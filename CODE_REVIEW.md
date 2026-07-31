# SpinPick — Live Website Code Review (God Mode Edition)

**Date:** 2026-07-31  
**Reviewer:** Senior Engineer (not your mom)  
**State:** Full codebase audit. Build passes. Lint passes. Tests pass. Still has architectural and UX debt.

---

## ⚠️ EXECUTIVE SUMMARY

| Category | Grade | Key Blockers |
|----------|-------|--------------|
| **Security** | **6/10** | ✅ API key removed from bundle; ✅ Proxy enforced; ⚠️ Proxy accepts API key from request body (key injection vector); ⚠️ No rate limiting; ⚠️ No CSP headers in production |
| **Architecture** | **4/10** | Inline utility CSS everywhere (914 lines in index.css); App.jsx 487 lines (God component); No TypeScript; No API layer; Props drilling |
| **Bundle/Perf** | **5/10** | 581 KB gzipped main chunk; 56-icon barrel still in bundle; No font preloading; No dynamic import for heavy libs (confetti, PapaParse) |
| **Accessibility** | **6/10** | Wheel SVG lacks screen reader support; Some ARIA labels missing; Color contrast untested in light mode; Focus management fragile |
| **UX/Polish** | **6/10** | Tour fires at 1.5s (too aggressive); Hardcoded default prompt in 3 places; No keyboard shortcuts; Wheel labels truncated w/o tooltip |
| **Maintainability** | **3/10** | 21 components × 21 CSS module files = maintenance burden; No shared patterns; Inconsistent naming; No Storybook |

**Ship readiness: NOT READY.** Fix P0 security issues, then address P1 architecture rot before any production deploy.

---

## ✅ WHAT'S ACTUALLY GOOD (Don't break these)

| Feature | File | Why It Works |
|---------|------|--------------|
| Lazy-loaded tabs | `App.jsx:22-25` | Keeps initial bundle somewhat reasonable |
| `useSound` AudioContext ref-counting | `useSound.jsx:8-38` | Singleton + cleanup on last unmount |
| `pendingVerdictRef` race-condition fix | `App.jsx:53-55, 130-135` | Prevents stale verdicts during rapid spins |
| `handleLoadPastSpin` restores exact wheel state | `App.jsx:251-277` | Stores `options[]`, `winnerIndex`, `reasoning` |
| `TABS` as single source of truth | `data/tabs.js` | Navbar + OnboardingTour stay in sync |
| OnboardingTour focus trap + ESC + click-outside | `OnboardingTour.jsx:64-111` | Proper `role="dialog"`, `aria-modal`, focus restoration |
| Sentry config (tracing, replay, noise filtering) | `main.jsx:10-33` | Production-ready — if DSN existed |
| Server-side OpenRouter proxy with origin allow-list | `server/proxy.mjs:40-79` | Key never leaves server — if deployed |
| `secureShuffle` + `secureRandomInt` using `crypto.getRandomValues()` | `aiService.js:22-41` | Cryptographically fair — no `Math.random()` |
| `COLOR_SCHEMES` only vibrant colors (WCAG AA vs `#141422`) | `aiService.js:14-20` | No dark slices blending into background |
| `secureRandomInt` used for winner selection | `WheelStage.jsx:70`, `TournamentMode.jsx:62` | Cryptographically fair winner picks |
| `prefers-reduced-motion` respected | `index.css:361-368`, `Navbar.jsx:293-295` | Accessibility done right |
| `ExporterModal` — PNG/CSV/JSON export + import | `ExporterModal.jsx` | Zero-watermark, 1200×1200 PNG, RFC 4180 CSV via PapaParse |
| `CriteriaTuner` keyword-boost weight recalculation | `CriteriaTuner.jsx:54-79` | Honest labeling ("Keyword Boost") |
| `DecisionHistory` confirms clear with `window.confirm()` | `DecisionHistory.jsx:5-9` | No accidental data loss |
| `useModalA11y` hook consolidates focus/ESC/trap logic | `useModalA11y.js` | Single source of truth for modal a11y |
| `CompareNavbar` component shared across compare pages | `CompareNavbar.jsx` | DRY — no duplicated navbar markup |

---

## 🔴 P0 — CRITICAL (Ship Blockers) — MUST FIX BEFORE DEPLOY

