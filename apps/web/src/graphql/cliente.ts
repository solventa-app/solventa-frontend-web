// Cliente GraphQL mínimo contra el BFF (canal web: /graphql/web). Sin librería a propósito: con pocas
// operaciones no hace falta urql ni Apollo, y MSW intercepta HTTP igual con cualquiera de ellos.
import { cabeceraIdioma, t } from '../i18n'

export class ErrorGraphQL extends Error {
  constructor(
    mensaje: string,
    readonly errores: unknown[] = [],
  ) {
    super(mensaje)
  }
}

// JWT de la sesión activa (lo fija useSesion.ts). Vive solo en memoria: nunca en localStorage (regla 7).
let token: string | null = null

export function usarToken(nuevo: string | null): void {
  token = nuevo
}

export interface OpcionesEjecucion {
  /** Ruta GraphQL. Por defecto el canal web del BFF; siniestros (HU-W04) usa su versión 1, '/v1/graphql/web'. */
  endpoint?: string
  /** Si se manda el JWT de la sesión. `false` para operaciones que no deben llevarlo. */
  conToken?: boolean
  /** Cabeceras extra, p. ej. `X-Enlace-Firma` de la página del enlace (HU-W03), que no usa sesión. */
  cabeceras?: Record<string, string>
}

export async function ejecutar<T>(
  consulta: string,
  variables: Record<string, unknown> = {},
  fetchFn: typeof fetch = fetch,
  opciones: OpcionesEjecucion = {},
): Promise<T> {
  const { endpoint = '/graphql/web', conToken = true } = opciones
  // Accept-Language: el BFF devuelve sus mensajes (errores, avisos) en el idioma del selector del header.
  const cabeceras: Record<string, string> = {
    ...opciones.cabeceras,
    'Content-Type': 'application/json',
    'Accept-Language': cabeceraIdioma(),
  }
  if (conToken && token) cabeceras.Authorization = `Bearer ${token}`

  const respuesta = await fetchFn(endpoint, {
    method: 'POST',
    headers: cabeceras,
    body: JSON.stringify({ query: consulta, variables }),
  })
  if (respuesta.status === 502 || respuesta.status === 503 || respuesta.status === 504) {
    throw new ErrorGraphQL(t('comun.servicioLento'))
  }
  if (!respuesta.ok) throw new ErrorGraphQL(`El BFF respondió ${respuesta.status}`)

  const cuerpo = (await respuesta.json()) as { data?: T; errors?: { message: string }[] }
  if (cuerpo.errors?.length) throw new ErrorGraphQL(cuerpo.errors[0].message, cuerpo.errors)
  if (!cuerpo.data) throw new ErrorGraphQL('Respuesta GraphQL sin datos')
  return cuerpo.data
}
