// Cliente GraphQL mínimo contra el BFF (canal web: /graphql/web). Sin librería a propósito: con pocas
// operaciones no hace falta urql ni Apollo, y MSW intercepta HTTP igual con cualquiera de ellos.

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

export async function ejecutar<T>(
  consulta: string,
  variables: Record<string, unknown> = {},
  fetchFn: typeof fetch = fetch,
): Promise<T> {
  const cabeceras: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) cabeceras.Authorization = `Bearer ${token}`

  const respuesta = await fetchFn('/graphql/web', {
    method: 'POST',
    headers: cabeceras,
    body: JSON.stringify({ query: consulta, variables }),
  })
  if (respuesta.status === 502 || respuesta.status === 503 || respuesta.status === 504) {
    throw new ErrorGraphQL('El servicio tardó más de lo esperado. Intenta nuevamente.')
  }
  if (!respuesta.ok) throw new ErrorGraphQL(`El BFF respondió ${respuesta.status}`)

  const cuerpo = (await respuesta.json()) as { data?: T; errors?: { message: string }[] }
  if (cuerpo.errors?.length) throw new ErrorGraphQL(cuerpo.errors[0].message, cuerpo.errors)
  if (!cuerpo.data) throw new ErrorGraphQL('Respuesta GraphQL sin datos')
  return cuerpo.data
}
