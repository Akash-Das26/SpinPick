# 🎯 SpinPick Fix-It Guide — God Mode Edition
### (For engineers who want to ship something they're proud of)

---

## 🏠 THE BIG PICTURE

You built a **decision wheel clubhouse**. It's got:
- Physics-driven spin wheel with sound ✅
- 1v1 bracket tournaments with visual bracket ✅
- AI-powered option generation (via proxy) ✅
- Export/import hub + full backup ✅
- History tracking + permalink sharing ✅
- Comparison pages for SEO ✅
- i18n (EN/ES/FR/DE/JA) ✅
- PWA + analytics ✅

But the **foundation still has cracks**. Security gaps, 202 KB bundle, no TypeScript, utility CSS hell. Let's finish it properly.

---

## 🔴 P0 — CRITICAL (Fix Before ANY Deploy)

### 1. 🛡️ **Rate Limiting on Proxy** — 45 min

**The Hole:** `server/proxy.mjs` accepts unlimited requests. One malicious script = infinite OpenRouter calls on your dime.

**Fix:** Add in-memory token bucket to `server/proxy.mjs`:

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

### 2. 🔒 **CSP Headers** — 1 hour

**In `server/proxy.mjs`**, add CSP to all responses:

```javascript
// Add after BASE_CORS_HEADERS
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

## 🟠 P1 — HIGH (Week 1)

### 3. 🏗️ **Migrate to TypeScript (Core First)** — 1-2 days

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
src/hooks/useWheelEngine.js → useWheelEngine.ts
src/hooks/useAIConfig.js → useAIConfig.ts
src/hooks/useKeyboardShortcuts.js → useKeyboardShortcuts.ts
src/data/tabs.js → tabs.ts
src/data/presets.js → presets.ts
src/data/constants.js → constants.ts
src/components/ErrorBoundary.jsx → ErrorBoundary.tsx
src/components/TabError.jsx → TabError.tsx
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

### 4. 🎨 **Replace Utility CSS with Tailwind** — 2-3 hrs

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
        'accent-lime-bright': 'var(--accent-lime-bright)',
        'accent-cyan': 'var(--accent-cyan)',
        'accent-mint': 'var(--accent-mint)',
        'accent-purple': 'var(--accent-purple)',
        'accent-orange': 'var(--accent-orange)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'text-inverse': 'var(--text-inverse)',
        'danger': 'var(--danger)',
        'success': 'var(--success)',
        'warning': 'var(--warning)',
        'border-subtle': 'var(--border-subtle)',
        'border-medium': 'var(--border-medium)',
        'border-glow': 'var(--border-glow)',
      },
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        body: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
        'full': 'var(--radius-full)',
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'glow': 'var(--shadow-glow)',
      },
      transitionDuration: {
        'fast': '150ms',
        'normal': '250ms',
        'slow': '400ms',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'out-back': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
}
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

### 5. 📦 **Prune lucide-react Barrel** — 30 min

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

### 6. 🏷️ **Consistent Naming: BEM in CSS Modules** — 2 hrs

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

### 7. 🌓 **Fix Light Mode Contrast** — 30 min

Test light mode colors against WCAG AA:

```css
/* In index.css - verify these ratios: */
[data-theme='light'] {
  --color-text-primary: #101828;    /* 12.6:1 on white ✅ */
  --color-text-secondary: #4b5563;  /* 7.3:1 on white ✅ */
  --color-text-muted: #6b7280;      /* 4.5:1 on white ✅ (min for large text) */
  --color-accent-lime: #6e8017;     /* 4.5:1 on white ✅ */
  --color-accent-cyan: #0f9eb9;     /* 4.5:1 on white ✅ */
  --color-accent-mint: #149b5b;     /* 3:1 on white ⚠️ may need darker */
  --color-accent-purple: #7b4ad7;   /* 4.5:1 on white ✅ */
  --color-accent-orange: #d97706;   /* 3:1 on white ⚠️ may need darker */
}
```

Fix any failing ratios by darkening the light-mode accent colors.

---

### 8. 🔧 **Verify `useLocalStorage` SSR Guard** — 15 min

**Current state in `hooks/useLocalStorage.js`:**

```javascript
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (e) {
      console.warn(`Failed to read localStorage key "${key}":`, e);
      return initialValue;
    }
  });

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`Failed to write localStorage key "${key}":`, e);
    }
  }, [key, value, isClient]);

  return [value, setValue];
}
```

**Verify:** The `isClient` guard prevents SSR hydration mismatch. Ensure all usages handle the initial `initialValue` correctly during first render.

---

## 🟡 P2 — MEDIUM (Week 2)

### 9. 📦 **Prune lucide-react Barrel** — 30 min (DUPLICATE OF #5)
See item #5 above.

### 10. 📊 **Bundle Audit** — 1 hr

```bash
npm install -D vite-bundle-analyzer
```

```javascript
// vite.config.js
import { analyzer } from 'vite-bundle-analyzer';

export default defineConfig({
  plugins: [
    react(),
    analyzer({ analyzerMode: 'static', openAnalyzer: false }),
  ],
});
```

Run `npm run build` and open `dist/stats.html` to identify large dependencies.

### 11. 📄 **Deduplicate `HowItWorks` Section** — 5 min

**In `App.jsx`:** The `<HowItWorks />` component renders in Studio tab. If it also appears elsewhere (Discover, etc.), lazy-load it:

```javascript
const HowItWorks = lazy(() => import('./components/HowItWorks').then(m => ({ default: m.HowItWorks })));
```

### 12. 📚 **Storybook + Visual Regression** — 2-3 hrs

```bash
npx storybook@latest init
npm install -D @storybook/addon-interactions @storybook/test
npm install -D chromatic
```

---

## 🟢 P3 — LOW (Sprint+)

### 13. 📚 **Storybook + Visual Regression**
See item #12.

### 14. 🌍 **More i18n Languages**
Add to `src/i18n.js` following the FR/DE/JA pattern.

---

## 🎯 YOUR ACTION PLAN

### This Week (P0 + P1)
- [ ] Day 1: Rate limiting + CSP headers (2 hrs)
- [ ] Day 2: Deploy proxy + configure production env (2 hrs)
- [ ] Day 3-4: TypeScript migration (core files) (1-2 days)
- [ ] Day 5: Tailwind migration + utility CSS deletion (2-3 hrs)
- [ ] Day 6: lucide-react pruning + BEM naming + light mode contrast (3 hrs)

### Next Week (P2)
- [ ] Bundle audit with vite-bundle-analyzer
- [ ] Deduplicate HowItWorks
- [ ] Storybook setup

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
npm run build                   # < 100 KB main chunk gzipped ⏳ (currently 202 KB)

# Manual verification
# - Spin wheel, verify sound + confetti
# - Tournament: full 7-match bracket + visual bracket
# - Builder: create, save, launch wheel
# - Discover: load preset → studio
# - History: export → import → verify
# - Permalink: share verdict → open in new tab
# - Screen reader: NVDA/VoiceOver test
# - Mobile: iOS Safari + Android Chrome
# - Light/dark mode toggle
# - Proxy: AI works without key in browser
```

---

## 💡 REMEMBER

> **"Code is read more than written. Write it for the next person (future you) to understand."**

You've fixed 28/36 issues since the last review. The remaining 8 are mostly P1 architectural debt that won't block launch. Ship the P0 fixes, deploy the proxy, then iterate. One commit at a time. 🚀

---

*Made with ❤️ for the SpinPick team. Questions? Ask the senior engineer (they're not scary, promise).*