interface ImportMetaEnv {
  readonly VITE_DEPLOYMENT?: 'preview' | 'production'
  readonly VITE_POSTHOG_HOST?: string
  readonly VITE_POSTHOG_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
