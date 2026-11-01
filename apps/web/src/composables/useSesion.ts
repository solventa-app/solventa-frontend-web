// Sesión del usuario autenticado (HU-M02 en el backend, docs/autenticacion-usuarios.md). `iniciarSesion`
// del BFF devuelve un JWT; de sus claims salen el rol y el nombre que se muestran.
//
// La sesión sobrevive a recargar la página (decisión del equipo, 2026-10-17): el token se guarda en
// `sessionStorage`, que vive mientras la pestaña esté abierta y se borra al cerrarla. Solo se guarda el
// token (no trae datos personales: rol, alias y vencimiento, regla 7). Al cargar, se restaura si sigue
// vigente; uno vencido o ilegible se descarta.
//
// El nombre NO viaja en el JWT (contrato v0.7: iría en base64, sin cifrar): se pide por GraphQL en
// `iniciarSesion` y, al restaurar la sesión tras una recarga, con `yo`. Si es null o la consulta falla, se
// muestra el alias (`usuario`), que nunca es un dato personal. El nombre no se guarda en el navegador.
// Con el nombre llega la moneda preferida de la cuenta, que prevalece sobre la del navegador (useMoneda.ts).
import { reactive } from 'vue'
import { CABECERA_CSRF, ejecutar, usarRenovador, usarToken } from '../graphql/cliente'
import type { ResultadoSesion, RolUsuario } from '../graphql/tipos'
import { t } from '../i18n'
import { log } from '../log'
import { adoptarMonedaDeCuenta } from './useMoneda'

export type Rol = RolUsuario

interface EstadoSesion {
  token: string | null
  rol: Rol | null
  nombre: string
  /** Alias con que inició sesión (claim `usuario`); no es un dato personal. */
  usuario: string
  /** Vencimiento del token (claim `exp`) en milisegundos. */
  expiraEn: number
  /** Cuándo se inició la sesión, en milisegundos (se muestra en el modal de cerrar sesión, G-04). */
  iniciadaEn: number
  /** `vencida` cuando la sesión terminó porque el refresh venció o falló: G-01 muestra el aviso (T22). */
  aviso: 'vencida' | null
}

/** Cómo se llama cada rol en pantalla (chips de G-01, perfil y modal de cierre), en el idioma activo. */
export function etiquetaRol(rol: RolUsuario): string {
  return t(`rol.${rol}`)
}

export const RUTA_INICIO: Record<Rol, string> = {
  CLIENTE: '/inicio',
  ASESOR: '/asesor',
  BACKOFFICE: '/operador',
}

const MUTACION_INICIAR_SESION = `
  mutation iniciarSesion($entrada: CredencialesInput!) {
    iniciarSesion(entrada: $entrada) {
      ... on Sesion { token refreshExpiraEn usuario { nombre moneda } }
      ... on ErrorAutenticacion { mensaje }
    }
  }
`

// T22: el refresh viaja en una cookie httpOnly que el BFF lee; aquí no se manda ni se ve. La cabecera anti-CSRF es obligatoria.
const MUTACION_RENOVAR_SESION = `
  mutation renovarSesion {
    renovarSesion {
      ... on Sesion { token refreshExpiraEn }
      ... on ErrorAutenticacion { codigo }
    }
  }
`

const MUTACION_CERRAR_SESION = `
  mutation cerrarSesion {
    cerrarSesion
  }
`

const CONSULTA_YO = `
  query yo {
    yo { nombre moneda }
  }
`

interface ClaimsSesion {
  usuario: string
  rol: Rol
  exp: number
}

/** Lee el payload del JWT sin verificar la firma: eso lo hace el BFF en cada petición. */
export function leerClaims(token: string): ClaimsSesion | null {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const bytes = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0))
    const claims = JSON.parse(new TextDecoder().decode(bytes)) as Partial<ClaimsSesion>
    if (!claims.usuario || !claims.rol || !(claims.rol in RUTA_INICIO) || typeof claims.exp !== 'number') return null
    return claims as ClaimsSesion
  } catch {
    return null
  }
}

