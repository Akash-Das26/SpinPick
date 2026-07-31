interface ImportMetaEnv {
  readonly VITE_OPENROUTER_PROXY_URL: string;
  readonly VITE_SENTRY_DSN: string;
  readonly VITE_APP_VERSION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}