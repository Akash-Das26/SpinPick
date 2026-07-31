import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import { VitePWA } from 'vite-plugin-pwa'

const testSetup = './tests/setup.js'

// Single source of truth for the app version (used by <Footer /> via __APP_VERSION__)
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))

// Sentry source map upload (production only). All three secrets are required
// together — a partial config would silently skip uploads and leave production
// stack traces minified, so we fail the build instead of guessing.
const sentrySecrets = {
  SENTRY_ORG: process.env.SENTRY_ORG,
  SENTRY_PROJECT: process.env.SENTRY_PROJECT,
  SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN,
}
const hasAnySentrySecret = Object.values(sentrySecrets).some(Boolean)
const hasAllSentrySecrets = Object.values(sentrySecrets).every(Boolean)

if (hasAnySentrySecret && !hasAllSentrySecrets) {
  throw new Error(
    'Sentry source map upload requires ALL of SENTRY_ORG, SENTRY_PROJECT and SENTRY_AUTH_TOKEN ' +
      '(see .env.example and README). Configure all three in CI secrets or none of them.'
  )
}

const sentryPlugin = hasAllSentrySecrets
  ? sentryVitePlugin({
      org: sentrySecrets.SENTRY_ORG,
      project: sentrySecrets.SENTRY_PROJECT,
      authToken: sentrySecrets.SENTRY_AUTH_TOKEN,
      sourcemaps: {
        assets: './dist/**',
      },
    })
  : null;

// https://vite.dev/config/
export default defineConfig({
  define: {
    // Injected at build time from package.json — never hardcode versions in UI
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    sentryPlugin,
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.svg'],
      manifest: false, // we provide our own manifest.json in public/
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,png,woff2,woff,ttf}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  server: {
    // serve index.html for all paths during development (SPA routing)
    historyApiFallback: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: [testSetup],
    globals: true,
  },
  build: {
    // Target modern browsers for smaller output
    target: 'es2020',
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Use esbuild for faster minification (default)
    minify: 'esbuild',
    // Generate sourcemaps for production debugging (hidden from users)
    sourcemap: 'hidden',
    // Set chunk size warning limit to 500KB
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Manual chunk splitting for optimal caching
        manualChunks(id) {
          if (id.includes('node_modules/react-router-dom') || id.includes('node_modules/react-router')) {
            return 'vendor-router';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          if (id.includes('node_modules/canvas-confetti')) {
            return 'vendor-confetti';
          }
          // Split heavy components into their own chunks
          if (id.includes('/components/TournamentMode')) {
            return 'tournament';
          }
          if (id.includes('/components/ExporterModal')) {
            return 'exporter';
          }
          if (id.includes('/components/CriteriaTuner')) {
            return 'criteria-tuner';
          }
          if (id.includes('/components/ComparisonSection') || id.includes('/pages/Compare')) {
            return 'compare';
          }
        },
        // Optimize asset file naming for cache busting
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/\.(png|jpe?g|gif|svg|webp|avif)$/.test(assetInfo.name)) {
            return `assets/images/[name]-[hash].${ext}`;
          }
          if (/\.(woff2?|eot|ttf|otf)$/.test(assetInfo.name)) {
            return `assets/fonts/[name]-[hash].${ext}`;
          }
          return `assets/[name]-[hash].${ext}`;
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
})
