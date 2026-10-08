// Formateo de dinero (CLAUDE.md regla 7: nunca concatenar el símbolo a mano, siempre Intl.NumberFormat).
// `Monto.valor` llega del contrato como texto decimal ("48500.00"), nunca float (ver contrato/schema.graphql).
import type { Monto } from '../graphql/tipos'

export function formatearMonto(monto: Pick<Monto, 'valor' | 'moneda'>): string {
  const numero = Number(monto.valor)
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: monto.moneda,
    maximumFractionDigits: 0,
  }).format(numero)
}

export function formatearRangoMonto(minima: Pick<Monto, 'valor' | 'moneda'>, maxima: Pick<Monto, 'valor' | 'moneda'>): string {
  return `${formatearMonto(minima)} — ${formatearMonto(maxima)}`
}

export function formatearFecha(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
}

export function formatearPorcentaje(peso: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'percent', maximumFractionDigits: 0 }).format(peso)
}
