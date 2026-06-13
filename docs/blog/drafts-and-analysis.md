# Blog post — drafts, analysis & final

I wrote **three different versions** of the build-log post, each making a
different bet on voice and structure. This doc has all three in full, my honest
analysis of which fits the goal best, and the polished **final version** at the
bottom (which is what's published at `building-cross-chat-memory.md`).

**The goal we're optimizing for:** a piece that (a) reads like a real junior dev
learning in public — not corporate AI, (b) clearly signals genuine *vector
database / RAG depth* to a technical reader, and (c) is compelling enough that
Nathan would actually want to share it.

All three reference the same meme slots in `images/README.md`.

---

# Version 1 — "The Build Log"

> **The bet:** chronological struggle narrative. Maximum personality and
> relatability; you live the journey in order. Memes at every struggle beat.
> Best for engagement and the "learning in public" vibe.

## I taught a chatbot to remember things I said in *other* chats — here's everything that broke

I kept reading about RAG and understanding none of it. Every tutorial said the
same four words — *embed, store, search, answer* — and I'd nod along with zero
real comprehension. What **is** an embedding, physically? What does the database
actually store?

So I built a project where I couldn't fake it: a chat app whose whole
personality is **cross-chat memory.** Tell it your dog's name in one chat, ask
about your dog in a totally different one, and it remembers. Most chat apps treat
every conversation as an island. I wanted to build the bridges.

![I have no idea what I'm doing](./images/no-idea-what-im-doing.png)

**Embeddings finally clicked** when I stopped reading and wrote it down myself:
an embedding is just a list of 768 numbers — a *point in space* — and text with
similar meaning lands in nearby points. Search isn't keyword matching, it's
measuring the distance between *meanings.* Ship it. How hard could the rest be?

**It worked perfectly on my machine.** Then four deploy failures in a row taught
me otherwise (peer-dep hell, a crash loop, missing build deps, and a 502 from
binding to the container's hostname instead of `0.0.0.0`).

![It works on my machine](./images/deploy-panik.png)

**Then the model got retired out from under me.** Cross-chat memory just…
stopped. No error, no failed deploy. Google had retired my embedding model and
the API was silently 404ing on every call.

![This is fine](./images/this-is-fine.png)

**But the real work was making retrieval not embarrassing.** Once it was pulling
context automatically, I started reading what it pulled — and a lot was junk, in
three predictable flavors:

1. **Lone messages have no context** → I chunk by *turn* now (your message + the
   reply together). I over-corrected by also gluing in the *previous* turn; a
   live test showed it contaminated unrelated chats, so I ripped it out.
   ![Surprised Pikachu](./images/windowing-disaster.png)
2. **Vectors are bad at exact words** → added a dumb keyword search alongside the
   smart vector one and fused them with Reciprocal Rank Fusion. Biggest jump.
3. **Top results are often the same result** → MMR reranking for diversity.
   *Not* an LLM reranker — that'd burn my shared free key on every message.
   ![Drake: LLM reranker no, MMR yes](./images/drake-reranker.png)

**The finale: a threshold I almost guessed at.** A weak irrelevant result was
sneaking past my distance cutoff. Instead of guessing a new number, I measured —
and the data showed legit paraphrases (~0.76) and false positives (~0.69–0.80)
*overlap*, so no single cutoff works. The fix was a *relative* rule (keep
results near the best match), not an absolute one.

![Two buttons](./images/two-buttons.png)

**What I learned:** tutorials show the demo, production is everything after;
read your model's *bad* output; measure before you tune; test the deployed thing
(my unit tests were green while the live app cited the wrong chat); and hosted
models can vanish with zero code changes.

---

# Version 2 — "The Teardown"

> **The bet:** concept-first. Lead with the technical payoff — "naive vector
> search fails in 3 predictable ways" — and organize by idea, not chronology.
> Demonstrates depth fastest; reads like someone who *understands* it, not just
> someone who survived it. Fewer memes, more authority. Best for a technical
> reviewer / recruiter skimming for signal.

## Naive vector search is wrong in three specific ways. I know because I shipped all three.

Every RAG tutorial ends at "embed your text, store the vectors, search for the
nearest ones." That's the *demo.* It's also where the interesting problems
*start* — and a tutorial-grade pipeline will quietly embarrass you in production
in three predictable ways. I learned each one by building a cross-chat-memory
chat app (tell it something in one conversation, ask about it in another) and
then actually reading what it retrieved.

First, the one-paragraph foundation: an embedding is a 768-dimensional vector,
and semantically similar text maps to nearby vectors. "Retrieval" means turning a
query into a vector and grabbing its nearest neighbors. Good. Now the three ways
that bites you.

**1. Context-free chunks.** If you embed each message alone, "yeah, the second
one" becomes a meaningless vector. The fix is chunking — I store one vector per
*turn* (user message + assistant reply), so each chunk is self-describing. The
subtle trap: I tried adding the *previous* turn for extra context, and it
back-fired — it bled each turn's content into its neighbor, so an unrelated query
matched on the windowed leftovers. More context isn't free; it's cross-talk.

**2. Lexical blind spots.** Embeddings encode *meaning*, which makes them
oddly bad at exact rare tokens — an error code, a proper noun. "An error code"
and "a *different* error code" are semantic neighbors. The fix is **hybrid
search**: run a lexical keyword search alongside the vector search and fuse the
two ranked lists with Reciprocal Rank Fusion (`1/(k+rank)` summed across lists —
no tuned weights, no shared scale). This was the single biggest quality gain.

**3. Redundant top-k.** The four nearest vectors are often four paraphrases of
one fact, wasting the context budget. The fix is **MMR** reranking — greedily
pick results that are relevant *and* mutually diverse. I deliberately avoided an
LLM-based reranker: this runs on a shared free key, and an extra model call per
message is how a free demo dies. MMR is pure vector math — effectively free.

![Expanding brain](./images/expanding-brain.png)

**The capstone — and my favorite lesson.** My retrieval gate dropped anything
past a distance of 0.85, and a weak false positive was still sneaking through.
The reflex is to lower the number. Instead I measured a labeled set, and the data
killed the whole approach: legitimate paraphrase matches reached ~0.76 while the
false positives sat ~0.69–0.80. **They overlap** — no absolute threshold can
separate them. The real fix was a *relative* rule: keep candidates within a small
gap of the *best* match per query (the right answer is essentially always
closest, so it costs no recall). I'd been reaching for the wrong kind of lever
entirely, and only measuring showed it.

Two lessons generalize past RAG: **test the deployed system** (my unit tests
were green the whole time the live app cited the wrong chat — only an end-to-end
probe with real data caught it), and **measure before you tune** (I almost
shipped a guessed threshold that was structurally incapable of working).

---

# Version 3 — "The Hook"

> **The bet:** short, punchy, one-idea, built for a LinkedIn/X post that links
> back to the repo. ~400 words. One meme. Designed to be *shared*, not to be the
> whole story.

## I almost shipped a number I guessed at

My AI chat app has one trick: it remembers things you told it in *other*
conversations. Tell it your dog's name in one chat, ask about your dog in
another, and it pulls the memory back. Building it taught me that "RAG" — the
embed-and-retrieve thing everyone bolts onto LLMs — is one line in a tutorial and
a dozen problems in production.

Here's the one that humbled me most.

My retrieval ignored anything past a similarity cutoff of 0.85. A junk result
kept sneaking under it, so — obviously — I went to lower the number. To 0.80? To
0.75? I genuinely didn't know, so I was about to just… pick one.

![Two buttons](./images/two-buttons.png)

Instead I spent ten minutes measuring actual distances on a labeled set. The data
ended the argument instantly: the *legit* matches I wanted to keep reached ~0.76,
and the false positives I wanted to drop sat at ~0.69–0.80. **They overlap.**
There is no single cutoff that keeps the good and drops the bad. I'd been trying
to solve it with the wrong tool the whole time — the fix wasn't a *lower*
threshold, it was a *relative* one (keep results close to the best match, not
under a fixed line).

Ten minutes of measuring saved me from confidently shipping something that
*could not work.* That's the lesson I keep relearning: **numbers beat vibes**,
and your gut is great at proposing solutions and terrible at noticing when the
whole framing is wrong.

(The same project also taught me that hybrid keyword+vector search beats pure
vectors, that LLM rerankers are a great way to bankrupt a free demo, and that a
hosted model can get retired out from under you with zero errors. Full build log
+ all the bugs → [repo link].)

---

# Analysis

| | V1 Build Log | V2 Teardown | V3 Hook |
|---|---|---|---|
| **Voice / "junior dev learning"** | ★★★ strongest | ★★ more authoritative | ★★ opinionated |
| **Signals technical depth** | ★★ (depth is there but you wade to it) | ★★★ fastest, clearest | ★ (one idea only) |
| **Engagement / story** | ★★★ lives the arc | ★★ | ★★★ for its length |
| **Shareability (socials)** | ★★ (a bit long) | ★ (reads like docs) | ★★★ built for it |
| **Memes land naturally** | ★★★ every beat | ★★ (feels bolted on) | ★ (one) |
| **Effort to maintain** | medium | medium | low |

**V1 (Build Log)** is the most *human* and the most fun — it nails the "I struggled
through this in order" feel and the memes have a natural home at each failure.
The cost: a recruiter skimming for "does this person actually understand vector
search?" has to read a while before the depth shows up.

**V2 (Teardown)** is the strongest *signal*. Leading with "naive vector search
fails in 3 predictable ways" is a thesis only someone who understood it could
write, and the three-flaw spine is exactly the structure a technical reader wants.
The cost: it reads a touch more like a tutorial than a personal journey, and the
self-deprecating-junior-dev charm is dialed down. Memes feel slightly bolted-on.

**V3 (Hook)** isn't really a competitor — it's a *distribution tool.* It's the
LinkedIn/X post you write to make people click through to the real one. On its
own it's too thin to be the portfolio piece, but it's the best at making someone
stop scrolling.

## Recommendation

**Publish a synthesis of V1 + V2, and keep V3 as the social teaser.**

The winning move isn't to pick one — it's to take V1's narrative spine (which
carries the voice and the memes) and graft on V2's two best moves:
1. **A thesis-y hook** so the depth is visible in the first 15 seconds, not
   paragraph nine. (Borrow V2/V3's "I almost shipped a number I guessed at" /
   "fails in three predictable ways" energy.)
2. **Crisp principle statements** — name the lesson at the end of each flaw, so a
   skimmer extracts the signal even if they don't read every line.

That gives you a post that's *fun to read top-to-bottom* (V1) **and** *legible to
a 30-second skim* (V2), with V3 ready to paste into a social post that links
back. That synthesis is the **Final version** below — and it's what I published
to `building-cross-chat-memory.md`.

Net: **V1 as the base, sharpened with V2's structure. V3 ships as your share
caption.** (If you only had time to read one, V2 is the single best *standalone*
for a technical audience — but it's the weakest fit for "compelling + human,"
which is what you actually asked for.)

---

# Final version (published)

> This is the synthesis — V1's arc + V2's visible-depth structure. Mirrored at
> `building-cross-chat-memory.md`.

## I taught a chatbot to remember things I said in *other* chats — and learned that "RAG" is a lie of omission

Every RAG tutorial — the embed-your-data-so-the-AI-can-use-it thing — ends at the
same four words: *embed, store, search, answer.* That's the **demo.** I learned
the hard way that it's also where the actual problems *start*, by building a chat
app whose entire personality is **cross-chat memory**: tell it your dog's name in
one conversation, ask about your dog in a completely different one, and it
remembers. Most chat apps treat every conversation as an island — I wanted to
build the bridges, and I figured I'd understand RAG by the end whether I liked it
or not.

Reader, I did not always like it.

![I have no idea what I'm doing](./images/no-idea-what-im-doing.png)
*Me, opening the vector database docs for the first time.*

### First, the one idea you actually need

An embedding is just a list of numbers — 768 of them, for the model I use — and
that list is a **point in space.** The magic property: text with similar
*meaning* lands in nearby points. "My dog's name is Biscuit" and "what did I call
my pet?" end up neighbors even though they share almost no words. Search isn't
keyword matching — it's measuring the **distance between meanings.** Writing that
sentence myself is the moment it finally clicked. I store every message as one of
these points (in LanceDB, an embedded vector database), and to "remember," I turn
your new question into a point and grab its nearest neighbors.

Cool. Ship it. How hard could the rest be?

### It worked perfectly on my machine

![It works on my machine](./images/deploy-panik.png)

Deploying it produced four failures in a row, each one teaching me something I
thought I already knew: npm peer-dependency hell (from a `legacy-peer-deps` flag
that doesn't *fix* conflicts, it just defers them to the worst moment); a crash
loop because the server *demanded* an API key it should've treated as optional;
missing build tools because `NODE_ENV=production` skips devDependencies; and the
sneaky one — a 502 because I bound to the container's hostname instead of
`0.0.0.0`. (Full saga in the [README](../../README.md).) Then production threw me
a curveball I *couldn't* have prevented: Google **retired the embedding model**
I was using, and cross-chat memory silently died — no error, no failed deploy,
just 404s on every embed call. A hosted model is a dependency that can vanish
without you running an install.

![This is fine](./images/this-is-fine.png)
*Production, allegedly.*

### The real work: naive vector search fails in three predictable ways

Here's the part the tutorials skip. Once retrieval was automatic, I started
actually **reading what it pulled back** — and a lot of it was junk, in three
specific flavors. Fixing each one was its own little experiment.

![Expanding brain](./images/expanding-brain.png)
*The real evolution of this project's retrieval, bottom to top.*

**1. Lone messages have no context.** A stored vector for "yeah, the second one"
is meaningless. So I chunk by *turn* now — your message **and** the reply,
together — and each chunk describes itself. I also over-corrected: my first
version glued the *previous* turn into every chunk too ("more context is
better!"). A live test demolished that idea — I mentioned my dog in one chat and,
in an unrelated chat, the app cited it anyway, because the dog turn had been
windowed into its neighbor and dragged along. **More context wasn't free; it was
cross-talk.** I tore it out.

![Surprised Pikachu](./images/windowing-disaster.png)
*Me, discovering my "extra context" was contaminating unrelated chats.*

**2. Vectors are weirdly bad at exact words.** Embeddings capture meaning — which
is the point — but that makes them terrible at the one thing keyword search is
great at: an exact rare token like `ERR_PACKAGE_PATH_NOT_EXPORTED`. To a vector,
"an error code" and "a *different* error code" are basically the same place. So I
added a dumb lexical keyword search next to the smart vector one and fused the two
ranked lists with **Reciprocal Rank Fusion** — score each result by `1/(k+rank)`
summed across both lists, so anything ranking high in *either* search floats up.
No tuned weights, no shared score scale. **Biggest single quality jump in the
project.**

**3. Your top results are often the same result.** Ask about your dog and the
four nearest vectors might be four paraphrases of one fact — you've spent your
whole context budget learning it four times. Fix: **MMR reranking**, which picks
results that are relevant *and* different from each other. The trendy move is to
ask an LLM to rerank — I didn't, on purpose:

![Drake: LLM reranker no, MMR yes](./images/drake-reranker.png)

This runs on a **shared free API key.** An extra model call on *every message*
just to reorder four snippets is exactly how a free demo goes broke. MMR is pure
math on vectors I already have. Effectively free.

### The finale: the threshold I almost guessed at

Last boss. My retrieval ignored anything past a distance of `0.85`, and a weak,
irrelevant result kept sneaking under it. My instinct: lower the number. To 0.80?
0.75? I had no idea — so I was about to just pick one.

![Two buttons](./images/two-buttons.png)

Instead I built a tiny harness, embedded a labeled set of questions and facts for
real, and **measured.** The data ended the debate in ten minutes: the legit
*paraphrased* matches I wanted to keep reached **~0.76**, and the false positives
I wanted to drop sat at **~0.69–0.80.** They **overlap.** There is no single
cutoff that keeps the good and drops the bad — I'd been reaching for the wrong
*kind* of lever the whole time. The real fix was a **relative** rule: keep results
within a small gap of the *best* match for each query (the right answer is
essentially always the closest one, so it costs zero recall). I shipped it,
re-ran the live test, and the dog question finally came back with exactly one
correct citation. 🎉

### What I actually learned

- **Tutorials show the demo; production is everything after.** "Embed, store,
  search, answer" hides chunking, hybrid search, reranking, and threshold tuning.
- **Read your model's *bad* output.** Every fix above came from staring at a junk
  retrieval — not from reading another article about RAG.
- **Measure before you tune.** I almost shipped a guessed threshold that was
  *structurally incapable* of working. Numbers beat vibes.
- **Test the deployed thing.** My unit tests were green the entire time the live
  app was citing the wrong chat. Mocks can't catch what real data does.
- **Hosted dependencies can disappear** — with zero code changes and zero errors.

If you're also learning this stuff and something here is wrong or unclear,
[open an issue](https://github.com/n8watkins/GeminiGPT/issues) — I'd genuinely
like to know.

*— Nathan, learning in public*
