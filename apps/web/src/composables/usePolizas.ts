// «Mis pólizas» (cliente) y «Pólizas emitidas» (asesor), G-06. Pagina en el servidor (`propuestas`) y se mantiene al
// día con los avisos `propuesta` del SSE: una fila conocida se actualiza al instante; una desconocida (otra pestaña
// o el cliente que acaba de pagar) pide la página otra vez, en silencio.
import { reactive } from 'vue'
import { ejecutar, pdfDeSesion } from '../graphql/cliente'
import type { EstadoVisible, Propuesta } from '../graphql/tipos'
import { t } from '../i18n'
import type { AvisoPropuesta } from './useAvisos'

const CAMPOS = `id ofertaId estado estadoVisible polizaId nombreTitular actualizadoEn plazoMeses
  prima { valor moneda } cobertura { valor moneda }
  poliza { id numero estado vigenciaDesde vigenciaHasta documentoUrl }`
const CONSULTA = `query propuestas($estado: EstadoVisible, $pagina: Int, $tamano: Int) {
  propuestas(estado: $estado, pagina: $pagina, tamano: $tamano) { propuestas { ${CAMPOS} } total pagina tamano }
}`

export const TAMANO_PAGINA_POLIZAS = 10
const ESPERA_RECARGA_MS = 1_000

export function usePolizas(fetchFn: typeof fetch = fetch) {
  const estado = reactive({
    propuestas: [] as Propuesta[],
    total: 0,
    pagina: 1,
    filtro: undefined as EstadoVisible | undefined,
    cargando: false,
    error: null as string | null,
  })
  let peticion = 0
  let recarga: ReturnType<typeof setTimeout> | undefined

  async function cargar(opciones: { silencioso?: boolean } = {}): Promise<void> {
    const esta = ++peticion
    if (!opciones.silencioso) {
      estado.cargando = true
      estado.error = null
    }
    try {
      const datos = await ejecutar<{ propuestas: { propuestas: Propuesta[]; total: number } }>(
        CONSULTA,
        { estado: estado.filtro ?? null, pagina: estado.pagina, tamano: TAMANO_PAGINA_POLIZAS },
        fetchFn,
      )
      if (esta !== peticion) return // llegó otra consulta después: esta quedó vieja
      estado.propuestas = datos.propuestas.propuestas
      estado.total = datos.propuestas.total
    } catch {
      if (esta !== peticion || opciones.silencioso) return // en silencio se conserva la tabla que ya había
      estado.error = t('polizas.error')
    } finally {
      if (esta === peticion) estado.cargando = false
    }
  }

  function filtrar(filtro: EstadoVisible | undefined): Promise<void> {
    estado.filtro = filtro
    estado.pagina = 1
    return cargar()
  }

  function irAPagina(pagina: number): Promise<void> {
    estado.pagina = pagina
    return cargar()
  }

  function aplicarAviso(aviso: AvisoPropuesta): void {
    const fila = estado.propuestas.find((p) => p.id === aviso.propuestaId)
    const cambiaElFiltro = !!estado.filtro && !!aviso.estadoVisible && aviso.estadoVisible !== estado.filtro
    if (fila && !cambiaElFiltro) {
      fila.estado = aviso.estado
      if (aviso.estadoVisible) fila.estadoVisible = aviso.estadoVisible
      if (aviso.polizaId) fila.polizaId = aviso.polizaId
      // El documento y las fechas de la póliza los trae la consulta, no el aviso.
      if (aviso.polizaId && !fila.poliza?.documentoUrl) programarRecarga()
      return
    }
    programarRecarga()
  }

  function programarRecarga(): void {
    clearTimeout(recarga)
    recarga = setTimeout(() => void cargar({ silencioso: true }), ESPERA_RECARGA_MS)
  }

  function detener(): void {
    clearTimeout(recarga)
  }

  /** Devuelve un `blob:` con el PDF de la póliza, o null si no se pudo traer. */
  function pdf(ruta: string): Promise<string | null> {
    return pdfDeSesion(ruta, fetchFn)
  }

  return { estado, cargar, filtrar, irAPagina, aplicarAviso, detener, pdf }
}
