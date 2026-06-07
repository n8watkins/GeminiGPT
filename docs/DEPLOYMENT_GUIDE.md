# Deployment Guide

_Last updated: 2026-06-07_

How to get GeminiGPT online — with a focus on **free / low-cost** hosting and a
realistic time roadmap. See also [PROJECT_STATUS.md](./PROJECT_STATUS.md) for the
overall readiness state.

---

## 1. Architecture & why hosting choice matters

This app is a **single custom Node process** (`server.js`) that runs **Next.js +
a socket.io WebSocket server together** on one port (`PORT`, binds `0.0.0.0`).
State lives on the local filesystem under `data/`:

- `data/chat.db` — SQLite (users, chats, messages, gemini_logs)
- `data/lancedb/` — LanceDB vector store (embeddings for cross-chat search)

This drives three hard constraints on where it can run:

1. **Needs a long-lived Node server** — not serverless. ❌ Vercel / Netlify /
   Cloudflare Workers cannot host it (they can't run a persistent WebSocket
   server). The old `deploy-to-production.sh` "Vercel frontend + Railway backend"
   split is **stale and does not apply** — deploy as one service.
2. **Single instance only** — better-sqlite3, in-process sockets, and an
   in-memory rate limiter mean it cannot be horizontally scaled. Run **1 replica**.
3. **Filesystem state** — needs either a persistent disk *or* acceptance that
   data resets (see below).

### The persistence escape hatch (this is the key to free hosting)

The app **recreates its database schema on boot** and **fully supports anonymous
users**. So it runs perfectly fine on hosts with *ephemeral* storage — you just
get a clean slate after each restart/redeploy. For a portfolio demo this is
usually **fine or even desirable** (every visitor starts fresh).

> **Decide up front:** do you need data to survive restarts?
> - **No (demo / fresh-each-time)** → any free tier works, including ones with no
>   disk. Easiest + cheapest.
> - **Yes (persist chats)** → you need a persistent volume → fewer free options.

---

## 2. Hosting options (free-first)

| Host | Cost | Persistent data? | WebSockets | Always-on | Notes |
|------|------|------------------|-----------|-----------|-------|
| **Render (free web service)** | Free | ❌ (disks are paid) | ✅ | ❌ sleeps after ~15 min idle (cold start ~30–60s) | Easiest free managed option. Great for an ephemeral demo. |
| **Koyeb (free)** | Free | ❌ ephemeral | ✅ | ✅ (1 free service) | Similar to Render, no forced sleep. Ephemeral data. |
| **Fly.io** | ~$0–5/mo | ✅ volumes | ✅ | ✅ | Best *managed* option **with** persistence; tiny apps are cheap, may need a card on file. |
| **Oracle Cloud — Always Free VM** | **Free forever** | ✅ full disk | ✅ | ✅ | A real ARM VM (generous specs). Truly free + persistent, but **you** manage Docker/PM2 + reverse proxy + TLS. |
| **Local + Cloudflare Tunnel** | Free | ✅ (your disk) | ✅ | only while your machine is on | Zero hosting cost; good for live walkthroughs, not 24/7. |
| **Railway** | ~$5/mo (trial credit first) | ✅ volumes | ✅ | ✅ | Easiest overall; what `railway.json` targets. Not free long-term. |
| Vercel / Netlify / CF Workers | — | — | ❌ | — | **Incompatible** with this architecture. |

> Free-tier terms change often — verify current limits on each provider before
> committing.

### Recommendation by goal

- **"I just want a free live demo, fast"** → **Render free** (accept cold start +
  data resets). ~1 hour to live.
- **"Free forever + keep data"** → **Oracle Cloud Always Free VM**. ~half a day of
  setup, then it's yours with no bill.
- **"Easiest, and a few $/mo is fine"** → **Railway** or **Fly.io**.

The rest of this guide uses **Render (free)** as the primary path and notes the
Oracle VM path where it differs.

---

## 3. Environment variables

Set these on whichever host you choose (names from `.env.example`):

**Required**
- `GEMINI_API_KEY` — your (rotated!) Gemini key
- `NODE_ENV=production`
- `NEXT_PUBLIC_RAILWAY_URL` **or** `PRODUCTION_URL` — your public app URL.
  `server.js` refuses to start in production without one (used for CORS).
- `TRUST_PROXY=true` — required behind any managed proxy for correct rate-limit IPs

**If keeping Google sign-in** (optional — app works anonymously without it)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `NEXTAUTH_SECRET` (`openssl rand -base64 32`)
- `NEXTAUTH_URL=https://<your-domain>`
- Add `https://<your-domain>/api/auth/callback/google` to the OAuth client's
  authorized redirect URIs in Google Cloud Console.