/** Dónde se guarda el token para que la sesión sobreviva a recargar la página. */
export const CLAVE_TOKEN = 'solventa.token'
/** Cuándo empezó la sesión: sin datos personales, solo una marca de tiempo. */
export const CLAVE_INICIO = 'solventa.sesionIniciadaEn'

// `sessionStorage` puede no existir o fallar (modo privado, cuota): la sesión sigue funcionando en memoria.
function guardarToken(token: string | null, iniciadaEn = 0): void {
  try {
    if (token) {
      sessionStorage.setItem(CLAVE_TOKEN, token)
      sessionStorage.setItem(CLAVE_INICIO, String(iniciadaEn))
    } else {
      sessionStorage.removeItem(CLAVE_TOKEN)
      sessionStorage.removeItem(CLAVE_INICIO)
    }
  } catch {
    /* sin almacenamiento disponible: solo en memoria */
  }
}

function leerInicioGuardado(): number {
  try {
    return Number(sessionStorage.getItem(CLAVE_INICIO)) || Date.now()
  } catch {
    return Date.now()
  }
}

/**
 * Hasta cuándo sirve el refresh (marca de tiempo, sin datos personales). Sin esta marca no se intenta renovar al
 * abrir la web; la cookie httpOnly en sí no se puede leer desde la página, y así no se pregunta al BFF en cada visita.
 */
export const CLAVE_REFRESH_HASTA = 'solventa.refreshHasta'

function guardarRefreshHasta(iso: string | null | undefined): void {
  try {
    const ms = iso ? Date.parse(iso) : NaN
    if (Number.isFinite(ms)) localStorage.setItem(CLAVE_REFRESH_HASTA, String(ms))
    else localStorage.removeItem(CLAVE_REFRESH_HASTA)
  } catch {
    /* sin almacenamiento disponible */
  }
}

function leerRefreshHasta(): number {
  try {
    return Number(localStorage.getItem(CLAVE_REFRESH_HASTA)) || 0
  } catch {
    return 0
  }
}

function leerTokenGuardado(): string | null {
  try {
    return sessionStorage.getItem(CLAVE_TOKEN)
  } catch {
    return null
  }
}

const estado = reactive<EstadoSesion>({
  token: null,
  rol: null,
  nombre: '',
  usuario: '',
  expiraEn: 0,
  iniciadaEn: 0,
  aviso: null,
})

function sesionActiva(): boolean {
  return !!estado.token && estado.expiraEn > Date.now()
}

function rutaInicio(): string {
  return estado.rol ? RUTA_INICIO[estado.rol] : '/login'
}

function abrirSesion(token: string, nombre?: string | null, iniciadaEn = Date.now()): boolean {
  const claims = leerClaims(token)
  if (!claims) return false
  estado.token = token
  estado.rol = claims.rol
  estado.nombre = nombre?.trim() || claims.usuario
  estado.usuario = claims.usuario
  estado.expiraEn = claims.exp * 1000
  estado.iniciadaEn = iniciadaEn
  usarToken(token)
  guardarToken(token, iniciadaEn)
  programarRenovacion()
  return true
}

// ---------- Renovación de la sesión con el refresh (T22) ----------

/** Cuánto antes del vencimiento se renueva: 60 s, o el 20 % de la vida del token si es más corta (pruebas de 1 min). */
const MARGEN_MAXIMO_MS = 60_000
const REINTENTO_MS = 15_000
let temporizador: ReturnType<typeof setTimeout> | undefined
// El `fetch` con que renuevan el temporizador y el cliente GraphQL: el global, salvo que una prueba inyecte otro.
let fetchRenovacion: typeof fetch = (...args) => fetch(...args)
let renovando: Promise<ResultadoRenovacion> | null = null
let alVencerSesion: (() => void) | null = null

