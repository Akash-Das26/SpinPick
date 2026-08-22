/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_OPENROUTER_PROXY_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// CSS module declarations
declare module '*.module.css' {
  const classes: { readonly [key: string]: string }
  export default classes
}

// Side-effect CSS imports
declare module '*.css'
