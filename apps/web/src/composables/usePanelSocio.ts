// Estado del panel del socio (W07-02, plan-hu-w07-front.md 5.3). Cada sección (credenciales, consumo, estado y
// ventas) carga por separado y tiene su propio error con reintento: si una falla, las demás se siguen viendo. Un 401
// con la sesión abierta significa que el token venció: se cierra la sesión técnica con el aviso y la vista vuelve al
// ingreso. Nunca se muestra un error técnico (regla 5): los mensajes salen de ErrorSocios.
import { reactive } from 'vue'
import {
  ErrorSocios,
  obtenerConsumo,
  obtenerCredenciales,
  obtenerEstado,
  obtenerVentas,
  pedirToken,
  rotarCredencial,
  type Consumo,
  type Credencial,
  type Credenciales,
  type Entorno,
  type Estado,
  type Ventana,
  type Ventas,
} from '../api/socios'
import { t } from '../i18n'
import { useSesionSocio } from './useSesionSocio'

type Seccion = 'credenciales' | 'consumo' | 'estado' | 'ventas'

export interface TokenGenerado {
  entorno: Entorno
  token: string
  expiraEn: number
}

interface EstadoPanel {
  entorno: Entorno
  ventana: Ventana
  credenciales: Credenciales | null
  consumo: Consumo | null
  salud: Estado | null
  ventas: Ventas | null
  cargando: Record<Seccion, boolean>
  error: Record<Seccion, string | null>
  /** El backend respondió 401: la vista vuelve al ingreso (el aviso ya quedó en la sesión técnica). */
  sesionVencida: boolean
}

function estadoInicial(): EstadoPanel {
  const porSeccion = <T>(valor: T): Record<Seccion, T> => ({
    credenciales: valor,
    consumo: valor,
    estado: valor,
    ventas: valor,
  })
  return {
    entorno: 'PRODUCCION',
    ventana: '1h',
    credenciales: null,
    consumo: null,
    salud: null,
    ventas: null,
    cargando: porSeccion(false),
    error: porSeccion<string | null>(null),
    sesionVencida: false,
  }
}

const estado = reactive<EstadoPanel>(estadoInicial())

/** Solo para pruebas: deja el estado como al cargar el módulo. */
export function reiniciarPanelSocio(): void {
  Object.assign(estado, estadoInicial())
}

export function usePanelSocio(fetchFn: typeof fetch = fetch) {
  const sesion = useSesionSocio(fetchFn)

  function mensajeDe(error: unknown): string {
    if (error instanceof ErrorSocios && error.codigo === 'NO_AUTORIZADO') {
      sesion.vencerSesion()
      estado.sesionVencida = true
    }
    return error instanceof ErrorSocios ? error.message : t('socios.error.generico')
  }

  async function cargar<T>(seccion: Seccion, pedir: (token: string) => Promise<T>, guardar: (valor: T) => void) {
    const token = sesion.estado.token
    if (!token) return
    estado.cargando[seccion] = true
    estado.error[seccion] = null
    try {
      guardar(await pedir(token))
    } catch (error) {
      estado.error[seccion] = mensajeDe(error)
    } finally {
      estado.cargando[seccion] = false
    }
  }

  const cargarCredenciales = () =>
    cargar(
      'credenciales',
      (token) => obtenerCredenciales(token, fetchFn),
      (valor) => {
        estado.credenciales = valor
        // Tras recargar la pestaña, el nombre del socio vuelve con las credenciales (no se guarda en el navegador).
        if (!sesion.estado.nombre) sesion.estado.nombre = valor.socio.nombre
      },
    )
  const cargarConsumo = () =>
    cargar(
      'consumo',
      (token) => obtenerConsumo(token, estado.entorno, estado.ventana, fetchFn),
      (valor) => (estado.consumo = valor),
    )
  const cargarEstado = () =>
    cargar(
      'estado',
      (token) => obtenerEstado(token, estado.ventana, fetchFn),
      (valor) => (estado.salud = valor),
    )
  const cargarVentas = () =>
    cargar(
      'ventas',
      (token) => obtenerVentas(token, estado.entorno, fetchFn),
      (valor) => (estado.ventas = valor),
    )

  async function cargarTodo() {
    await Promise.all([cargarCredenciales(), cargarConsumo(), cargarEstado(), cargarVentas()])
  }

  /** El entorno cambia las credenciales que se ven, el consumo y las ventas; la salud es la misma. */
  async function cambiarEntorno(entorno: Entorno) {
    if (estado.entorno === entorno) return
    estado.entorno = entorno
    await Promise.all([cargarConsumo(), cargarVentas()])
  }

  async function cambiarVentana(ventana: Ventana) {
    if (estado.ventana === ventana) return
    estado.ventana = ventana
    await Promise.all([cargarConsumo(), cargarEstado()])
  }

  function credencialDe(entorno: Entorno): Credencial | null {
    return estado.credenciales?.entornos.find((c) => c.entorno === entorno) ?? null
  }

  /** Regenera la clave del entorno. Devuelve la credencial nueva o el mensaje de error. */
  async function rotar(entorno: Entorno): Promise<Credencial | string> {
    const token = sesion.estado.token
    if (!token) return t('socios.sesion.vencida')
    try {
      const nueva = await rotarCredencial(token, entorno, fetchFn)
      if (estado.credenciales) {
        estado.credenciales.entornos = estado.credenciales.entornos.map((c) => (c.entorno === entorno ? nueva : c))
      }
      return nueva
    } catch (error) {
      return mensajeDe(error)
    }
  }

  /** Pide un token de 15 minutos con la clave del entorno (W07-4). Devuelve el token o el mensaje de error. */
  async function generarToken(entorno: Entorno): Promise<TokenGenerado | string> {
    const credencial = credencialDe(entorno)
    if (!credencial) return t('socios.error.generico')
    try {
      const respuesta = await pedirToken(credencial.socioId, credencial.clave, fetchFn)
      return { entorno, token: respuesta.token, expiraEn: new Date(respuesta.expiraEn).getTime() }
    } catch (error) {
      // Aquí un 401 es de la clave del entorno, no de la sesión del portal: no se cierra la sesión.
      return error instanceof ErrorSocios ? error.message : t('socios.error.generico')
    }
  }

  return {
    estado,
    cargarTodo,
    cargarCredenciales,
    cargarConsumo,
    cargarEstado,
    cargarVentas,
    cambiarEntorno,
    cambiarVentana,
    credencialDe,
    rotar,
    generarToken,
  }
}
