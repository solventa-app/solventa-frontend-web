// «Fuentes consultadas» del menú (W01-04) cuando la oferta no está en memoria (recarga, sesión nueva): trae del backend
// la oferta de la propuesta más reciente de la persona y su detalle de fuentes. Un aviso `propuesta` la refresca.
import { reactive } from 'vue'
import { ejecutar } from '../graphql/cliente'
import type { Oferta, Propuesta } from '../graphql/tipos'

const ULTIMA = `query ultimaPropuesta { propuestas(pagina: 1, tamano: 1) { propuestas { id ofertaId } } }`
const OFERTA = `query oferta($id: ID!) {
  oferta(id: $id) { id tipo cobertura { valor moneda } fuentes { id nombre origen estado capturadoEn } }
}`

export function useUltimaConsulta(fetchFn: typeof fetch = fetch) {
  const estado = reactive({ oferta: null as Oferta | null, cargando: false })
  let peticion = 0

  async function cargar(opciones: { silencioso?: boolean } = {}): Promise<void> {
    const esta = ++peticion
    if (!opciones.silencioso) estado.cargando = true
    try {
      const ultima = await ejecutar<{ propuestas: { propuestas: Pick<Propuesta, 'id' | 'ofertaId'>[] } }>(
        ULTIMA,
        {},
        fetchFn,
      )
      const ofertaId = ultima.propuestas.propuestas[0]?.ofertaId
      if (!ofertaId) return
      const datos = await ejecutar<{ oferta: Oferta | null }>(OFERTA, { id: ofertaId }, fetchFn)
      if (esta === peticion && datos.oferta) estado.oferta = datos.oferta
    } catch {
      // Sin la consulta, la pantalla muestra el estado vacío con el camino a una cotización nueva.
    } finally {
      if (esta === peticion) estado.cargando = false
    }
  }

  return { estado, cargar }
}