type ResultadoRenovacion = 'ok' | 'vencida' | 'error'

/** La app registra aquí qué hacer cuando la sesión termina sola: llevar al ingreso (main.ts). */
export function alSesionVencida(accion: (() => void) | null): void {
  alVencerSesion = accion
}

function programarRenovacion(retardo?: number): void {
  clearTimeout(temporizador)
  if (!estado.token) return
  // Se llama al abrirse un token nuevo, así que lo que le queda es toda su vida.
  const restante = Math.max(estado.expiraEn - Date.now(), 0)
  const espera = retardo ?? Math.max(restante - Math.min(MARGEN_MAXIMO_MS, restante * 0.2), 0)
  temporizador = setTimeout(() => void renovarAhora(), espera)
}

function vencerSesion(): void {
  cerrarSesion()
  estado.aviso = 'vencida'
  alVencerSesion?.()
}

/** Una sola renovación a la vez: el temporizador, un 401 y la restauración comparten la misma promesa. */
function renovar(fetchFn: typeof fetch = fetchRenovacion): Promise<ResultadoRenovacion> {
  renovando ??= pedirRenovacion(fetchFn).finally(() => {
    renovando = null
  })
  return renovando
}

async function pedirRenovacion(fetchFn: typeof fetch): Promise<ResultadoRenovacion> {
  try {
    const datos = await ejecutar<{ renovarSesion: ResultadoSesion }>(MUTACION_RENOVAR_SESION, {}, fetchFn, {
      conToken: false,
      cabeceras: CABECERA_CSRF,
    })
    const resultado = datos.renovarSesion
    if ('codigo' in resultado || 'mensaje' in resultado) {
      // Refresh vencido, usado o revocado: el BFF no dice cuál (mismo mensaje siempre).
      log.info('Sesión: el refresh venció o no es válido', { canal: 'web', motivo: 'refresh_invalido' })
      return 'vencida'
    }
    const iniciadaEn = estado.iniciadaEn || leerInicioGuardado()
    const nombre = estado.nombre || undefined
    if (!abrirSesion(resultado.token, nombre, iniciadaEn)) return 'error'
    guardarRefreshHasta(resultado.refreshExpiraEn)
    if (!nombre) void cargarNombre(fetchFn)
    log.info('Sesión renovada', { canal: 'web' }) // solo un breadcrumb: sin token ni usuario
    return 'ok'
  } catch {
    // Red o 5xx: no es un refresh inválido, así que no se cierra la sesión; se reintenta.
    log.warn('Sesión: no se pudo renovar', { canal: 'web', motivo: 'fallo_inesperado' })
    return 'error'
  }
}

async function renovarAhora(): Promise<void> {
  const resultado = await renovar()
  if (resultado === 'vencida') vencerSesion()
  else if (resultado === 'error') {
    // Mientras el token siga vigente se reintenta; si ya venció, la persona vuelve a ingresar.
    if (estado.expiraEn > Date.now()) programarRenovacion(REINTENTO_MS)
    else vencerSesion()
  }
}

// Ante un «sin sesión» del BFF, el cliente GraphQL renueva una vez y reintenta (graphql/cliente.ts).
usarRenovador(async () => (await renovar()) === 'ok')

// Estado en memoria de otras pantallas que no debe sobrevivir a la sesión (regla 7), p. ej. el nombre y el correo
// del cliente que captura un ASESOR en W01-01. Cada composable registra aquí cómo borrarlo.
const limpiezasAlCerrar = new Set<() => void>()

export function alCerrarSesion(limpiar: () => void): void {
  limpiezasAlCerrar.add(limpiar)
}

function cerrarSesion(): void {
  clearTimeout(temporizador)
  guardarRefreshHasta(null)
  for (const limpiar of limpiezasAlCerrar) limpiar()
  estado.token = null
  estado.rol = null
  estado.nombre = ''
  estado.usuario = ''
  estado.expiraEn = 0
  estado.iniciadaEn = 0
  usarToken(null)
  guardarToken(null)
}

