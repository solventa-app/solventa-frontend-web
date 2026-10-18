// Formateo de dinero (CLAUDE.md regla 7: nunca concatenar el símbolo a mano, siempre Intl.NumberFormat).
// `Monto.valor` llega como texto decimal ("48500.00") y se le pasa así a Intl, que formatea cadenas
// numéricas sin pasarlas por float: no se pierde precisión en montos grandes.
import type { Monto } from '../graphql/tipos'

export function formatearMonto(monto: Pick<Monto, 'valor' | 'moneda'>): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: monto.moneda,
    maximumFractionDigits: 0,
  }).format(monto.valor as Intl.StringNumericLiteral)
}

export function formatearRangoMonto(
  minima: Pick<Monto, 'valor' | 'moneda'>,
  maxima: Pick<Monto, 'valor' | 'moneda'>,
): string {
  return `${formatearMonto(minima)} — ${formatearMonto(maxima)}`
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// Formato del prototipo (W05-01, nodo 2001:3156): "12 sep 2026, 10:45 a. m.", siempre en hora de Bogotá.
// Se arma con formatToParts porque es-CO da "sept" y el día sin cero a la izquierda.
export function formatearFecha(iso: string): string {
  const partes = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(new Date(iso))
  const obtener = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? ''
  const dia = obtener('day').padStart(2, '0')
  const mes = MESES[Number(obtener('month')) - 1]
  const anio = obtener('year')
  const periodo = obtener('dayPeriod').toLowerCase().startsWith('p') ? 'p. m.' : 'a. m.'
  return `${dia} ${mes} ${anio}, ${obtener('hour')}:${obtener('minute')} ${periodo}`
}

export function formatearPorcentaje(peso: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'percent', maximumFractionDigits: 0 }).format(peso)
}
