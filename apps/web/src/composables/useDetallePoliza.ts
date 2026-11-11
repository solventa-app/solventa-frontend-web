// Detalle de una póliza (G-06b), para el CLIENTE titular y el ASESOR que la aceptó. Un solo `propuesta(id)`: el BFF ya
// filtra por rol (el nombre del titular solo llega al asesor; una propuesta ajena responde igual que una inexistente).
import { reactive } from 'vue'
import { ejecutar, pdfDeSesion } from '../graphql/cliente'
import type { Propuesta } from '../graphql/tipos'
import { t } from '../i18n'

const CONSULTA = `query propuesta($id: ID!) {
  propuesta(id: $id) {
    id ofertaId estado estadoVisible polizaId nombreTitular actualizadoEn creadaEn plazoMeses
    motivoEstado mensajeEstado accionSugerida
    prima { valor moneda } cobertura { valor moneda }
    poliza { id numero estado vigenciaDesde vigenciaHasta documentoUrl ramo }
  }
}`

export function useDetallePoliza(fetchFn: typeof fetch = fetch) {
  const estado = reactive({
    propuesta: null as Propuesta | null,
    cargando: false,
    /** `null` si cargó; 'no-encontrada' si el BFF devolvió null (inexistente o ajena); 'error' ante una falla. */
    problema: null as 'no-encontrada' | 'error' | null,
    mensajeError: null as string | null,
  })
  let peticion = 0

  async function cargar(id: string, opciones: { silencioso?: boolean } = {}): Promise<void> {
    const esta = ++peticion
    if (!opciones.silencioso) {
      estado.cargando = true
      estado.problema = null
      estado.mensajeError = null
    }
    try {
      const datos = await ejecutar<{ propuesta: Propuesta | null }>(CONSULTA, { id }, fetchFn)
      if (esta !== peticion) return
      estado.propuesta = datos.propuesta
      estado.problema = datos.propuesta ? null : 'no-encontrada'
    } catch {
      if (esta !== peticion || opciones.silencioso) return
      estado.problema = 'error'
      estado.mensajeError = t('detallePoliza.error')
    } finally {
      if (esta === peticion) estado.cargando = false
    }
  }

  /** Devuelve un `blob:` con el PDF de la póliza, o null si no se pudo traer. */
  function pdf(ruta: string): Promise<string | null> {
    return pdfDeSesion(ruta, fetchFn)
  }

  return { estado, cargar, pdf }
}
