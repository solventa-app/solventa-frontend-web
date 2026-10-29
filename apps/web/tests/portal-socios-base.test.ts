// Piezas comunes del portal de socios (HU-W07, plan-hu-w07-front.md 5.1): cliente REST, sesión técnica del socio,
// guardia del router y mocks del borrador del contrato.
import { createMemoryHistory } from 'vue-router'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorSocios, llamarApiSocios, obtenerConsumo, obtenerCredenciales, rotarCredencial } from '../src/api/socios'
import {
  CLAVE_TOKEN_SOCIO,
  leerClaimsSocio,
  restaurarSesionSocio,
  useSesionSocio,
} from '../src/composables/useSesionSocio'
import { idioma } from '../src/i18n'
import { crearRouter } from '../src/router'
import { servidor } from '../src/mocks/node'
import { MENSAJES_SOCIOS, NOMBRE_SOCIO_DEMO, restablecerSociosDePrueba, tokenSocioDeDemo } from '../src/mocks/socios'

const fetchPrueba: typeof fetch = (url, init) => fetch(new URL(String(url), 'http://localhost'), init)
/** Espera que la promesa falle y devuelve el error, tipado. */
const fallo = (promesa: Promise<unknown>) =>
  promesa.then(
    () => {
      throw new Error('se esperaba un error')
    },
    (e: ErrorSocios) => e,
  )
const respuesta = (status: number, cuerpo: unknown = {}) =>
  vi.fn(async () => new Response(JSON.stringify(cuerpo), { status })) as unknown as typeof fetch

beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  servidor.resetHandlers()
  useSesionSocio().cerrarSesion()
  idioma.value = 'ES'
})
afterAll(() => servidor.close())
beforeEach(() => restablecerSociosDePrueba())

describe('cliente REST de socios', () => {
  it('manda el token, el idioma y el cuerpo en JSON a /v1', async () => {
    const f = respuesta(200, { ok: true })
    await llamarApiSocios('POST', '/cotizaciones', { cuerpo: { a: 1 }, token: 'jwt', fetchFn: f })
    const [url, init] = (f as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    const cabeceras = init.headers as Record<string, string>
    expect(url).toBe('/v1/cotizaciones')
    expect(cabeceras.Authorization).toBe('Bearer jwt')
    expect(cabeceras['Accept-Language']).toBeTruthy()
    expect(init.body).toBe('{"a":1}')
  })

  it('un 502, 503 o 504 del gateway llega como servicio lento, nunca como 5xx', async () => {
    for (const status of [502, 503, 504]) {
      const error = await fallo(llamarApiSocios('GET', '/estado', { fetchFn: respuesta(status) }))
      expect(error).toBeInstanceOf(ErrorSocios)
      expect(error.codigo).toBe('SERVICIO_LENTO')
      expect(error.message).not.toMatch(/50\d/)
    }
  })

  it('otro 5xx o un fallo de red dan un mensaje genérico', async () => {
    const e500 = await fallo(llamarApiSocios('GET', '/estado', { fetchFn: respuesta(500) }))
    expect(e500.codigo).toBe('ERROR')
    const red = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    }) as unknown as typeof fetch
    const eRed = await fallo(llamarApiSocios('GET', '/estado', { fetchFn: red }))
    expect(eRed.codigo).toBe('ERROR')
    expect(eRed.message).not.toMatch(/fetch/i)
  })

  it('un 429 es «presupuesto agotado» con el texto del portal; un 401 trae el mensaje del backend', async () => {
    const e429 = await fallo(llamarApiSocios('POST', '/cotizaciones', { fetchFn: respuesta(429) }))
    expect(e429.codigo).toBe('PRESUPUESTO_AGOTADO')
    expect(e429.message).toMatch(/Presupuesto agotado/)
    const e401 = await fallo(
      llamarApiSocios('GET', '/consumo', {
        fetchFn: respuesta(401, { codigo: 'NO_AUTORIZADO', mensaje: 'Mensaje del backend.' }),
      }),
    )
    expect(e401).toMatchObject({ codigo: 'NO_AUTORIZADO', message: 'Mensaje del backend.' })
  })
})

