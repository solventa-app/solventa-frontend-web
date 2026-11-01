// W07-03 · Documentación de la API (HU-W07, plan-hu-w07-front.md 5.4): CA-W07-11 a CA-W07-13, la barra de pestañas y
// la copia del contrato de socios que sirve la web.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { HttpResponse, http } from 'msw'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import Pestanas from '../src/components/ui/Pestanas.vue'
import { reiniciarPanelSocio } from '../src/composables/usePanelSocio'
import { leerClaimsSocio, useSesionSocio } from '../src/composables/useSesionSocio'
import { servidor } from '../src/mocks/node'
import { restablecerSociosDePrueba } from '../src/mocks/socios'
import { crearRutas } from '../src/router'
import DocumentacionApi from '../src/views/DocumentacionApi.vue'

// Swagger UI no corre en jsdom: se reemplaza por un falso que guarda sus opciones para revisar el token inyectado.
const swagger = vi.hoisted(() => ({ opciones: [] as { requestInterceptor: (p: unknown) => Promise<unknown> }[] }))
vi.mock('swagger-ui-dist/swagger-ui-es-bundle.js', () => ({
  default: (opciones: (typeof swagger.opciones)[number]) => swagger.opciones.push(opciones),
}))
vi.mock('swagger-ui-dist/swagger-ui.css', () => ({}))

const montados: VueWrapper[] = []
let router: Router

async function esperar(condicion: () => boolean) {
  for (let i = 0; i < 40 && !condicion(); i++) {
    await flushPromises()
    await new Promise((r) => setTimeout(r, 5))
  }
}

async function montarDocs(pestana?: string) {
  await useSesionSocio().iniciarSesion('retail-fintech-042', 'sk_live_x')
  router = createRouter({ history: createMemoryHistory(), routes: crearRutas() })
  await router.push({ path: '/socios/documentacion', query: pestana ? { pestana } : {} })
  const wrapper = mount(DocumentacionApi, { global: { plugins: [router] } })
  montados.push(wrapper)
  await flushPromises()
  return wrapper
}

/** Llama al requestInterceptor del último Swagger montado y devuelve los claims del token que puso. */
async function tokenInyectado() {
  await esperar(() => swagger.opciones.length > 0)
  const peticion = { url: 'http://localhost/v1/cotizaciones', headers: {} as Record<string, string> }
  await swagger.opciones.at(-1)!.requestInterceptor(peticion)
  return leerClaimsSocio(peticion.headers.Authorization.replace('Bearer ', ''))
}

