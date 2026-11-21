// KAN-32: el idioma se guarda en la cuenta (como la moneda y el país) y la cuenta lo impone al entrar o al recuperar
// la sesión. Antes solo vivía en `localStorage` y en otro equipo volvía a español.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { adoptarIdiomaDeCuenta, elegirIdioma } from '../src/composables/useIdiomaCuenta'
import { moneda } from '../src/composables/useMoneda'
import { pais } from '../src/composables/usePais'
import { useSesion } from '../src/composables/useSesion'
import { usarToken } from '../src/graphql/cliente'
import { idioma } from '../src/i18n'

type Llamada = [string, RequestInit]
const cuerpoDe = (fetchFn: ReturnType<typeof vi.fn>, i = 0) =>
  JSON.parse((fetchFn.mock.calls[i] as unknown as Llamada)[1].body as string)

/** JWT sin firma con los claims dados (la firma la verifica el BFF, no el frontend). */
function token(claims: Record<string, unknown>): string {
  const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/=+$/, '')
  return `${b64({ alg: 'none' })}.${b64(claims)}.x`
}
const tokenCliente = () =>
  token({ sub: '1', usuario: 'cliente.demo', rol: 'CLIENTE', exp: Math.floor(Date.now() / 1000) + 600 })

beforeEach(() => {
  localStorage.clear()
  usarToken(null)
  idioma.value = 'ES'
  moneda.value = 'COP'
})
afterEach(() => {
  useSesion().cerrarSesion()
  idioma.value = 'ES'
})

describe('elegirIdioma', () => {
  it('sin sesión cambia el idioma y lo recuerda en el navegador, sin llamar al BFF', async () => {
    const fetchFn = vi.fn()
    await elegirIdioma('EN', fetchFn as unknown as typeof fetch)
    expect(idioma.value).toBe('EN')
    expect(localStorage.getItem('solventa.idioma')).toBe('EN')
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('con sesión también lo guarda en la cuenta, con la moneda y el país actuales', async () => {
    usarToken('token')
    moneda.value = 'USD'
    pais.value = 'CO'
    const fetchFn = vi.fn(
      async () => new Response(JSON.stringify({ data: { actualizarPreferencias: { __typename: 'Usuario' } } })),
    )
    await elegirIdioma('EN', fetchFn as unknown as typeof fetch)
    const cuerpo = cuerpoDe(fetchFn)
    expect(cuerpo.query).toContain('actualizarPreferencias')
    expect(cuerpo.variables.entrada).toEqual({ idioma: 'EN', moneda: 'USD', pais: 'CO' })
  })

  it('si la cuenta no lo guarda, sigue valiendo en el navegador', async () => {
    usarToken('token')
    await elegirIdioma('EN', vi.fn().mockRejectedValue(new Error('red')) as unknown as typeof fetch)
    expect(idioma.value).toBe('EN')
  })
})

describe('el idioma de la cuenta prevalece', () => {
  it('adoptarIdiomaDeCuenta acepta ES/EN (en cualquier caja) e ignora lo demás', () => {
    adoptarIdiomaDeCuenta('en')
    expect(idioma.value).toBe('EN')
    adoptarIdiomaDeCuenta('FR')
    adoptarIdiomaDeCuenta(null)
    expect(idioma.value).toBe('EN')
    adoptarIdiomaDeCuenta('ES')
    expect(idioma.value).toBe('ES')
  })

  it('al iniciar sesión pide `idioma` y aplica el de la cuenta', async () => {
    const fetchFn = vi.fn(async () =>
      Response.json({
        data: {
          iniciarSesion: {
            token: tokenCliente(),
            refreshExpiraEn: new Date(Date.now() + 3_600_000).toISOString(),
            usuario: { nombre: 'Cliente Demo', idioma: 'EN', moneda: 'COP', pais: 'CO' },
          },
        },
      }),
    )
    expect(await useSesion(fetchFn as unknown as typeof fetch).iniciarSesion('cliente.demo', 'x')).toBeNull()
    expect(cuerpoDe(fetchFn).query).toMatch(/usuario \{[^}]*idioma/)
    expect(idioma.value).toBe('EN')
  })

  it('al recuperar la sesión (`yo`) aplica el de la cuenta', async () => {
    usarToken(tokenCliente())
    const sesion = useSesion()
    sesion.estado.token = tokenCliente()
    const fetchFn = vi.fn(async () =>
      Response.json({ data: { yo: { nombre: 'Cliente Demo', idioma: 'EN', moneda: 'COP', pais: 'CO' } } }),
    )
    await useSesion(fetchFn as unknown as typeof fetch).cargarNombre()
    expect(cuerpoDe(fetchFn).query).toMatch(/yo \{[^}]*idioma/)
    expect(idioma.value).toBe('EN')
  })
})