describe('sesión técnica del socio', () => {
  it('entra con la clave de producción, guarda solo el token y trae el nombre del socio', async () => {
    const sesion = useSesionSocio(fetchPrueba)
    expect(await sesion.iniciarSesion(' retail-fintech-042 ', 'sk_live_x')).toBeNull()
    expect(sesion.sesionActiva()).toBe(true)
    expect(sesion.estado).toMatchObject({ socioId: 'retail-fintech-042', nombre: NOMBRE_SOCIO_DEMO, aviso: null })
    expect(sessionStorage.getItem(CLAVE_TOKEN_SOCIO)).toBe(sesion.estado.token)
    sesion.cerrarSesion()
    expect(sessionStorage.getItem(CLAVE_TOKEN_SOCIO)).toBeNull()
  })

  it('con la clave de pruebas no abre el portal (W07-3)', async () => {
    const sesion = useSesionSocio(fetchPrueba)
    expect(await sesion.iniciarSesion('retail-fintech-042', 'sk_test_x')).toMatch(/clave de producción/)
    expect(sesion.sesionActiva()).toBe(false)
  })

  it('muestra el error genérico y el bloqueo por intentos', async () => {
    const sesion = useSesionSocio(fetchPrueba)
    expect(await sesion.iniciarSesion('retail-fintech-042', 'clave-erronea')).toBe(MENSAJES_SOCIOS.credenciales)
    expect(await sesion.iniciarSesion('bloqueado-01', 'sk_live_x')).toBe(MENSAJES_SOCIOS.bloqueado)
    expect(sesion.sesionActiva()).toBe(false)
  })

  it('al recargar restaura un token vigente y descarta uno vencido con el aviso', () => {
    sessionStorage.setItem(CLAVE_TOKEN_SOCIO, tokenSocioDeDemo('retail-fintech-042', 'PRODUCCION'))
    restaurarSesionSocio()
    const sesion = useSesionSocio()
    expect(sesion.sesionActiva()).toBe(true)

    sessionStorage.setItem(CLAVE_TOKEN_SOCIO, tokenSocioDeDemo('retail-fintech-042', 'PRODUCCION', -60))
    restaurarSesionSocio()
    expect(sesion.sesionActiva()).toBe(false)
    expect(sesion.estado.aviso).toBe('vencida')
    expect(sessionStorage.getItem(CLAVE_TOKEN_SOCIO)).toBeNull()
  })

  it('lee el socio y el entorno del token y rechaza uno ilegible', () => {
    expect(leerClaimsSocio(tokenSocioDeDemo('s-1', 'PRUEBAS'))).toMatchObject({ sub: 's-1', entorno: 'PRUEBAS' })
    expect(leerClaimsSocio('no-es-un-jwt')).toBeNull()
  })
})

describe('guardia del portal de socios', () => {
  it('sin sesión técnica, el panel y la documentación llevan al ingreso del socio', async () => {
    for (const ruta of ['/socios/panel', '/socios/documentacion']) {
      const router = crearRouter(createMemoryHistory())
      await router.push(ruta)
      expect(router.currentRoute.value.path).toBe('/socios/ingreso')
    }
  })

  it('con sesión técnica deja pasar; si venció, vuelve al ingreso con el aviso', async () => {
    const sesion = useSesionSocio(fetchPrueba)
    await sesion.iniciarSesion('retail-fintech-042', 'sk_live_x')
    const router = crearRouter(createMemoryHistory())
    await router.push('/socios/panel')
    expect(router.currentRoute.value.path).toBe('/socios/panel')

    sesion.estado.expiraEn = Date.now() - 1
    await router.push('/socios/documentacion')
    expect(router.currentRoute.value.path).toBe('/socios/ingreso')
    expect(sesion.estado.aviso).toBe('vencida')
  })
})

describe('mocks de la API de socios', () => {
  const token = () => tokenSocioDeDemo('retail-fintech-042', 'PRODUCCION')

  it('devuelve las credenciales por entorno y rota la clave de uno', async () => {
    const antes = await obtenerCredenciales(token(), fetchPrueba)
    expect(antes.entornos.map((c) => c.entorno)).toEqual(['PRODUCCION', 'PRUEBAS'])
    const nueva = await rotarCredencial(token(), 'PRUEBAS', fetchPrueba)
    expect(nueva.clave).not.toBe(antes.entornos[1].clave)
    expect(nueva.clave.startsWith('sk_test_')).toBe(true)
  })

  it('cotizar descuenta del presupuesto; agotado responde 429', async () => {
    const consumo = await obtenerConsumo(token(), 'PRODUCCION', '1h', fetchPrueba)
    expect(consumo.presupuesto).toMatchObject({ asignadas: 1000, consumidas: 842, restantes: 158 })
    const agotado = tokenSocioDeDemo('agotado-01', 'PRODUCCION')
    const error = await fallo(
      llamarApiSocios('POST', '/cotizaciones', { cuerpo: {}, token: agotado, fetchFn: fetchPrueba }),
    )
    expect(error.codigo).toBe('PRESUPUESTO_AGOTADO')
  })

  it('sin token vigente, la cuenta responde 401', async () => {
    const error = await fallo(obtenerCredenciales('vencido', fetchPrueba))
    expect(error.codigo).toBe('NO_AUTORIZADO')
  })
})
