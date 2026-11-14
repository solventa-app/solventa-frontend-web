import type { EstadoVisible, Propuesta } from '../graphql/tipos'

/** El estado que ve la persona: el que manda el BFF (v0.18) o, si falta, el derivado del estado de la propuesta. */
export function estadoVisibleDe(p: Pick<Propuesta, 'estado' | 'estadoVisible'>): EstadoVisible {
  return (
    p.estadoVisible ?? (p.estado === 'EMITIDA' ? 'EMITIDA' : p.estado === 'NO_EMITIDA' ? 'NO_EMITIDA' : 'EMITIENDO')
  )
}

/**
 * Los estados en que el CLIENTE todavía tiene algo que hacer en su sesión: firmar, o pagar (también tras un pago que
 * falló o quedó pendiente). Los demás son de espera (revisión de UNDER) o terminales.
 */
const ESTADOS_QUE_EL_CLIENTE_CONTINUA: Propuesta['estado'][] = [
  'EN_FIRMA',
  'FIRMADA',
  'PAGO_RECHAZADO',
  'PENDIENTE_PAGO',
]

/**
 * A dónde lleva «Continuar» al CLIENTE con una propuesta a medias: la página de firma de su sesión, que lee el estado
 * y lo lleva al paso que le toca («retoma donde iba», W03-22). `null` si no hay nada que continuar.
 */
export function rutaParaContinuar(p: Pick<Propuesta, 'id' | 'estado'>): string | null {
  return ESTADOS_QUE_EL_CLIENTE_CONTINUA.includes(p.estado) ? `/propuestas/${p.id}/firma` : null
}
