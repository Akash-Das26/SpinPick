# SpinPick Decision Studio 🎡

> AI-assisted decision making with multi-criteria scoring, tournaments, and a secure OpenRouter proxy.

[![CI — Lint, Unit Tests, Build & E2E](https://github.com/Akash-Das26/SpinPick/actions/workflows/ci.yml/badge.svg)](https://github.com/Akash-Das26/SpinPick/actions/workflows/ci.yml)

SpinPick is a privacy-first decision studio built with Vite and React. Generate options, tune criteria, run tournaments, and export results — all from a fast, local-first web app.

## Features

- AI option generation with optional OpenRouter proxy support
- Weighted spin wheel with animated physics and confetti
- Multi-criteria score tuning and decision comparison
- Bracket-style 1v1 tournament play with visual bracket tree
- Custom slice builder with labels, colors, and weights
- Local decision history and restore support
- Export results as CSV, JSON, or screenshot-ready output
- PWA-ready static frontend with offline support
- Optional server-side OpenRouter proxy for private API key handling
- Full keyboard navigation and screen reader support
- i18n support (English, Spanish, French, German, Japanese)
- Full dark/light theme with WCAG AA contrast compliance

## Tech stack

- React 19
- Vite 8
- TypeScript (core modules)
- Tailwind CSS 4
- Vitest unit testing
- Playwright E2E testing
- Sentry error monitoring
- Node.js proxy server

## Getting started

```bash
git clone https://github.com/Akash-Das26/SpinPick.git
cd SpinPick
npm install
```

Start the frontend:

```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

### Optional OpenRouter proxy

To keep your OpenRouter API key off the client, run the bundled proxy server:

```bash
OPENROUTER_API_KEY=sk-or-v1-... npm run proxy
```

Then set `VITE_OPENROUTER_PROXY_URL` for the frontend in `.env.local`:

```bash
echo "VITE_OPENROUTER_PROXY_URL=http://localhost:8787" >> .env.local
```

Restart the dev server afterward.

## Scripts

- `npm run dev` — start Vite development server
- `npm run build` — production build
- `npm run preview` — preview built app
- `npm run lint` — run oxlint
- `npm run secret:scan` — run gitleaks secret scan
- `npm run proxy` — start the OpenRouter backend proxy
- `npm run test:unit` — run Vitest unit tests (145 tests)
- `npm run test:e2e` — run Playwright E2E tests
- `npm run test:e2e:ui` — run Playwright tests in headed mode

## Deployment

The app is a static frontend and can be deployed anywhere that serves built assets. For OpenRouter usage in production, run `server/proxy.mjs` on a Node host and set:

- `OPENROUTER_API_KEY` (proxy only)
- `ALLOWED_ORIGINS` (recommended for production)
- `PROXY_AUTH_TOKEN` (optional for non-browser clients)
- `VITE_OPENROUTER_PROXY_URL` (frontend build env)

### CI/CD

The project includes a production-ready GitHub Actions workflow (`.github/workflows/ci.yml`) that runs:
- Linting (oxlint)
- Type checking (tsc --noEmit)
- Unit tests (145 tests)
- Production build
- E2E tests with Playwright

### Security features

- ✅ Rate limiting on proxy (60 req/min/IP)
- ✅ CSP headers with nonce-based CSP
- ✅ Rate limiting on proxy (60 req/min/IP)
- ✅ CSP headers with nonce-based CSP
- ✅ Proxy enforces origin allow-list
- ✅ API key never leaves server
- ✅ Rate limiting on proxy (60 req/min/IP)
- ✅ CSP headers with nonce-based CSP
- ✅ Proxy enforces origin allow-list
- ✅ API key never leaves server
- ✅ CSP headers with nonce-based CSP
- ✅ Server-side OpenRouter proxy with origin allow-list
- ✅ Secure Shuffle + secureRandomInt using `crypto.getRandomValues()`
- ✅ Color schemes only vibrant colors (WCAG AA vs `#141422`)
- ✅ Secure Random Int used for winner selection
- ✅ prefers-reduced-motion respected
- ✅ Wheel SVG screen reader support with live region announcements
- ✅ Visual bracket tree for Tournament
- ✅ Permalink sharing for verdicts
- ✅ HowItWorks lazy-loaded with Suspense

## Security note

- `react-router` / `react-router-dom` are pinned to `7.18.2` for compatibility with the current app code.
- `npm audit` still reports a high-severity advisory for React Router that is fixed only in `react-router@8.3.0`.
- There is currently no published `react-router-dom@8.x` package available, so this remains a dependency risk until the router ecosystem upgrades.

---

## Quick Start

```bash
git clone https://github.com/Akash-Das26/SpinPick.git
cd SpinPick
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

*SpinPick is production-ready. Deploy the proxy, set your env vars, and ship.* 🚀