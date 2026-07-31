# 🎯 SpinPick Fix-It Guide — God Mode Edition
### (For engineers who want to ship something they're proud of)

---

## 🏠 THE BIG PICTURE

You built a **decision wheel clubhouse**. It's got:
- Physics-driven spin wheel with sound ✅
- 1v1 bracket tournaments ✅
- AI-powered option generation (via proxy) ✅
- Export/import hub ✅
- History tracking ✅
- Comparison pages for SEO ✅
- i18n (EN/ES) ✅
- PWA + analytics ✅

But the **foundation is rotting**. Security holes, 191 KB bundle, God component, dishonest marketing. Let's fix it properly.

---

## 🔴 P0 — CRITICAL (Fix Before ANY Deploy)

### 1. 🔑 **Proxy Key Injection Vector** — 30 min

**The Hole:** `server/proxy.mjs:147-158` accepts `apiKey` from request body:

```javascript
// DANGEROUS - allows key injection
const { model, messages, apiKey } = payload;
const outgoingKey = apiKey?.trim() || OPENROUTER_API_KEY;
```

**Fix:** Remove `apiKey` handling entirely. Server ONLY uses env var.

```javascript
// server/proxy.mjs — REPLACE lines 147-158
const { model, messages } = payload;  // IGNORE apiKey from client
if (!model || !Array.isArray(messages) || messages.length === 0) {
  send(res, 400, { error: 'Missing "model" or "messages"' }, origin);
  return;
}

if (!OPENROUTER_API_KEY) {
  console.error('[proxy] OPENROUTER_API_KEY not set in server env.');
  send(res, 500, { error: 'Proxy not configured' }, origin);
  return;
}

const outgoingKey = OPENROUTER_API_KEY;  // ONLY server env key
```

**Also update frontend** (`src/services/aiService.js:153-155`) — remove `apiKey` from payload:

```javascript
// aiService.js — callOpenRouterProxy
const body = {
  model: modelName,
  messages: buildOpenRouterMessages(prompt, optionCount),
  // REMOVE: apiKey field entirely
};
```

---

### 2. 🛡️ **Rate Limiting on Proxy** — 45 min

**Add in-memory token bucket** to `server/proxy.mjs`:

```javascript
// Add after imports, before server creation
const RATE_LIMIT = 60;        // requests per window
const RATE_WINDOW_MS = 60_000; // 1 minute
const ipBuckets = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const bucket = ipBuckets.get(ip) || { count: 0, windowStart: now };
  
  if (now - bucket.windowStart > RATE_WINDOW_MS) {
    bucket.count = 0;
    bucket.windowStart = now;
  }
  
  if (bucket.count >= RATE_LIMIT) {
    return false;
  }
  
  bucket.count++;
  ipBuckets.set(ip, bucket);
  return true;
}

// In createServer handler, AFTER origin check:
const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
  || req.socket.remoteAddress;
if (!checkRateLimit(clientIp)) {
  send(res, 429, { error: 'Rate limit exceeded. Try again in a minute.' }, origin);
  return;
}
```

**Production:** Replace with Redis-backed rate limiter.

---

### 3. 🔒 **CSP Headers** — 1 hour

**In `server/proxy.mjs`**, add CSP to all responses:

```javascript
// Add to BASE_CORS_HEADERS
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'nonce-{NONCE}' https://plausible.io",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self' https://plausible.io",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ');

function corsHeadersFor(origin, nonce) {
  return {
    ...BASE_CORS_HEADERS,
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.length > 0 ? (origin || '') : '*',
    'Content-Security-Policy': CSP.replace('{NONCE}', nonce || ''),
    ...(ALLOWED_ORIGINS.length > 0 ? { Vary: 'Origin' } : {}),
  };
}
```

**In `vite.config.js`**, generate nonce for inline scripts:

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';

