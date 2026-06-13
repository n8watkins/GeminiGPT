# Blog image slots — drop-in guide

The post `../building-cross-chat-memory.md` references the images below. Save
each one into **this folder** with the exact filename and it renders. All are
well-known, freely-circulating memes — grab whichever version you like from a
quick image search (terms provided). GIFs welcome where noted.

| Filename | Meme / image | Where it lands | Suggested search |
|----------|--------------|----------------|------------------|
| `no-idea-what-im-doing.jpg` | "I have no idea what I'm doing" dog at a computer | Opening — first time in the vector DB docs | *"i have no idea what im doing dog"* |
| `works-on-my-machine.gif` | "It works on my machine" (a shrug/dev GIF works great) | Part 2, the deploy saga | *"it works on my machine gif"* |
| `this-is-fine.png` | "This is fine" dog in the burning room | Part 3, model silently retired in prod | *"this is fine dog meme"* |
| `expanding-brain.jpg` | Expanding/galaxy brain (4 panels) | Part 4 intro, the retrieval evolution | *"expanding brain meme blank"* — optionally caption the 4 tiers: isolated messages → turn chunks → hybrid search → relative-gap rerank |
| `surprised-pikachu.jpg` | Surprised Pikachu | Part 4, the live test catching the windowing bug | *"surprised pikachu"* |
| `press-f.png` | "Press F to pay respects" | Part 4, deleting the windowing code | *"press f to pay respects meme"* |
| `drake-reranker.jpg` | Drake "no / yes" two-panel | Part 4, rejecting an LLM reranker for MMR | *"drake meme template"* — top (reject): "LLM reranker on every message", bottom (approve): "free offline MMR math" |
| `two-buttons.jpg` | "Two buttons" sweating guy | Part 5, the threshold guess | *"two buttons meme template"* — buttons: "MAX_DISTANCE 0.75" / "MAX_DISTANCE 0.80" |

Tips:
- For the captioned ones (expanding brain, drake, two buttons), imgflip's
  meme generator makes them in ~30 seconds.
- GIFs from Giphy/Tenor: download the `.gif` (or `.mp4`→`.gif`) and commit it —
  don't hotlink, so the post survives if the link rots.
- Keep them reasonably small (< ~2 MB each) so the repo stays light.
