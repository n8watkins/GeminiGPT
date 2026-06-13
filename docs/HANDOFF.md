# Handoff

_Last updated: 2026-06-13 (Wave 4). Zero-context handoff — read this + `docs/RAG_OVERHAUL_PLAN.md` before doing anything._

## Project summary

**GeminiGPT** — an AI chat app whose headline feature is **cross-chat memory**:
every message is embedded into a vector DB, and any chat can automatically
retrieve relevant context from the user's *other* chats. It's a RAG /
vector-database learning project; the README is intentionally a first-person
learning journal, not expert docs.

- **Stack:** Next.js 16 (App Router) + a custom Node server (`server.js`) that
  runs Next.js **and** a Socket.IO WebSocket server on one port. SQLite
  (better-sqlite3) for chats/logs, LanceDB for vectors, Gemini for chat
  (`gemini-3.1-flash-lite`) + embeddings (`gemini-embedding-001`, 768-dim).
- **Auth:** next-auth v5 (Auth.js). Optional — app fully supports anonymous use.
- **Deploy:** Render free tier, **live at https://geminigpt-n8.onrender.com**.
  Blueprint-managed via `render.yaml`; **auto-deploys on push to `main`**
  (~5–8 min build + a brief 502 while the instance swaps). Free tier sleeps
  after 15 min idle (~30–60s cold start). UptimeRobot pings `/healthz` every
  5 min to keep it warm.
- **GitHub:** `n8watkins/GeminiGPT` (homepage + description + topics set).

## State (what's done — latest session 2026-06-13, Wave 4)

