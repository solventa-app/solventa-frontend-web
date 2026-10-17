// Sesión activa (HU-M02, CA-W01-11). Singleton a nivel de módulo, igual patrón que useCotizacion.ts.
// `ingresar` llama a `iniciarSesion` del BFF (alias + clave) y guarda el token SOLO en memoria (CLAUDE.md
// regla 7): si se recarga la página, se vuelve al rol por defecto y hay que entrar de nuevo. El rol lo
// decide el token, no la pantalla: los chips de G-01 son una preselección que se valida contra él.
import { reactive } from 'vue'
import { ejecutar } from '../graphql/cliente'
import { fijarToken } from '../graphql/token'
import type { ResultadoSesion, RolUsuario } from '../graphql/tipos'

export type Rol = RolUsuario

interface EstadoSesion {
  rol: Rol
  nombre: string
  /** Alias con el que se entró (`Usuario.usuario`); null mientras no haya sesión real. */
  usuario: string | null
  autenticado: boolean
}

/** Ruta del "home" de cada rol (ver src/router/pantallas.ts: G-02, G-02a, G-02b). */
export const RUTA_INICIO: Record<Rol, string> = {
  CLIENTE: '/inicio',
  ASESOR: '/asesor',
  BACKOFFICE: '/operador',
}

/** Cómo se nombra cada rol en pantalla (chips de G-01 y mensajes). */
export const ETIQUETA_ROL: Record<Rol, string> = {
  CLIENTE: 'Cliente',
  ASESOR: 'Asesor comercial',
  BACKOFFICE: 'Operador',
}

const NOMBRE_POR_DEFECTO: Record<Rol, string> = {
  CLIENTE: 'María Fernanda Restrepo',
  ASESOR: 'Ricardo Peña',
  BACKOFFICE: 'Equipo de Operaciones',
}

const MUTACION_INICIAR_SESION = `
  mutation iniciarSesion($entrada: CredencialesInput!) {
    iniciarSesion(entrada: $entrada) {
      ... on Sesion {
        token
        expiraEn
        usuario { id usuario rol }
      }
      ... on ErrorAutenticacion { mensaje }
    }
  }
`

export type ResultadoIngreso = { ok: true; rol: Rol } | { ok: false; mensaje: string }

// Por defecto CLIENTE: así una pantalla de /cotizacion/* sigue siendo navegable escribiendo la URL
// directamente (el BFF acepta W01 sin token mientras su bandera esté en `opcional`).
const estado = reactive<EstadoSesion>({
  rol: 'CLIENTE',
  nombre: NOMBRE_POR_DEFECTO.CLIENTE,
  usuario: null,
  autenticado: false,
})

export function useSesion(fetchFn: typeof fetch = fetch) {
  /** Fija el rol de la sesión (con token, si lo hay). Lo usa `ingresar`; las pruebas lo usan directo. */
  function establecerSesion(rol: Rol, token: string | null = null, usuario: string | null = null) {
    estado.rol = rol
    estado.nombre = NOMBRE_POR_DEFECTO[rol]
    estado.usuario = usuario
    estado.autenticado = token !== null
    fijarToken(token)
  }

  /**
   * G-01: inicia sesión en el BFF. `rolElegido` es el chip marcado: si no coincide con el rol del
   * usuario, no se entra y se explica por qué (el rol lo decide el token, no la pantalla).
   */
  async function ingresar(usuario: string, clave: string, rolElegido: Rol): Promise<ResultadoIngreso> {
    let resultado: ResultadoSesion
    try {
      const datos = await ejecutar<{ iniciarSesion: ResultadoSesion }>(
        MUTACION_INICIAR_SESION,
        { entrada: { usuario: usuario.trim(), clave } },
        fetchFn,
      )
      resultado = datos.iniciarSesion
    } catch {
      return { ok: false, mensaje: 'No pudimos iniciar sesión en este momento. Intenta de nuevo.' }
    }
    if (!('token' in resultado)) return { ok: false, mensaje: resultado.mensaje }
    const rol = resultado.usuario.rol
    if (rol !== rolElegido) {
      return { ok: false, mensaje: `Tu usuario es de ${ETIQUETA_ROL[rol]}: elige ese rol para ingresar.` }
    }
    establecerSesion(rol, resultado.token, resultado.usuario.usuario)
    return { ok: true, rol }
  }

  function cerrarSesion() {
    establecerSesion('CLIENTE')
  }

  return { estado, ingresar, establecerSesion, cerrarSesion }
}
