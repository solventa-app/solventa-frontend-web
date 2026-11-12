import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ErrorGraphQL,
  TIEMPO_MAXIMO_MS,
  ENDPOINT_SUSCRIPCION,
  ejecutar,
  ejecutarSuscripcion,
  esErrorSinSesion,
  usarRenovador,
  usarToken,
} from '../src/graphql/cliente'

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
    await ejecutar('{ ok }', {}, f as unknown as typeof fetch, { endpoint: '/v1/graphql/web', conToken: false })
    expect((f.mock.calls[0] as unknown as [string])[0]).toBe('/v1/graphql/web')
    expect(cabeceras(f).Authorization).toBeUndefined()
    expect(cabeceras(f)['Accept-Language']).toBeTruthy()
  })
})

describe('ejecutarSuscripcion · ruta del flujo de suscripción', () => {
  afterEach(() => usarToken(null))

  it('va a /v1/graphql/web-suscripcion (5 s en el gateway) con el JWT de la sesión', async () => {
    usarToken('jwt')
    const f = fetchFalso()
    await ejecutarSuscripcion('{ ok }', {}, f as unknown as typeof fetch)
    expect(ENDPOINT_SUSCRIPCION).toBe('/v1/graphql/web-suscripcion')
    expect((f.mock.calls[0] as unknown as [string])[0]).toBe('/v1/graphql/web-suscripcion')
    expect(cabeceras(f).Authorization).toBe('Bearer jwt')
  })

  it('conserva las cabeceras del enlace de firma y el modo sin token', async () => {
    usarToken('jwt')
    const f = fetchFalso()
    await ejecutarSuscripcion('{ ok }', {}, f as unknown as typeof fetch, {
      conToken: false,
      cabeceras: { 'X-Enlace-Firma': 'abc' },
    })
    expect(cabeceras(f).Authorization).toBeUndefined()
    expect(cabeceras(f)['X-Enlace-Firma']).toBe('abc')
  })

  it('`ejecutar` sigue yendo al canal web de 700 ms', async () => {
    const f = fetchFalso()
    await ejecutar('{ ok }', {}, f as unknown as typeof fetch)
    expect((f.mock.calls[0] as unknown as [string])[0]).toBe('/graphql/web')
  })
})

describe('ejecutar: tiempo máximo', () => {
  it('corta una petición colgada y falla con error reintentable', async () => {
    vi.useFakeTimers()
    const colgado = vi.fn(
      (_u: string, init: RequestInit) =>
        new Promise((_ok, no) => init.signal?.addEventListener('abort', () => no(new DOMException('x', 'AbortError')))),
    )
    const promesa = ejecutar('{ ok }', {}, colgado as unknown as typeof fetch)
    const afirmacion = expect(promesa).rejects.toThrow('tardó más de lo esperado')
    await vi.advanceTimersByTimeAsync(TIEMPO_MAXIMO_MS + 1)
    await afirmacion
    vi.useRealTimers()
  })
})

describe('ejecutar · sesión vencida (v0.34: extensions.code)', () => {
  afterEach(() => {
    usarToken(null)
    usarRenovador(null)
  })

  const sinSesion = (code: string, message = 'Texto que puede cambiar') =>
    new Response(JSON.stringify({ data: null, errors: [{ message, extensions: { code } }] }), { status: 200 })

  it('reconoce SIN_SESION y SESION_INVALIDA por el código, no por el texto', () => {
    expect(esErrorSinSesion(new ErrorGraphQL('x', [{ message: 'x', extensions: { code: 'SIN_SESION' } }]))).toBe(true)
    expect(esErrorSinSesion(new ErrorGraphQL('x', [{ message: 'x', extensions: { code: 'SESION_INVALIDA' } }]))).toBe(
      true,
    )
    // El texto de antes, sin código, ya no cuenta.
    expect(esErrorSinSesion(new ErrorGraphQL('Debes iniciar sesión.', [{ message: 'Debes iniciar sesión.' }]))).toBe(
      false,
    )
    expect(esErrorSinSesion(new Error('SIN_SESION'))).toBe(false)
  })

  it('con SESION_INVALIDA renueva una vez y reintenta', async () => {
    usarToken('viejo')
    const renovador = vi.fn(async () => {
      usarToken('nuevo')
      return true
    })
    usarRenovador(renovador)
    const f = vi
      .fn()
      .mockResolvedValueOnce(
        sinSesion('SESION_INVALIDA', 'Your session is invalid or has expired. Please sign in again.'),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { ok: true } }), { status: 200 }))

    await expect(ejecutar('{ ok }', {}, f as unknown as typeof fetch)).resolves.toEqual({ ok: true })
    expect(renovador).toHaveBeenCalledTimes(1)
    const segunda = (f.mock.calls[1] as unknown as [string, RequestInit])[1].headers as Record<string, string>
    expect(segunda.Authorization).toBe('Bearer nuevo')
  })

  it('otro error con el mismo texto no renueva', async () => {
    usarToken('jwt')
    const renovador = vi.fn(async () => true)
    usarRenovador(renovador)
    const f = vi.fn(async () => sinSesion('OTRO', 'Debes iniciar sesión.'))

    await expect(ejecutar('{ ok }', {}, f as unknown as typeof fetch)).rejects.toThrow('Debes iniciar sesión.')
    expect(renovador).not.toHaveBeenCalled()
  })
})
