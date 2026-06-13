# Blog images — how they were made

These are **real, committed PNGs**, captioned and generated via
[**memegen.link**](https://memegen.link) — a free, no-auth, URL-based meme API
(213 templates). No account, no key: you build a URL like
`https://api.memegen.link/images/<template>/<top>/<bottom>.png` and it renders.
Spaces → `_`, literal `_` → `__`, `-` → `--`, `?` → `~q`.

To regenerate or tweak any image, re-run its `curl` below (from this folder):

| File | Template | Regenerate |
|------|----------|------------|
| `no-idea-what-im-doing.png` | `noidea` | `curl -s "https://api.memegen.link/images/noidea/me_the_first_time_I_opened_the_LanceDB_docs.png" -o no-idea-what-im-doing.png` |
| `deploy-panik.png` | `panik-kalm-panik` | `curl -s "https://api.memegen.link/images/panik-kalm-panik/it_works_locally/deployed_to_Render/HTTP_502_no_errors_in_the_logs.png" -o deploy-panik.png` |
| `this-is-fine.png` | `fine` | `curl -s "https://api.memegen.link/images/fine/cross_chat_memory~q_in_prod/(google_retired_my_embedding_model).png" -o this-is-fine.png` |
| `expanding-brain.png` | `gb` (Galaxy Brain) | `curl -s "https://api.memegen.link/images/gb/embed_each_message_alone/embed_whole_turns/hybrid_keyword_and_vector/relative_gap_rerank.png" -o expanding-brain.png` |
| `windowing-disaster.png` | `disastergirl` | `curl -s "https://api.memegen.link/images/disastergirl/my_'extra_context'/quietly_poisoning_unrelated_chats.png" -o windowing-disaster.png` |
| `drake-reranker.png` | `drake` | `curl -s "https://api.memegen.link/images/drake/LLM_reranker_on_every_message/free_offline_MMR_math.png" -o drake-reranker.png` |
| `two-buttons.png` | `ds` (Daily Struggle) | `curl -s "https://api.memegen.link/images/ds/max_distance_0.75/max_distance_0.80.png" -o two-buttons.png` |

**Want animated GIFs instead?** memegen is static-only. For GIFs use the
**Giphy** or **Tenor** APIs (both free, but they need an API key) — e.g. a
"it works on my machine" GIF for the deploy section. Not wired up here to avoid
a key dependency; the panik-kalm-panik static covers that beat fine.

Other ready-made templates that fit if you want to swap: `success` (Success Kid),
`stonks`, `disastergirl`, `gandalf` (Confused Gandalf), `exit` (Left Exit 12).
Browse them all at <https://api.memegen.link/templates>.
