# Handoff

## Current state and open work (2026-10-27): start here

This section is the entry point.
The older sections below are history from June 2026; where they disagree with this section, this section wins.

### What it is and where it lives

GeminiGPT is an AI chat app whose headline feature is cross-chat memory: every turn is embedded, and each reply can recall context from your other chats (RAG over LanceDB).
Live demo: https://geminigpt-n8.onrender.com (Render free plan, service `geminigpt-n8`, Blueprint `gemini-gpt-n8` from `render.yaml`).
It is listed on the owner's portfolio, https://portfolio.n8builds.dev, which shows OpenPing's live status next to it.
Repo: `n8watkins/GeminiGPT` (default branch `main`), MIT license as of 2026-10-27.

### Status as of 2026-10-27

- `/healthz` returns 200 and the page title is "GeminiGPT - AI Chat Assistant".
- The live deploy is still commit `976554e` (2026-06-14).
  Merged to `main` since then but **not live**: the MIT license (`642e21a`) and the em dash fix for UI copy (PR #2).
  Render's auto-deploy did not fire for either push (see open problem 2).
- Render free plan: the service sleeps after about 15 minutes idle and a cold start takes about a minute.
  OpenPing measures 90-day uptime at 96.7%.
  Render's event log also shows every free service in the workspace suspended for "Free Tier Usage Exceeded" from 2026-07-24 to 2026-08-01, so keeping several free services warm burns the shared 750 instance-hours.
- Models: chat uses `gemini-3.1-flash-lite` (`lib/websocket/services/GeminiService.js`); embeddings use `gemini-embedding-001` at 768 dimensions (`vectorDB.js`), which is not deprecated and stays.
- Checks run locally today: `npm run type-check` clean, `npx jest` 124/124 pass, `npm run lint` 0 errors and 14 warnings.

### Model plan (open PR, do not merge before the key step)

The owner decided on 2026-10-27 to move every Gemini text model to Gemini 3.5 Flash Lite.
The exact ID `gemini-3.5-flash-lite` was confirmed on https://ai.google.dev/gemini-api/docs/models (listed as Stable, on the free tier).
**PR #3** (https://github.com/n8watkins/GeminiGPT/pull/3) switches the chat model, the test helpers, README, `SETUP_GUIDE.md` and `tests/README.md`.
It is intentionally left open, because it can't be verified end to end until the owner's new Gemini key is on Render.
Order: owner sets the new `GEMINI_API_KEY` on the Render service `geminigpt-n8`, then merge PR #3 (squash), then make sure it actually deploys (see open problem 2), then a live check: a streamed reply, a tool call (a web search question), and cross-chat recall via `node tests/manual/prod-rag-probe.js`.

### Open problems

1. **Security, HIGH (live public site): Next.js has known critical advisories.**
   `package-lock.json` locks `next` 16.0.0.
   GitHub's advisory database (checked 2026-10-27) lists 4 critical, 15 high, 16 moderate and 3 low advisories for it, including unauthenticated remote code execution (`use cache`, Image Optimization).
   All are fixed in `next` >= 16.4.1.
   Fix: upgrade `next` (and `eslint-config-next` to match) to the latest 16.x (>= 16.4.1), run `npm run lint`, `npm run build` and `npx jest`, deploy (needs open problem 2 fixed so the deploy actually happens), then a live check of chat, uploads and cross-chat recall.
   Node runtime: Render runs this service on its native Node runtime with `NODE_VERSION=24` (set in `render.yaml` and confirmed on the service), so the `Dockerfile`'s `node:20-alpine` base (Node 20 is end-of-life since April 2026) is not what production uses.
   The Dockerfile is only for self-hosting; bump it to a supported Node (22 or 24) or delete it.
2. **Render auto-deploy is not firing.**
   The service has auto-deploy on (trigger: commit), but the last deploy is from 2026-06-14 although `main` has moved twice since.
   Echo's service in the same workspace did auto-deploy today, so the likely cause is the Render GitHub app's access to this repo or a broken webhook.
   Reproduce: compare `git log origin/main` with the Deploys tab of `geminigpt-n8` in the Render dashboard.
3. **Old API keys sit in git history.**
   `TODO.md` and `docs/archive/CODE_REVIEW_REPORT.md` contained a full Gemini key and a full Google Search key in this public repo.
   They were redacted from the current files on 2026-10-27 (only the last four characters remain, to identify them), but they stay in git history.
   Nobody has recorded that they were revoked.
4. **A stale Vercel project (`gemini-gpt`) is still linked to the repo** and fails on every push and PR.
   It is harmless for the live app (which runs on Render) but shows a red check on every PR.
5. **Lint warnings (14, no errors).**
   Mostly `react-hooks` "setState synchronously within an effect" in `src/app/page.tsx`, `src/components/{ApiKeySetup,KeyboardShortcuts,MigrationBanner,Modal,UsageStats}.tsx`, `src/contexts/ThemeContext.tsx`, `src/hooks/{useOnboarding,useUserId}.ts`; an impure call during render in `src/components/RateLimitModal.tsx`; unused variables in `src/components/DebugPanel.tsx` and `src/contexts/ChatContext.tsx`.
   Reproduce: `npm run lint`.
   Fixing them changes render behavior, so do it with a browser pass, not blind.
6. **Status display on the portfolio.**
   OpenPing currently shows off-hours (weekend) monitors as "operational"; the fix is tracked in the open-ping repo, not here.
7. **Stale docs.**
   `TODO.md` describes an old Railway plan (now marked stale at its top), and several older docs (`DEPLOYMENT.md`, `docs/DEPLOYMENT_GUIDE.md`, `docs/DATABASE_SCHEMA.md`) predate the Render deploy and name older models.
   Treat README and this file as current.

### Blocked on the owner

- Create the new Gemini API key and set it as `GEMINI_API_KEY` on the Render service `geminigpt-n8` (the owner said on 2026-10-27 that new keys are coming).
- Revoke the two old keys from open problem 3 if they still exist: the Gemini key ending `6C4w` (Google AI Studio, API keys) and the Google Search key ending `0cpQ` (Google Cloud console, Credentials).
- Fix Render auto-deploy for this repo (check the Render GitHub app has access to `n8watkins/GeminiGPT`), then trigger one deploy of `main` so the merged commits go live.
- Disconnect or delete the stale Vercel project `gemini-gpt`.
- No subdomain is planned for GeminiGPT yet (only `echo.n8builds.dev` is planned, for Echo).

### Next steps, in order

1. Owner: set the new key on Render and fix auto-deploy (above).
2. Upgrade `next` to the latest 16.x (open problem 1) in its own PR, verify lint, build and tests, deploy and check live.
3. Merge PR #3, confirm the deploy reaches the new commit, then run the live check described in "Model plan".
4. Confirm the old keys are revoked and record it here.
5. Clear the 14 lint warnings with a browser check of each affected screen.
6. Parked feature work from June (settings consolidation, sidebar diet, `/inspector` route) is listed under "Next steps" below and in `docs/RAG_OVERHAUL_PLAN.md`.

_Last updated: 2026-06-13 (Wave 4). Zero-context handoff - read this + `docs/RAG_OVERHAUL_PLAN.md` before doing anything._

## Project summary

**GeminiGPT** - an AI chat app whose headline feature is **cross-chat memory**:
every message is embedded into a vector DB, and any chat can automatically
retrieve relevant context from the user's *other* chats. It's a RAG /
vector-database learning project; the README is intentionally a first-person
learning journal, not expert docs.

- **Stack:** Next.js 16 (App Router) + a custom Node server (`server.js`) that
  runs Next.js **and** a Socket.IO WebSocket server on one port. SQLite
  (better-sqlite3) for chats/logs, LanceDB for vectors, Gemini for chat
  (`gemini-3.1-flash-lite`) + embeddings (`gemini-embedding-001`, 768-dim).
- **Auth:** next-auth v5 (Auth.js). Optional - app fully supports anonymous use.
- **Deploy:** Render free tier, **live at https://geminigpt-n8.onrender.com**.
  Blueprint-managed via `render.yaml`; **auto-deploys on push to `main`**
  (~5–8 min build + a brief 502 while the instance swaps). Free tier sleeps
  after 15 min idle (~30–60s cold start). UptimeRobot pings `/healthz` every
  5 min to keep it warm.
- **GitHub:** `n8watkins/GeminiGPT` (homepage + description + topics set).

## State (what's done - latest session 2026-06-13, Wave 4)

**RAG retrieval-quality experiments shipped** (`b9a5723`, `662eabf`, `9bc8107`,
plus README `577e03f` and fix `759d6bd` - all pushed to `origin/main`, live):
- Built by **three parallel worktree agents** against a shared `searchChats`
  row contract (zero file overlap), merged in order **chunk → hybrid → rerank**:
  - **Turn-chunking** (`ConversationChunker.js`): one context-carrying `turn`
    row per turn (user + assistant combined) instead of two isolated rows.
    (Originally also windowed the prior turn; removed in `576b401` after a live
    probe showed it polluted neighbour embeddings - see below.)
  - **Hybrid search** (`HybridSearch.js` + `searchChats`): lexical `LIKE`
    search fused with vector search via Reciprocal Rank Fusion (k=60). Rows
    gain `_rrf` + `_keywordScore`; keyword-only hits carry `_distance=null`.
  - **MMR reranking** (`Reranker.js` + `ChatRetriever`): gate on distance OR
    keyword strength, then MMR (λ=0.7) for relevance + diversity. Offline by
    design - NO extra LLM call (it'd burn the shared pool per query).
- **Live prod probe drove two fixes to the windowing idea** (unit tests on mock
  rows passed throughout; only the end-to-end prod probe with real chunked data
  caught these):
  - `759d6bd` - chunks led with the windowed prior turn, but the read path
    snippets the first ~200 chars for both citation and injected context, so a
    follow-up turn's snippet showed the OLD window and truncated away the turn's
    actual content. Reordered to lead with the current turn.
  - `576b401` - the re-probe then showed the deeper flaw: windowing the prior
    turn into every chunk polluted neighbour embeddings, so a "dog's name" query
    matched an unrelated "production deployment" turn (the dog turn had been
    windowed into it) and recalled the same fact twice with a misleading
    citation. **Removed cross-turn windowing entirely**; kept turn-pairing
    (user+assistant), which already solves the lone-message problem.
- **Relevance tuned from measured data** (`ed631ae` → superseded by `49e8cad`;
  docs `e32788f`): the probe also exposed a weak structural false positive (a
  "production deployment codename" turn matching "what is my dog's name?").
  Built `tests/manual/threshold-tuning.js` (labelled turn-chunk corpus,
  precision/recall sweep) which showed legit paraphrases (~0.76) and these false
  positives (~0.69-0.80) OVERLAP - so no absolute `MAX_DISTANCE` separates them.
  Final design: keep `MAX_DISTANCE=0.85` (recall-safe ceiling) + new
  `RELEVANCE_GAP=0.10` (drop vector candidates trailing the closest match by
  >gap; the correct fact is ~always closest, so no recall cost). Keyword-only
  hits bypass the gap. Regression test in `tests/chat-retriever-gap.test.js`.
- Verified: build ✓, lint ✓ (0 errors, 14 warnings), type-check ✓, tests
  **124/124** (96 baseline + 28 new). Live `/healthz`, `/api/usage`, `/share`
  all 200 post-deploy; cross-chat recall (semantic + exact-token) confirmed via
  the live probe across iterations.
- _Confirmed on prod:_ the final `tests/manual/prod-rag-probe.js` run shows the
  `RELEVANCE_GAP` rule works on the live site - "what is my dog's name?" now
  returns a SINGLE source (the Waffles turn); the structural deployment
  neighbour no longer leaks in, and the exact-token query still answers. No open
  items. (If it ever regresses, nudge `RELEVANCE_GAP` toward 0.08 - the tuning
  corpus has margin to do so with no recall cost - and re-probe.)
- Full detail + the new row-field contract in `docs/RAG_OVERHAUL_PLAN.md`
  "Wave 4". A reusable live prod probe is at `tests/manual/prod-rag-probe.js`
  (NOT run by `npm test` - it hits the live site and spends pool budget;
  `node tests/manual/prod-rag-probe.js`, `PROBE_URL` env overrides the target).

**Image-upload bug fixed** (`e63d0df`, pushed to `origin/main`):
- The PNG/JPEG upload path was already working end-to-end (FileUpload →
  data URL → `MessagePipeline.processAttachments` → `processImage` →
  Gemini `inlineData` → `sendMessageStream`). So the owner's earlier "broken
  upload" was indeed the now-fixed DebugPanel overlay.
- **Real latent bug found & fixed:** the client accepts any `image/*`, but
  `AttachmentHandler.validateImageDimensions()` only parsed PNG/JPEG. **GIF and
  WebP** fell through with width/height = 0 and were fail-closed as
  `[Image dimensions too large: 0x0]` - silently dropped before reaching Gemini.
  Added `parseGIFDimensions` + `parseWebPDimensions` (VP8/VP8L/VP8X variants),
  wired into `validateImageDimensions`. All four common formats now accepted.
- Reproduced with real 1×1 fixtures pre-fix; verified accepted post-fix.
- Added `tests/attachment-image-dimensions.test.js` (4 tests: PNG/GIF/WebP
  acceptance + oversized-dimension rejection). Suite now **96/96**.
- Verified: build ✓, lint ✓ (0 errors, 14 warnings), type-check ✓, tests ✓.
  Live `/healthz`, `/api/usage`, `/share` all 200 post-push.
- _Not done:_ true browser/WebSocket end-to-end upload of a `.webp` on the live
  site (can't drive a headless browser here) - server-side processing is
  verified against real image bytes, but a manual drag-drop confirm is welcome.

## State (earlier work)

All work is committed and **pushed to `origin/main`**. Two waves shipped, all
live and verified on production:

**Wave 1 - RAG overhaul** (see `docs/RAG_OVERHAUL_PLAN.md` agents A–D):
- Automatic cross-chat retrieval with citations (`37fcaff`) - verified live
  (plant a fact in chat A, ask chat B → answered with a 📎 citation).
- Shared-pool usage tracking + daily budget + `POOL_EXHAUSTED` (`d7aea86`).
- Onboarding wizard, pool-key-by-default, citations UI, usage meter (`111ec8f`).
- README rewritten as a learning journal (`eb77081`).

**Wave 2 - fixes + polish** (agents E–F):
- `c8446a7` - single shared WebSocket (was 4–6 sockets/visitor causing
  disconnect flicker on chat switch); fixed export/download (root cause: the
  DebugPanel overlay was covering the buttons - now hidden behind Alt+Shift+D);
  self-contained share links (`/share#<base64url(gzip(json))>`, no server
  storage, never expire); sign-in UI hidden when no OAuth provider configured;
  deleted unused legacy `/api/chat`.
- `babccda`/`4143902` - lucide-react icons, smoother animations, "🎓 Portfolio
  learning project" badge (top-left, links to repo), typed-out cycling prompt
  suggestions in the input, ambient drifting-orb background (respects
  prefers-reduced-motion).

**Verified working:** build, lint (0 errors), type-check, tests (92/92),
live `/healthz` 200, `/api/usage` 200, `/share` 200, cross-chat RAG on prod,
20/20 concurrent WebSocket connections (multi-user confirmed).

**Bugs found & fixed along the way:** the old embedding model
(`text-embedding-004`) had been **retired by Google** - vector search was
silently 404ing in production until this session; `token_count` was never
actually logged (now is).

## Next steps (ordered)

If a focus was given at handoff time, do that first. Otherwise:

1. _(DONE 2026-06-13 - `e63d0df`)_ Image upload re-tested; PNG/JPEG worked,
   GIF/WebP were silently dropped and are now fixed. Optional follow-up: a
   manual drag-drop of a `.webp` on the live site to confirm interpretation
   end-to-end through the WebSocket.
2. **Owner housekeeping (not code):** disconnect the stale Vercel project still
   linked to the GitHub repo (fails on every push, harmless); verify the
   budget cap on the Render `GEMINI_API_KEY` in Google AI Studio / Cloud
   Console (the only true spend ceiling on the shared pool).
3. _(DONE 2026-06-13 - Wave 4)_ RAG experiments - hybrid keyword+vector search,
   conversation-window chunking, reranking - all shipped and live. See the
   Wave 4 state above and `docs/RAG_OVERHAUL_PLAN.md`.
4. **Parked feature work** (from `docs/RAG_OVERHAUL_PLAN.md` "Later / parked"):
   - UI gutting: consolidate the many modals into one tabbed Settings surface;
     sidebar diet (it's ~800 lines) with per-chat `⋯` menus; an `/inspector`
     route fed by the existing `debug-info` socket events.
   - Edge: an invalid BYOK key falls back to the server key internally but is
     tagged `byok`, so it isn't counted against the pool budget.
   - _(DONE)_ RAG relevance tuning: measured precision/recall on a turn-chunk
     corpus (`tests/manual/threshold-tuning.js`) showed legit paraphrases
     (~0.76) and structural false positives (~0.69-0.80) OVERLAP, so no absolute
     `MAX_DISTANCE` separates them. Final design (`49e8cad`): keep `MAX_DISTANCE`
     a recall-safe 0.85 and add `RELEVANCE_GAP=0.10` - drop vector candidates
     trailing the closest match by more than the gap (the correct fact is
     essentially always closest, so no recall cost). `MMR_LAMBDA` left at 0.7.
     (Intermediate `MAX_DISTANCE=0.80` in `ed631ae` was superseded - it didn't
     separate the overlap.) Windowing double-recall resolved earlier (`576b401`).

## Conventions & gotchas (hard-won this session)

- **Commit after each logical change**; trailer required:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`. Push when done.
- **Sub-agent workflow that worked well:** isolated git worktrees, define
  interface contracts up front (see plan doc), each agent runs full
  verification + commits in its worktree (no push), main session reviews the
  diff, merges, pushes (auto-deploys), smoke-tests live. `.claude/` (where
  worktrees live) is gitignored AND eslint-ignored - keep it that way; never
  `git add -A` a worktree into the index.
- **Verification commands that actually work:** `npm run build`,
  `npm run lint` (0 errors expected; ~12–14 pre-existing warnings are fine),
  `npm run type-check`, `npm test`. If type-check reports errors about
  `.next/dev/types/.../route.js` for deleted routes, that's a **stale Next
  cache** - `rm -rf .next/dev/types .next/types` and re-run.
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
  Studio) - validators in `src/lib/apiKeyValidation.ts` and `GeminiService.js`.
- **Decisions already made (do NOT re-ask):** stay on Render free tier;
  ephemeral data accepted; keep the first-run onboarding wizard (owner likes
  it); pool-key-by-default with no upfront key ask; keep the share button
  (self-contained links); UptimeRobot at 5-min interval is correct.

## File map (for the next steps)

- `docs/RAG_OVERHAUL_PLAN.md` - full plan/decisions/agent status; the roadmap.
- `server.js` - entry point (Next + Socket.IO, port logic, env validation).
- `websocket-server.js` - wires services; CORS; socket event handlers.
- `vectorDB.js` - embeddings (per-key clients, BYOK) + LanceDB search.
- `lib/websocket/services/MessagePipeline.js` - message flow: rate limit →
  pool budget → retrieval → generate → index → usage emit.
- `lib/websocket/services/ChatRetriever.js` - auto-retrieval + `retrieval-info`;
  Wave 4: keyword-OR-distance gate, `RELEVANCE_GAP` trim, then MMR rerank before
  injection. Tuning knobs live in `RETRIEVAL_CONFIG` at the top.
- `tests/manual/threshold-tuning.js` - offline relevance-tuning harness (labelled
  corpus, distance + precision/recall sweep + gap-rule sweep). Needs a key in
  `.env.local`; `node tests/manual/threshold-tuning.js`.
- `lib/websocket/services/Reranker.js` - Wave 4: offline MMR (relevance +
  diversity), pure function, no API calls.
- `lib/websocket/services/HybridSearch.js` - Wave 4: keyword extraction +
  Reciprocal Rank Fusion (pure helpers; the LanceDB queries live in vectorDB.js).
- `lib/websocket/services/ConversationChunker.js` - Wave 4: builds one
  `turn` chunk per turn (user+assistant combined; no cross-turn windowing).
- `lib/websocket/services/VectorIndexer.js` - indexes via ConversationChunker
  (one `turn` row per turn; `indexMessagePair` signature unchanged).
- `lib/websocket/services/UsageTracker.js` - pool budget + `usage-info`.
- `src/contexts/WebSocketContext.tsx` - the single shared socket (provider).
- `src/hooks/useWebSocket.ts` - thin consumer of that context.
- `src/components/OnboardingWizard.tsx`, `UsageMeter.tsx`, `PoolExhaustedNotice.tsx`.
- `src/lib/shareLink.ts` - gzip+base64url share encode/decode.
- `src/components/FileUpload.tsx` - image/doc upload UI (client validation).
- `lib/websocket/services/AttachmentHandler.js` - server-side attachment
  processing; `validateImageDimensions` now parses PNG/JPEG/GIF/WebP.
- `render.yaml` - Render blueprint (env vars; `GEMINI_API_KEY` is
  dashboard-only `sync:false`; `POOL_DAILY_REQUEST_BUDGET=300`).