/**
 * Cierre explícito de la persona: revoca el refresh en el BFF (que además borra la cookie) y cierra la sesión local.
 * `cerrarSesion` a secas solo limpia lo local (la usa el router cuando ya no hay sesión).
 */
export async function terminarSesion(fetchFn: typeof fetch = fetch): Promise<void> {
  cerrarSesion()
  try {
    await ejecutar(MUTACION_CERRAR_SESION, {}, fetchFn, { conToken: false, cabeceras: CABECERA_CSRF })
  } catch {
    /* sin red: la sesión local ya se cerró y el refresh vence solo */
  }
}

/** Pide el nombre del usuario autenticado; si falla, queda el alias (nunca se muestra un error). */
async function cargarNombre(fetchFn: typeof fetch = fetch): Promise<void> {
  // Se compara el usuario, no el token: una renovación a mitad de camino cambia el token pero no la sesión.
  const usuario = estado.usuario
  try {
    const datos = await ejecutar<{ yo: { nombre?: string | null; moneda?: string } | null }>(CONSULTA_YO, {}, fetchFn)
    const nombre = datos.yo?.nombre?.trim()
    if (nombre && estado.token && estado.usuario === usuario) estado.nombre = nombre
    if (estado.token && estado.usuario === usuario) adoptarMonedaDeCuenta(datos.yo?.moneda)
  } catch {
    /* se queda el alias */
  }
}

/** Recupera la sesión guardada si sigue vigente. Se llama al cargar el módulo, es decir, al recargar. */
export function restaurarSesion(): void {
  const token = leerTokenGuardado()
  if (token && abrirSesion(token, null, leerInicioGuardado()) && sesionActiva()) {
    void cargarNombre()
    restauracion = null
    return
  }
  const refreshVigente = leerRefreshHasta() > Date.now() // antes de cerrar, que borra la marca
  if (token) cerrarSesion()
  // Sin token vigente pero con un refresh que sigue valiendo (otra pestaña, el acceso de 60 min ya venció): se renueva
  // en silencio. Si falla no se avisa nada: simplemente se queda sin sesión y el ingreso la pide.
  restauracion = refreshVigente
    ? renovar().then((r) => {
        if (r !== 'ok') guardarRefreshHasta(null)
      })
    : null
}

/** El router espera aquí antes de decidir si hay sesión, por si se está renovando al abrir la web. */
let restauracion: Promise<void> | null = null
export function esperarRestauracion(): Promise<void> {
  return restauracion ?? Promise.resolve()
}

restaurarSesion()

export function useSesion(fetchFn: typeof fetch = fetch) {
  if (fetchFn !== globalThis.fetch) fetchRenovacion = fetchFn

  /** Devuelve `null` si la sesión quedó abierta, o el mensaje que se le muestra al usuario. */
  async function iniciarSesion(usuario: string, clave: string, rol?: Rol): Promise<string | null> {
    try {
      const datos = await ejecutar<{ iniciarSesion: ResultadoSesion }>(
        MUTACION_INICIAR_SESION,
        { entrada: { usuario, clave, ...(rol ? { rol } : {}) } },
        fetchFn,
      )
      const resultado = datos.iniciarSesion
      if ('mensaje' in resultado) return resultado.mensaje
      if (!abrirSesion(resultado.token, resultado.usuario.nombre)) return t('ingreso.falla')
      estado.aviso = null
      guardarRefreshHasta(resultado.refreshExpiraEn)
      adoptarMonedaDeCuenta(resultado.usuario.moneda)
      return null
    } catch {
      return t('ingreso.falla')
    }
  }

  return {
    estado,
    iniciarSesion,
    renovarSesion: () => renovar(fetchFn),
    terminarSesion: () => terminarSesion(fetchFn),
    cargarNombre: () => cargarNombre(fetchFn),
    cerrarSesion,
    sesionActiva,
    rutaInicio,
  }
}
