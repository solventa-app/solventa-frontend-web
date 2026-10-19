import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  CLAVE_INICIO,
  CLAVE_TOKEN,
  leerClaims,
  restaurarSesion,
  RUTA_INICIO,
  useSesion,
} from '../src/composables/useSesion'
import { tokenDeDemo } from '../src/mocks/handlers'
import { servidor } from '../src/mocks/node'

const fetchPrueba: typeof fetch = (url, init) => fetch(new URL(String(url), 'http://localhost'), init)

/** JWT sin firma con los claims dados (la firma la verifica el BFF, no el frontend). */
function token(claims: Record<string, unknown>): string {
  const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/=+$/, '')
  return `${b64({ alg: 'none' })}.${b64(claims)}.x`
}

beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  servidor.resetHandlers()
  useSesion().cerrarSesion()
})
afterAll(() => servidor.close())

describe('leerClaims', () => {
  it('lee usuario, rol y exp del payload, incluidos caracteres con tilde, y el token no trae el nombre', () => {
    const claims = leerClaims(tokenDeDemo('andrés.duarte', 'CLIENTE'))
    expect(claims).toMatchObject({ usuario: 'andrés.duarte', rol: 'CLIENTE' })
    expect(claims).not.toHaveProperty('nombre')
  })

  it('rechaza un token mal formado o con un rol desconocido', () => {
    expect(leerClaims('no-es-un-jwt')).toBeNull()
    expect(leerClaims(token({ usuario: 'x', rol: 'OPERADOR', exp: 9999999999 }))).toBeNull()
  })
})

describe('useSesion', () => {
  it('arranca sin sesión', () => {
    const { estado, sesionActiva, rutaInicio } = useSesion()
    expect(estado.token).toBeNull()
    expect(sesionActiva()).toBe(false)
    expect(rutaInicio()).toBe('/login')
  })

  it('RUTA_INICIO mapea los 3 roles del backend a su home (G-02/G-02a/G-02b)', () => {
    expect(RUTA_INICIO).toEqual({ CLIENTE: '/inicio', ASESOR: '/asesor', BACKOFFICE: '/operador' })
  })

  it('iniciarSesion toma el rol del JWT y el nombre de Usuario.nombre', async () => {
    const { estado, iniciarSesion, sesionActiva, rutaInicio } = useSesion(fetchPrueba)
    expect(await iniciarSesion('asesor.pena', 'secreta123')).toBeNull()
    expect(estado.rol).toBe('ASESOR')
    expect(estado.nombre).toBe('Asesor Pena')
    expect(sesionActiva()).toBe(true)
    expect(rutaInicio()).toBe('/asesor')
  })

  it('si Usuario.nombre es null muestra el alias', async () => {
    const sinNombre = token({
      sub: '1',
      usuario: 'cliente.demo',
      rol: 'CLIENTE',
      exp: Math.floor(Date.now() / 1000) + 60,
    })
    const fetchSinNombre: typeof fetch = async () =>
      Response.json({ data: { iniciarSesion: { token: sinNombre, usuario: { nombre: null } } } })
    const { estado, iniciarSesion } = useSesion(fetchSinNombre)
    expect(await iniciarSesion('cliente.demo', 'x')).toBeNull()
    expect(estado.nombre).toBe('cliente.demo')
  })

  it('envía el token en Authorization en las peticiones siguientes', async () => {
    await useSesion(fetchPrueba).iniciarSesion('cliente.demo', 'x')
    let cabecera: string | null = null
    const fetchQueCaptura: typeof fetch = async (url, init) => {
      cabecera = new Headers(init?.headers).get('Authorization')
      return fetchPrueba(url, init)
    }
    await useSesion(fetchQueCaptura).iniciarSesion('cliente.demo', 'x')
    expect(cabecera).toMatch(/^Bearer ey/)
  })

  it('devuelve el mensaje genérico del BFF con credenciales incorrectas y no abre sesión', async () => {
    const { iniciarSesion, sesionActiva } = useSesion(fetchPrueba)
    expect(await iniciarSesion('cliente.demo', 'clave-erronea')).toBe('Usuario o clave incorrectos.')
    expect(sesionActiva()).toBe(false)
  })

  it('una falla técnica nunca llega como texto crudo (regla 5)', async () => {
    const fetchCaido: typeof fetch = async () => new Response(null, { status: 500 })
    const mensaje = await useSesion(fetchCaido).iniciarSesion('cliente.demo', 'x')
    expect(mensaje).toBeTruthy()
    expect(mensaje).not.toMatch(/500|BFF/)
  })

  it('un token vencido no cuenta como sesión activa', async () => {
    const vencido = token({ sub: '1', usuario: 'cliente.demo', rol: 'CLIENTE', exp: Math.floor(Date.now() / 1000) - 1 })
    const fetchVencido: typeof fetch = async () => Response.json({ data: { iniciarSesion: { token: vencido } } })
    const { iniciarSesion, sesionActiva } = useSesion(fetchVencido)
    await iniciarSesion('cliente.demo', 'x')
    expect(sesionActiva()).toBe(false)
  })

  it('cerrarSesion borra token, rol y nombre', async () => {
    const { estado, iniciarSesion, cerrarSesion } = useSesion(fetchPrueba)
    await iniciarSesion('admin.solventa', 'x')
    cerrarSesion()
    expect(estado).toMatchObject({ token: null, rol: null, nombre: '' })
  })
})