**RAG retrieval-quality experiments shipped** (`b9a5723`, `662eabf`, `9bc8107`,
plus README `577e03f` and fix `759d6bd` — all pushed to `origin/main`, live):
- Built by **three parallel worktree agents** against a shared `searchChats`
  row contract (zero file overlap), merged in order **chunk → hybrid → rerank**:
  - **Turn-chunking** (`ConversationChunker.js`): one context-carrying `turn`
    row per turn (current turn + windowed prior turn) instead of two isolated
    user/assistant rows.
  - **Hybrid search** (`HybridSearch.js` + `searchChats`): lexical `LIKE`
    search fused with vector search via Reciprocal Rank Fusion (k=60). Rows
    gain `_rrf` + `_keywordScore`; keyword-only hits carry `_distance=null`.
  - **MMR reranking** (`Reranker.js` + `ChatRetriever`): gate on distance OR
    keyword strength, then MMR (λ=0.7) for relevance + diversity. Offline by
    design — NO extra LLM call (it'd burn the shared pool per query).
- **Live prod probe found & fixed a real bug** (`759d6bd`): chunks led with the
  windowed prior turn, but the read path snippets the first ~200 chars for both
  citation and injected context — so a follow-up turn's snippet showed the OLD
  window and truncated away the turn's actual content. Now leads with the
  current turn. (Lesson: unit tests on mock rows passed; only the end-to-end
  prod probe with real chunked data caught it.)
- Verified: build ✓, lint ✓ (0 errors, 14 warnings), type-check ✓, tests
  **123/123** (96 baseline + 27 new). Live `/healthz`, `/api/usage`, `/share`
  all 200 post-deploy.
- Full detail + the new row-field contract in `docs/RAG_OVERHAUL_PLAN.md`
  "Wave 4". A reusable live prod probe is at `/tmp/prod-rag-probe.js`
  (uncommitted — burns pool budget; `PROBE_URL` env overrides the target).

**Image-upload bug fixed** (`e63d0df`, pushed to `origin/main`):
- The PNG/JPEG upload path was already working end-to-end (FileUpload →
  data URL → `MessagePipeline.processAttachments` → `processImage` →
  Gemini `inlineData` → `sendMessageStream`). So the owner's earlier "broken
  upload" was indeed the now-fixed DebugPanel overlay.
- **Real latent bug found & fixed:** the client accepts any `image/*`, but
  `AttachmentHandler.validateImageDimensions()` only parsed PNG/JPEG. **GIF and
  WebP** fell through with width/height = 0 and were fail-closed as
  `[Image dimensions too large: 0x0]` — silently dropped before reaching Gemini.
  Added `parseGIFDimensions` + `parseWebPDimensions` (VP8/VP8L/VP8X variants),
  wired into `validateImageDimensions`. All four common formats now accepted.
- Reproduced with real 1×1 fixtures pre-fix; verified accepted post-fix.
- Added `tests/attachment-image-dimensions.test.js` (4 tests: PNG/GIF/WebP
  acceptance + oversized-dimension rejection). Suite now **96/96**.
- Verified: build ✓, lint ✓ (0 errors, 14 warnings), type-check ✓, tests ✓.
  Live `/healthz`, `/api/usage`, `/share` all 200 post-push.
- _Not done:_ true browser/WebSocket end-to-end upload of a `.webp` on the live
  site (can't drive a headless browser here) — server-side processing is
  verified against real image bytes, but a manual drag-drop confirm is welcome.

## State (earlier work)

All work is committed and **pushed to `origin/main`**. Two waves shipped, all
live and verified on production:

**Wave 1 — RAG overhaul** (see `docs/RAG_OVERHAUL_PLAN.md` agents A–D):
- Automatic cross-chat retrieval with citations (`37fcaff`) — verified live
  (plant a fact in chat A, ask chat B → answered with a 📎 citation).
- Shared-pool usage tracking + daily budget + `POOL_EXHAUSTED` (`d7aea86`).
- Onboarding wizard, pool-key-by-default, citations UI, usage meter (`111ec8f`).
- README rewritten as a learning journal (`eb77081`).

**Wave 2 — fixes + polish** (agents E–F):
- `c8446a7` — single shared WebSocket (was 4–6 sockets/visitor causing
  disconnect flicker on chat switch); fixed export/download (root cause: the
  DebugPanel overlay was covering the buttons — now hidden behind Alt+Shift+D);
  self-contained share links (`/share#<base64url(gzip(json))>`, no server
  storage, never expire); sign-in UI hidden when no OAuth provider configured;
  deleted unused legacy `/api/chat`.
- `babccda`/`4143902` — lucide-react icons, smoother animations, "🎓 Portfolio
  learning project" badge (top-left, links to repo), typed-out cycling prompt
  suggestions in the input, ambient drifting-orb background (respects
  prefers-reduced-motion).

**Verified working:** build, lint (0 errors), type-check, tests (92/92),
live `/healthz` 200, `/api/usage` 200, `/share` 200, cross-chat RAG on prod,
20/20 concurrent WebSocket connections (multi-user confirmed).

**Bugs found & fixed along the way:** the old embedding model
(`text-embedding-004`) had been **retired by Google** — vector search was
silently 404ing in production until this session; `token_count` was never
actually logged (now is).

## Next steps (ordered)

If a focus was given at handoff time, do that first. Otherwise:

1. _(DONE 2026-06-13 — `e63d0df`)_ Image upload re-tested; PNG/JPEG worked,
   GIF/WebP were silently dropped and are now fixed. Optional follow-up: a
   manual drag-drop of a `.webp` on the live site to confirm interpretation
   end-to-end through the WebSocket.
2. **Owner housekeeping (not code):** disconnect the stale Vercel project still
   linked to the GitHub repo (fails on every push, harmless); verify the
   budget cap on the Render `GEMINI_API_KEY` in Google AI Studio / Cloud
   Console (the only true spend ceiling on the shared pool).
3. _(DONE 2026-06-13 — Wave 4)_ RAG experiments — hybrid keyword+vector search,
   conversation-window chunking, reranking — all shipped and live. See the
   Wave 4 state above and `docs/RAG_OVERHAUL_PLAN.md`.
4. **Parked feature work** (from `docs/RAG_OVERHAUL_PLAN.md` "Later / parked"):
   - UI gutting: consolidate the many modals into one tabbed Settings surface;
     sidebar diet (it's ~800 lines) with per-chat `⋯` menus; an `/inspector`
     route fed by the existing `debug-info` socket events.
   - Edge: an invalid BYOK key falls back to the server key internally but is
     tagged `byok`, so it isn't counted against the pool budget.
   - RAG follow-ups now visible after Wave 4: windowing makes a fact appear in
     two chunks (the turn itself + the next turn's trailing window), so a recall
     can cite the same fact twice — could dedupe by source turn or by fuzzy
     snippet overlap. Also consider tuning `MAX_DISTANCE`/`MMR_LAMBDA` now that
     chunks are turn-sized (longer) rather than single messages.

## Conventions & gotchas (hard-won this session)

- **Commit after each logical change**; trailer required:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`. Push when done.
- **Sub-agent workflow that worked well:** isolated git worktrees, define
  interface contracts up front (see plan doc), each agent runs full
  verification + commits in its worktree (no push), main session reviews the
  diff, merges, pushes (auto-deploys), smoke-tests live. `.claude/` (where
  worktrees live) is gitignored AND eslint-ignored — keep it that way; never
  `git add -A` a worktree into the index.
- **Verification commands that actually work:** `npm run build`,
  `npm run lint` (0 errors expected; ~12–14 pre-existing warnings are fine),
  `npm run type-check`, `npm test`. If type-check reports errors about
  `.next/dev/types/.../route.js` for deleted routes, that's a **stale Next
  cache** — `rm -rf .next/dev/types .next/types` and re-run.
- **Dev server:** `npm run dev` picks a **random high port** (printed as
  "Server listening on http://localhost:<port>") and binds `0.0.0.0`. To run
  detached so it survives across turns:
  `setsid nohup node server.js > /tmp/gemini-chat-server.log 2>&1 < /dev/null &`
- **`node server.js` runs DEV mode**; production mode needs `NODE_ENV=production`
  plus `NEXT_PUBLIC_APP_URL`/`PRODUCTION_URL` (CORS) or it refuses to boot.
- **Render deploy failure chain already solved** (don't reintroduce): bind
  `0.0.0.0` not `process.env.HOSTNAME` (container ID → 502); build uses
  `npm ci --include=dev` (NODE_ENV=production else skips typescript);
  `GEMINI_API_KEY` must be optional (BYOK); apache-arrow pinned to 18.1.0 for
  LanceDB peer compat.
- **Gemini key formats:** accept both `AIza…` (classic) and `AQ.…` (newer AI
  Studio) — validators in `src/lib/apiKeyValidation.ts` and `GeminiService.js`.
- **Decisions already made (do NOT re-ask):** stay on Render free tier;
  ephemeral data accepted; keep the first-run onboarding wizard (owner likes
  it); pool-key-by-default with no upfront key ask; keep the share button
  (self-contained links); UptimeRobot at 5-min interval is correct.

## File map (for the next steps)

- `docs/RAG_OVERHAUL_PLAN.md` — full plan/decisions/agent status; the roadmap.
- `server.js` — entry point (Next + Socket.IO, port logic, env validation).
- `websocket-server.js` — wires services; CORS; socket event handlers.
- `vectorDB.js` — embeddings (per-key clients, BYOK) + LanceDB search.
- `lib/websocket/services/MessagePipeline.js` — message flow: rate limit →
  pool budget → retrieval → generate → index → usage emit.
- `lib/websocket/services/ChatRetriever.js` — auto-retrieval + `retrieval-info`;
  Wave 4: keyword-OR-distance gate + MMR rerank before injection.
- `lib/websocket/services/Reranker.js` — Wave 4: offline MMR (relevance +
  diversity), pure function, no API calls.
- `lib/websocket/services/HybridSearch.js` — Wave 4: keyword extraction +
  Reciprocal Rank Fusion (pure helpers; the LanceDB queries live in vectorDB.js).
- `lib/websocket/services/ConversationChunker.js` — Wave 4: builds one
  context-carrying `turn` chunk per turn (current turn leads, prior turn trails).
- `lib/websocket/services/VectorIndexer.js` — indexes via ConversationChunker
  (one `turn` row per turn; `indexMessagePair` signature unchanged).
- `lib/websocket/services/UsageTracker.js` — pool budget + `usage-info`.
- `src/contexts/WebSocketContext.tsx` — the single shared socket (provider).
- `src/hooks/useWebSocket.ts` — thin consumer of that context.
- `src/components/OnboardingWizard.tsx`, `UsageMeter.tsx`, `PoolExhaustedNotice.tsx`.
- `src/lib/shareLink.ts` — gzip+base64url share encode/decode.
- `src/components/FileUpload.tsx` — image/doc upload UI (client validation).
- `lib/websocket/services/AttachmentHandler.js` — server-side attachment
  processing; `validateImageDimensions` now parses PNG/JPEG/GIF/WebP.
- `render.yaml` — Render blueprint (env vars; `GEMINI_API_KEY` is
  dashboard-only `sync:false`; `POOL_DAILY_REQUEST_BUDGET=300`).
