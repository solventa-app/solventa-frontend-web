import * as Sentry from '@sentry/vue'
import { limpiarObjeto, limpiarTexto } from './observabilidad/limpiar'

type Nivel = 'debug' | 'info' | 'warn' | 'error'

/**
 * T22 · Solo en desarrollo (`npm run dev`): manda la línea, ya limpia de datos personales, al middleware `/__log` de
 * `vite.config.ts`, que la anexa a `logs/web-local.log`. Nunca en producción ni en las pruebas, y nunca falla: si el
 * servidor de Vite no responde, el log solo queda en la consola.
 */
export function enviarALogLocal(
  nivel: Nivel,
  mensaje: string,
  datos?: Record<string, unknown>,
  fetchFn: typeof fetch = fetch,
): void {
  try {
    const cuerpo = JSON.stringify({ nivel, mensaje, datos, ruta: globalThis.location?.pathname })
    void fetchFn('/__log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: cuerpo,
      keepalive: true,
    }).catch(() => undefined)
  } catch {
    // Datos no serializables o sin fetch: el log se queda en la consola.
  }
}

function aLogLocal(nivel: Nivel, mensaje: string, datos?: Record<string, unknown>): void {
  if (import.meta.env.DEV && import.meta.env.MODE !== 'test') enviarALogLocal(nivel, mensaje, datos)
}

/**
 * Logger estructurado de `solventa-web` (docs/plan-sentry.md §2.5 y §2.6):
 * - En desarrollo (`import.meta.env.DEV`) escribe en la consola y en `logs/web-local.log` (vía `/__log`).
 * - En producción `info` y `warn` van como `Sentry.addBreadcrumb`, y `error`
 *   como `Sentry.captureException`.
 */
export const log = {
  debug(mensaje: string, datos?: Record<string, unknown>): void {
    const msg = limpiarTexto(mensaje)
    const limpio = datos ? limpiarObjeto(datos) : undefined
    if (import.meta.env.DEV) {
      console.debug(`[Solventa] ${msg}`, limpio ?? '')
      aLogLocal('debug', msg, limpio)
    }
  },

  info(mensaje: string, datos?: Record<string, unknown>): void {
    const msg = limpiarTexto(mensaje)
    const limpio = datos ? limpiarObjeto(datos) : undefined
    if (import.meta.env.DEV) {
      console.info(`[Solventa] ${msg}`, limpio ?? '')
      aLogLocal('info', msg, limpio)
    } else {
      Sentry.addBreadcrumb({
        level: 'info',
        message: msg,
        data: limpio,
      })
    }
  },

  warn(mensaje: string, datos?: Record<string, unknown>): void {
    const msg = limpiarTexto(mensaje)
    const limpio = datos ? limpiarObjeto(datos) : undefined
    if (import.meta.env.DEV) {
      console.warn(`[Solventa] ${msg}`, limpio ?? '')
      aLogLocal('warn', msg, limpio)
    } else {
      Sentry.addBreadcrumb({
        level: 'warning',
        message: msg,
        data: limpio,
      })
    }
  },

  error(mensaje: string, error?: unknown, datos?: Record<string, unknown>): void {
    const msg = limpiarTexto(mensaje)
    const limpio = datos ? limpiarObjeto(datos) : undefined
    if (import.meta.env.DEV) {
      console.error(`[Solventa] ${msg}`, error ?? '', limpio ?? '')
      aLogLocal('error', msg, { ...limpio, error: error instanceof Error ? limpiarTexto(error.message) : undefined })
    } else {
      Sentry.addBreadcrumb({
        level: 'error',
        message: msg,
        data: limpio,
      })
      Sentry.captureException(error instanceof Error ? error : new Error(msg))
    }
  },
}

/**
 * Obtiene y etiqueta en Sentry el código de soporte corto (8 caracteres) para
 * mostrar al usuario cuando ocurre un fallo.
 */
export function obtenerCodigoSoporte(): string {
  const traceId = Sentry.getActiveSpan()?.spanContext().traceId ?? Sentry.lastEventId()
  const candidato = traceId && traceId !== '00000000000000000000000000000000' ? traceId : '4bf92f35'
  const codigo = candidato.slice(0, 8)
  Sentry.setTag('codigo_soporte', codigo)
  return codigo
}
