// Estado compartido de conciliación de pagos (HU-W05): singleton a nivel de módulo, como useCotizacion.ts,
// para que la lista sobreviva la navegación entre G-02b y W05-01. Se trae la lista completa una vez y el
// filtro por pestaña se hace en la vista: para el volumen de un back-office evita una ida al BFF por clic
// y mantiene correcto el contador de "Todos". `cobros` exige un token BACKOFFICE en el BFF.
import { reactive } from 'vue'
import { ErrorGraphQL, ejecutar } from '../graphql/cliente'
import type { Cobro, EstadoCobro } from '../graphql/tipos'
import type { AvisoCobro } from './useAvisos'
import { t } from '../i18n'

const COBROS = `query cobros($estado: EstadoCobro, $pagina: Int, $tamano: Int) {
  cobros(estado: $estado, pagina: $pagina, tamano: $tamano) {
    id
    cliente { id nombre }
    polizaId
    estado
    monto { valor moneda }
    actualizadoEn
    idTransaccion
    motivo
    reintentosRestantes
    origen
    medio { marca tipo }
  }
}`

const REINTENTAR_COBRO = `mutation reintentarCobro($cobroId: ID!) {
  reintentarCobro(cobroId: $cobroId) {
    id
    cliente { id nombre }
    polizaId
    estado
    monto { valor moneda }
    actualizadoEn
    idTransaccion
    motivo
    reintentosRestantes
    origen
    medio { marca tipo }
  }
}`

interface EstadoConciliacion {
  cobros: Cobro[]
  cargando: boolean
  error: string | null
  /** Error de un reintento puntual; separado de `error` para no ocultar la tabla ya cargada. */
  errorReintento: string | null
  /** id del cobro que se está reintentando, para deshabilitar solo su botón (no toda la tabla). */
  reintentando: string | null
}

const estado = reactive<EstadoConciliacion>({
  cobros: [],
  cargando: false,
  error: null,
  errorReintento: null,
  reintentando: null,
})

/**
 * Mensaje para el usuario: el del BFF solo si salió de un resolutor (trae `path`), p. ej. "Se agotaron los 3
 * reintentos…": esos los escribe el BFF para el usuario. Un error de validación del esquema (sin `path`),
 * "Unexpected error." (falla interna enmascarada), la red o un HTTP de error dan el genérico (regla 5).
 */
function mensajeParaUsuario(error: unknown, generico: string): string {
  if (!(error instanceof ErrorGraphQL)) return generico
  const primero = error.errores[0] as { path?: unknown } | undefined
  const deResolutor = Array.isArray(primero?.path) && primero.path.length > 0
  return deResolutor && error.message !== 'Unexpected error.' ? error.message : generico
}

const TAMANO_LOTE_COBROS = 100

// Un lote de avisos pide la lista una sola vez.
const ESPERA_RECARGA_MS = 1_000
let recargaPendiente: ReturnType<typeof setTimeout> | undefined

// Cuenta los reintentos manuales (empezados y terminados): una recarga silenciosa que se cruza con uno
// trae datos de antes del reintento y se descarta, para no devolver el cobro a su estado anterior.
let generacion = 0

export function useConciliacion(fetchFn: typeof fetch = fetch) {
  /**
   * `silencioso`: recarga en segundo plano (la tabla se refresca sola). No muestra "Cargando…", no borra la
   * tabla ni muestra un error si falla (se conserva lo que ya hay y se reintenta en el próximo ciclo).
   */
  // El BFF pagina (10 por defecto) y la vista filtra y cuenta sobre la lista completa: se piden todas las páginas.
  async function traerCobros(variables: Record<string, unknown>): Promise<Cobro[]> {
    if (variables.pagina !== undefined) {
      return (await ejecutar<{ cobros: Cobro[] }>(COBROS, variables, fetchFn)).cobros
    }
    const cobros: Cobro[] = []
    for (let pagina = 1; ; pagina++) {
      const r = await ejecutar<{ cobros: Cobro[] }>(
        COBROS,
        { ...variables, pagina, tamano: TAMANO_LOTE_COBROS },
        fetchFn,
      )
      cobros.push(...r.cobros)
      if (r.cobros.length < TAMANO_LOTE_COBROS) return cobros
    }
  }

  async function cargarCobros(
    filtro?: EstadoCobro,
    opciones: { silencioso?: boolean; pagina?: number; tamano?: number } = {},
  ) {
    const silencioso = opciones.silencioso === true
    if (silencioso && estado.reintentando !== null) return
    const generacionAlEmpezar = generacion
    if (!silencioso) {
      estado.cargando = true
      estado.error = null
    }
    try {
      const variables: Record<string, unknown> = {}
      if (filtro !== undefined) variables.estado = filtro
      if (opciones.pagina !== undefined) variables.pagina = opciones.pagina
      if (opciones.tamano !== undefined) variables.tamano = opciones.tamano

      const cobros = await traerCobros(variables)
      if (silencioso && (generacion !== generacionAlEmpezar || estado.reintentando !== null)) return
      estado.cobros = cobros
    } catch {
      // Nunca se muestra el error técnico/5xx crudo al usuario (CLAUDE.md regla 5).
      if (!silencioso) estado.error = t('conciliacion.errorCarga')
    } finally {
      if (!silencioso) estado.cargando = false
    }
  }

  async function reintentarCobro(cobroId: string) {
    estado.reintentando = cobroId
    estado.errorReintento = null
    generacion++
    try {
      const r = await ejecutar<{ reintentarCobro: Cobro }>(REINTENTAR_COBRO, { cobroId }, fetchFn)
      const indice = estado.cobros.findIndex((c) => c.id === cobroId)
      if (indice !== -1) estado.cobros.splice(indice, 1, r.reintentarCobro)
    } catch (error) {
      estado.errorReintento = mensajeParaUsuario(error, t('conciliacion.errorReintento'))
    } finally {
      estado.reintentando = null
      generacion++
    }
  }

  /**
   * Un aviso de cobro (W05-A6) cambia solo su fila, y los filtros, que son en el navegador, la recalculan. El aviso no
   * trae el motivo ni los reintentos: un estado final y un cobro nuevo (recurrente) piden la lista en silencio.
   */
  function aplicarAviso(aviso: AvisoCobro) {
    const cobro = estado.cobros.find((c) => c.id === aviso.cobroId)
    if (cobro) {
      cobro.estado = aviso.estado
      cobro.actualizadoEn = new Date().toISOString()
    }
    if (cobro && aviso.estado !== 'COBRADO' && aviso.estado !== 'RECHAZADO') return
    clearTimeout(recargaPendiente)
    recargaPendiente = setTimeout(() => void cargarCobros(undefined, { silencioso: true }), ESPERA_RECARGA_MS)
  }

  return { estado, cargarCobros, reintentarCobro, aplicarAviso }
}
