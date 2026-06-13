# I taught a chatbot to remember things I said in *other* chats — here's everything that broke

*A build log from someone who learned RAG the hard way: by watching it fail.*

I kept reading about RAG — retrieval-augmented generation, the thing everyone bolts onto LLMs so they can "use your data." Every tutorial said the same four words: *embed, store, search, answer.* I'd nod along and understand exactly none of it. What **is** an embedding, physically? What does the database actually store? When does the "retrieval" even happen?

So I picked a project where I couldn't fake it: a chat app whose whole personality is **cross-chat memory**. Tell it your dog's name in one conversation, ask about your dog in a totally different one, and it remembers. Most chat apps treat every conversation like an island. I wanted to build the bridges.

This is the story of how that went. Spoiler: the four-word tutorial is a *lie of omission*.

![I have no idea what I'm doing](./images/no-idea-what-im-doing.jpg)
*Me, opening the LanceDB docs for the first time.*

---

## Part 1: embeddings finally clicked (and it wasn't from reading)

Here's the thing that unstuck me. An embedding is just a list of numbers — for the model I use, 768 of them. That list is a *point in space*, and the magic is that text with similar **meaning** lands in nearby points. "My dog's name is Biscuit" and "what did I call my pet?" end up as neighbors even though they barely share a word.

That's the whole trick. Search isn't keyword matching — it's measuring the **distance between meanings**. Once I wrote that sentence down myself, it finally stuck. I store every message as one of these points in a vector database (LanceDB), and to "remember," I turn your new question into a point and grab the nearest neighbors.

Cool. Ship it. How hard could the rest be?

---

## Part 2: it worked perfectly on my machine

![It works on my machine](./images/works-on-my-machine.gif)

Deploying this thing to a real server taught me more than the app did. In order, the failures were:

1. **npm peer-dependency hell** — my lockfile had been quietly papered over with `legacy-peer-deps`. It didn't fix the conflict, it just saved it for the worst possible moment (the deploy).
2. **A crash loop** because the server *demanded* an API key at boot — even though the entire point was that the key is optional.
3. **Missing devDependencies at build** because `NODE_ENV=production` makes npm skip the very tools the build needs.
4. **The sneaky one**: everything deployed, health check passed, site returned 502. I was binding to `process.env.HOSTNAME`, which on a container is the container ID, so my server was listening at a door nobody was knocking on. *Bind to `0.0.0.0`. Always.*

I wrote these up in detail in the [README](../../README.md) so I'd never relearn them. But the deploy wasn't even the part that humbled me.

---

## Part 3: the model got retired out from under me

One day, cross-chat memory just… stopped remembering. No error in my code. No failed deploy. Nothing in my logs screaming. It just silently returned nothing.

![This is fine](./images/this-is-fine.png)
*Production, allegedly.*

Turns out Google **retired the embedding model** I was using (`text-embedding-004`), and the API was quietly 404ing on every single embed call. The lesson burned in deep: **a hosted model is a dependency that can vanish without you running an install.** I migrated to `gemini-embedding-001` — which has its own gremlin (at the 768 dimensions I truncate to, it returns *un-normalized* vectors, so I had to L2-normalize them myself or the distance math silently breaks). But "no code changed" never again means "still working."

---

## Part 4: the real work — making retrieval not embarrassing

Here's the part the tutorials skip. Once retrieval was *automatic* — every message embedded, nearest neighbors pulled in without me asking — I started actually **reading what it pulled back.** A lot of it was junk. And the junk came in three flavors, each one a specific way naive vector search embarrasses you.

![Expanding brain: the retrieval pipeline](./images/expanding-brain.jpg)
*The actual evolution of this project's retrieval, bottom to top.*

### Flaw 1: lone messages have no context

I was embedding each message on its own. So a stored vector for "yeah, the second one" is *meaningless* — pulled up later, it tells the model nothing. The fix is **chunking**: I store one row per *turn* (your message **+** the assistant's reply together), so a recalled snippet carries its own meaning.

And here's where I over-engineered. My first version *also* glued the **previous** turn into every chunk — "more context is better," I figured. Then I ran a live test: I told it my dog's name in one chat, and in a different chat asked something totally unrelated about a deployment. It cited the dog chat anyway — because the dog turn had been windowed into the next chunk and dragged along for the ride.

![Surprised Pikachu](./images/surprised-pikachu.jpg)
*Me discovering my "more context" was just cross-contamination.*

So I tore the windowing back out.

![Press F](./images/press-f.png)
*Pouring one out for the 40 lines of windowing code I was so proud of.*

The assistant's own reply already carries enough context. **One clean turn per chunk** keeps retrieval — and the citations — honest. Lesson: reading what the thing *actually retrieves* beats reasoning about what it *should*.

### Flaw 2: vectors are weirdly bad at exact words

Embeddings capture meaning — which is the whole point — but it makes them oddly terrible at the one thing keyword search is trivially good at: matching an exact rare token. Tell it your dog is "Waffles" and ask "what's my dog called?" → nailed. But ask about an error code like `ERR_PACKAGE_PATH_NOT_EXPORTED` and the nearest vector might be some *other* error, because "an error code" and "a different error code" sit close together in meaning-space.

So I added a second, dumb lexical search (good old SQL `LIKE`) running alongside the smart vector one, and fused the two ranked lists with **Reciprocal Rank Fusion** — a fancy name for a delightfully simple idea: score each result by `1 / (k + rank)` summed across both lists, so anything ranking high in *either* search floats up. No tuned weights, no shared score scale needed. This "hybrid search" was the single biggest quality jump.

### Flaw 3: your top results are often the *same* result

Ask "what did I say about my dog?" and the four nearest vectors might be four paraphrases of one fact. You've spent your whole context budget learning the same thing four times. The fix is reranking for **diversity** — I used MMR (Maximal Marginal Relevance), which greedily picks results that are both relevant *and* different from what's already chosen.

The tempting move here is to throw an LLM at it ("ask the model to rerank!"). I didn't:

![Drake: LLM reranker no, MMR yes](./images/drake-reranker.jpg)

This runs on a **shared free API key**. Spending an extra model call on *every single message* just to reorder four snippets is exactly the kind of cost that quietly sinks a free demo. MMR is pure math on vectors I already have. Effectively free.

---

## Part 5: the threshold that taught me to measure, not guess

Last boss. My retrieval had a cutoff: ignore anything farther than distance `0.85`. But a live test showed a weak, irrelevant turn sneaking past it. My instinct was to just tighten the number.

![Two buttons: 0.75 or 0.80?](./images/two-buttons.jpg)
*Me, about to guess.*

Instead of guessing, I built a tiny harness: a labeled set of facts and questions, embedded for real, and I **measured** the actual distances. The data ended the debate instantly:

- Legit *paraphrased* questions matched their answer at distances up to **~0.76**.
- The annoying false positives sat at **~0.69–0.80**.

They **overlap.** There is no single cutoff that keeps the good and drops the bad — I'd been trying to solve it with the wrong lever the whole time. The fix wasn't an *absolute* threshold at all; it was a **relative** one: keep results within a small gap of the *best* match for that query. The right answer is essentially always the closest match, so trimming the trailing stuff costs zero recall and kills the false positives.

I shipped it, re-ran the live test, and the dog question finally came back with exactly one, correct citation. 🎉

---

## What I actually learned

- **Tutorials show you the demo; production is the part after.** "Embed, store, search, answer" is four words hiding chunking, hybrid search, reranking, and threshold tuning.
- **Read your model's bad output.** Every single fix in Part 4 came from staring at a junk retrieval, not from reading another article about RAG.
- **Measure before you tune.** I almost shipped a threshold I *guessed* at. Ten minutes of measuring showed the entire approach was wrong (overlapping distributions — an absolute cutoff *can't* work). Numbers > vibes.
- **Test the deployed thing.** My unit tests were green the whole time the live app was citing the wrong chat. Real data, real round-trip, catches what mocks can't.
- **Hosted dependencies can disappear.** A retired model took down a feature with zero code changes and zero errors.

If you're also learning this stuff and something here is wrong or unclear, [open an issue](https://github.com/n8watkins/GeminiGPT/issues) — I'd genuinely like to know.

*— Nathan, learning in public*
