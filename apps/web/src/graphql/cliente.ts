import { tokenActual } from './token'

// Cliente GraphQL mínimo contra el BFF (canal web: /graphql/web). Sin librería a propósito: todavía no
// hay operaciones; cuando haya muchas se puede cambiar por urql o Apollo sin tocar los mocks (MSW intercepta HTTP).

export class ErrorGraphQL extends Error {
  constructor(
    mensaje: string,
    readonly errores: unknown[] = [],
  ) {
    super(mensaje)
  }
}

export async function ejecutar<T>(
  consulta: string,
  variables: Record<string, unknown> = {},
  fetchFn: typeof fetch = fetch,
): Promise<T> {
  // Con sesión, el token viaja en cada operación (el BFF exige BACKOFFICE para los cobros, HU-W05).
  const token = tokenActual()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const respuesta = await fetchFn('/graphql/web', {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: consulta, variables }),
  })
  if (!respuesta.ok) throw new ErrorGraphQL(`El BFF respondió ${respuesta.status}`)

  const cuerpo = (await respuesta.json()) as { data?: T; errors?: { message: string }[] }
  if (cuerpo.errors?.length) throw new ErrorGraphQL(cuerpo.errors[0].message, cuerpo.errors)
  if (!cuerpo.data) throw new ErrorGraphQL('Respuesta GraphQL sin datos')
  return cuerpo.data
}
