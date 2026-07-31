import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import * as Sentry from '@sentry/react'
import './index.css'
import styles from './main.module.css'
import { App } from './App.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import './i18n'

// Initialize Sentry error monitoring (only if DSN is configured)
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    // Capture 100% of transactions in development, adjust for production
    tracesSampleRate: import.meta.env.PROD ? 0.25 : 1.0,
    // Capture 10% of all sessions for replays
    replaysSessionSampleRate: 0.1,
    // Capture 100% of sessions that have an error
    replaysOnErrorSampleRate: 1.0,
    // Only send errors from the app's origin, ignore browser extensions
    allowUrls: [window.location.origin],
    // Skip errors from browser extensions and noisy third-party scripts
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'NetworkError when attempting to fetch resource',
      'AbortError: Fetch is aborted',
    ],
  });
}

// eslint-disable-next-line react/only-export-components — used internally by router
const CompareHub = lazy(() => import('./pages/CompareHub.jsx').then(m => ({ default: m.CompareHub })))
// eslint-disable-next-line react/only-export-components — used internally by router
const ComparisonPage = lazy(() => import('./pages/ComparisonPage.jsx').then(m => ({ default: m.ComparisonPage })))

// eslint-disable-next-line react/only-export-components — used as fallback Suspense UI
function PageLoader() {
  return (
    <div className={styles.pageLoader}>
      <div className={styles.spinner} aria-label="Loading page" role="status" />
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/compare" element={<CompareHub />} />
            <Route path="/compare/:slug" element={<ComparisonPage />} />
            {/* catch-all → back to app */}
            <Route path="*" element={<App />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
