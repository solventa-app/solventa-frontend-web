import type { EstadoVisible, Propuesta } from '../graphql/tipos'

/** El estado que ve la persona: el que manda el BFF (v0.18) o, si falta, el derivado del estado de la propuesta. */
export function estadoVisibleDe(p: Pick<Propuesta, 'estado' | 'estadoVisible'>): EstadoVisible {
  return (
    p.estadoVisible ?? (p.estado === 'EMITIDA' ? 'EMITIDA' : p.estado === 'NO_EMITIDA' ? 'NO_EMITIDA' : 'EMITIENDO')
  )
}
