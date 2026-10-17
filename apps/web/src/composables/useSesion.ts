// Sesión del usuario autenticado (HU-M02 en el backend, docs/autenticacion-usuarios.md). `iniciarSesion`
// del BFF devuelve un JWT; de sus claims salen el rol y el nombre que se muestran. El token vive solo en
// memoria (regla 7): al recargar la página hay que volver a iniciar sesión.
//
// El nombre se lee del claim `nombre`, que el backend todavía no emite (pedido en contrato/CHANGELOG.md);
// mientras no llegue se muestra el alias (`usuario`), que nunca es un dato personal.
import { reactive } from 'vue'
import { ejecutar, usarToken } from '../graphql/cliente'
import type { ResultadoSesion, RolUsuario } from '../graphql/tipos'

export type Rol = RolUsuario

interface EstadoSesion {
  token: string | null
  rol: Rol | null
  nombre: string
  /** Vencimiento del token (claim `exp`) en milisegundos. */
  expiraEn: number
}

export const RUTA_INICIO: Record<Rol, string> = {
  CLIENTE: '/inicio',
  ASESOR: '/asesor',
  BACKOFFICE: '/operador',
}

const MENSAJE_FALLA = 'No pudimos iniciar sesión en este momento. Intenta de nuevo.'

const MUTACION_INICIAR_SESION = `
  mutation iniciarSesion($entrada: CredencialesInput!) {
    iniciarSesion(entrada: $entrada) {
      ... on Sesion { token }
      ... on ErrorAutenticacion { mensaje }
    }
  }
`

interface ClaimsSesion {
  usuario: string
  rol: Rol
  exp: number
  nombre?: string
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

const estado = reactive<EstadoSesion>({ token: null, rol: null, nombre: '', expiraEn: 0 })

function sesionActiva(): boolean {
  return !!estado.token && estado.expiraEn > Date.now()
}

function rutaInicio(): string {
  return estado.rol ? RUTA_INICIO[estado.rol] : '/login'
}

function abrirSesion(token: string): boolean {
  const claims = leerClaims(token)
  if (!claims) return false
  estado.token = token
  estado.rol = claims.rol
  estado.nombre = claims.nombre?.trim() || claims.usuario
  estado.expiraEn = claims.exp * 1000
  usarToken(token)
  return true
}

function cerrarSesion(): void {
  estado.token = null
  estado.rol = null
  estado.nombre = ''
  estado.expiraEn = 0
  usarToken(null)
}

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
      return abrirSesion(resultado.token) ? null : MENSAJE_FALLA
    } catch {
      return MENSAJE_FALLA
    }
  }

  return { estado, iniciarSesion, cerrarSesion, sesionActiva, rutaInicio }
}
