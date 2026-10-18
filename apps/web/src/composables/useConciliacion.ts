// Estado compartido de conciliación de pagos (HU-W05): singleton a nivel de módulo, como useCotizacion.ts,
// para que la lista sobreviva la navegación entre G-02b y W05-01. Se trae la lista completa una vez y el
// filtro por pestaña se hace en la vista: para el volumen de un back-office evita una ida al BFF por clic
// y mantiene correcto el contador de "Todos". `cobros` exige un token BACKOFFICE en el BFF.
import { reactive } from 'vue'
import { ErrorGraphQL, ejecutar } from '../graphql/cliente'
import type { Cobro, EstadoCobro } from '../graphql/tipos'

const COBROS = `query cobros($estado: EstadoCobro) {
  cobros(estado: $estado) {
    id
    cliente { id nombre }
    polizaId
    estado
    monto { valor moneda }
    actualizadoEn
    idTransaccion
    motivo
    reintentosRestantes
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

// Cuenta los reintentos manuales (empezados y terminados): una recarga silenciosa que se cruza con uno
// trae datos de antes del reintento y se descarta, para no devolver el cobro a su estado anterior.
let generacion = 0

export function useConciliacion(fetchFn: typeof fetch = fetch) {
  /**
   * `silencioso`: recarga en segundo plano (la tabla se refresca sola). No muestra "Cargando…", no borra la
   * tabla ni muestra un error si falla (se conserva lo que ya hay y se reintenta en el próximo ciclo).
   */
  async function cargarCobros(filtro?: EstadoCobro, opciones: { silencioso?: boolean } = {}) {
    const silencioso = opciones.silencioso === true
    if (silencioso && estado.reintentando !== null) return
    const generacionAlEmpezar = generacion
    if (!silencioso) {
      estado.cargando = true
      estado.error = null
    }
    try {
      const r = await ejecutar<{ cobros: Cobro[] }>(COBROS, { estado: filtro }, fetchFn)
      if (silencioso && (generacion !== generacionAlEmpezar || estado.reintentando !== null)) return
      estado.cobros = r.cobros
    } catch {
      // Nunca se muestra el error técnico/5xx crudo al usuario (CLAUDE.md regla 5).
      if (!silencioso) estado.error = 'No pudimos cargar la conciliación de pagos en este momento.'
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
      estado.errorReintento = mensajeParaUsuario(error, 'No pudimos reintentar el cobro en este momento.')
    } finally {
      estado.reintentando = null
      generacion++
    }
  }

  return { estado, cargarCobros, reintentarCobro }
}
