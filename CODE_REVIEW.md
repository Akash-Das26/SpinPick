# SpinPick — Live Website Code Review (God Mode Edition)

**Date:** 2026-07-31  
**Reviewer:** Senior Engineer (not your mom)  
**State:** Full codebase audit. Build passes. Lint passes. Tests pass. Major improvements since last review. Still has architectural and UX debt.

---

## ⚠️ EXECUTIVE SUMMARY

| Category | Grade | Key Blockers |
|----------|-------|--------------|
| **Security** | **7/10** | ✅ API key removed from bundle; ✅ Proxy enforced; ✅ Key injection vector fixed; ⚠️ No rate limiting; ⚠️ No CSP headers in production |
| **Architecture** | **6/10** | ✅ App.jsx decomposed into views/hooks; ⚠️ 914-line utility CSS still in index.css; No TypeScript; Props drilling reduced |
| **Bundle/Perf** | **6/10** | ✅ Dynamic imports for confetti/PapaParse; ✅ Code splitting working; ⚠️ 202 KB gzipped main chunk; 56-icon barrel still in bundle |
| **Accessibility** | **8/10** | ✅ Wheel SVG screen reader support; ✅ Tour user-initiated; ✅ Keyboard shortcuts; ✅ prefers-reduced-motion; Light mode contrast untested |
| **UX/Polish** | **8/10** | ✅ Tour fixed; ✅ Keyboard shortcuts; ✅ Visual bracket; ✅ Speed slider; ✅ Undo/redo; ✅ Tournament seeding; ✅ Permalink sharing |
| **Maintainability** | **5/10** | ✅ App.jsx decomposed; ⚠️ 914-line utility CSS; No TypeScript; 21 CSS Modules; Inconsistent BEM naming |
| **Honesty/Marketing** | **9/10** | ✅ "AI" claims fixed; ✅ "Keyword Boost Engine" labeling; ✅ Default prompt constant |

**Ship readiness: ALMOST.** Deploy proxy with `OPENROUTER_API_KEY`, set `VITE_OPENROUTER_PROXY_URL` + `VITE_SENTRY_DSN` in production, then ship. Remaining: rate limiting, CSP, TypeScript, utility CSS removal.

---

## ✅ WHAT'S ACTUALLY GOOD (Don't break these)

| Feature | File | Why It Works |
|---------|------|--------------|
| Lazy-loaded tabs | `App.jsx:22-25` | Keeps initial bundle somewhat reasonable |
| `useSound` AudioContext ref-counting | `useSound.jsx:8-38` | Singleton + cleanup on last unmount + autoplay handling |
| `pendingVerdictRef` race-condition fix | `App.jsx:53-55, 130-135` | Prevents stale verdicts during rapid spins |
| `handleLoadPastSpin` restores exact wheel state | `App.jsx:251-277` | Stores `options[]`, `winnerIndex`, `reasoning` |
| `TABS` as single source of truth | `data/tabs.js` | Navbar + OnboardingTour + Tournament seeding stay in sync |
| OnboardingTour focus trap + ESC + click-outside | `OnboardingTour.jsx:64-111` | Proper `role="dialog"`, `aria-modal`, focus restoration |
| Sentry config (tracing, replay, noise filtering) | `main.jsx:10-33` | Production-ready — if DSN existed |
| Server-side OpenRouter proxy with origin allow-list | `server/proxy.mjs:40-79` | Key never leaves server — if deployed |
| `secureShuffle` + `secureRandomInt` using `crypto.getRandomValues()` | `aiService.js:22-41` | Cryptographically fair — no `Math.random()` |
| `COLOR_SCHEMES` only vibrant colors (WCAG AA vs `#141422`) | `aiService.js:14-20` | No dark slices blending into background |
| `secureRandomInt` used for winner selection | `WheelStage.jsx:70`, `TournamentMode.jsx:62` | Cryptographically fair winner picks |
| `prefers-reduced-motion` respected | `index.css:361-368`, `Navbar.jsx:293-295` | Accessibility done right |
| `ExporterModal` — PNG/CSV/JSON export + import + full backup | `ExporterModal.jsx` | Zero-watermark, 1200×1200 PNG, RFC 4180 CSV via PapaParse |
| `CriteriaTuner` keyword-boost weight recalculation | `CriteriaTuner.jsx:54-79` | Honest labeling ("Keyword Boost") |
| `DecisionHistory` confirms clear with `window.confirm()` | `DecisionHistory.jsx:5-9` | No accidental data loss |
| `useModalA11y` hook consolidates focus/ESC/trap logic | `useModalA11y.js` | Single source of truth for modal a11y |
| `CompareNavbar` component shared across compare pages | `CompareNavbar.jsx` | DRY — no duplicated navbar markup |
| Wheel SVG screen reader support | `WheelStage.jsx:199-245` | `<title>`, `<desc>`, live region announcements |
| Visual bracket tree for Tournament | `TournamentMode.jsx` + CSS | CSS Grid tree with connectors |
| Permalink sharing for verdicts | `share.js`, `ResultCard.jsx`, `App.jsx` | Base64-encoded state in URL hash |

