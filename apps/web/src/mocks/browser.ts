import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
import { handlersSiniestros } from './siniestros'
import { handlersSuscripcion } from './suscripcion'

// Los de siniestros van primero: su enlace ('*/v1/graphql/web') es más específico que el '*' del BFF.
export const worker = setupWorker(...handlersSiniestros, ...handlersSuscripcion, ...handlers)
