/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BFF_URL?: string
  readonly VITE_USE_MOCKS?: string
  readonly VITE_SINIESTROS_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
