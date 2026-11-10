// «Olvidé mi contraseña» (KAN-26, contrato v0.43). Dos pasos sin sesión:
// 1. G-07 pide solo el correo (`solicitarRestablecimientoClave`): el BFF siempre responde `true`, exista o no la cuenta.
// 2. G-08 se abre desde el enlace del correo (`/restablecer-clave#t=…`) y fija la clave nueva (`restablecerClave`).
// El token del enlace vive solo en memoria, se quita de la barra de direcciones al leerlo y viaja en la cabecera
// `X-Enlace-Clave`, nunca en la URL de la API ni en el cuerpo (regla 7). Los textos de error vienen del BFF en el idioma
// del selector; si no responde, un mensaje genérico nuestro (regla 5).
import { ejecutar, ErrorGraphQL } from '../graphql/cliente'
import { t } from '../i18n'

const FORMATO_TOKEN = /^[A-Za-z0-9_-]{16,128}$/
const CABECERA_ENLACE = 'X-Enlace-Clave'

let token: string | null = null

/** Lee el token del fragmento (`#t=…`) y lo quita de la barra de direcciones. Devuelve si hay uno en memoria. */
export function tomarTokenDelEnlace(): boolean {
  if (typeof window === 'undefined') return token !== null
  const coincidencia = /(?:^#|&)t=([^&]+)/.exec(window.location.hash)
  if (coincidencia) {
    let candidato: string
    try {
      candidato = decodeURIComponent(coincidencia[1])
    } catch {
      candidato = ''
    }
    token = FORMATO_TOKEN.test(candidato) ? candidato : null
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
  }
  return token !== null
}

export function olvidarTokenDeRestablecimiento(): void {
  token = null
}

const cabeceras = (): Record<string, string> => (token ? { [CABECERA_ENLACE]: token } : {})

/** Pide el enlace. Devuelve un mensaje de error solo si el BFF no respondió; nunca dice si la cuenta existe. */
export async function solicitarRestablecimiento(correo: string, fetchFn: typeof fetch = fetch): Promise<string | null> {
  try {
    await ejecutar<{ solicitarRestablecimientoClave: boolean }>(
      'mutation solicitarRestablecimientoClave($correo: String!) { solicitarRestablecimientoClave(correo: $correo) }',
      { correo },
      fetchFn,
      { conToken: false },
    )
    return null
  } catch (e) {
    return e instanceof ErrorGraphQL && e.message ? e.message : t('restablecer.falla')
  }
}

export type EstadoEnlace = 'vigente' | 'invalido' | 'error'

/** ¿Sirve el enlace? Así G-08 avisa antes de que la persona escriba la clave nueva. */
export async function comprobarEnlace(fetchFn: typeof fetch = fetch): Promise<EstadoEnlace> {
  if (!token) return 'invalido'
  try {
    const datos = await ejecutar<{ enlaceRestablecimientoVigente: boolean }>(
      'query enlaceRestablecimientoVigente { enlaceRestablecimientoVigente }',
      {},
      fetchFn,
      { conToken: false, cabeceras: cabeceras() },
    )
    return datos.enlaceRestablecimientoVigente ? 'vigente' : 'invalido'
  } catch {
    return 'error'
  }
}

export type ResultadoRestablecer =
  { ok: true } | { ok: false; codigo: 'ENLACE_INVALIDO' | 'CLAVE_DEBIL' | 'OTRO'; mensaje: string }

export async function restablecerClave(clave: string, fetchFn: typeof fetch = fetch): Promise<ResultadoRestablecer> {
  try {
    const datos = await ejecutar<{
      restablecerClave: { ok: boolean } | { mensaje: string; codigo: string | null }
    }>(
      `mutation restablecerClave($clave: String!) {
        restablecerClave(clave: $clave) {
          ... on RestablecimientoExitoso { ok }
          ... on ErrorAutenticacion { mensaje codigo }
        }
      }`,
      { clave },
      fetchFn,
      { conToken: false, cabeceras: cabeceras() },
    )
    const r = datos.restablecerClave
    if ('mensaje' in r) {
      const codigo = r.codigo === 'ENLACE_INVALIDO' || r.codigo === 'CLAVE_DEBIL' ? r.codigo : 'OTRO'
      if (codigo === 'ENLACE_INVALIDO') olvidarTokenDeRestablecimiento()
      return { ok: false, codigo, mensaje: r.mensaje }
    }
    olvidarTokenDeRestablecimiento()
    return { ok: true }
  } catch {
    return { ok: false, codigo: 'OTRO', mensaje: t('restablecer.falla') }
  }
}
