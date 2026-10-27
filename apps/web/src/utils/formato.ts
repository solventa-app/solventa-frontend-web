// Formateo de dinero (CLAUDE.md regla 7: nunca concatenar el símbolo a mano, siempre Intl.NumberFormat).
// `Monto.valor` llega como texto decimal ("48500.00") y se le pasa así a Intl, que formatea cadenas
// numéricas sin pasarlas por float: no se pierde precisión en montos grandes.
// El locale sigue al idioma del selector del header (src/i18n): es-CO en español, en-US en inglés.
import type { Monto } from '../graphql/tipos'
import { idioma, localeIntl } from '../i18n'

export function formatearMonto(monto: Pick<Monto, 'valor' | 'moneda'>): string {
  return new Intl.NumberFormat(localeIntl(), {
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
const MESES_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Formato del prototipo (W05-01, nodo 2001:3156): "12 sep 2026, 10:45 a. m.", siempre en hora de Bogotá.
// Se arma con formatToParts porque es-CO da "sept" y el día sin cero a la izquierda. En inglés:
// "Sep 12, 2026, 10:45 AM", con la misma hora de Bogotá.
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
  const anio = obtener('year')
  const tarde = obtener('dayPeriod').toLowerCase().startsWith('p')
  if (idioma.value === 'EN') {
    const mesEn = MESES_EN[Number(obtener('month')) - 1]
    return `${mesEn} ${dia}, ${anio}, ${obtener('hour')}:${obtener('minute')} ${tarde ? 'PM' : 'AM'}`
  }
  const mes = MESES[Number(obtener('month')) - 1]
  const periodo = tarde ? 'p. m.' : 'a. m.'
  return `${dia} ${mes} ${anio}, ${obtener('hour')}:${obtener('minute')} ${periodo}`
}

/** Solo la hora, en hora de Bogotá, con el formato de `formatearFecha`: "10:45 a. m." / "10:45 AM" (HU-W03). */
export function formatearHora(iso: string): string {
  const completa = formatearFecha(iso)
  return completa.slice(completa.lastIndexOf(', ') + 2)
}

export function formatearPorcentaje(peso: number): string {
  return new Intl.NumberFormat(localeIntl(), { style: 'percent', maximumFractionDigits: 0 }).format(peso)
}

// Solo la fecha, como la columna "Fecha" de W04-01 (Figma 2001:2402): "12 sep 2026" / "Sep 12, 2026", en hora
// de Bogotá y con el día a dos dígitos. Reusa las abreviaturas de `formatearFecha` (sin el punto de es-CO).
export function formatearFechaCorta(iso: string): string {
  const partes = new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(new Date(iso))
  const obtener = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? ''
  const dia = obtener('day').padStart(2, '0')
  const mes = Number(obtener('month')) - 1
  if (idioma.value === 'EN') return `${MESES_EN[mes]} ${dia}, ${obtener('year')}`
  return `${dia} ${MESES[mes]} ${obtener('year')}`
}

/**
 * Quita el punto final (y espacios) de un dato que va al final de una frase del catálogo, para no pintar
 * "S.A.S.." cuando la frase ya cierra con punto (decisión del diseñador, HU-W04).
 */
export function sinPuntoFinal(texto: string): string {
  return texto.trim().replace(/\.+$/, '')
}
