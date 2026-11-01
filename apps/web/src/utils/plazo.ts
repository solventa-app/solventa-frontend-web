// Tiempo que falta para un plazo, siempre con minutos: el operador debe ver que la cuenta avanza.
import { t } from '../i18n'

export function textoRestante(ms: number): string {
  if (ms <= 0) return t('siniestros.detalle.vencido')
  const minutos = Math.floor(ms / 60_000)
  const horas = Math.floor(minutos / 60)
  const m = minutos % 60
  if (horas >= 24) return t('siniestros.detalle.tiempoDias', { d: Math.floor(horas / 24), h: horas % 24, m })
  return t('siniestros.detalle.tiempoHoras', { h: horas, m })
}
