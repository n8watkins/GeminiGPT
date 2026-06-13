# RAG Overhaul Plan

_Last updated: 2026-06-12. This is the recovery document: if a session, machine,
or agent crashes, resume from here. Check the Status column first._

## Project intent (owner's words)

A **RAG / vector-database learning project** about chat with LLMs. The headline
feature: **cross-chat memory** — one chat can look into other chats' history via
the vector DB. The README should read as a first-person learning journal
(entry-level developer voice: "what I learned building this"), not expert docs.

## Where we are (done)

- ✅ Live on Render free tier: https://geminigpt-n8.onrender.com
  (service `geminigpt-n8`, deploys automatically on push to `main`;
  config in `render.yaml`, blueprint-managed)
- ✅ Deploy failure chain fixed (in order: apache-arrow peer conflict,
  GEMINI_API_KEY crash-loop, devDeps missing at build, HOSTNAME bind bug)
- ✅ next-auth v4 → v5, Railway legacy removed, Sentry removed
- ✅ BYOK works; server fallback key set in Render dashboard (shared demo pool)
- ✅ Dev server picks a random port; WebSocket connects to page origin
- ✅ Existing RAG: every message embedded (text-embedding-004, 768-dim) into
  LanceDB; retrieval via `search_chat_history` **function tool only** (model
  decides; no automatic injection). Per-user isolation via `user_id` filter.

## Decisions made

- Stay on **Render free tier**; ephemeral data is accepted (fresh slate per
  restart; usage counters may reset per boot — Google-console budget cap on the
  shared key is the true spend ceiling).
- BYOK users must get **full cross-chat memory** (embeddings via their key).
- Keep the explicit search tool alongside auto-retrieval.
- ~~Skipped (for now): hybrid keyword+vector search, window chunking,
  reranking.~~ **All three shipped in Wave 4 (2026-06-13)** — see below.
- **Keep the first-run About/API-key modals** — owner likes the design; they
  explain the project. Improvements welcome, removal is not.
- **Onboarding (decided 2026-06-12):** visitors use the server pool key by
  default — never ask for an API key upfront ("a little sketch"). BYOK is the
  upgrade path shown when the pool runs out (with instructions for getting a
  key). The two stacked modals become ONE two-step wizard (step 1: About/what
  this is incl. the cross-chat-memory pitch; step 2: get started, showing the
  live demo-pool meter). Wizard renders over the live, blurred chat UI, not a
  blank page. Keep the existing design language.

## Interface contracts (agents build against these)

- Socket event `retrieval-info`:
  `{ chatId, sources: [{ chatId, chatTitle, snippet, score }] }`
- Socket event `usage-info` and REST `GET /api/usage`:
  `{ pool: { used, budget, resetAt, available }, user: { requests, tokens } }`
- Pool exhaustion: when a pool-key request is rejected for budget, the server
  sends the standard message-error path with `code: 'POOL_EXHAUSTED'` (and
  `usage-info` shows `available: 0`) — the UI uses this to prompt adding a key.

## Workstreams

