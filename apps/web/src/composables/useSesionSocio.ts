// Sesión técnica del portal de socios (HU-W07). Separada de useSesion.ts porque el socio no es un usuario con rol:
// entra con su ID de socio (el `clientId` de producción) y la clave de producción (W07-3) y recibe un JWT de 15 minutos
// (`POST /v1/token`, contrato v0.22).
//
// El token vive en `sessionStorage` (`solventa.tokenSocio`) con la misma excepción de la regla 7 que el JWT de
// usuario: sobrevive a recargar la pestaña y se borra al cerrarla o al cerrar sesión. Solo se guarda el token (sus
// claims no traen datos personales); el nombre del socio no viaja en el token ni se guarda: llega con
// `GET /v1/credenciales` al ingresar y al recargar. Al vencer, se vuelve al login con el aviso «Tu sesión técnica venció».
import { reactive } from 'vue'
import { ErrorSocios, obtenerCredenciales, pedirToken, type Entorno } from '../api/socios'
import { t } from '../i18n'

export const CLAVE_TOKEN_SOCIO = 'solventa.tokenSocio'

interface ClaimsSocio {
  sub: string
  entorno: Entorno
  exp: number
}

/** Lee el payload del JWT sin verificar la firma: eso lo hace el gateway en cada petición. */
export function leerClaimsSocio(token: string): ClaimsSocio | null {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const bytes = Uint8Array.from(atob(payload), (c) => c.charCodeAt(0))
    const claims = JSON.parse(new TextDecoder().decode(bytes)) as Partial<ClaimsSocio>
    if (!claims.sub || (claims.entorno !== 'PRODUCCION' && claims.entorno !== 'PRUEBAS')) return null
    if (typeof claims.exp !== 'number') return null
    return claims as ClaimsSocio
  } catch {
    return null
  }
}

interface EstadoSesionSocio {
  token: string | null
  socioId: string
  /** Nombre comercial del socio; vacío hasta que llegue (se muestra el ID mientras tanto). */
  nombre: string
  /** Vencimiento del token (claim `exp`) en milisegundos. */
  expiraEn: number
  /** Aviso para el login: la sesión anterior venció. */
  aviso: 'vencida' | null
}

const estado = reactive<EstadoSesionSocio>({ token: null, socioId: '', nombre: '', expiraEn: 0, aviso: null })

// `sessionStorage` puede fallar (modo privado, cuota): la sesión sigue funcionando en memoria.
function guardarToken(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(CLAVE_TOKEN_SOCIO, token)
    else sessionStorage.removeItem(CLAVE_TOKEN_SOCIO)
  } catch {
    /* sin almacenamiento disponible: solo en memoria */
  }
}

function abrirSesion(token: string, nombre = ''): boolean {
  const claims = leerClaimsSocio(token)
  if (!claims) return false
  Object.assign(estado, { token, socioId: claims.sub, nombre, expiraEn: claims.exp * 1000, aviso: null })
  guardarToken(token)
  return true
}

function sesionActiva(): boolean {
  return !!estado.token && estado.expiraEn > Date.now()
}

/** Cierra la sesión; con `vencida`, el login muestra el aviso. */
function cerrarSesion(aviso: EstadoSesionSocio['aviso'] = null): void {
  Object.assign(estado, { token: null, socioId: '', nombre: '', expiraEn: 0, aviso })
  guardarToken(null)
}

/** Recupera el token guardado si sigue vigente. Se llama al cargar el módulo, es decir, al recargar. */
function leerTokenGuardado(): string | null {
  try {
    return sessionStorage.getItem(CLAVE_TOKEN_SOCIO)
  } catch {
    return null
  }
}

export function restaurarSesionSocio(): void {
  const token = leerTokenGuardado()
  if (!token) return
  if (!abrirSesion(token)) cerrarSesion()
  else if (!sesionActiva()) cerrarSesion('vencida')
}

restaurarSesionSocio()

export function useSesionSocio(fetchFn: typeof fetch = fetch) {
  /** Devuelve `null` si la sesión quedó abierta, o el mensaje que se le muestra al socio. */
  async function iniciarSesion(socioId: string, clave: string): Promise<string | null> {
    try {
      const respuesta = await pedirToken(socioId.trim(), clave, fetchFn)
      // Al portal se entra con la clave de producción (W07-3); la de pruebas solo sirve en la API.
      if (respuesta.entorno !== 'PRODUCCION') return t('socios.sesion.soloProduccion')
      if (!abrirSesion(respuesta.accessToken)) return t('socios.error.generico')
      await cargarNombre()
      return null
    } catch (error) {
      return error instanceof ErrorSocios ? error.message : t('socios.error.generico')
    }
  }

  /** El nombre comercial del socio para el encabezado; si no llega, se muestra el ID (nunca un error). */
  async function cargarNombre(): Promise<void> {
    const token = estado.token
    if (!token) return
    try {
      const credenciales = await obtenerCredenciales(token, fetchFn)
      if (estado.token === token) estado.nombre = credenciales.socio.nombre
    } catch {
      /* se queda el ID de socio */
    }
  }

  /** El backend respondió 401 con la sesión abierta: el token venció o fue revocado. */
  function vencerSesion(): void {
    cerrarSesion('vencida')
  }

  return { estado, iniciarSesion, cerrarSesion, vencerSesion, sesionActiva }
}
