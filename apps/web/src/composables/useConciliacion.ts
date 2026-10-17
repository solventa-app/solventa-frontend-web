// Estado compartido de conciliación de pagos (HU-W05), mismo patrón que useCotizacion.ts (HU-W01):
// objeto reactive() a nivel de módulo (singleton) para que la lista de cobros sobreviva la
// navegación entre G-02b y W05-01, con fetchFn inyectable para pruebas (ver tests/mocks.test.ts).
//
// Decisión de alcance: el contrato (contrato/schema.graphql) permite filtrar `cobros(estado:)` en
// el servidor, pero aquí se trae la lista completa una sola vez y el filtrado por pestaña
// (Todos/Cobrando/Cobrado/Rechazado/Pendiente de reintento) se hace en la vista, en memoria. Para
// el tamaño de datos de un back-office (decenas, no miles, de cobros por corte) evita una ida y
// vuelta al BFF por cada clic de pestaña y mantiene el contador de "Todos" siempre correcto. El
// argumento `estado` de cargarCobros() se deja disponible por si una pantalla futura sí necesita
// paginar/filtrar en servidor.
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
    idTransaccion
    actualizadoEn
    motivo
    intentos
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
    idTransaccion
    actualizadoEn
    motivo
    intentos
    reintentosRestantes
  }
}`

interface EstadoConciliacion {
  cobros: Cobro[]
  cargando: boolean
  error: string | null
  /**
   * Error de un reintento puntual, separado de `error` (que es solo para fallas de cargarCobros):
   * antes ambos compartían el mismo campo, así que un reintento fallido reemplazaba la tabla entera
   * por el mensaje de error de carga (v-else-if="estado.error" en la vista), ocultando también las
   * pestañas, el pie y el bloque legal — aunque los demás cobros sí se habían cargado bien.
   */
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
 * Mensaje para el usuario: el del BFF solo si salió de un resolutor (trae `path`), p. ej. "Debes iniciar
 * sesión." o "Se agotaron los 3 reintentos…": esos los escribe el BFF para el usuario. Un error de
 * validación del esquema (sin `path`), "Unexpected error." (falla interna enmascarada), la red o un HTTP
 * de error dan el genérico. Nunca el texto técnico crudo (CLAUDE.md regla 5).
 */
function mensajeParaUsuario(error: unknown, generico: string): string {
  if (!(error instanceof ErrorGraphQL)) return generico
  const primero = error.errores[0] as { message?: string; path?: unknown } | undefined
  const deResolutor = Array.isArray(primero?.path) && primero.path.length > 0
  return deResolutor && error.message !== 'Unexpected error.' ? error.message : generico
}

export function useConciliacion(fetchFn: typeof fetch = fetch) {
  async function cargarCobros(filtro?: EstadoCobro) {
    estado.cargando = true
    estado.error = null
    try {
      const r = await ejecutar<{ cobros: Cobro[] }>(COBROS, { estado: filtro }, fetchFn)
      estado.cobros = r.cobros
    } catch (error) {
      // Nunca se muestra el error técnico/5xx crudo al usuario (CLAUDE.md regla 5).
      estado.error = mensajeParaUsuario(error, 'No pudimos cargar la conciliación de pagos en este momento.')
    } finally {
      estado.cargando = false
    }
  }

  async function reintentarCobro(cobroId: string) {
    estado.reintentando = cobroId
    estado.errorReintento = null
    try {
      const r = await ejecutar<{ reintentarCobro: Cobro }>(REINTENTAR_COBRO, { cobroId }, fetchFn)
      const indice = estado.cobros.findIndex((c) => c.id === cobroId)
      if (indice !== -1) estado.cobros.splice(indice, 1, r.reintentarCobro)
    } catch (error) {
      estado.errorReintento = mensajeParaUsuario(error, 'No pudimos reintentar el cobro en este momento.')
    } finally {
      estado.reintentando = null
    }
  }

  return { estado, cargarCobros, reintentarCobro }
}