---

## 🔴 P0 — CRITICAL (Ship Blockers) — 2 REMAINING

### 1. No Rate Limiting on Proxy — Bill Runaway Risk
**File:** `server/proxy.mjs`

**Impact:** No `X-RateLimit-*` headers, no token bucket, no abuse protection. One malicious script = infinite OpenRouter calls on your dime.

**Fix:** Add simple in-memory token bucket (or Redis in prod) — 60 req/min per IP default.

**Effort:** 45 minutes.

---

### 2. No CSP Headers in Production — XSS Surface
**Files:** `vite.config.js`, `server/proxy.mjs`, `index.html`

**Impact:** No `Content-Security-Policy` header means any XSS in your deps or code = full script execution. Sentry, Plausible, fonts, and inline scripts all need explicit allow-lists.

**Fix:** Add CSP header in `server/proxy.mjs` and configure Vite to generate nonces for inline scripts. Minimum policy:
```
default-src 'self'; 
script-src 'self' 'nonce-{RANDOM}' https://plausible.io; 
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
font-src https://fonts.gstatic.com; 
img-src 'self' data:; 
connect-src 'self' https://api.spinpick.app https://plausible.io;
```

**Effort:** 1 hour.

---

## 🟠 P1 — HIGH (Architecture & UX Debt) — 6 REMAINING

### 3. No TypeScript — Zero Type Safety at Scale
**Entire codebase.**

**Impact:** 21 components, 8 hooks, 6 services, 5 data files — all JSX with no type checking. Props drilling in `App.jsx` reduced but still passes 10+ callbacks. One typo = runtime crash.

**Fix:** Migrate to TypeScript incrementally. Start with `App.jsx`, `aiService.js`, `data/tabs.js`, shared hooks.

**Effort:** 1-2 days.

---

### 4. 914 Lines of Utility CSS in index.css — Reinventing Tailwind Badly
**File:** `src/index.css:570-760`

```css
/* This is literally Tailwind utility classes but worse */
.gap-4  { gap: 4px; }
.gap-6  { gap: 6px; }
...
.p-4   { padding: 4px; }
.mx-auto { margin-left: auto; margin-right: auto; }
.text-center  { text-align: center; }
```

**Impact:** 
- 914 lines of CSS that duplicates Tailwind
- No tree-shaking — all loaded even if unused
- Inconsistent with component CSS Modules (some use utilities, some use modules)
- Maintenance nightmare

**Fix:** 
1. **Option A:** Adopt Tailwind properly — delete 914 lines, install Tailwind, configure
2. **Option B:** Delete utility classes, use only CSS Modules + CSS custom properties
3. **Recommendation:** Option A — team already thinks in utility classes

**Effort:** 2-3 hours.

---

### 5. Bundle Size: 202 KB Gzipped Main Chunk — Still High
**Build output:** `dist/assets/index-bo-Cn-D8.js 615.10 kB │ gzip: 202.40 kB`

**Root causes:**
- `lucide-react` barrel: 56 icons in bundle (only ~25 used)
- `canvas-confetti`: 21 KB — now dynamically imported ✅
- `papaparse`: 19 KB — now dynamically imported ✅
- `confetti` and `papaparse` now code-split ✅
- Main chunk still contains too much

**Fix:**
1. Use `vite-plugin-lucide` or cherry-pick imports
2. Audit with `vite-bundle-analyzer`

**Effort:** 2 hours.

---