| Agent | Track | Scope | Status |
|-------|-------|-------|--------|
| A | Backend | **RAG core**: auto-retrieval on every message (embed query → search other chats above similarity threshold → inject context → emit `retrieval-info`). Per-user embedding keys (visitor's BYOK key; server key fallback). Keep search tool. Files: `vectorDB.js`, `lib/websocket/services/*`, prompts. | ✅ merged 37fcaff (incl. forced migration to gemini-embedding-001 — text-embedding-004 was retired upstream) |
| B | Backend | **Usage tracking**: tag each `gemini_logs` row with key class (pool vs BYOK), aggregate counters, `GET /api/usage`, broadcast `usage-info`, env-configurable demo budget. Merges AFTER A (shared files in `lib/websocket/services/`). | ✅ merged d7aea86 (also fixed token_count never being logged) |
| C | Frontend | **Onboarding wizard + citations + usage meter**: merge About/ApiKeySetup modals into one two-step wizard over blurred live UI; pool-key-by-default (no upfront key ask; BYOK offered on `POOL_EXHAUSTED`); "📎 Recalled from <chat title>" citations; live shared-pool meter (in wizard step 2 + persistent in UI). Builds against contracts; parallel with A/B. Files: `src/components/*`, `src/hooks/useWebSocket.ts`. | ✅ merged 111ec8f |
| D | Docs | **README learning journal**: full rewrite, first-person learner voice. Material: RAG/embeddings/LanceDB, WebSockets, BYOK economics, the 4-failure Render deploy saga. Independent. | ✅ merged eb77081 |

Merge order: **A → B → C** (then end-to-end contract check), **D** anytime.
Each agent: isolated worktree, full verification (`npm ci`-clean build, lint,
test, boot + curl), commit in worktree, no push. Main session reviews each diff,
merges, pushes (auto-deploys), smoke-tests live site.

## Wave 2 (launched 2026-06-12): fixes + polish

Decisions: KEEP the share button but make it work via self-contained URLs
(server disk is ephemeral — old disk-based shares die on every restart).
Hide sign-in UI when no OAuth provider is configured (it silently fails
today). Multi-user confirmed live (20/20 concurrent sockets).

| Agent | Scope | Status |
|-------|-------|--------|
| E (fix) | Single shared WebSocket (4 components each open their own socket today — causes disconnect flicker on chat switch); fix chat export/download error; self-contained share links (no server storage); hide sign-in when providers list is empty; remove/instrument legacy `/api/chat`. | ✅ merged c8446a7 (one socket via WebSocketProvider; export bug was the DebugPanel overlay swallowing clicks — debug widget now hidden by default, Alt+Shift+D; shares are `/share#<base64url(gzip(json))>` with size cap, legacy `/share/<id>` shows friendly expired state; sign-in UI gated on `/api/auth/providers`; `/api/chat` deleted — zero references) |
| F (polish) | lucide-react icons (settings/theme/etc.); smoother+longer sidebar & shortcuts-modal animations; "student project" badge top-left; cycling typed-out prompt suggestions at the input; subtle ambient background motion (respect prefers-reduced-motion). | ✅ merged 4143902 |

## Wave 3 (2026-06-13): image-upload fix

- ✅ `e63d0df` — GIF and WebP image uploads were silently dropped: the client
  accepts any `image/*`, but `AttachmentHandler.validateImageDimensions` only
  parsed PNG/JPEG, so GIF/WebP fail-closed at 0×0. Added GIF + WebP
  (VP8/VP8L/VP8X) dimension parsers; regression test added (suite now 96/96).
  PNG/JPEG path was already working end-to-end.

## Wave 4 (2026-06-13): RAG retrieval-quality experiments

Built by three parallel worktree agents against a shared `searchChats` row
contract (zero file overlap; merged in order chunk → hybrid → rerank). All on
`main`, live, verified (build/lint/type-check + 123 tests).

| Commit | Scope |
|--------|-------|
| `b9a5723` | **Conversation-window chunking** (write path): index one context-carrying `turn` row per turn (current turn + a window of the prior turn) instead of two isolated user/assistant rows. New `ConversationChunker.js`. |
| `662eabf` | **Hybrid keyword+vector search** (`searchChats`): lexical `LIKE` search fused with vector search via Reciprocal Rank Fusion (k=60). Rows gain `_rrf` + `_keywordScore`; keyword-only hits carry `_distance=null`. New `HybridSearch.js`. |
| `9bc8107` | **MMR reranking** (`ChatRetriever`): gate on vector distance OR keyword strength, then Maximal Marginal Relevance (λ=0.7) for relevance + diversity. Offline — NO extra LLM call (would burn the shared pool per query). New `Reranker.js`. |
| `577e03f` | README learning-journal entry on all three + fixed stale facts (auto-retrieval live; embeddings `gemini-embedding-001`). |
| `759d6bd` | **Fix found via live prod probe:** chunks led with the windowed prior turn, but the read path snippets the FIRST ~200 chars for both citation and injected context — so a follow-up turn's snippet/context showed the OLD window and truncated away the turn's actual content (retrieval found the right turn, model couldn't answer it). Now leads with the current turn; window trails as labeled context. |

Interface contract added this wave — `searchChats` rows now also carry:
`_rrf` (number), `_keywordScore` (int; keyword-only hits have `_distance=null`),
alongside the existing `_distance` and `vector`. `ChatRetriever` consumes these.

## Later / parked

- UI gutting (modal consolidation, sidebar diet, Inspector route from
  `debug-info` events) — outlined in chat 2026-06-12, do after RAG stages
- ~~Hybrid search / chunking / reranking experiments~~ — **done, Wave 4 above**
- Vercel ghost project still linked to repo (owner to disconnect)
- UptimeRobot keep-warm monitor on `/healthz` (owner setting up)
- ~~Legacy REST `/api/chat` route calls Gemini with the server key WITHOUT
  logging to gemini_logs~~ — audited (Agent E): nothing referenced it; deleted.
- Edge: an invalid BYOK key falls back to the server key internally but is
  tagged `byok` (not counted against the pool).

## Environment notes (recovery)

- Local dev: `npm run dev` → random port, logged as "Server listening on ..."
- Local detached server pattern: `setsid nohup node server.js > /tmp/gemini-chat-server.log 2>&1 &`
- Render env vars live in `render.yaml` + dashboard (`GEMINI_API_KEY` is
  dashboard-only, `sync: false`)
- A second Claude session sometimes runs this app on port 1337 for portfolio
  screenshots; it holds the `.next/dev` lock while active
