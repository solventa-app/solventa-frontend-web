// KAN-203: useSesion nunca tenía una prueba propia, solo se ejercitaba de rebote dentro de las
// pruebas de las vistas (pantallas-w01.test.ts/pantallas-w05.test.ts). Cubre lo que de verdad
// decide: a qué home vuelve "Inicio" por rol (RUTA_INICIO), el nombre por defecto que muestra cada
// home al iniciar sesión, y que cerrarSesion siempre vuelve a CLIENTE (nunca deja al usuario
// "atrapado" en un rol sin salida, ver nota del propio composable sobre el rol por defecto).
import { http, HttpResponse } from 'msw'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { ejecutar } from '../src/graphql/cliente'
import { servidor } from '../src/mocks/node'
import { CLAVE_SESION, RUTA_INICIO, restaurarSesion, useSesion } from '../src/composables/useSesion'

// `estado` es un singleton a nivel de módulo (mismo patrón que useCotizacion/useConciliacion): se
// resetea después de cada prueba para que una prueba no herede el rol que dejó la anterior.
afterEach(() => {
  useSesion().cerrarSesion()
  servidor.resetHandlers()
})
beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }))
afterAll(() => servidor.close())

const fetchPrueba: typeof fetch = (url, init) => fetch(new URL(String(url), 'http://localhost'), init)

describe('useSesion', () => {
  it('arranca en CLIENTE por defecto (una pantalla de /cotizacion/* es navegable sin pasar por /login)', () => {
    const { estado } = useSesion()
    expect(estado.rol).toBe('CLIENTE')
    expect(estado.nombre).toBeTruthy()
  })

  it('RUTA_INICIO mapea los 3 roles a su propio home (G-02/G-02a/G-02b)', () => {
    expect(RUTA_INICIO).toEqual({
      CLIENTE: '/inicio',
      ASESOR: '/asesor',
      BACKOFFICE: '/operador',
    })
  })

  it('establecerSesion cambia el rol y el nombre a los del rol entrante', () => {
    const { estado, establecerSesion } = useSesion()
    establecerSesion('ASESOR')
    expect(estado.rol).toBe('ASESOR')
    const nombreAsesor = estado.nombre
    expect(nombreAsesor).toBeTruthy()

    establecerSesion('BACKOFFICE')
    expect(estado.rol).toBe('BACKOFFICE')
    // El nombre cambia junto con el rol: cada rol tiene su propio nombre por defecto, no se arrastra
    // el del rol anterior.
    expect(estado.nombre).not.toBe(nombreAsesor)
  })

  it('cerrarSesion siempre vuelve a CLIENTE, sin importar desde qué rol se llame', () => {
    const { estado, establecerSesion, cerrarSesion } = useSesion()
    establecerSesion('BACKOFFICE')
    expect(estado.rol).toBe('BACKOFFICE')

    cerrarSesion()
    expect(estado.rol).toBe('CLIENTE')
  })

  it('el estado es compartido (singleton): dos llamadas a useSesion() ven el mismo cambio', () => {
    const primera = useSesion()
    const segunda = useSesion()
    primera.establecerSesion('ASESOR')
    expect(segunda.estado.rol).toBe('ASESOR')
  })

  it('ingresar guarda el token y ejecutar() lo manda en Authorization; cerrarSesion lo borra', async () => {
    const { estado, ingresar, cerrarSesion } = useSesion(fetchPrueba)
    const resultado = await ingresar('admin.solventa', 'clave', 'BACKOFFICE')
    expect(resultado).toEqual({ ok: true, rol: 'BACKOFFICE' })
    expect(estado.autenticado).toBe(true)
    expect(estado.usuario).toBe('admin.solventa')

    let cabecera: string | null = null
    servidor.use(
      http.post('*/graphql/web', ({ request }) => {
        cabecera = request.headers.get('authorization')
        return HttpResponse.json({ data: { yo: null } })
      }),
    )
    await ejecutar('{ yo { id } }', {}, fetchPrueba)
    expect(cabecera).toBe('Bearer token-demo-admin.solventa')

    cerrarSesion()
    await ejecutar('{ yo { id } }', {}, fetchPrueba)
    expect(cabecera).toBeNull()
  })

  it('ingresar con un rol que no es el del usuario no abre sesión', async () => {
    const { estado, ingresar } = useSesion(fetchPrueba)
    const resultado = await ingresar('asesor.demo', 'clave', 'CLIENTE')
    expect(resultado).toEqual({ ok: false, mensaje: 'Tu usuario es de Asesor comercial: elige ese rol para ingresar.' })
    expect(estado.autenticado).toBe(false)
  })

  describe('la sesión sobrevive a recargar la página (sessionStorage)', () => {
    afterEach(() => sessionStorage.clear())

    it('ingresar la guarda (sin datos personales) y cerrarSesion la borra', async () => {
      const { ingresar, cerrarSesion } = useSesion(fetchPrueba)
      await ingresar('admin.solventa', 'clave', 'BACKOFFICE')

      const guardada = JSON.parse(sessionStorage.getItem(CLAVE_SESION)!)
      expect(Object.keys(guardada).sort()).toEqual(['expiraEn', 'rol', 'token', 'usuario'])
      expect(guardada).toMatchObject({ rol: 'BACKOFFICE', usuario: 'admin.solventa', token: 'token-demo-admin.solventa' })

      cerrarSesion()
      expect(sessionStorage.getItem(CLAVE_SESION)).toBeNull()
    })

    it('al recargar, una sesión vigente se restaura y el token vuelve a viajar', async () => {
      const expiraEn = new Date(Date.now() + 60_000).toISOString()
      sessionStorage.setItem(CLAVE_SESION, JSON.stringify({ token: 't-1', rol: 'BACKOFFICE', usuario: 'admin.solventa', expiraEn }))

      restaurarSesion()

      const { estado } = useSesion()
      expect(estado).toMatchObject({ rol: 'BACKOFFICE', usuario: 'admin.solventa', autenticado: true })
      let cabecera: string | null = null
      servidor.use(
        http.post('*/graphql/web', ({ request }) => {
          cabecera = request.headers.get('authorization')
          return HttpResponse.json({ data: { yo: null } })
        }),
      )
      await ejecutar('{ yo { id } }', {}, fetchPrueba)
      expect(cabecera).toBe('Bearer t-1')
    })

    it('una sesión vencida no se restaura y se borra', () => {
      const expiraEn = new Date(Date.now() - 1000).toISOString()
      sessionStorage.setItem(CLAVE_SESION, JSON.stringify({ token: 't-1', rol: 'BACKOFFICE', usuario: 'admin.solventa', expiraEn }))

      restaurarSesion()

      expect(useSesion().estado.autenticado).toBe(false)
      expect(sessionStorage.getItem(CLAVE_SESION)).toBeNull()
    })

    it('un valor corrupto en sessionStorage no rompe la app', () => {
      sessionStorage.setItem(CLAVE_SESION, '{no es json')

      expect(() => restaurarSesion()).not.toThrow()
      expect(useSesion().estado.autenticado).toBe(false)
    })
  })
})
