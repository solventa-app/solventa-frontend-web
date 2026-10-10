// Formato de valores monetarios y de fecha para la UI (HU-W05). Siempre vía Intl.*, nunca
// concatenando separadores de miles a mano (CLAUDE.md, regla de datos monetarios y PII).
import type { Monto } from '../graphql/tipos'

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function formatearMonto(monto: Monto): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: monto.moneda,
    maximumFractionDigits: 0,
  }).format(Number(monto.valor))
}

// Formato "05 sep, 09:14" (día, mes abreviado de 3 letras, hora 24h) fiel al prototipo de alta
// fidelidad (W05-01). El Intl.DateTimeFormat de Node con locale es-CO no deja el día en 2 dígitos
// ni el mes en 3 letras directamente (da "sept" y sin cero a la izquierda), así que se arma a mano
// a partir de formatToParts en vez de confiar en el string por defecto del locale. Siempre en hora
// de Bogotá (America/Bogota), sin importar en qué huso corra el servidor/navegador.
export function formatearFecha(iso: string): string {
  const partes = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso))
  const obtener = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? ''
  const dia = obtener('day').padStart(2, '0')
  const mes = MESES[Number(obtener('month')) - 1]
  return `${dia} ${mes}, ${obtener('hour')}:${obtener('minute')}`
}
