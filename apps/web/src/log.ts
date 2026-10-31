import * as Sentry from '@sentry/vue'
import { limpiarObjeto, limpiarTexto } from './observabilidad/limpiar'

/**
 * Logger estructurado de `solventa-web` (docs/plan-sentry.md §2.5 y §2.6):
 * - En desarrollo (`import.meta.env.DEV`) escribe en la consola.
 * - En producción `info` y `warn` van como `Sentry.addBreadcrumb`, y `error`
 *   como `Sentry.captureException`.
 */
export const log = {
  debug(mensaje: string, datos?: Record<string, unknown>): void {
    const msg = limpiarTexto(mensaje)
    const limpio = datos ? limpiarObjeto(datos) : undefined
    if (import.meta.env.DEV) {
      console.debug(`[Solventa] ${msg}`, limpio ?? '')
    }
  },

  info(mensaje: string, datos?: Record<string, unknown>): void {
    const msg = limpiarTexto(mensaje)
    const limpio = datos ? limpiarObjeto(datos) : undefined
    if (import.meta.env.DEV) {
      console.info(`[Solventa] ${msg}`, limpio ?? '')
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
