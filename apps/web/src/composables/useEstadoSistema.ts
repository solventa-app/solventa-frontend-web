// Estado del sistema para el BACKOFFICE (W07-04, plan-hu-w07-front.md 5.6): la consulta GraphQL `estadoSistema(ventana)`
// del contrato v0.22, solo BACKOFFICE. Se recarga sola cada 30 s, como W05-01 (`silencioso`): sin «Cargando…», conserva
// los datos si falla y descarta una respuesta que llegue después de un cambio de ventana. Nunca un error técnico (regla 5).
import { reactive } from 'vue'
import { ejecutar } from '../graphql/cliente'
import type { EstadoSistema } from '../graphql/tipos'
import type { Estado, Ventana } from '../api/socios'
import { t } from '../i18n'

const CONSULTA = `query estadoSistema($ventana: String) {
  estadoSistema(ventana: $ventana) {
    porcentaje color disponibilidad latenciaMediaMs ventana calculadoEn
    apis { nombre porcentaje color micros externas { nombre estado } }
    micros { nombre peso porcentaje color responde sinTrafico disponibilidad latenciaMediaMs latenciaP95Ms }
  }
}`

interface EstadoPantalla {
  ventana: Ventana
  datos: EstadoSistema | null
  cargando: boolean
  error: string | null
}

const estado = reactive<EstadoPantalla>({ ventana: '1h', datos: null, cargando: false, error: null })
let generacion = 0

/** Solo para pruebas: deja el estado como al cargar el módulo. */
export function reiniciarEstadoSistema(): void {
  Object.assign(estado, { ventana: '1h', datos: null, cargando: false, error: null })
  generacion = 0
}

/**
 * La caja de estado es la misma del panel del socio (TarjetaEstado, con la forma de `GET /v1/estado`): se adapta la
 * respuesta de GraphQL a esa forma, sin los micros.
 */
export function comoEstadoGeneral(datos: EstadoSistema): Estado {
  return {
    general: {
      porcentaje: datos.porcentaje,
      color: datos.color,
      disponibilidad: datos.disponibilidad ?? null,
      latenciaMediaMs: datos.latenciaMediaMs ?? null,
      ventana: datos.ventana as Ventana,
    },
    apis: datos.apis.map((api) => ({
      api: api.nombre as Estado['apis'][number]['api'],
      porcentaje: api.porcentaje,
      color: api.color,
    })),
    verificadoEn: datos.calculadoEn,
  }
}

export function useEstadoSistema(fetchFn: typeof fetch = fetch) {
  async function cargar(opciones: { silencioso?: boolean } = {}) {
    const silencioso = opciones.silencioso === true
    const propia = ++generacion
    if (!silencioso) {
      estado.cargando = true
      estado.error = null
    }
    try {
      const r = await ejecutar<{ estadoSistema: EstadoSistema }>(CONSULTA, { ventana: estado.ventana }, fetchFn)
      if (propia !== generacion) return
      estado.datos = r.estadoSistema
      estado.error = null
    } catch {
      if (propia !== generacion) return
      // En silencio se conservan los datos que ya había; si no hay datos, se muestra el error con reintento.
      if (!silencioso || !estado.datos) estado.error = t('estadoSistema.errorCarga')
    } finally {
      if (propia === generacion) estado.cargando = false
    }
  }

  async function cambiarVentana(ventana: Ventana) {
    if (estado.ventana === ventana) return
    estado.ventana = ventana
    await cargar()
  }

  return { estado, cargar, cambiarVentana }
}