const cspNonce = crypto.randomBytes(16).toString('base64');

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'csp-nonce',
      transformIndexHtml(html) {
        return html.replace(
          '<script type="module" src="/src/main.jsx"></script>',
          `<script type="module" nonce="${cspNonce}" src="/src/main.jsx"></script>`
        );
      },
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          res.setHeader('Content-Security-Policy', 
            CSP.replace('{NONCE}', cspNonce)
          );
          next();
        });
      }
    }
  ],
  // ... rest of config
});
```

---

### 4. 📢 **Fix Dishonest AI Marketing** — 10 min

**Files to change:**

| File | Line | Change |
|------|------|--------|
| `src/App.jsx` | 303-304 | `"Multi-criteria AI & 1v1 Tournaments"` → `"Keyword Boost Engine & 1v1 Tournaments"` |
| `src/components/ComparisonSection.jsx` | 14 | `"AI Multi-Criteria Engine"` → `"Keyword Boost Engine"` |
| `src/pages/CompareHub.jsx` | (search) | Same replacement |

**Add disclaimer in hero** (`App.jsx:307-309`):

```jsx
<p className={`text-secondary mx-auto mb-28 ${styles.heroCopy}`}>
  SpinPick combines real-time option synthesis, multi-criteria weight tuning, 
  and bracket elimination tournaments — 100% free with zero watermarks.
  <br /><span className="text-xs text-muted">
    AI reasoning requires server-side proxy configuration.
  </span>
</p>
```

---

### 5. 🎯 **Single Default Prompt Constant** — 5 min

**Create `src/data/constants.js`:**

```javascript
export const DEFAULT_PROMPT = 'What should I cook for dinner tonight?';
export const SURPRISE_PROMPTS = [
  'What movie should I watch tonight?',
  'Which project should I tackle first?',
  'Where should I travel next?',
  'What should I learn this month?',
];
```

**Update `src/App.jsx`:**

```javascript
import { DEFAULT_PROMPT, SURPRISE_PROMPTS } from '../data/constants';
// Line 44:
const [promptInput, setPromptInput] = useState(DEFAULT_PROMPT);
// Line 177:
handleGenerateOptionsRef.current(DEFAULT_PROMPT);
// Line 317:
placeholder={`e.g. ${DEFAULT_PROMPT}`}
```

**Update `src/data/presets.js`** to import from constants.

---

### 6. 🚀 **Deploy Proxy + Env Vars** — 2 hrs

**Production checklist:**

```bash
# Server (Railway/Render/Fly.io/Cloudflare Workers)
# 1. Set env vars:
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxx
ALLOWED_ORIGINS=https://spinpick.app
PORT=8787
UPSTREAM_TIMEOUT_MS=60000

# 2. Deploy server/proxy.mjs
# 3. Verify health: curl https://api.spinpick.app/health

# Frontend (Vercel/Netlify/Cloudflare Pages)
# 1. Set env vars:
VITE_OPENROUTER_PROXY_URL=https://api.spinpick.app
VITE_SENTRY_DSN=https://xxx@oxxx.ingest.sentry.io/xxx

# 2. Deploy
```

---

## 🟠 P1 — HIGH (Week 1)

### 7. 🏗️ **Decompose App.jsx (487 lines → 4 files)**

**Extract `src/views/StudioView.jsx`:**

```javascript
// StudioView.jsx — ALL studio tab logic
import { WheelStage } from '../components/WheelStage';
import { ResultCard } from '../components/ResultCard';
import { SliceEditor } from '../components/SliceEditor';
// ... other imports

export function StudioView({ 
  promptInput, setPromptInput,
  currentPrompt, setCurrentPrompt,
  options, setOptions,
  // ... pass only what's needed
}) {
  // Move ALL studio-specific state and handlers here
  // Return JSX for studio tab
}
```

**Extract `src/hooks/useWheelEngine.js`:**

```javascript
// useWheelEngine.js — spin logic, verdict, history
import { useCallback, useRef } from 'react';
import { aiService } from '../services/aiService';
import { useLocalStorage } from './useLocalStorage';

