/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BFF_URL?: string
  readonly VITE_USE_MOCKS?: string
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_RELEASE?: string
  readonly VITE_AMBIENTE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// swagger-ui-dist no publica tipos: solo lo que usa el Swagger embebido de W07-03 (components/socios/SwaggerSocios.vue).
declare module 'swagger-ui-dist/swagger-ui-es-bundle.js' {
  interface PeticionSwagger {
    url: string
    headers: Record<string, string>
  }
  interface OpcionesSwagger {
    domNode: HTMLElement
    url: string
    deepLinking?: boolean
    tryItOutEnabled?: boolean
    defaultModelsExpandDepth?: number
    displayRequestDuration?: boolean
    requestInterceptor?: (peticion: PeticionSwagger) => PeticionSwagger | Promise<PeticionSwagger>
  }
  const SwaggerUIBundle: (opciones: OpcionesSwagger) => unknown
  export default SwaggerUIBundle
}
