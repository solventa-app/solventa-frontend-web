import { afterEach, describe, expect, it, vi } from 'vitest'
import { ejecutar, usarToken } from '../src/graphql/cliente'

function fetchFalso() {
  return vi.fn(async () => new Response(JSON.stringify({ data: { ok: true } }), { status: 200 }))
}
const cabeceras = (f: ReturnType<typeof fetchFalso>) =>
  (f.mock.calls[0] as unknown as [string, RequestInit])[1].headers as Record<string, string>

describe('ejecutar · opciones', () => {
  afterEach(() => usarToken(null))

  it('por defecto va a /graphql/web con el JWT de la sesión', async () => {
    usarToken('jwt')
    const f = fetchFalso()
    await ejecutar('{ ok }', {}, f as unknown as typeof fetch)
    expect((f.mock.calls[0] as unknown as [string])[0]).toBe('/graphql/web')
    expect(cabeceras(f).Authorization).toBe('Bearer jwt')
  })

  it('acepta otro endpoint y omitir el token', async () => {
    usarToken('jwt')
    const f = fetchFalso()
    await ejecutar('{ ok }', {}, f as unknown as typeof fetch, { endpoint: '/graphql/siniestros', conToken: false })
    expect((f.mock.calls[0] as unknown as [string])[0]).toBe('/graphql/siniestros')
    expect(cabeceras(f).Authorization).toBeUndefined()
    expect(cabeceras(f)['Accept-Language']).toBeTruthy()
  })
})
