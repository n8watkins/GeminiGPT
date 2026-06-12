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
- Skipped (for now): hybrid keyword+vector search, window chunking, reranking.
- **Keep the first-run About/API-key modals** — owner likes the design; they
  explain the project. Improvements welcome, removal is not.

## Interface contracts (agents build against these)

- Socket event `retrieval-info`:
  `{ chatId, sources: [{ chatId, chatTitle, snippet, score }] }`
- Socket event `usage-info` and REST `GET /api/usage`:
  `{ pool: { used, budget, resetAt, available }, user: { requests, tokens } }`

## Workstreams

| Agent | Track | Scope | Status |
|-------|-------|-------|--------|
| A | Backend | **RAG core**: auto-retrieval on every message (embed query → search other chats above similarity threshold → inject context → emit `retrieval-info`). Per-user embedding keys (visitor's BYOK key; server key fallback). Keep search tool. Files: `vectorDB.js`, `lib/websocket/services/*`, prompts. | not started |
| B | Backend | **Usage tracking**: tag each `gemini_logs` row with key class (pool vs BYOK), aggregate counters, `GET /api/usage`, broadcast `usage-info`, env-configurable demo budget. Merges AFTER A (shared files in `lib/websocket/services/`). | not started |
| C | Frontend | **Citations + usage meter**: "📎 Recalled from <chat title>" on messages using cross-chat memory; live shared-pool meter visible to all users. Builds against contracts; parallel with A/B. Files: `src/components/*`, `src/hooks/useWebSocket.ts`. | not started |
| D | Docs | **README learning journal**: full rewrite, first-person learner voice. Material: RAG/embeddings/LanceDB, WebSockets, BYOK economics, the 4-failure Render deploy saga. Independent. | not started |

Merge order: **A → B → C** (then end-to-end contract check), **D** anytime.
Each agent: isolated worktree, full verification (`npm ci`-clean build, lint,
test, boot + curl), commit in worktree, no push. Main session reviews each diff,
merges, pushes (auto-deploys), smoke-tests live site.

## Later / parked

- UI gutting (modal consolidation, sidebar diet, Inspector route from
  `debug-info` events) — outlined in chat 2026-06-12, do after RAG stages
- Hybrid search / chunking / reranking experiments
- Vercel ghost project still linked to repo (owner to disconnect)
- UptimeRobot keep-warm monitor on `/healthz` (owner setting up)

## Environment notes (recovery)

- Local dev: `npm run dev` → random port, logged as "Server listening on ..."
- Local detached server pattern: `setsid nohup node server.js > /tmp/gemini-chat-server.log 2>&1 &`
- Render env vars live in `render.yaml` + dashboard (`GEMINI_API_KEY` is
  dashboard-only, `sync: false`)
- A second Claude session sometimes runs this app on port 1337 for portfolio
  screenshots; it holds the `.next/dev` lock while active