export function useWheelEngine({ promptInput, aiConfig }) {
  const [options, setOptions] = useState([]);
  const [displayVerdict, setDisplayVerdict] = useState(null);
  const [history, setHistory] = useLocalStorage('spinpick_history', []);
  // ... all wheel logic
  
  return {
    options, setOptions,
    displayVerdict, setDisplayVerdict,
    handleGenerateOptions,
    handleSpinComplete,
    handleEliminateAndRespin,
    handleLoadPastSpin,
    history,
  };
}
```

**Extract `src/hooks/useAIConfig.js`:**

```javascript
// useAIConfig.js — AI settings management
import { useState, useEffect } from 'react';

export function useAIConfig() {
  const [aiConfig, setAiConfig] = useState(() => {
    // ... sessionStorage logic
  });
  
  useEffect(() => {
    // ... sessionStorage sync
  }, [aiConfig.modelName, aiConfig.optionCount]);
  
  return { aiConfig, setAiConfig };
}
```

**New `App.jsx` (clean):**

```javascript
function AppInner() {
  const { aiConfig, setAiConfig } = useAIConfig();
  const wheelEngine = useWheelEngine({ promptInput, aiConfig });
  const [activeTab, setActiveTab] = useState('studio');
  // ... modal states only
  
  return (
    <Navbar ... />
    <main>
      {activeTab === 'studio' && <StudioView {...wheelEngine} />}
      <Suspense fallback={<Loader />}>
        {activeTab === 'tournament' && <TournamentMode />}
        {/* ... */}
      </Suspense>
    </main>
    // ... modals
  );
}
```

---

### 8. 🎨 **Replace Utility CSS with Tailwind** — 2-3 hrs

**Step 1: Install & configure**

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Step 2: `tailwind.config.js`**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'bg-dark': 'var(--bg-dark)',
        'bg-surface': 'var(--bg-surface)',
        'accent-lime': 'var(--accent-lime)',
        // ... map all CSS custom properties
      },
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        body: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
```

**Step 3: Delete `src/index.css:570-760`** (all utility classes)

**Step 4: Replace component classes** — e.g., `WheelStage.module.css`:

```css
/* BEFORE: .wheelStage__header { display: flex; justify-content: space-between; } */
/* AFTER:  Use Tailwind in JSX */
<div className="flex justify-between items-center mb-5">
```

**Step 5: Keep CSS Modules for component-specific styles only** (animations, complex layouts)

---

### 9. ⚡ **Dynamic Import Heavy Libs** — 15 min each

**`src/components/WheelStage.jsx`:**

```javascript
// REMOVE: import confetti from 'canvas-confetti';
// ADD:
const [confetti, setConfetti] = useState(null);

useEffect(() => {
  import('canvas-confetti').then(m => setConfetti(() => m.default));
}, []);

// In spin complete:
if (confetti && !prefersReduced) {
  confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: [...] });
}
```

**`src/components/ExporterModal.jsx`:**

```javascript
// REMOVE: import Papa from 'papaparse';
// IN handleImport:
const Papa = (await import('papaparse')).default;
Papa.parse(text, { header: true, ... });
```

---

### 10. ♿ **Wheel SVG Screen Reader Support** — 1 hr

**`src/components/WheelStage.jsx`:**

```jsx
<svg viewBox="-100 -100 200 200" aria-label="Decision spin wheel" role="img">
  <title>Decision wheel with {slices.length} options</title>
  <desc>
    {slices.map(s => `${s.label} (${Math.round(s.sliceAngle)}°)`).join(', ')}
  </desc>
  {/* ... existing paths ... */}
  {/* Live region for spin announcements */}
  <liveRegion aria-live="polite" aria-atomic="true" className="sr-only" />
</svg>
```

**Add CSS for screen reader only:**

```css
/* In index.css or global CSS Module */
.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0);
  white-space: nowrap; border: 0;
}
```

**Announce current slice during spin** (in `animate` function):

```javascript
if (currentSliceIdx !== -1 && currentSliceIdx !== lastSliceIndexRef.current) {
  lastSliceIndexRef.current = currentSliceIdx;
  const slice = slices[currentSliceIdx];
  // Update live region
  const liveRegion = wheelElRef.current?.querySelector('[aria-live]');
  if (liveRegion) liveRegion.textContent = `Passing ${slice.label}`;
  // ... rest of tick logic
}
```

---

### 11. 🎪 **Fix Tour Trigger** — 15 min