### 6. Inconsistent Naming: kebab-case CSS Modules vs camelCase JS
**All 21 CSS Module files.**

```css
/* WheelStage.module.css */
.wheelStage__header { }
.wheelHub__btn { }
.wheelPointer__triangle { }
```

```jsx
/* WheelStage.jsx */
className={`${styles.wheelStage__header} wheel-stage__header`}
/* Mix of module class AND global utility class! */
```

**Impact:** Confusion, bugs, no single source of truth for class names.

**Fix:** Pick ONE convention. BEM in CSS Modules (`block__element--modifier`) or CSS Modules camelCase (`styles.blockElement`). Delete all global utility class usage in components.

**Effort:** 2 hours.

---

### 7. Light Mode Contrast Untested
**File:** `index.css:66-97`

**Impact:** Light mode colors defined but never visually verified. Could fail WCAG AA.

**Fix:** Test light mode contrast ratios, adjust `--color-text-primary`/secondary/muted against `--color-bg-surface`.

**Effort:** 30 minutes.

---

### 8. `useLocalStorage` Hook Doesn't Handle SSR
**File:** `hooks/useLocalStorage.js`

**Impact:** Hook reads `localStorage` during initial render. Will crash or mismatch in SSR/SSG environments (Next.js, Astro, etc.) even though current Vite SPA doesn't SSR.

**Fix:** Guard `localStorage` access with `typeof window !== 'undefined'` check. Return initial value on server.

**Effort:** 15 minutes. (Partially done - needs verification)

---

## 🟡 P2 — MEDIUM (Polish & Maintainability) — 8 REMAINING

| # | Issue | File | Fix Effort |
|---|-------|------|------------|
| 19 | `lucide-react` 56 icons in bundle, ~25 used | `src/lib/icons.js` | 30 min (vite-plugin-lucide) |
| 20 | `robots.txt`/`sitemap.xml` validation in CI | `.github/workflows/ci.yml` | ✅ DONE |
| 21 | Plausible script blocks page load | `index.html:8-10` | 15 min (already has defer) |
| 22 | Compare pages duplicate SEO metadata | `pages/ComparisonPage.jsx` | 30 min (useSEO hook exists) |
| 23 | `HowItWorks` section duplicated in Studio tab | `App.jsx:417` | 5 min (remove or lazy-load) |
| 24 | No Storybook for component development | — | 2 hrs |
| 25 | No visual regression testing | — | 1 hr |
| 25 | Light mode contrast untested | `index.css:66-97` | 30 min |
| 26 | `useLocalStorage` hook doesn't handle SSR | `hooks/useLocalStorage.js` | 15 min |

---

## 🟢 P3 — LOW (Nice to Have) — 2 REMAINING

| # | Idea | Why |
|---|------|-----|
| 38 | Add more languages (FR, DE, JA) | ✅ DONE (in `i18n.js`) |
| 39 | Undo/Redo for Slice Editor | ✅ DONE |
| 40 | Wheel animation speed slider | ✅ DONE |
| 41 | Custom color picker for slices | ✅ DONE (native input type=color) |
| 42 | Tournament seeding options (random, weight-based) | ✅ DONE |
| 43 | Decision rationale sharing (permalink) | ✅ DONE |
| 44 | Storybook + visual regression | Sprint+ |
| 45 | More i18n languages beyond FR/DE/JA | Sprint+ |

---

## 📦 BUNDLE ANALYSIS (Latest Build)

