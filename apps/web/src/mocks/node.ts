import { setupServer } from 'msw/node'
import { handlers } from './handlers'
import { handlersSiniestros } from './siniestros'
import { handlersSocios } from './socios'
import { handlersSuscripcion } from './suscripcion'

// Para pruebas de Vitest: `servidor.listen()` en beforeAll y `servidor.close()` en afterAll.
// Los de siniestros van primero: su enlace ('*/v1/graphql/web') es más específico que el '*' del BFF.
export const servidor = setupServer(...handlersSiniestros, ...handlersSocios, ...handlersSuscripcion, ...handlers)
