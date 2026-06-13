# Social captions

Ready-to-paste captions for sharing the build log. Swap in the real links:
- Build log: `https://github.com/n8watkins/GeminiGPT/blob/main/docs/blog/building-cross-chat-memory.md`
- Live demo: `https://geminigpt-n8.onrender.com`
- Repo: `https://github.com/n8watkins/GeminiGPT`

---

## X / Twitter (short — thread starter)

> I built an AI chat app that remembers things you told it in *other* conversations.
>
> Turns out "RAG" is one line in every tutorial and about a dozen problems in production.
>
> So I wrote up everything that broke — including the similarity threshold I almost shipped by *guessing* at the number 👇

*(Reply/thread with the build-log link + a screenshot of the Two Buttons meme.)*

---

## LinkedIn (longer — reflective)

> I wanted to actually *understand* RAG, so I built a chat app with one trick: it remembers things you told it in **other** conversations. Tell it your dog's name in one chat, ask about your dog in a totally different one, and it pulls the memory back.
>
> Every tutorial makes RAG sound like four words — embed, store, search, answer. Building it for real taught me that's just the demo. The interesting part is everything *after*:
>
> • Vector search is weirdly bad at exact words (an error code, a name), so I added hybrid keyword + vector search.
> • Your top results are often the same fact four times, so I added reranking — but *not* an LLM one, because an extra model call on every message is how you bankrupt a free demo.
> • And the one that humbled me: I almost shipped a similarity threshold I just… guessed at. Ten minutes of *measuring* showed the entire approach couldn't work — the good and bad results overlapped, so no single cutoff could separate them.
>
> The biggest takeaways weren't even technical: **read your model's bad output** (every fix came from staring at a junk result, not from another article), and **test the deployed thing** — my unit tests were green the whole time the live app was citing the wrong chat.
>
> Full build log, with memes because I struggled: [link]
> Live demo: [link]
>
> #RAG #VectorDatabases #LearningInPublic #WebDev

---

## One-liner (for a repo description, bio, or quote-tweet)

> A chat app that remembers across conversations — and a build log of everything naive vector search got wrong (and how I measured my way out of it).