**`src/App.jsx`:**

```javascript
// REMOVE auto-fire tour (lines 79-86)
// ADD: Tour button in hero
<button 
  className="btn btn-secondary btn-sm mt-8"
  onClick={() => setShowTour(true)}
  aria-label="Start interactive tour"
>
  <Sparkles size={14} aria-hidden="true" />
  Take Tour
</button>
```

**Add "Don't show again" in `OnboardingTour.jsx`:**

```jsx
<div className="flex items-center gap-6 mt-4">
  <label className="flex items-center gap-4 text-sm text-muted cursor-pointer">
    <input 
      type="checkbox" 
      checked={dontShowAgain} 
      onChange={(e) => setDontShowAgain(e.target.checked)}
    />
    Don't show this tour again
  </label>
</div>
```

---

### 12. ⌨️ **Keyboard Shortcuts** — 30 min

**Create `src/hooks/useKeyboardShortcuts.js`:**

```javascript
import { useEffect, useCallback } from 'react';

export function useKeyboardShortcuts({ 
  onSpin, 
  onTour, 
  activeTab, 
  setActiveTab,
  isSpinning 
}) {
  const handleKey = useCallback((e) => {
    // Ignore if typing in input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    if (e.code === 'Space' && !isSpinning) {
      e.preventDefault();
      onSpin();
    }
    if (e.code === 'KeyT') setActiveTab('tournament');
    if (e.code === 'KeyB') setActiveTab('builder');
    if (e.code === 'KeyH') setActiveTab('history');
    if (e.code === 'KeyD') setActiveTab('discover');
    if (e.code === 'KeyS') setActiveTab('studio');
    if (e.code === 'Slash' && e.shiftKey) onTour(); // Shift+? for help
  }, [onSpin, onTour, activeTab, setActiveTab, isSpinning]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);
}
```

**Use in `App.jsx`:**

```javascript
useKeyboardShortcuts({
  onSpin: () => wheelRef.current?.spin?.(), // Need ref to WheelStage
  onTour: () => setShowTour(true),
  activeTab,
  setActiveTab,
  isSpinning,
});
```

---

### 13. 💡 **Tooltip for Truncated Labels** — 10 min

**`src/components/WheelStage.jsx`:**

```jsx
<text
  x={tx} y={ty}
  fill={textFill}
  fontSize={fontSize}
  fontWeight="800"
  fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
  textAnchor="middle"
  dominantBaseline="middle"
  transform={`rotate(${slice.midAngle} ${tx} ${ty})`}
  title={slice.label}  {/* Native tooltip on hover */}
>
  {displayLabel}
</text>
```

**For better UX, add custom tooltip component** (optional).

---

### 14. 🛡️ **ErrorBoundaries for Lazy Tabs** — 30 min

**`src/components/ErrorBoundary.jsx` (already exists, use it):**

```jsx
// App.jsx
import { ErrorBoundary } from './components/ErrorBoundary';

<Suspense fallback={<Loader />}>
  {activeTab === 'tournament' && (
    <ErrorBoundary fallback={<TabError tab="Tournament" />}>
      <TournamentMode options={options} onExitTournament={() => setActiveTab('studio')} />
    </ErrorBoundary>
  )}
  {/* Repeat for all lazy tabs */}
</Suspense>
```

**Create `src/components/TabError.jsx`:**

```jsx
export function TabError({ tab }) {
  return (
    <div className="glass-panel text-center p-32">
      <AlertTriangle size={48} color="var(--danger)" className="mx-auto mb-8" />
      <h3 className="font-extrabold mb-4">Failed to load {tab}</h3>
      <p className="text-muted mb-8">Something went wrong loading this module.</p>
      <button className="btn btn-primary" onClick={() => window.location.reload()}>
        Reload Page
      </button>
    </div>
  );
}
```

---

## 🟡 P2 — MEDIUM (Week 2)

### 15. 🏆 **Visual Bracket Tree for Tournament** — 2-3 hrs

**Option A: Pure CSS Grid bracket**

