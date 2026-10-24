import { setupServer } from 'msw/node'
import { handlers } from './handlers'
import { handlersSiniestros } from './siniestros'

// Para pruebas de Vitest: `servidor.listen()` en beforeAll y `servidor.close()` en afterAll.
// Los de siniestros van primero (su enlace es más específico que el '*' del BFF) y solo existen aquí:
// en `dev:mock` el navegador usa el dummy real de siniestros (src/mocks/siniestros.ts).
export const servidor = setupServer(...handlersSiniestros, ...handlers)