### 1. Proxy Accepts API Key from Request Body — Key Injection Vector
**Files:** `server/proxy.mjs:147, 153`, `src/services/aiService.js:153-155`

```javascript
// proxy.mjs:147-158
const { model, messages, apiKey } = payload;
const outgoingKey = apiKey?.trim() || OPENROUTER_API_KEY;  // DANGEROUS!
```

**Impact:** Any attacker who can make a POST to your proxy endpoint can inject their own OpenRouter API key and run up your bill or probe the system. The frontend sends `apiKey: ''` (empty string), but nothing prevents a malicious client from sending a real key.

**Fix (Required):**
1. **Remove `apiKey` from request payload handling entirely** — server should ONLY use `OPENROUTER_API_KEY` from env
2. If you need BYOK for some reason, implement a separate authenticated endpoint with user sessions
3. Add rate limiting per IP (see P1 #12)

**Effort:** 30 minutes.

---

### 2. No Rate Limiting on Proxy — Bill Runaway Risk
**File:** `server/proxy.mjs`

**Impact:** No `X-RateLimit-*` headers, no token bucket, no abuse protection. One malicious script = infinite OpenRouter calls on your dime.

**Fix:** Add simple in-memory token bucket (or Redis in prod) — 60 req/min per IP default.

**Effort:** 45 minutes.

---

### 3. No CSP Headers in Production — XSS Surface
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

### 4. AI Marketing Copy Is Still Dishonest
**Files:** `App.jsx:303-304`, `ComparisonSection.jsx`, `CompareHub.jsx`

```jsx
// App.jsx:303-304
<h1>Type any <span>decision</span>. Spin.<br />
  Multi-criteria AI & 1v1 Tournaments.</h1>
```

**Impact:** "Multi-criteria AI" implies the built-in generator uses AI. It doesn't — it's keyword matching. Users without a proxy configured get ZERO AI. This is false advertising.

**Fix:** Change to `"Keyword Boost Engine & 1v1 Tournaments"` or `"Smart Weight Tuning & 1v1 Tournaments"`. Add disclaimer: *"AI reasoning requires server-side proxy configuration."*

**Effort:** 10 minutes.

---

### 5. Hardcoded Default Prompt in 3 Places — DRY Violation
**Files:** `App.jsx:44`, `App.jsx:177`, `App.jsx:317`

```jsx
// Line 44
const [promptInput, setPromptInput] = useState('What should I cook for dinner tonight?');
// Line 177
handleGenerateOptionsRef.current('What should I cook for dinner tonight?');
// Line 317
placeholder="e.g. What should I cook for dinner tonight?"
```

**Impact:** Changing the default requires editing 3 locations. Bug-prone.

**Fix:** Single constant in `data/presets.js` or `data/constants.js`.

**Effort:** 5 minutes.

---

### 6. No TypeScript — Zero Type Safety at Scale
**Entire codebase.**

**Impact:** 21 components, 8 hooks, 6 services, 5 data files — all JSX with no type checking. Props drilling in `App.jsx` passes 15+ callbacks. One typo = runtime crash.

**Fix:** Migrate to TypeScript incrementally. Start with `App.jsx`, `aiService.js`, `data/tabs.js`, shared hooks.

**Effort:** 1-2 days.

---

## 🟠 P1 — HIGH (Architecture & UX Debt)

### 7. App.jsx Is a 487-Line God Component
**File:** `src/App.jsx`

**Problems:**
- 15+ state variables
- 12+ callbacks passed down as props
- 5 lazy-loaded tab components + 5 modals all managed here
- Business logic mixed with rendering logic
- Impossible to unit test in isolation

**Fix:** Extract into:
- `StudioView.jsx` — all studio tab logic
- `useWheelEngine` hook — spin logic, verdict generation, history
- `useAIConfig` hook — AI settings management
- Modal state into a `ModalProvider` context

**Effort:** 1-2 days.

---

### 8. 914 Lines of Utility CSS in index.css — Reinventing Tailwind Badly
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

### 9. Bundle Size: 581 KB Gzipped Main Chunk — Unacceptable
**Build output:** `dist/assets/index-BA0kpJZ6.js 581.80 kB │ gzip: 191.61 kB`

**Root causes:**
- `lucide-react` barrel: 56 icons in bundle (only ~25 used)
- `canvas-confetti`: 21 KB — loaded on every page
- `papaparse`: 28 KB — loaded on every page
- No dynamic imports for heavy libs
- All tab components code-split but still bundled in main via Suspense fallback

**Fix:**
1. Use `vite-plugin-lucide` or cherry-pick imports
2. Dynamic import `confetti` and `PapaParse` only when needed
3. Audit with `vite-bundle-analyzer`

**Effort:** 2 hours.

---

### 10. Wheel SVG Has Zero Screen Reader Support
**File:** `WheelStage.jsx:199-245`

```jsx
<svg viewBox="-100 -100 200 200" aria-label="Decision spin wheel" role="img">
  {slices.map((slice) => (
    <g key={slice.id}>
      <path ... />
      <text ...>{displayLabel}</text>
    </g>
  ))}
</svg>
```

**Impact:** Screen reader hears "Decision spin wheel" — no slice labels, no weights, no current state. Blind users cannot use the core feature.

**Fix:** 
1. Add `<title>` and `<desc>` with full option list
2. Add live region announcing current slice during spin
3. Provide text-only fallback view for screen readers

**Effort:** 1 hour.

---

### 11. Tour Fires at 1.5s — Too Aggressive, No User Intent
**File:** `App.jsx:79-86`

```jsx
useEffect(() => {
  if (options.length > 0 && !hasSeenTour && !showTour) {
    const timer = setTimeout(() => setShowTour(true), 1500);
    return () => clearTimeout(timer);
  }
}, [options, hasSeenTour, showTour]);
```

**Impact:** User hasn't even read the hero, wheel just appeared, and BOOM — modal overlay. Dismissal rate will be >80%.

**Fix:** 
1. Fire tour on explicit user action (click "Take Tour" button in hero)
2. Or wait for first spin completion
3. Add "Don't show again" checkbox

**Effort:** 15 minutes.

---

### 12. No Keyboard Shortcuts — Power User Hostile
**Entire app.**

**Impact:** No `Space` to spin, `←/→` for tour, `Esc` to close modals (works but undocumented), `?` for help.

**Fix:** Add `useKeyboardShortcuts` hook:
- `Space` / `Enter` → Spin (when wheel focused)
- `?` → Show shortcuts help
- `t` → Open Tournament
- `b` → Open Builder
- `h` → Open History
- `d` → Open Discover

**Effort:** 30 minutes.

---

### 13. Wheel Labels Truncated With No Tooltip
**File:** `WheelStage.jsx:221-223`

```jsx
const maxChars = Math.max(6, Math.floor(24 * (slice.sliceAngle / 45) * (8.5 / fontSize)));
const displayLabel = truncateLabel(slice.label, maxChars);
```

**Impact:** "Sheet-Pan Garlic Fajitas" → "Sheet-Pan…" — user can't read full option on narrow slices. No hover tooltip.

**Fix:** Add `title` attribute or custom tooltip on `<text>` element showing full label.

**Effort:** 10 minutes.

---

### 14. Tournament Bracket Log Is Text-Only — No Visual Bracket
**File:** `TournamentMode.jsx:265-293`

```jsx
<div className="flex-col gap-12">
  {matches.map((m, idx) => (
    <div key={m.id} className="bracketItem">
      <div>Match #{idx + 1}</div>
      <div>{m.player1.label} vs {m.player2.label}</div>
    </div>
  ))}
</div>
```

**Impact:** For 8 options = 7 matches, user sees a flat list. No visual bracket tree. Hard to follow tournament progress.

**Fix:** Render actual bracket visualization (CSS Grid tree) or use a bracket library.

**Effort:** 2-3 hours.

---

### 15. History Is localStorage-Only — No Cross-Device, No Export
**Files:** `App.jsx:59`, `DecisionHistory.jsx`

**Impact:** Clear browser data = lose all history. No way to export/import history JSON.

**Fix:** 
1. Add "Export History" button in ExporterModal
2. Add "Import History" with merge logic
3. Consider IndexedDB for larger storage

**Effort:** 1 hour.

---

### 16. Sound/AudioContext Management Is Fragile
**Files:** `hooks/useSound.jsx`, `hooks/useSound` (global singleton)

**Problems:**
- Global singleton never closes AudioContext on page unload
- `releaseAudioContext()` only called when all components unmount
- Safari/iOS requires user gesture to start AudioContext — not handled gracefully
- No fallback for browsers blocking autoplay

**Fix:** 
1. Add `beforeunload` handler to close AudioContext
2. Defer AudioContext creation until first user interaction
3. Add silent fallback for autoplay-blocked contexts

**Effort:** 45 minutes.

---

### 17. No Error Boundaries for Tab Components
**File:** `App.jsx:422-450`

```jsx
<Suspense fallback={<div>Loading...</div>}>
  {activeTab === 'tournament' && <TournamentMode />}
  ...
</Suspense>
```

**Impact:** If any lazy-loaded tab crashes, entire app white-screens. No recovery UI.

**Fix:** Wrap each tab in `<ErrorBoundary>` with "Reload tab" button.

**Effort:** 30 minutes.

---

### 18. Inconsistent Naming: kebab-case CSS Modules vs camelCase JS
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

## 🟡 P2 — MEDIUM (Polish & Maintainability)

| # | Issue | File | Fix Effort |
|---|-------|------|------------|
| 19 | `lucide-react` 56 icons in bundle, ~25 used | `src/lib/icons.js` | 30 min (vite-plugin-lucide) |
| 20 | `canvas-confetti` loaded globally | `TournamentMode.jsx:3`, `WheelStage.jsx:3` | 15 min (dynamic import) |
| 21 | `papaparse` loaded globally | `ExporterModal.jsx` | 15 min (dynamic import) |
| 22 | Font loading not optimized (no preload) | `index.html` | 10 min |
| 23 | No `robots.txt`/`sitemap.xml` validation in CI | `public/` | 10 min |
| 24 | Plausible script blocks page load | `index.html:8-10` | 15 min (defer + data-domain) |
| 25 | Compare pages duplicate SEO metadata | `pages/ComparisonPage.jsx` | 30 min (useSEO hook) |
| 26 | `HowItWorks` section duplicated in Studio tab | `App.jsx:417` | 5 min (remove or lazy-load) |
| 27 | No Storybook for component development | — | 2 hrs |
| 28 | No visual regression testing | — | 1 hr |
| 29 | Light mode contrast untested | `index.css:66-97` | 30 min |
| 30 | `useLocalStorage` hook doesn't handle SSR | `hooks/useLocalStorage.js` | 15 min |

---

## 🟢 P3 — LOW (Nice to Have)

| # | Idea | Why |
|---|------|-----|
| 31 | Add "Copy Prompt" button on ResultCard | ✅ DONE |
| 32 | Share verdict via Web Share API | ✅ DONE (in `share.js`) |
| 33 | Dark/light theme toggle | ✅ DONE (exists in `ThemeToggle.jsx`) |
| 34 | PWA offline support | ✅ DONE (Workbox generates SW) |
| 35 | Analytics (Plausible) | ✅ DONE (in `index.html`) |
| 36 | E2E tests for critical flows | ✅ DONE (Playwright tests exist) |
| 37 | i18n support (English + Spanish) | ✅ DONE (in `i18n.js`) |
| 38 | Add more languages (FR, DE, JA) | `i18n.js` | Sprint+ |
| 39 | Undo/Redo for Slice Editor | User expectation |
| 40 | Wheel animation speed slider | Accessibility |
| 41 | Custom color picker for slices | Power user feature |
| 42 | Tournament seeding options (random, weight-based) | Fairness |
| 43 | Decision rationale sharing (permalink) | Viral growth |

---

## 📦 BUNDLE ANALYSIS (Latest Build)

```
dist/assets/index-BA0kpJZ6.js             581.80 kB │ gzip: 191.61 kB │ map: 2,491.82 kB
dist/assets/index-BCwoxTCD.css             34.38 kB │ gzip:   7.75 kB
dist/assets/compare-CKnMB9Ul.js            63.98 kB │ gzip:  22.46 kB │ map:   460.63 kB
dist/assets/tournament-DjgbSJtR.js         21.48 kB │ gzip:   8.28 kB │ map:    69.87 kB
dist/assets/exporter-D1UHdGVf.js           28.95 kB │ gzip:  10.81 kB │ map:    68.73 kB
dist/assets/ComparisonPage-yr1RO-yS.js     11.73 kB │ gzip:   3.89 kB │ map:    32.58 kB
dist/assets/CustomBuilder-C9bP5Lmr.js       5.69 kB │ gzip:   2.21 kB │ map:    13.06 kB
dist/assets/criteria-tuner-6il-sJ-p.js      9.03 kB │ gzip:   3.12 kB │ map:    24.63 kB
dist/assets/vendor-icons--JlL250n.js        7.30 kB │ gzip:   2.73 kB │ map:    31.87 kB
dist/assets/DiscoverGallery--nxcAnep.js     2.26 kB │ gzip:   0.96 kB │ map:     6.25 kB
dist/assets/DecisionHistory-DdtpsltU.js     3.06 kB │ gzip:   1.24 kB │ map:     6.81 kB
```

**Observations:**
- Main chunk (191 KB gzipped) is **unacceptable** for a decision wheel
- `vendor-icons` (7.3 KB) includes 56 icons; only ~25 used
- CSS Modules working: `index-BCwoxTCD.css` (34 KB) extracted — good start
- `compare` chunk (64 KB) loaded only on `/compare` route — good code splitting
- `confetti` and `papaparse` bundled in main chunk despite only used in 2 components

---

## 🎯 PRIORITY ACTION PLAN

| Phase | Tasks | Est. Time | Status |
|-------|-------|-----------|--------|
| **P0 — Before ANY Deploy** | 1. Remove `apiKey` from proxy request handling<br>2. Add rate limiting to proxy (60 req/min/IP)<br>3. Add CSP headers in proxy + Vite nonce generation<br>4. Fix AI marketing copy ("Keyword Boost Engine")<br>5. Extract default prompt to single constant<br>6. Deploy proxy with `OPENROUTER_API_KEY` + `ALLOWED_ORIGINS`<br>7. Set `VITE_OPENROUTER_PROXY_URL` + `VITE_SENTRY_DSN` in prod env | 4-5 hrs | ⏳ **PENDING** |
| **P1 — Week 1** | 8. Decompose `App.jsx` into `StudioView` + hooks<br>9. Replace 914-line utility CSS with Tailwind<br>10. Dynamic import `confetti` + `papaparse`<br>11. Add screen reader support to wheel SVG<br>12. Fix tour trigger (user-initiated)<br>13. Add keyboard shortcuts<br>14. Add tooltip for truncated wheel labels<br>15. Add ErrorBoundaries for each lazy tab | 3-4 days | ⏳ **PENDING** |
| **P2 — Week 2** | 16. Visual bracket tree for TournamentMode<br>17. Export/Import history JSON<br>18. Fix AudioContext lifecycle<br>19. Prune `lucide-react` barrel<br>20. Migrate to TypeScript (core files first)<br>21. Consistent naming convention (BEM in CSS Modules) | 3-4 days | ⏳ **PENDING** |
| **P3 — Ongoing** | 22. Storybook + visual regression<br>23. More i18n languages<br>24. Permalink sharing for verdicts<br>25. Tournament seeding options | Sprint+ | ⏳ Pending |

---

## 🏁 FINAL VERDICT

| Metric | Score | Notes |
|--------|-------|-------|
| **Security** | 6/10 | Proxy key injection vector; no rate limiting; no CSP |
| **Performance** | 5/10 | 191 KB gzipped main chunk; no dynamic imports for heavy libs |
| **Accessibility** | 6/10 | Wheel SVG unusable by screen readers; tour timing hostile |
| **Architecture** | 4/10 | God component; utility CSS reinventing Tailwind; no TS |
| **Maintainability** | 3/10 | 21 CSS Module files; inconsistent naming; no component library |
| **Honesty/Marketing** | 4/10 | "AI" claims false without proxy; hardcoded prompts |

**Ship readiness: NOT READY.** Fix 7 P0 issues first (4-5 hrs), then P1 architecture rot (3-4 days). Current state would get roasted on HN/Reddit for security, bundle size, and dishonest marketing.

---

*(End of review — 42 findings across security, architecture, UX, and maintenance. 0 FIXED in this pass. Previous pass had 38/42 fixed but introduced new issues.)*