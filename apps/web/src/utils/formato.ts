// Formato de valores monetarios y de fecha para la UI (HU-W05). Siempre vía Intl.*, nunca
// concatenando separadores de miles a mano (CLAUDE.md, regla de datos monetarios y PII).
// Esta rama (feature/HU-W05-conciliacion) no reutiliza utils/ de otra rama: cada rama de historia
// es independiente (ver docs/convenciones.md, "un PR cuenta una sola historia"), así que solo se
// crea aquí lo que esta pantalla necesita (nada de formatearRangoMonto/formatearPorcentaje, que son
// de HU-W01 y no se usan en conciliación de pagos).
import type { Monto } from '../graphql/tipos'

export function formatearMonto(monto: Monto): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: monto.moneda,
    maximumFractionDigits: 0,
  }).format(Number(monto.valor))
}

export function formatearFecha(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}
