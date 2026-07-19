/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_APP_URL?: string
  readonly VITE_APP_NAME?: string
  readonly VITE_WEB3FORMS_ACCESS_KEY?: string
  /** Cutover flag — set "false" to serve legacy /trades */
  readonly VITE_TRADE_V2_ENABLED?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