describe('nombre del usuario al restaurar la sesión (yo)', () => {
  afterEach(() => sessionStorage.clear())

  it('cargarNombre pide `yo` con el token y reemplaza el alias por el nombre', async () => {
    const { estado, iniciarSesion, cargarNombre } = useSesion(fetchPrueba)
    await iniciarSesion('maria.restrepo', 'x')
    estado.nombre = 'maria.restrepo'
    await cargarNombre()
    expect(estado.nombre).toBe('Maria Restrepo')
  })

  it('si `yo` falla se queda el alias y no se muestra ningún error', async () => {
    const { estado, iniciarSesion } = useSesion(fetchPrueba)
    await iniciarSesion('maria.restrepo', 'x')
    estado.nombre = 'maria.restrepo'
    const caido: typeof fetch = async () => new Response(null, { status: 500 })
    await useSesion(caido).cargarNombre()
    expect(estado.nombre).toBe('maria.restrepo')
  })

  it('el nombre no se guarda en sessionStorage', async () => {
    await useSesion(fetchPrueba).iniciarSesion('maria.restrepo', 'x')
    const guardado = sessionStorage.getItem(CLAVE_TOKEN) ?? ''
    expect(guardado).not.toContain('Maria')
    // Solo el token y la marca de tiempo del inicio de sesión (sin datos personales).
    expect(sessionStorage.length).toBe(2)
    expect(Number(sessionStorage.getItem(CLAVE_INICIO))).toBeGreaterThan(0)
  })
})

describe('la sesión sobrevive a recargar la página (sessionStorage)', () => {
  const enUnMinuto = () => Math.floor(Date.now() / 1000) + 60

  afterEach(() => sessionStorage.clear())

  it('iniciarSesion guarda el token y la hora de inicio, y cerrarSesion los borra', async () => {
    const { iniciarSesion, cerrarSesion, estado } = useSesion(fetchPrueba)
    await iniciarSesion('asesor.pena', 'secreta123')

    expect(sessionStorage.length).toBe(2)
    expect(sessionStorage.getItem(CLAVE_TOKEN)).toBe(estado.token)
    expect(Number(sessionStorage.getItem(CLAVE_INICIO))).toBe(estado.iniciadaEn)
    expect(estado.usuario).toBe('asesor.pena')

    cerrarSesion()
    expect(sessionStorage.getItem(CLAVE_TOKEN)).toBeNull()
    expect(sessionStorage.getItem(CLAVE_INICIO)).toBeNull()
  })

  it('al recargar, un token vigente reabre la sesión con su rol', () => {
    sessionStorage.setItem(CLAVE_TOKEN, token({ usuario: 'admin.solventa', rol: 'BACKOFFICE', exp: enUnMinuto() }))

    restaurarSesion()

    const { estado, sesionActiva, rutaInicio } = useSesion()
    expect(sesionActiva()).toBe(true)
    expect(estado.rol).toBe('BACKOFFICE')
    expect(rutaInicio()).toBe('/operador')
  })

  it('un token vencido no se restaura y se borra', () => {
    const vencido = Math.floor(Date.now() / 1000) - 10
    sessionStorage.setItem(CLAVE_TOKEN, token({ usuario: 'admin.solventa', rol: 'BACKOFFICE', exp: vencido }))

    restaurarSesion()

    expect(useSesion().sesionActiva()).toBe(false)
    expect(sessionStorage.getItem(CLAVE_TOKEN)).toBeNull()
  })

  it('un token ilegible no rompe la app y se borra', () => {
    sessionStorage.setItem(CLAVE_TOKEN, 'basura')

    expect(() => restaurarSesion()).not.toThrow()
    expect(useSesion().sesionActiva()).toBe(false)
    expect(sessionStorage.getItem(CLAVE_TOKEN)).toBeNull()
  })
})
