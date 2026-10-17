// Estado compartido de conciliación de pagos (HU-W05): singleton a nivel de módulo, como useCotizacion.ts,
// para que la lista sobreviva la navegación entre G-02b y W05-01. Se trae la lista completa una vez y el
// filtro por pestaña se hace en la vista: para el volumen de un back-office evita una ida al BFF por clic
// y mantiene correcto el contador de "Todos". `cobros` exige un token BACKOFFICE en el BFF.
import { reactive } from 'vue'
import { ejecutar } from '../graphql/cliente'
import type { Cobro, EstadoCobro } from '../graphql/tipos'

const COBROS = `query cobros($estado: EstadoCobro) {
  cobros(estado: $estado) {
    id
    cliente { id nombre }
    polizaId
    estado
    monto { valor moneda }
    actualizadoEn
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

export function useConciliacion(fetchFn: typeof fetch = fetch) {
  async function cargarCobros(filtro?: EstadoCobro) {
    estado.cargando = true
    estado.error = null
    try {
      const r = await ejecutar<{ cobros: Cobro[] }>(COBROS, { estado: filtro }, fetchFn)
      estado.cobros = r.cobros
    } catch {
      // Nunca se muestra el error técnico/5xx crudo al usuario (CLAUDE.md regla 5).
      estado.error = 'No pudimos cargar la conciliación de pagos en este momento.'
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
    } catch {
      estado.errorReintento = 'No pudimos reintentar el cobro en este momento.'
    } finally {
      estado.reintentando = null
    }
  }

  return { estado, cargarCobros, reintentarCobro }
}