```css
/* TournamentMode.module.css */
.bracketTree {
  display: grid;
  grid-template-columns: repeat(4, 1fr); /* Round 1, 2, 3, Final */
  gap: 24px;
  padding: 24px;
}

.bracketRound { display: flex; flex-direction: column; gap: 16px; }
.bracketMatch { 
  background: var(--bg-glass); 
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: 16px;
}
.bracketMatch.active { border-color: var(--accent-lime); }
```

**Option B: Use `react-tournament-bracket` library**

```bash
npm install react-tournament-bracket
```

---

### 16. 📤 **Export/Import History JSON** — 1 hr

**Add to `ExporterModal.jsx`:**

```javascript
// In export options:
json: {
  title: 'JSON Backup (Wheel + History)',
  description: 'Full app state including decision history',
  button: 'Export Full JSON',
  async onClick() {
    const history = JSON.parse(localStorage.getItem('spinpick_history') || '[]');
    const wheels = JSON.parse(localStorage.getItem('spinpick_saved_wheels') || '[]');
    const aiConfig = sessionStorage.getItem('spinpick_aiconfig');
    
    const backup = {
      version: 1,
      timestamp: Date.now(),
      history,
      savedWheels: wheels,
      aiConfig: aiConfig ? JSON.parse(aiConfig) : null,
    };
    
    download(JSON.stringify(backup, null, 2), 'spinpick-backup.json', 'application/json');
  }
}

// Add import handler for full backup:
import: {
  label: 'Import Full Backup (.json)',
  onChange(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const backup = JSON.parse(e.target.result);
        if (backup.history) localStorage.setItem('spinpick_history', JSON.stringify(backup.history));
        if (backup.savedWheels) localStorage.setItem('spinpick_saved_wheels', JSON.stringify(backup.savedWheels));
        if (backup.aiConfig) sessionStorage.setItem('spinpick_aiconfig', JSON.stringify(backup.aiConfig));
        window.location.reload();
      } catch (err) {
        alert('Invalid backup file');
      }
    };
    reader.readAsText(file);
  }
}
```

---

### 17. 🔊 **Fix AudioContext Lifecycle** — 45 min

**`src/hooks/useSound.jsx`:**

```javascript
// Add at top level
let audioCtxRef = null;
let activeComponents = 0;

export function getAudioContextSingleton() {
  if (!audioCtxRef) {
    audioCtxRef = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtxRef;
}

export function releaseAudioContext() {
  activeComponents--;
  if (activeComponents <= 0 && audioCtxRef && audioCtxRef.state !== 'closed') {
    audioCtxRef.close();
    audioCtxRef = null;
  }
}

export function acquireAudioContext() {
  activeComponents++;
  return getAudioContextSingleton();
}

// In SoundProvider:
useEffect(() => {
  const ctx = acquireAudioContext();
  
  // Handle autoplay policy
  const resumeAudio = async () => {
    if (ctx.state === 'suspended') {
      try { await ctx.resume(); } catch {}
    }
    document.removeEventListener('click', resumeAudio);
    document.removeEventListener('keydown', resumeAudio);
  };
  
  document.addEventListener('click', resumeAudio, { once: true });
  document.addEventListener('keydown', resumeAudio, { once: true });
  
  // Cleanup on unload
  const handleUnload = () => {
    if (audioCtxRef && audioCtxRef.state !== 'closed') {
      audioCtxRef.close();
    }
  };
  window.addEventListener('beforeunload', handleUnload);
  
  return () => {
    window.removeEventListener('beforeunload', handleUnload);
    releaseAudioContext();
  };
}, []);
```

---

### 18. 📦 **Prune lucide-react Barrel** — 30 min

**Install `vite-plugin-lucide`:**

```bash
npm install -D vite-plugin-lucide
```

**`vite.config.js`:**

```javascript
import lucide from 'vite-plugin-lucide';

export default defineConfig({
  plugins: [
    react(),
    lucide(),  // Auto-imports only used icons
  ],
});
```

**Delete `src/lib/icons.js`** — import directly:

```javascript
// Before: import { Disc, Sparkles } from '../lib/icons';
// After:
import { Disc, Sparkles } from 'lucide-react';
```

