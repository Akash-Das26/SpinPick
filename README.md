# SpinPick Decision Studio 🎡

> Type any decision. Spin. Multi-criteria AI & 1v1 Tournaments — 100% free.

<!-- ⚠️ Replace YOUR_USERNAME with your GitHub username/organization after pushing to GitHub -->
[![CI — Lint, Unit Tests, Build & E2E](https://github.com/YOUR_USERNAME/SpinPick/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/SpinPick/actions/workflows/ci.yml)

SpinPick combines real-time AI option synthesis, multi-criteria weight tuning, bracket elimination tournaments, and a customizable decision wheel — all in a single zero-watermark, privacy-first web app.

## Features

- **AI-Powered Option Generation** — Type any prompt and get intelligently curated choices using the built-in decision engine or the optional OpenRouter AI API (called directly with your own key, or securely via the bundled backend proxy).
- **Interactive Spin Wheel** — Crypto-fair weighted random selection with physics-based spin animation, confetti, and sound effects.
- **Multi-Criteria Tuner** — Adjust weights, scores, and criteria rankings before spinning.
- **1v1 Tournament Mode** — Bracket-style elimination tournament where champions are crowned match by match.
- **Custom Builder** — Design your own slices with custom labels, colors, and weight ratios.
- **Discover Gallery** — Browse and load curated decision templates.
- **Export Hub** — Export results as PNG, CSV, or JSON.
- **Decision History** — Every spin is saved locally; browse, search, and restore past decisions.
- **PWA Ready** — Installable as a standalone app with offline service worker.
- **Privacy-First** — Everything runs locally. Your API key (optional) is held in memory for the session only and never persisted or shipped in the bundle. For maximum security, run the bundled OpenRouter proxy so the key lives only on your server.

## Tech Stack

| Layer | Tech |
|-------|------|
| Framework | [React 19](https://react.dev) |
| Build | [Vite 8](https://vitejs.dev) + [Oxlint](https://oxc.rs) |
| Routing | [React Router 6](https://reactrouter.com) |
| Testing | [Vitest](https://vitest.dev) (unit, 126 tests) · [Playwright](https://playwright.dev) (E2E, 48 tests) |
| CI | GitHub Actions (lint → 126 unit tests → build → 48 E2E tests) |
| Monitoring | [Sentry](https://sentry.io) (error tracking + source maps) |
| PWA | [vite-plugin-pwa](https://vite-pwa-org.netlify.app) |

## Getting Started

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/SpinPick.git
cd SpinPick

# Install dependencies
npm install

# Install Playwright browsers (for E2E tests)
npx playwright install chromium

# Start dev server
npm run dev
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run oxlint |
| `npm run test:e2e` | Run E2E test suite (48 tests) |
| `npm run test:e2e:ui` | Run E2E tests headed (visible browser) |
| `npm run proxy` | Start the OpenRouter backend proxy (`server/proxy.mjs`) on port 8787 |

## OpenRouter AI Proxy (Recommended for Production)

The frontend can call OpenRouter in two ways:

1. **Bring-Your-Own-Key (default)** — Users paste a key in *Settings*; it is held in browser memory for the session only and sent directly to OpenRouter.
2. **Backend proxy (recommended)** — `server/proxy.mjs` holds the API key **server-side**, so the key is never bundled into the JS or exposed to visitors. The browser only talks to your proxy.

### Why use the proxy?

- Your OpenRouter key never ships in the production JS bundle.
- No key is ever sent to (or stored on) your visitors' machines.
- You control rate limits, logging, and attribution headers in one place.

### Local development

```bash
# 1. Start the proxy with your key in the shell environment
OPENROUTER_API_KEY=sk-or-v1-... npm run proxy
#   → OpenRouter proxy listening on http://localhost:8787
#   (Windows PowerShell: $env:OPENROUTER_API_KEY="sk-or-v1-..."; npm run proxy)

# 2. Point the frontend at it (create .env.local — already git-ignored)
echo "VITE_OPENROUTER_PROXY_URL=http://localhost:8787" >> .env.local

# 3. Restart the dev server; all AI calls now go through the proxy
npm run dev
```

> Without a proxy URL set, the app uses the built-in keyword engine only.
> Direct browser OpenRouter calls are disabled for security. If a proxy *is*
> configured but becomes unreachable, the app logs a warning and gracefully
> falls back to the built-in keyword engine (no crash).

### Production deployment

The proxy is a single zero-dependency Node file (Node 18+, built-ins only).
Deploy it anywhere that runs Node:

- **Render / Fly.io / Railway / Heroku** — run `node server/proxy.mjs`, set `PORT`
  and `OPENROUTER_API_KEY` in the service's environment.
- **Docker (one command)** — a `Dockerfile` and `docker-compose.yml` are included:

  ```bash
  # From the repo root (the key can also go in a local .env file)
  OPENROUTER_API_KEY=sk-or-v1-... docker compose up -d --build
  ```

  The image is intentionally tiny — it runs only `server/proxy.mjs` (no npm
  dependencies), as a non-root user, with a built-in healthcheck. Set
  `ALLOWED_ORIGINS` (comma-separated) to lock the proxy to your frontend
  origin(s). Without Docker, the equivalent is:

  ```bash
  docker build -t spinpick-proxy .
  docker run --rm -p 8787:8787 -e OPENROUTER_API_KEY=sk-or-v1-... \
    -e ALLOWED_ORIGINS=https://spinpick.app spinpick-proxy
  ```

  > `OPENROUTER_API_KEY` is effectively required — without it the container
  > starts, `GET /health` still reports `200` (the server is alive), but every
  > `POST /api/openrouter` request returns `500` and the `/health` body shows
  > `keyConfigured: false` so orchestration can decide how to react.
  > (Foreground mode above is for a quick test; add `-d` to detach.)

- **Edge/serverless** — the request-handling logic (read body, CORS, forward to
  OpenRouter) is portable: re-wrap it as a `POST /api/openrouter` handler for a
  Cloudflare Worker or Vercel/Netlify function.

Because the proxy sends permissive CORS headers, a separate-domain (proxy on
its own origin) deployment works with **zero frontend CORS config**: when the
allow-list is configured the header reflects your frontend origin instead.

> ⚠️ **`ALLOWED_ORIGINS` is effectively required for production.** In production
> the proxy defaults to a **strict empty allow-list**: without it the browser
> frontend itself is rejected (`403`) and the CORS header is `null` (not `*`).
> With it set, browsers from other websites are blocked. Note it only filters
> browser `Origin` headers — non-browser clients (no `Origin`) are throttled by
> the rate limiter (60 req/min/IP); set `PROXY_AUTH_TOKEN` to reject them
> outright. Keep the proxy URL unguessable either way.

The allow-list defends against *browser-based* abuse. To also stop non-browser
clients (e.g. `curl`, scripts, server-to-server) — which don't send an `Origin`
header — set `PROXY_AUTH_TOKEN`; such clients must then present
`Authorization: Bearer <PROXY_AUTH_TOKEN>` or they receive `401` (on top of the
per-IP rate limiter). `GET /health` and `OPTIONS` are exempt so Docker
healthchecks and preflights keep working, and browser clients (gated by
`ALLOWED_ORIGINS`) never need the token.

> ✅ **Regression-tested in CI.** The proxy's security behavior above — origin
> allow-list (`403` for disallowed origins), `PROXY_AUTH_TOKEN` gate (`401` +
> `WWW-Authenticate: Bearer`), rate limiting (`429`), and the `/health`/`OPTIONS`
> exemptions — runs under `npm run test:unit` in the `lint-and-test` CI job:
> mocked-handler tests (`tests/unit/proxy.test.mjs`, `aiService.proxy.test.mjs`)
> **plus** HTTP-level integration tests (`tests/unit/proxy.http.test.mjs`) that
> boot the real server on an ephemeral port and drive the same gates with real
> `fetch`. A separate CI job (`proxy-smoke`) additionally exercises the live
> matrix end-to-end with curl (`scripts/proxy-smoke.sh`).

Then set these at **build time** on the static frontend host:

| Env var | Value | Where |
|---------|-------|-------|
| `VITE_OPENROUTER_PROXY_URL` | `https://your-proxy.example.com` | Frontend build (public) |
| `OPENROUTER_API_KEY` | `sk-or-v1-...` | Proxy server only (private, never commit) |
| `PORT` | `8787` (default) | Proxy server |
| `OPENROUTER_SITE_URL` | `https://spinpick.app` (optional) | Proxy server, used for OpenRouter attribution |
| `OPENROUTER_APP_NAME` | `SpinPick Decision Studio` (optional) | Proxy server, used for OpenRouter attribution |
| `ALLOWED_ORIGINS` | `https://spinpick.app,http://localhost:5173` (recommended) | Proxy server — comma-separated origin allow-list; other origins get 403 |
| `PROXY_AUTH_TOKEN` | long random string (recommended) | Proxy server — shared secret for **non-browser** clients; when set, requests without an `Origin` header must send `Authorization: Bearer <token>` or get 401 |
| `UPSTREAM_TIMEOUT_MS` | `60000` (default) | Proxy server — upstream request timeout |

### Endpoints

- `POST {VITE_OPENROUTER_PROXY_URL}/api/openrouter` — accepts `{ "model": string, "messages": [{ role, content }] }` and returns the OpenRouter chat-completion response verbatim.
- `GET {VITE_OPENROUTER_PROXY_URL}/health` (alias `/healthz`) — returns `200` with `{ status, service, keyConfigured, uptime }`. Used by the Docker HEALTHCHECK and uptime monitors.

See `server/proxy.mjs` for the full implementation.

> Set `VITE_OPENROUTER_PROXY_URL` to the proxy's **base origin only**
> (e.g. `https://proxy.example.com`). The `/api/openrouter` path is appended
> automatically — do not include it in the env var.

## CI Status

✅ **The repo ships with a hardened `.github/workflows/ci.yml` — use it, don't
overwrite it.** It runs lint, unit tests, production build, SEO validation, E2E tests, and a
gitleaks secret scan on every push/PR, with security defaults that hand-rolled
templates often miss:

- `permissions: contents: read` (least-privilege token)
- `concurrency` + `cancel-in-progress` (no wasted runs)
- `timeout-minutes` on every job
- E2E with `BASE_URL` env + Playwright
- **Secret scanning** — pinned `gitleaks` binary (v8.18.2) scans full history in
  the `secret-scan` job; a local pre-commit hook (`.pre-commit-config.yaml`)
  scans staged changes with the same `.gitleaks.toml` allowlist. Install the
  hook with `pip install pre-commit && pre-commit install` (or run
  `npm run secret:scan` anytime to scan the whole repo)
- **CodeQL code scanning** — separate `.github/workflows/security.yml`
  (`init@v3`, `security-and-quality` queries) runs on every push/PR and weekly;
  results appear in the Security tab

To extend CI, edit the existing file instead of creating a new one.

The project runs a three-stage CI pipeline on every push to `main`:

1. **Lint, Unit Tests & Build** — `oxlint` → `vitest run` (126 tests) → `vite build`
2. **Secret Scan** — `gitleaks detect` on full history; fails on any realistic secret
3. **E2E Tests** — 48 Playwright tests across 12 categories (smoke, navbar, generate, spin, modals, tabs, tournament, compare, routing, builder, discover, error handling)

Replace `YOUR_USERNAME` in the badge URL above with your GitHub username or organization after pushing.

## Sentry SDK Setup

### Install

Add the Sentry SDK as a dependency using `npm`, `yarn`, or `pnpm`:

```bash
npm install --save @sentry/react
```

### Configure SDK

Initialize Sentry as early as possible in your application's lifecycle.

```javascript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "https://30d75fa97579c2e5d8b0027ddea618af@o4511827580157952.ingest.de.sentry.io/4511827623280720",
  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/react/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: []
  }
});

const container = document.getElementById("app");
const root = createRoot(container);
root.render(<App />);
```

### Verify

This snippet contains an intentional error and can be used as a test to make sure that everything's working as expected.

```javascript
import * as Sentry from '@sentry/react';

function ErrorButton() {
  return (
    <button
      onClick={() => {
        throw new Error('This is your first error!');
      }}
    >
      Break the world
    </button>
  );
}
```

## Sentry (Source Maps in CI)

The production build uploads source maps to Sentry **only** when all three build
secrets are present **together** (a partial set fails the build so source maps
are never silently skipped):

| Secret | Where |
|--------|-------|
| `SENTRY_ORG` | CI secrets (e.g. GitHub Actions → Settings → Secrets) |
| `SENTRY_PROJECT` | CI secrets |
| `SENTRY_AUTH_TOKEN` | CI secrets (create at Sentry → Settings → Developer Settings → Auth Tokens) |

```yaml
# .github/workflows/ci.yml — add under env:
SENTRY_ORG: ${{ secrets.SENTRY_ORG }}
SENTRY_PROJECT: ${{ secrets.SENTRY_PROJECT }}
SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
```

Without these, the build still succeeds and ships fine — just without source
map uploads (production stack traces will be minified). `VITE_SENTRY_DSN` (the
public DSN that initializes runtime error tracking) is separate and documented
in `.env.example`.

## License

MIT
