// Estado del panel del socio (W07-02, plan-hu-w07-front.md 5.3; contrato v0.22). Cada sección (credenciales, consumo,
// estado y ventas) carga por separado y tiene su propio error con reintento: si una falla, las demás se siguen viendo.
//
// En el contrato, el consumo y las ventas son «del entorno del token»: los de producción se piden con el token de la
// sesión (que es de producción, W07-3) y los de pruebas con un token pedido con la clave de pruebas, que se guarda en
// memoria hasta que vence. La ventana de tiempo solo cambia el estado del servicio.
//
// Un 401 de la sesión significa que el token venció: se cierra la sesión técnica con el aviso y la vista vuelve al
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
  /** El backend respondió 401 a la sesión: la vista vuelve al ingreso (el aviso ya quedó en la sesión técnica). */
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
/** Token de pruebas pedido con la clave de pruebas (para el consumo, las ventas y el Swagger de pruebas). */
let tokenPruebas: TokenGenerado | null = null

/** Solo para pruebas: deja el estado como al cargar el módulo. */
export function reiniciarPanelSocio(): void {
  Object.assign(estado, estadoInicial())
  tokenPruebas = null
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

  function credencialDe(entorno: Entorno): Credencial | null {
    return estado.credenciales?.credenciales.find((c) => c.entorno === entorno) ?? null
  }

  /** Pide un token de 15 minutos con la clave del entorno (W07-4). Devuelve el token o el mensaje de error. */
  async function generarToken(entorno: Entorno): Promise<TokenGenerado | string> {
    if (!estado.credenciales) await cargarCredenciales()
    const credencial = credencialDe(entorno)
    if (!credencial) return t('socios.error.generico')
    try {
      const respuesta = await pedirToken(credencial.clientId, credencial.clave, fetchFn)
      return { entorno, token: respuesta.accessToken, expiraEn: new Date(respuesta.expiraEn).getTime() }
    } catch (error) {
      // Aquí un 401 es de la clave del entorno, no de la sesión del portal: no se cierra la sesión.
      return error instanceof ErrorSocios ? error.message : t('socios.error.generico')
    }
  }

  /** El token con el que se leen los datos de un entorno; con el de pruebas, uno vigente (con un minuto de margen). */
  async function tokenDe(entorno: Entorno): Promise<string> {
    if (entorno === 'PRODUCCION') return sesion.estado.token ?? ''
    if (tokenPruebas && tokenPruebas.expiraEn - Date.now() > 60_000) return tokenPruebas.token
    const resultado = await generarToken('PRUEBAS')
    if (typeof resultado === 'string') throw new ErrorSocios(resultado, 'ERROR')
    tokenPruebas = resultado
    return resultado.token
  }

  async function cargar<T>(seccion: Seccion, pedir: () => Promise<T>, guardar: (valor: T) => void) {
    if (!sesion.estado.token) return
    estado.cargando[seccion] = true
    estado.error[seccion] = null
    try {
      guardar(await pedir())
    } catch (error) {
      estado.error[seccion] = mensajeDe(error)
    } finally {
      estado.cargando[seccion] = false
    }
  }

  async function cargarCredenciales() {
    await cargar(
      'credenciales',
      () => obtenerCredenciales(sesion.estado.token ?? '', fetchFn),
      (valor) => {
        estado.credenciales = valor
        // Tras recargar la pestaña, el nombre del socio vuelve con las credenciales (no se guarda en el navegador).
        if (!sesion.estado.nombre) sesion.estado.nombre = valor.socio.nombre
      },
    )
  }

  // El entorno se fija al pedir: si cambia mientras llega la respuesta, la de un entorno viejo se descarta.
  async function cargarConsumo() {
    const entorno = estado.entorno
    await cargar(
      'consumo',
      async () => obtenerConsumo(await tokenDe(entorno), fetchFn),
      (valor) => {
        if (entorno === estado.entorno) estado.consumo = valor
      },
    )
  }

  async function cargarVentas() {
    const entorno = estado.entorno
    await cargar(
      'ventas',
      async () => obtenerVentas(await tokenDe(entorno), fetchFn),
      (valor) => {
        if (entorno === estado.entorno) estado.ventas = valor
      },
    )
  }

  async function cargarEstado() {
    await cargar(
      'estado',
      () => obtenerEstado(sesion.estado.token ?? '', estado.ventana, fetchFn),
      (valor) => (estado.salud = valor),
    )
  }

  async function cargarTodo() {
    // Las credenciales primero: las de pruebas hacen falta para leer los datos de ese entorno.
    await cargarCredenciales()
    await Promise.all([cargarConsumo(), cargarEstado(), cargarVentas()])
  }

  /** El entorno cambia las credenciales que se ven, el consumo y las ventas; la salud es la misma. */
  async function cambiarEntorno(entorno: Entorno) {
    if (estado.entorno === entorno) return
    estado.entorno = entorno
    estado.consumo = null
    estado.ventas = null
    await Promise.all([cargarConsumo(), cargarVentas()])
  }

  async function cambiarVentana(ventana: Ventana) {
    if (estado.ventana === ventana) return
    estado.ventana = ventana
    await cargarEstado()
  }

  /** Regenera la clave del entorno. Devuelve la credencial nueva o el mensaje de error. */
  async function rotar(entorno: Entorno): Promise<Credencial | string> {
    const token = sesion.estado.token
    if (!token) return t('socios.sesion.vencida')
    try {
      const nueva = await rotarCredencial(token, entorno, fetchFn)
      if (estado.credenciales) {
        estado.credenciales.credenciales = estado.credenciales.credenciales.map((c) =>
          c.entorno === entorno ? nueva : c,
        )
      }
      // El token de pruebas se pidió con la clave anterior.
      if (entorno === 'PRUEBAS') tokenPruebas = null
      return nueva
    } catch (error) {
      return mensajeDe(error)
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
