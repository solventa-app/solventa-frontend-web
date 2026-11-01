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
import { ejecutar, usarToken } from '../graphql/cliente'
import type { ResultadoSesion, RolUsuario } from '../graphql/tipos'
import { t } from '../i18n'
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
      ... on Sesion { token usuario { nombre moneda } }
      ... on ErrorAutenticacion { mensaje }
    }
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
  return true
}

// Estado en memoria de otras pantallas que no debe sobrevivir a la sesión (regla 7), p. ej. el nombre y el correo
// del cliente que captura un ASESOR en W01-01. Cada composable registra aquí cómo borrarlo.
const limpiezasAlCerrar = new Set<() => void>()

export function alCerrarSesion(limpiar: () => void): void {
  limpiezasAlCerrar.add(limpiar)
}

function cerrarSesion(): void {
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

/** Pide el nombre del usuario autenticado; si falla, queda el alias (nunca se muestra un error). */
async function cargarNombre(fetchFn: typeof fetch = fetch): Promise<void> {
  const token = estado.token
  try {
    const datos = await ejecutar<{ yo: { nombre?: string | null; moneda?: string } | null }>(CONSULTA_YO, {}, fetchFn)
    const nombre = datos.yo?.nombre?.trim()
    if (nombre && estado.token === token) estado.nombre = nombre
    if (estado.token === token) adoptarMonedaDeCuenta(datos.yo?.moneda)
  } catch {
    /* se queda el alias */
  }
}

/** Recupera la sesión guardada si sigue vigente. Se llama al cargar el módulo, es decir, al recargar. */
export function restaurarSesion(): void {
  const token = leerTokenGuardado()
  if (!token) return
  if (!abrirSesion(token, null, leerInicioGuardado()) || !sesionActiva()) cerrarSesion()
  else void cargarNombre()
}

restaurarSesion()

export function useSesion(fetchFn: typeof fetch = fetch) {
  /** Devuelve `null` si la sesión quedó abierta, o el mensaje que se le muestra al usuario. */
  async function iniciarSesion(usuario: string, clave: string): Promise<string | null> {
    try {
      const datos = await ejecutar<{ iniciarSesion: ResultadoSesion }>(
        MUTACION_INICIAR_SESION,
        { entrada: { usuario, clave } },
        fetchFn,
      )
      const resultado = datos.iniciarSesion
      if ('mensaje' in resultado) return resultado.mensaje
      if (!abrirSesion(resultado.token, resultado.usuario.nombre)) return t('ingreso.falla')
      adoptarMonedaDeCuenta(resultado.usuario.moneda)
      return null
    } catch {
      return t('ingreso.falla')
    }
  }

  return { estado, iniciarSesion, cargarNombre: () => cargarNombre(fetchFn), cerrarSesion, sesionActiva, rutaInicio }
}
