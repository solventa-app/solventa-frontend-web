// W07-01 · Ingreso al portal de socios (HU-W07, plan-hu-w07-front.md 5.2): CA-W07-01 a CA-W07-04.
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { CLAVE_TOKEN_SOCIO, useSesionSocio } from '../src/composables/useSesionSocio'
import { servidor } from '../src/mocks/node'
import { MENSAJES_SOCIOS } from '../src/mocks/socios'
import { crearRutas } from '../src/router'
import IngresoConRol from '../src/views/IngresoConRol.vue'
import IngresoSocio from '../src/views/IngresoSocio.vue'

const montados: VueWrapper[] = []
function montar(componente: Parameters<typeof mount>[0], router: Router) {
  const wrapper = mount(componente, { global: { plugins: [router] } })
  montados.push(wrapper)
  return wrapper
}
const crearRouterDePrueba = () => createRouter({ history: createMemoryHistory(), routes: crearRutas() })

async function esperarRuta(router: Router, ruta: string) {
  for (let i = 0; i < 20 && router.currentRoute.value.path !== ruta; i++) {
    await flushPromises()
    await new Promise((r) => setTimeout(r, 10))
  }
}

async function llenar(wrapper: VueWrapper, socioId: string, clave: string) {
  const [id, campoClave] = wrapper.findAll('input')
  await id.setValue(socioId)
  await campoClave.setValue(clave)
}

const boton = (wrapper: VueWrapper) => wrapper.get('button[aria-busy]')

beforeAll(() => {
  servidor.listen({ onUnhandledFrame: 'error' })
  // La vista llama a `fetch('/v1/token')` con la ruta relativa, como en el navegador: en Node se le da un origen. Se
  // reemplaza después de `listen`, para que la petición pase por el `fetch` que intercepta MSW.
  const fetchConMsw = globalThis.fetch
  vi.stubGlobal('fetch', (url: RequestInfo | URL, init?: RequestInit) =>
    fetchConMsw(typeof url === 'string' ? new URL(url, 'http://localhost') : url, init),
  )
})
afterEach(() => {
  montados.splice(0).forEach((w) => w.unmount())
  servidor.resetHandlers()
  useSesionSocio().cerrarSesion()
})
afterAll(() => {
  servidor.close()
  vi.unstubAllGlobals()
})

describe('W07-01 · Ingreso al portal de socios', () => {
  it('CA-W07-01: «Ingresar» queda deshabilitado hasta llenar el ID y la clave', async () => {
    const wrapper = montar(IngresoSocio, crearRouterDePrueba())
    expect(boton(wrapper).attributes('disabled')).toBeDefined()
    await wrapper.findAll('input')[0].setValue('retail-fintech-042')
    expect(boton(wrapper).attributes('disabled')).toBeDefined()
    await wrapper.findAll('input')[1].setValue('sk_live_x')
    expect(boton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('CA-W07-01: con la clave de producción entra al panel y guarda solo el token', async () => {
    const router = crearRouterDePrueba()
    const wrapper = montar(IngresoSocio, router)
    await llenar(wrapper, 'retail-fintech-042', 'sk_live_x')
    await boton(wrapper).trigger('click')
    await esperarRuta(router, '/socios/panel')
    expect(router.currentRoute.value.path).toBe('/socios/panel')
    expect(sessionStorage.getItem(CLAVE_TOKEN_SOCIO)).toBeTruthy()
  })

  it('CA-W07-02: con credenciales incorrectas muestra el mensaje genérico y limpia la clave', async () => {
    const wrapper = montar(IngresoSocio, crearRouterDePrueba())
    await llenar(wrapper, 'retail-fintech-042', 'clave-erronea')
    await boton(wrapper).trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toBe(MENSAJES_SOCIOS.credenciales)
    expect((wrapper.findAll('input')[1].element as HTMLInputElement).value).toBe('')
  })

  it('CA-W07-02: el bloqueo por intentos muestra su mensaje', async () => {
    const wrapper = montar(IngresoSocio, crearRouterDePrueba())
    await llenar(wrapper, 'bloqueado-042', 'sk_live_x')
    await boton(wrapper).trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toBe(MENSAJES_SOCIOS.bloqueado)
  })

  it('CA-W07-03: con la clave de pruebas no entra y lo explica', async () => {
    const router = crearRouterDePrueba()
    await router.push('/socios/ingreso')
    const wrapper = montar(IngresoSocio, router)
    await llenar(wrapper, 'retail-fintech-042', 'sk_test_x')
    await boton(wrapper).trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toMatch(/clave de producción/)
    expect(router.currentRoute.value.path).toBe('/socios/ingreso')
    expect(sessionStorage.getItem(CLAVE_TOKEN_SOCIO)).toBeNull()
  })

  it('CA-W07-04: si la sesión técnica venció, avisa arriba de la tarjeta', async () => {
    useSesionSocio().vencerSesion()
    const wrapper = montar(IngresoSocio, crearRouterDePrueba())
    expect(wrapper.get('[role="status"]').text()).toMatch(/sesión técnica venció/)
  })

  it('tiene el enlace de regreso al login de Solventa', () => {
    const wrapper = montar(IngresoSocio, crearRouterDePrueba())
    expect(wrapper.find('a[href="/login"]').exists()).toBe(true)
  })
})

describe('G-01 · enlace al portal de socios', () => {
  it('«¿Eres un socio de distribución?…» lleva a /socios/ingreso', () => {
    const wrapper = montar(IngresoConRol, crearRouterDePrueba())
    expect(wrapper.find('a[href="/socios/ingreso"]').text()).toMatch(/socio de distribución/)
  })
})
