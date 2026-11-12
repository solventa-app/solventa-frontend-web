import { describe, expect, it, vi } from 'vitest'
import { enviarALogLocal } from '../src/log'

describe('log local (T22, /__log)', () => {
  it('manda nivel, mensaje y datos a /__log con keepalive', () => {
    const f = vi.fn(async () => new Response(null, { status: 204 }))
    enviarALogLocal('warn', 'El BFF no respondió a tiempo', { endpoint: '/graphql/web' }, f as unknown as typeof fetch)

    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/__log')
    expect(init.method).toBe('POST')
    expect(init.keepalive).toBe(true)
    expect(JSON.parse(init.body as string)).toMatchObject({
      nivel: 'warn',
      mensaje: 'El BFF no respondió a tiempo',
      datos: { endpoint: '/graphql/web' },
    })
  })

  it('nunca lanza aunque el servidor no responda o los datos no se puedan serializar', () => {
    const caido = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })
    expect(() => enviarALogLocal('error', 'x', undefined, caido as unknown as typeof fetch)).not.toThrow()

    const circular: Record<string, unknown> = {}
    circular.yo = circular
    const f = vi.fn()
    expect(() => enviarALogLocal('info', 'x', circular, f as unknown as typeof fetch)).not.toThrow()
    expect(f).not.toHaveBeenCalled()
  })
})