**Optional**
- `GOOGLE_SEARCH_API_KEY` + `GOOGLE_SEARCH_ENGINE_ID` (web/stock/weather tools)
- `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` (error tracking)
- `RATE_LIMIT_PER_MINUTE` / `RATE_LIMIT_PER_HOUR` (defaults 60 / 500)
- `DATABASE_PATH` — absolute path to the SQLite file; **set this to your volume
  mount** when using persistent storage (e.g. `/data/chat.db`)

---

## 4. Deploy steps

### Path A — Render (free, ephemeral) ⭐ fastest

1. Push the repo to GitHub (done).
2. Render → **New → Web Service** → connect the repo.
3. Build command: `npm ci && npm run build` · Start command: `npm start`.
4. Add the environment variables from §3 (`NEXT_PUBLIC_RAILWAY_URL` = the
   `onrender.com` URL Render assigns).
5. Health check path: `/healthz`.
6. Deploy → open the URL → smoke-test (see §5). Data resets on each redeploy/idle
   spin-down — expected on the free tier.

### Path B — Oracle Cloud Always Free VM (free, persistent)

1. Create an **Always Free** ARM (Ampere) instance (Ubuntu).
2. Install Node 20 + build tools (`apt install build-essential python3`), clone repo.
3. `npm ci && npm run build`.
4. Create a `.env` from `.env.example`; set `DATABASE_PATH` to a path on the VM
   disk (data persists by default on a VM).
5. Run under a process manager: `pm2 start "npm start" --name geminigpt` (or the
   provided `Dockerfile`).
6. Put **Caddy** or **nginx** in front for HTTPS (Caddy auto-TLS is simplest), or
   use a **Cloudflare Tunnel** to expose it without opening ports.
7. Point a domain (or use the Cloudflare Tunnel hostname) and set `NEXTAUTH_URL`
   / `NEXT_PUBLIC_RAILWAY_URL` accordingly.

### Path C — Railway (paid, easiest persistent)

`railway.json` is already configured. New project from repo → add a **volume**
mounted at `/data` → set `DATABASE_PATH=/data/chat.db` → add env vars → deploy.

---

## 5. Pre-launch checklist

- [ ] **Rotate the leaked Gemini + Google Search keys** (they were in git history).
- [ ] Env vars set (esp. `NEXT_PUBLIC_RAILWAY_URL`/`PRODUCTION_URL`, `TRUST_PROXY=true`).
- [ ] **Cost guard:** confirm Gemini key quota/billing limits so a shared demo
      link can't run up a bill. (`ECHO_MODE` exists for a no-API demo mode.)
- [ ] Health check returns 200 at `/healthz`.
- [ ] Smoke test: send a message and get a streamed reply; create a share link;
      send 60+ requests/min and confirm a 429.
- [ ] (If persistent) volume mounted and `DATABASE_PATH` pointing at it.
- [ ] (If auth) OAuth redirect URI + `NEXTAUTH_URL` + `NEXTAUTH_SECRET` set.

---

## 6. Time roadmap

Estimates assume focused work and that the [stabilization pass](./PROJECT_STATUS.md)
(build/lint/test/run all green) is already done — which it is.

| Phase | Work | Est. |
|-------|------|------|
| **0 — Prep** | Rotate API keys; decide ephemeral vs persistent; (small) anchor the LanceDB path to `DATABASE_PATH`'s dir; retire/replace stale `deploy-to-production.sh` | **1–2 h** |
| **1 — First deploy** | Render free path → live URL + env vars + healthcheck | **~1 h** |
| _1-alt — persistent_ | Oracle VM instead: provision, Node, pm2, Caddy/Cloudflare TLS | **3–4 h** |
| **2 — Demo polish** | Verify anonymous chat works end-to-end; add a cost/rate guard; rewrite `README` (what it is, live demo link, screenshot/GIF, stack, run-locally) | **2–3 h** |
| **3 — Optional polish** | Wire Sentry; one WebSocket integration test; clear the 12 advisory lint warnings | **3–5 h** |

**Bottom line:**
- **Working free live demo (ephemeral):** ~**half a day** (Phases 0→1→2 via Render).
- **Free + persistent (Oracle):** ~**1–1.5 days** (Phases 0→1-alt→2).
- **Fully polished portfolio piece:** add Phase 3 → ~**2 days** total.

For a portfolio project, Phases 0–2 are the target — a working live demo with a
clean README beats additional features.