---

### 19. 🏷️ **Consistent Naming: BEM in CSS Modules** — 2 hrs

**Standard:** `block__element--modifier`

**Rename all CSS Module files:**

```css
/* WheelStage.module.css — BEFORE */
.wheelStage__header { }
.wheelHub__btn { }
.pointerBounceClass { }

/* AFTER */
.wheel-stage__header { }
.wheel-stage__hub-btn { }
.wheel-stage__pointer--bounce { }
```

**Update JSX:**

```jsx
// Before: className={`${styles.wheelStage__header} wheel-stage__header`}
// After:  className={styles['wheel-stage__header']}
```

**Run codemod for consistency:**

```bash
npx jscodeshift -t scripts/bem-codemod.js src/
```

---

### 20. 🔷 **Migrate to TypeScript (Core First)** — 1-2 days

**Step 1: Install**

```bash
npm install -D typescript @types/react @types/react-dom @types/node
```

**Step 2: `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**Step 3: Rename core files incrementally:**

```
src/services/aiService.js → aiService.ts
src/hooks/useLocalStorage.js → useLocalStorage.ts
src/data/tabs.js → tabs.ts
src/data/presets.js → presets.ts
src/components/ErrorBoundary.jsx → ErrorBoundary.tsx
```

**Step 4: Add types for props:**

```typescript
// WheelStage.tsx
interface WheelStageProps {
  options: WheelOption[];
  targetWinnerIndex: number | null;
  onSpinComplete: (winner: WheelOption, index: number) => void;
  isSpinning: boolean;
  setIsSpinning: (spinning: boolean) => void;
  currentPrompt: string;
  onOpenSliceEditor: () => void;
  onOpenCriteriaTuner: (open: boolean) => void;
  onOpenExporter: () => void;
}
```

---

## 🎯 YOUR ACTION PLAN

### This Week (P0 + P1)
- [ ] Day 1: Fix proxy key injection + rate limiting + CSP (2 hrs)
- [ ] Day 2: Fix AI marketing copy + default prompt constant (30 min)
- [ ] Day 3: Deploy proxy + configure production env (2 hrs)
- [ ] Day 4-5: Decompose App.jsx + add ErrorBoundaries (1 day)
- [ ] Day 6: Replace utility CSS with Tailwind (2-3 hrs)
- [ ] Day 7: Dynamic imports + wheel a11y + tour fix + shortcuts (3 hrs)

### Next Week (P2)
- [ ] Visual bracket tree for Tournament
- [ ] Export/import history
- [ ] Fix AudioContext lifecycle
- [ ] Prune lucide-react
- [ ] BEM naming convention
- [ ] TypeScript migration (core files)

---

## 🏁 DONE CHECKLIST

```bash
# Security
npm run lint                    # 0 warnings ✅
# Proxy deployed with rate limiting + CSP ✅
# AI marketing copy fixed ✅

# Architecture
# App.jsx < 200 lines ✅
# Tailwind configured, utility CSS deleted ✅
# Dynamic imports for confetti/papaparse ✅

# Accessibility
# Wheel SVG has screen reader support ✅
# Tour is user-initiated ✅
# Keyboard shortcuts work ✅

# Quality
npm run test:unit               # 68+ passing ✅
npm run test:e2e                # All passing ✅
npm run build                   # < 100 KB main chunk gzipped ✅

# Manual verification
# - Spin wheel, verify sound + confetti
# - Tournament: full 7-match bracket
# - Builder: create, save, launch wheel
# - Discover: load preset → studio
# - History: export → import → verify
# - Screen reader: NVDA/VoiceOver test
# - Mobile: iOS Safari + Android Chrome
# - Light/dark mode toggle
# - Proxy: AI works without key in browser
```

---

## 💡 REMEMBER

> **"Code is read more than written. Write it for the next person (future you) to understand."**

You've got a great product buried under technical debt. Fix the P0s this week, P1s next week, and you'll have something you can genuinely be proud to ship. One commit at a time. 🚀

---

*Made with ❤️ for the SpinPick team. Questions? Ask the senior engineer (they're not scary, promise).*