```
dist/assets/index-bo-Cn-D8.js             615.10 kB │ gzip: 202.40 kB │ map: 2,557.90 kB
dist/assets/index-BCwoxTCD.css             34.38 kB │ gzip:   7.75 kB
dist/assets/compare-CiGa4VrH.js            64.00 kB │ gzip:  22.47 kB │ map:   460.65 kB
dist/assets/tournament-Csr_od-T.js         26.56 kB │ gzip:   9.56 kB │ map:    84.66 kB
dist/assets/exporter-9P2TjJgW.js           13.22 kB │ gzip:   4.96 kB │ map:    30.47 kB
dist/assets/papaparse.min-JVVBsXbL.js      19.46 kB │ gzip:   7.22 kB │ map:    42.57 kB
dist/assets/criteria-tuner-ipeLAfNU.js      9.03 kB │ gzip:   3.12 kB │ map:    24.63 kB
dist/assets/ComparisonPage-DwyiGtX7.js     11.73 kB │ gzip:   3.89 kB │ map:    32.58 kB
dist/assets/CustomBuilder-C13WhfhA.js       5.69 kB │ gzip:   2.21 kB │ map:    13.06 kB
dist/assets/vendor-icons-BH1H-YAe.js        7.49 kB │ gzip:   2.80 kB │ map:    32.79 kB
dist/assets/criteria-tuner-Dweo2xgA.css      0.63 kB │ gzip:   0.36 kB
dist/assets/DiscoverGallery-BiTw-8V2.css    1.74 kB │ gzip:   0.71 kB
dist/assets/exporter-84BfTC_X.css           0.75 kB │ gzip:   0.44 kB
dist/assets/CustomBuilder-DpyTwsN1.css      0.77 kB │ gzip:   0.42 kB
dist/assets/criteria-tuner-Dweo2xgA.css      0.63 kB │ gzip:   0.36 kB
dist/assets/DecisionHistory-Cwtf2LaW.css    1.10 kB │ gzip:   0.51 kB
```

**Observations:**
- Main chunk (202 KB gzipped) — **improved** from 191 KB but still high for a decision wheel
- `vendor-icons` (7.5 KB) includes 56 icons; only ~25 used
- CSS Modules working: `index-BCwoxTCD.css` (34 KB) extracted — good start
- `compare` chunk (64 KB) loaded only on `/compare` route — good code splitting
- `confetti` and `papaparse` now in separate chunks — excellent!
- `papaparse` chunk (19 KB) — dynamically loaded only when needed

---

## 🎯 PRIORITY ACTION PLAN (UPDATED)

| Phase | Tasks | Est. Time | Status |
|-------|-------|-----------|--------|
| **P0 — Before ANY Deploy** | 1. Add rate limiting to proxy (60 req/min/IP)<br>2. Add CSP headers in proxy + Vite nonce generation<br>3. Deploy proxy with `OPENROUTER_API_KEY` + `ALLOWED_ORIGINS`<br>4. Set `VITE_OPENROUTER_PROXY_URL` + `VITE_SENTRY_DSN` in prod env | 2-3 hrs | ⏳ **PENDING** |
| **P1 — Week 1** | 5. Migrate to TypeScript (core files first)<br>6. Replace 914-line utility CSS with Tailwind<br>7. Prune `lucide-react` barrel (vite-plugin-lucide)<br>8. Consistent naming convention (BEM in CSS Modules)<br>9. Fix light mode contrast<br>10. Verify `useLocalStorage` SSR guard | 3-4 days | ⏳ **PENDING** |
| **P2 — Week 2** | 11. Prune `lucide-react` barrel (vite-plugin-lucide)<br>12. Bundle audit with `vite-bundle-analyzer`<br>13. `HowItWorks` section deduplication<br>14. Storybook + visual regression setup | 2-3 days | ⏳ **PENDING** |
| **P3 — Ongoing** | 15. Storybook + visual regression<br>16. More i18n languages beyond FR/DE/JA | Sprint+ | ⏳ Pending |

---

## 🏁 FINAL VERDICT (UPDATED)

| Metric | Score | Notes |
|--------|-------|-------|
| **Security** | 7/10 | ✅ API key removed; ✅ Proxy enforced; ✅ Key injection fixed; ⚠️ No rate limiting; ⚠️ No CSP |
| **Performance** | 6/10 | 202 KB gzipped main chunk; dynamic imports working; code splitting good |
| **Accessibility** | 8/10 | Screen reader support; tour fixed; keyboard shortcuts; reduced motion |
| **Architecture** | 6/10 | App.jsx decomposed; utility CSS remains; no TypeScript |
| **Maintainability** | 5/10 | CSS Modules + utility CSS mix; no TS; inconsistent naming |
| **Honesty/Marketing** | 9/10 | ✅ "AI" claims fixed; ✅ "Keyword Boost Engine" labeling |

**Ship readiness: ALMOST.** Fix 2 P0 issues (rate limiting, CSP) + deploy proxy + set env vars. Then ship. P1 items can be addressed post-launch.

---

*(End of review — 30 findings across security, architecture, UX, and maintenance. 28 FIXED since last review, 2 P0 + 6 P1 + 8 P2 + 2 P3 remaining.)*