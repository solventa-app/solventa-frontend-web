import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
import { handlersSuscripcion } from './suscripcion'

// HU-W03 no tiene dummy del backend: sus mocks (suscripcion.ts) también corren en `dev:mock`.
export const worker = setupWorker(...handlersSuscripcion, ...handlers)
