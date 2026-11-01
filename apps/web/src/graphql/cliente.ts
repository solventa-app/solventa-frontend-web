// Cliente GraphQL mínimo contra el BFF (canal web: /graphql/web). Sin librería a propósito: con pocas
// operaciones no hace falta urql ni Apollo, y MSW intercepta HTTP igual con cualquiera de ellos.
import { cabeceraIdioma, t } from '../i18n'
import { log, obtenerCodigoSoporte } from '../log'

export class ErrorGraphQL extends Error {
  readonly codigoSoporte: string

  constructor(
    mensaje: string,
    readonly errores: unknown[] = [],
  ) {
    super(mensaje)
    this.codigoSoporte = obtenerCodigoSoporte()
  }
}

// JWT de la sesión activa (lo fija useSesion.ts). Vive solo en memoria: nunca en localStorage (regla 7).
let token: string | null = null

export function usarToken(nuevo: string | null): void {
  token = nuevo
}

/** Cabecera anti-CSRF que el BFF exige a `renovarSesion` y `cerrarSesion` en la web (T22). */
export const CABECERA_CSRF = { 'X-Solventa-Csrf': '1' }

// Mensajes con que el BFF dice que el token venció o falta (en español y en inglés, según Accept-Language).
const MENSAJES_SIN_SESION = [
  'Tu sesión no es válida o venció. Inicia sesión de nuevo.',
  'Your session is invalid or has expired. Please sign in again.',
  'Debes iniciar sesión.',
  'You must sign in.',
]

// Renueva la sesión con el refresh (lo fija useSesion.ts). Devuelve true si quedó un token nuevo.
let renovador: (() => Promise<boolean>) | null = null

export function usarRenovador(nuevo: (() => Promise<boolean>) | null): void {
  renovador = nuevo
}

export function haySesion(): boolean {
  return token !== null
}

/** Descarga un PDF protegido por la sesión (póliza del cliente o del asesor) como `blob:`; null si no llega un PDF. */
export async function pdfDeSesion(ruta: string, fetchFn: typeof fetch = fetch): Promise<string | null> {
  if (!token) return null
  try {
    const respuesta = await fetchFn(ruta, { headers: { Authorization: `Bearer ${token}` } })
    if (!respuesta.ok) return null
    // Si la ruta no llega al BFF, el hosting responde 200 con el index.html de la SPA.
    if (!(respuesta.headers.get('Content-Type') ?? '').includes('application/pdf')) return null
    return URL.createObjectURL(await respuesta.blob())
  } catch {
    return null
  }
}

export interface OpcionesEjecucion {
  /** Ruta GraphQL. Por defecto el canal web del BFF; siniestros (HU-W04) usa su versión 1, '/v1/graphql/web'. */
  endpoint?: string
  /** Si se manda el JWT de la sesión. `false` para operaciones que no deben llevarlo. */
  conToken?: boolean
  /** Cabeceras extra, p. ej. `X-Enlace-Firma` de la página del enlace (HU-W03), que no usa sesión. */
  cabeceras?: Record<string, string>
}

/** Tiempo máximo de espera de una operación: pasado esto se corta y la pantalla muestra error con reintento, nunca «Cargando…» sin fin. */
export const TIEMPO_MAXIMO_MS = 30_000

export async function ejecutar<T>(
  consulta: string,
  variables: Record<string, unknown> = {},
  fetchFn: typeof fetch = fetch,
  opciones: OpcionesEjecucion = {},
): Promise<T> {
  const { endpoint = '/graphql/web', conToken = true } = opciones
  try {
    return await ejecutarUnaVez<T>(consulta, variables, fetchFn, opciones, endpoint, conToken)
  } catch (e) {
    // Token vencido entre dos renovaciones programadas: se renueva una vez y se reintenta (T22).
    const sinSesion = e instanceof ErrorGraphQL && MENSAJES_SIN_SESION.includes(e.message)
    if (conToken && token && sinSesion && renovador && (await renovador())) {
      return await ejecutarUnaVez<T>(consulta, variables, fetchFn, opciones, endpoint, conToken)
    }
    throw e
  }
}

async function ejecutarUnaVez<T>(
  consulta: string,
  variables: Record<string, unknown>,
  fetchFn: typeof fetch,
  opciones: OpcionesEjecucion,
  endpoint: string,
  conToken: boolean,
): Promise<T> {
  // Accept-Language: el BFF devuelve sus mensajes (errores, avisos) en el idioma del selector del header.
  const cabeceras: Record<string, string> = {
    ...opciones.cabeceras,
    'Content-Type': 'application/json',
    'Accept-Language': cabeceraIdioma(),
  }
  if (conToken && token) cabeceras.Authorization = `Bearer ${token}`

  const control = new AbortController()
  const temporizador = setTimeout(() => control.abort(), TIEMPO_MAXIMO_MS)
  try {
    return await ejecutarConLimite<T>(endpoint, cabeceras, consulta, variables, fetchFn, control.signal)
  } catch (e) {
    if (control.signal.aborted) {
      log.warn('El BFF no respondió a tiempo', { endpoint })
      throw new ErrorGraphQL(t('comun.servicioLento'))
    }
    throw e
  } finally {
    clearTimeout(temporizador)
  }
}

async function ejecutarConLimite<T>(
  endpoint: string,
  cabeceras: Record<string, string>,
  consulta: string,
  variables: Record<string, unknown>,
  fetchFn: typeof fetch,
  signal: AbortSignal,
): Promise<T> {
  const respuesta = await fetchFn(endpoint, {
    method: 'POST',
    headers: cabeceras,
    body: JSON.stringify({ query: consulta, variables }),
    signal,
  })
  if (respuesta.status === 502 || respuesta.status === 503 || respuesta.status === 504) {
    const err = new ErrorGraphQL(t('comun.servicioLento'))
    log.warn('BFF no disponible temporalmente', { status: respuesta.status, endpoint })
    throw err
  }
  if (!respuesta.ok) {
    const err = new ErrorGraphQL(`El BFF respondió ${respuesta.status}`)
    log.error('Error HTTP del BFF', err, { status: respuesta.status, endpoint })
    throw err
  }

  const cuerpo = (await respuesta.json()) as { data?: T; errors?: { message: string }[] }
  if (cuerpo.errors?.length) {
    const err = new ErrorGraphQL(cuerpo.errors[0].message, cuerpo.errors)
    log.warn('Error GraphQL devuelto por el BFF', { endpoint })
    throw err
  }
  if (!cuerpo.data) {
    const err = new ErrorGraphQL('Respuesta GraphQL sin datos')
    log.error('Respuesta GraphQL sin datos', err, { endpoint })
    throw err
  }
  return cuerpo.data
}
