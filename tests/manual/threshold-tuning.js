/**
 * Offline tuning harness for the cross-chat retrieval distance threshold
 * (ChatRetriever RETRIEVAL_CONFIG.MAX_DISTANCE).
 *
 * Why: the live probe showed a weak structural neighbour ("my production
 * deployment runs under codename X") sneaking under the 0.85 gate for an
 * unrelated query ("what is my dog's name?"). This measures REAL distances for
 * a small labelled corpus and sweeps candidate thresholds on precision/recall,
 * so any threshold change is data-driven rather than overfit to one anecdote.
 *
 * It mirrors production exactly: docs are stored as turn-chunks
 * ("User: … / Assistant: …"); queries are embedded as the raw user message
 * (that's what ChatRetriever embeds). Embeddings are L2-normalized in
 * vectorDB.js, so squared-L2 distance = 2*(1 - cosine) = LanceDB's `_distance`.
 *
 * Needs a GEMINI_API_KEY (read from .env.local). Run:
 *   node tests/manual/threshold-tuning.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });
const { generateEmbedding } = require('../../vectorDB');

// --- Labelled corpus: stored turn-chunks (what gets indexed) ---------------
// Deliberately includes three "my X is named Y" facts (dog / car / deployment)
// because that shared structure is exactly what produced the false positive.
const DOCS = {
  dog: 'User: Just so you know, my dog\'s name is Waffles and he is a corgi.\nAssistant: That\'s a great name! Waffles is a perfect name for a corgi.',
  deploy: 'User: Also remember: my production deployment runs under the internal codename Zephyr-Quokka-7X.\nAssistant: Understood. Your production deployment is under the internal codename Zephyr-Quokka-7X.',
  car: 'User: My car is a blue 2018 Subaru Outback named Bluey.\nAssistant: Nice — a blue 2018 Subaru Outback called Bluey.',
  book: 'User: The book I loved most last year was The Three-Body Problem.\nAssistant: Great pick — The Three-Body Problem is a classic of hard sci-fi.',
  coffee: 'User: I take my coffee black, no sugar, usually two cups in the morning.\nAssistant: Got it — black coffee, no sugar, two cups in the morning.',
  css: 'User: How do I center a div in CSS?\nAssistant: Use display:flex with justify-content:center and align-items:center on the parent.',
};

// --- Queries, each labelled with the ONE doc it should retrieve ------------
const QUERIES = [
  { q: 'what is my dog\'s name?', match: 'dog' },
  { q: 'remind me what I named my dog', match: 'dog' },
  { q: 'what\'s the codename of my production deployment?', match: 'deploy' },
  { q: 'what is Zephyr-Quokka-7X?', match: 'deploy' },
  { q: 'what kind of car do I drive?', match: 'car' },
  { q: 'what sci-fi book did I say I liked?', match: 'book' },
  { q: 'how do I take my coffee?', match: 'coffee' },
];

const CANDIDATE_THRESHOLDS = [0.70, 0.75, 0.78, 0.80, 0.82, 0.85, 0.90];

function sqL2(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; }
  return s;
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error('No GEMINI_API_KEY in env/.env.local — cannot embed.');
    process.exit(2);
  }

  console.log('Embedding corpus + queries...\n');
  const docVecs = {};
  for (const [k, text] of Object.entries(DOCS)) docVecs[k] = await generateEmbedding(text);

  // pair list: { query, docKey, dist, shouldRetrieve }
  const pairs = [];
  for (const { q, match } of QUERIES) {
    const qv = await generateEmbedding(q);
    const row = Object.keys(DOCS).map((k) => ({ docKey: k, dist: sqL2(qv, docVecs[k]) }));
    row.sort((a, b) => a.dist - b.dist);
    console.log(`Q: "${q}"  (expect: ${match})`);
    for (const r of row) {
      const tag = r.docKey === match ? '  <-- SHOULD RETRIEVE' : '';
      console.log(`   ${r.dist.toFixed(3)}  ${r.docKey}${tag}`);
      pairs.push({ q, docKey: r.docKey, dist: r.dist, shouldRetrieve: r.docKey === match });
    }
    console.log('');
  }

  // --- Threshold sweep: precision / recall / F1 over all pairs -------------
  console.log('Absolute MAX_DISTANCE sweep (gate: keep pair if dist <= T):');
  console.log('   T      TP  FP  FN   precision  recall   F1');
  const totalPos = pairs.filter((p) => p.shouldRetrieve).length;
  for (const T of CANDIDATE_THRESHOLDS) {
    let tp = 0, fp = 0;
    for (const p of pairs) {
      const kept = p.dist <= T;
      if (kept && p.shouldRetrieve) tp++;
      else if (kept && !p.shouldRetrieve) fp++;
    }
    const fn = totalPos - tp;
    const precision = tp + fp ? tp / (tp + fp) : 1;
    const recall = totalPos ? tp / totalPos : 1;
    const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
    console.log(`   ${T.toFixed(2)}   ${String(tp).padStart(2)}  ${String(fp).padStart(2)}  ${String(fn).padStart(2)}    ${precision.toFixed(3)}     ${recall.toFixed(3)}   ${f1.toFixed(3)}`);
  }

  // --- Diagnostics: the recall floor and the closest false positive -------
  const posDists = pairs.filter((p) => p.shouldRetrieve).map((p) => p.dist);
  const negDists = pairs.filter((p) => !p.shouldRetrieve).map((p) => p.dist);
  console.log('\nRecall floor  (max distance among SHOULD-RETRIEVE pairs): ', Math.max(...posDists).toFixed(3));
  console.log('Hardest FP    (min distance among SHOULD-NOT pairs):      ', Math.min(...negDists).toFixed(3));
  console.log('=> a clean separating threshold exists only if recall-floor < hardest-FP.');

  process.exit(0);
}
main().catch((e) => { console.error('Error:', e); process.exit(1); });