beforeAll(() => {
  servidor.listen({ onUnhandledFrame: 'error' })
  const fetchConMsw = globalThis.fetch
  vi.stubGlobal('fetch', (url: RequestInfo | URL, init?: RequestInit) =>
    fetchConMsw(typeof url === 'string' ? new URL(url, 'http://localhost') : url, init),
  )
})
beforeEach(() => {
  restablecerSociosDePrueba()
  reiniciarPanelSocio()
  swagger.opciones.length = 0
  // Por defecto la guía en PDF aún no está publicada (paso 5.5).
  servidor.use(http.head('*/socios/:archivo', () => new HttpResponse(null, { status: 404 })))
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

describe('W07-03 · Documentación de la API', () => {
  it('CA-W07-11: abre en «Guía de integración» y, sin el PDF publicado, lo dice', async () => {
    const wrapper = await montarDocs()
    expect(wrapper.get('[role="tab"][aria-selected="true"]').text()).toContain('Guía de integración')
    await esperar(() => wrapper.find('[data-prueba="guia-pendiente"]').exists())
    expect(wrapper.get('[data-prueba="guia-pendiente"]').text()).toMatch(/todavía no está publicada/)
    expect(swagger.opciones).toHaveLength(0)
  })

  it('CA-W07-11: con el PDF publicado lo muestra en el idioma activo, con abrir y descargar', async () => {
    servidor.use(
      http.head('*/socios/:archivo', () => new HttpResponse(null, { headers: { 'Content-Type': 'application/pdf' } })),
    )
    const wrapper = await montarDocs()
    await esperar(() => wrapper.find('[data-prueba="guia-pdf"]').exists())
    expect(wrapper.get('[data-prueba="guia-pdf"]').attributes('src')).toBe('/socios/guia-integracion-es.pdf')
    expect(wrapper.find('a[download]').attributes('href')).toBe('/socios/guia-integracion-es.pdf')
  })

  it('la pestaña va en la URL y se puede abrir por enlace', async () => {
    const wrapper = await montarDocs('pruebas')
    expect(wrapper.get('[role="tab"][aria-selected="true"]').text()).toContain('API Pruebas')
    await wrapper.findAll('[role="tab"]')[3].trigger('click')
    await esperar(() => router.currentRoute.value.query.pestana === 'produccion')
    expect(router.currentRoute.value.query.pestana).toBe('produccion')
  })

  it('CA-W07-12: «Pruebas» explica el modo prueba (respuestas simuladas, código 000000) y usa el token de PRUEBAS', async () => {
    const wrapper = await montarDocs('pruebas')
    expect(wrapper.get('[data-prueba="distintivo-entorno"]').text()).toBe('Entorno: Sandbox')
    expect(wrapper.get('[data-prueba="caja-pruebas"]').text()).toMatch(/simuladas.*000000/s)
    expect((await tokenInyectado())?.entorno).toBe('PRUEBAS')
  })

  it('CA-W07-13: «Producción» avisa que se descuenta presupuesto y usa el token de producción', async () => {
    const wrapper = await montarDocs('produccion')
    expect(wrapper.get('[data-prueba="alerta-produccion"]').text()).toContain('descuenta presupuesto real')
    expect(wrapper.get('[data-prueba="distintivo-entorno"]').text()).toBe('Entorno: Producción')
    expect((await tokenInyectado())?.entorno).toBe('PRODUCCION')
  })

  it('el contrato mismo se descarga sin token', async () => {
    await montarDocs('pruebas')
    await esperar(() => swagger.opciones.length > 0)
    const peticion = { url: '/assets/socios-v1.yaml', headers: {} as Record<string, string> }
    await swagger.opciones[0].requestInterceptor(peticion)
    expect(peticion.headers.Authorization).toBeUndefined()
  })
})

describe('Pestanas (librería)', () => {
  const PESTANAS = [
    { id: 'a', texto: 'Uno' },
    { id: 'b', texto: 'Dos' },
    { id: 'c', texto: 'Tres' },
  ]

  it('marca la activa con aria-selected y foco móvil, y cambia con las flechas, Inicio y Fin', async () => {
    const wrapper = mount(Pestanas, {
      props: {
        pestanas: PESTANAS,
        modelValue: 'a',
        etiqueta: 'Prueba',
        'onUpdate:modelValue': (id: string) => wrapper.setProps({ modelValue: id }),
      },
      attachTo: document.body,
    })
    const tabs = () => wrapper.findAll('[role="tab"]')
    expect(tabs().map((t) => t.attributes('tabindex'))).toEqual(['0', '-1', '-1'])
    await tabs()[0].trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.props('modelValue')).toBe('b')
    await tabs()[1].trigger('keydown', { key: 'End' })
    expect(wrapper.props('modelValue')).toBe('c')
    await tabs()[2].trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.props('modelValue')).toBe('a')
    await tabs()[0].trigger('keydown', { key: 'ArrowLeft' })
    expect(wrapper.props('modelValue')).toBe('c')
    expect(tabs()[2].attributes('aria-selected')).toBe('true')
    expect(tabs()[2].attributes('aria-controls')).toMatch(/-panel-c$/)
    wrapper.unmount()
  })
})

describe('contrato de socios de la web', () => {
  it('la copia que sirve la web es idéntica a la de contrato/ (v0.22)', () => {
    const raiz = readFileSync(resolve(__dirname, '../../../contrato/socios-v1.json'), 'utf8')
    const web = readFileSync(resolve(__dirname, '../src/contrato/socios-v1.json'), 'utf8')
    expect(web.trimEnd()).toBe(raiz.trimEnd())
  })

  it('la barra del portal queda fuera de main, sin migas, y vuelve al panel', async () => {
    const wrapper = await montarDocs('pruebas')
    expect(wrapper.find('main [role="tablist"]').exists()).toBe(false)
    expect(wrapper.find('main nav').exists()).toBe(false)
    await wrapper.findAll('[role="tab"]')[0].trigger('click')
    await esperar(() => router.currentRoute.value.path === '/socios/panel')
    expect(router.currentRoute.value.path).toBe('/socios/panel')
  })
})
