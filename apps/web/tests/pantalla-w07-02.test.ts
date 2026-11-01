// W07-02 · Panel del socio (HU-W07, plan-hu-w07-front.md 5.3): CA-W07-05 a CA-W07-10.
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { HttpResponse, http } from 'msw'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { cambiarMoneda } from '../src/composables/useMoneda'
import { reiniciarPanelSocio } from '../src/composables/usePanelSocio'
import { useSesionSocio } from '../src/composables/useSesionSocio'
import { servidor } from '../src/mocks/node'
import { restablecerSociosDePrueba } from '../src/mocks/socios'
import { crearRutas } from '../src/router'
import PanelSocio from '../src/views/PanelSocio.vue'

const montados: VueWrapper[] = []
let router: Router

async function montarPanel(socioId = 'retail-fintech-042') {
  await useSesionSocio().iniciarSesion(socioId, 'sk_live_x')
  router = createRouter({ history: createMemoryHistory(), routes: crearRutas() })
  await router.push('/socios/panel')
  const wrapper = mount(PanelSocio, { global: { plugins: [router] }, attachTo: document.body })
  montados.push(wrapper)
  // Las credenciales cargan primero (dan el token de pruebas); luego el resto de las secciones.
  await esperar(
    () => wrapper.find('[data-prueba="socio-id"]').exists() && wrapper.find('[data-prueba="indicadores"]').exists(),
  )
  return wrapper
}

async function esperar(condicion: () => boolean) {
  for (let i = 0; i < 40 && !condicion(); i++) {
    await flushPromises()
    await new Promise((r) => setTimeout(r, 5))
  }
}

const tarjeta = (wrapper: VueWrapper, nombre: string) => wrapper.get(`[data-prueba="tarjeta-${nombre}"]`)
const boton = (contenedor: VueWrapper | ReturnType<VueWrapper['get']>, texto: string) =>
  contenedor.findAll('button').find((b) => b.text().includes(texto))!

beforeAll(() => {
  servidor.listen({ onUnhandledFrame: 'error' })
  // Las vistas llaman a `fetch('/v1/…')` con rutas relativas, como en el navegador: en Node se les da un origen.
  const fetchConMsw = globalThis.fetch
  vi.stubGlobal('fetch', (url: RequestInfo | URL, init?: RequestInit) =>
    fetchConMsw(typeof url === 'string' ? new URL(url, 'http://localhost') : url, init),
  )
})
beforeEach(() => {
  restablecerSociosDePrueba()
  reiniciarPanelSocio()
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn(async () => {}) }, configurable: true })
})
afterEach(() => {
  montados.splice(0).forEach((w) => w.unmount())
  servidor.resetHandlers()
  useSesionSocio().cerrarSesion()
  vi.useRealTimers()
})
afterAll(() => {
  servidor.close()
  vi.unstubAllGlobals()
})

describe('W07-02 · Panel del socio', () => {
  it('muestra el nombre del socio con «Cerrar sesión» y la barra lleva a la documentación', async () => {
    const wrapper = await montarPanel()
    expect(wrapper.text()).toContain('Retail Fintech S.A.S. · Socio de distribución')
    expect(wrapper.findAll('[role="tab"]').map((p) => p.text())).toEqual([
      'Panel',
      'Guía de integración',
      'API Pruebas',
      'API Producción',
    ])
    expect(wrapper.get('[role="tab"][aria-selected="true"]').text()).toBe('Panel')
    await wrapper.findAll('[role="tab"]')[2].trigger('click')
    // La ruta carga en diferido: se le da tiempo real.
    await vi.waitFor(() => expect(router.currentRoute.value.query.pestana).toBe('pruebas'), { timeout: 3000 })
  })

  it('CA-W07-05: credenciales del entorno con la clave enmascarada, «Mostrar» y «Copiar»; cambian con el entorno', async () => {
    const wrapper = await montarPanel()
    const credenciales = tarjeta(wrapper, 'credenciales')
    expect(credenciales.get('[data-prueba="socio-id"]').text()).toBe('retail-fintech-042')
    expect(credenciales.get('[data-prueba="clave"]').text()).toMatch(/^sk_live_•+$/)
    await boton(credenciales, 'Mostrar').trigger('click')
    expect(credenciales.get('[data-prueba="clave"]').text()).toBe('sk_live_9f2c41d7e8a05b36c1f4')
    await boton(credenciales, 'Copiar').trigger('click')
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('retail-fintech-042')

    await wrapper.get('[role="radiogroup"] [role="radio"]:nth-of-type(2)').trigger('click')
    await flushPromises()
    expect(credenciales.get('[data-prueba="socio-id"]').text()).toBe('retail-fintech-042-pruebas')
    expect(credenciales.get('[data-prueba="clave"]').text()).toMatch(/^sk_test_•+$/)
  })

  it('CA-W07-06: «Regenerar» pide confirmación con el aviso; cancelar no cambia la clave; confirmar la muestra una vez', async () => {
    const wrapper = await montarPanel()
    const credenciales = tarjeta(wrapper, 'credenciales')
    await boton(credenciales, 'Regenerar').trigger('click')
    const modal = () => wrapper.find('[data-componente="modal-regenerar"]')
    expect(modal().text()).toMatch(/deja de funcionar de inmediato/)
    await boton(wrapper, 'Cancelar').trigger('click')
    expect(modal().exists()).toBe(false)

    await boton(credenciales, 'Regenerar').trigger('click')
    await boton(wrapper, 'Regenerar clave').trigger('click')
    await esperar(() => modal().find('[data-prueba="clave-nueva"]').exists())
    const nueva = modal().get('[data-prueba="clave-nueva"]').text()
    expect(nueva).toMatch(/^sk_live_/)
    expect(nueva).not.toBe('sk_live_9f2c41d7e8a05b36c1f4')
    await boton(wrapper, 'Listo').trigger('click')
    expect(modal().exists()).toBe(false)
  })

  it('CA-W07-07: «Generar token» muestra el token de 15 minutos con su cuenta regresiva', async () => {
    const wrapper = await montarPanel()
    const credenciales = tarjeta(wrapper, 'credenciales')
    await boton(credenciales, 'Generar token').trigger('click')
    await esperar(() => credenciales.find('[data-prueba="token"]').exists())
    expect(credenciales.get('[data-prueba="token"]').text()).toMatch(/Vence en 1[45]:\d\d/)
  })

  it('CA-W07-08: consumo de cotizaciones contra el presupuesto, «Lo recarga Solventa»', async () => {
    const wrapper = await montarPanel()
    const consumo = tarjeta(wrapper, 'consumo')
    expect(consumo.get('[data-prueba="cotizaciones"]').text()).toMatch(/842\s*\/\s*1\.000/)
    expect(consumo.text()).toContain('84 % utilizado')
    expect(consumo.text()).toContain('158 disponibles')
    expect(consumo.text()).toContain('Lo recarga Solventa')
    expect(consumo.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('842')
  })

  it('CA-W07-08: con el presupuesto agotado la tarjeta pasa a alerta con el 429', async () => {
    const wrapper = await montarPanel('agotado-042')
    expect(tarjeta(wrapper, 'consumo').get('[role="status"]').text()).toMatch(/Presupuesto agotado.*429/)
  })

  it('CA-W07-09: estado por umbral con ícono y texto, métricas y APIs sin micros internos; sin tráfico en 15 min', async () => {
    const wrapper = await montarPanel()
    const estado = tarjeta(wrapper, 'estado')
    expect(estado.get('[data-prueba="caja-estado"]').text()).toContain('Operativo')
    expect(estado.get('[data-prueba="metricas"]').text()).toMatch(/48 ms.*99,98 %/)
    expect(estado.text()).toContain('Cotización')
    expect(estado.text()).toContain('Emisión')
    expect(estado.text()).not.toMatch(/bff|auth|risk|rating|policy/i)

    await estado.findAll('[role="radio"]')[0].trigger('click')
    await esperar(() => estado.get('[data-prueba="metricas"]').text().includes('Sin tráfico'))
    expect(estado.get('[data-prueba="metricas"]').text()).toContain('Sin tráfico en la ventana')
  })

  it('CA-W07-10: consumo por API con gráfico y ventas en pesos; en pruebas, «Datos simulados»', async () => {
    const wrapper = await montarPanel()
    expect(wrapper.find('[data-prueba="grafico-llamadas"]').exists()).toBe(true)
    expect(wrapper.get('[data-prueba="rango-consumo"]').text()).toBe('Del 30 sep 2026 al 29 oct 2026')
    // «Con éxito» = llamadas − errores (el contrato da los dos).
    expect(wrapper.get('[data-prueba="tabla-consumo"]').text()).toMatch(/cotizaciones\s*842\s*833\s*9\s*412 ms/)
    const indicadores = wrapper.get('[data-prueba="indicadores"]').text()
    expect(indicadores).toMatch(/\$\s?48\.650\.000/)
    expect(indicadores).toMatch(/77\s?%/) // 126 emitidas / 164 propuestas
    expect(indicadores).toMatch(/Tasa de comisión: 10\s?%/)
    expect(wrapper.text()).toContain('Octubre de 2026')
    expect(wrapper.text()).not.toContain('Datos simulados')

    await wrapper.get('[role="radiogroup"] [role="radio"]:nth-of-type(2)').trigger('click')
    await esperar(() => wrapper.text().includes('Datos simulados'))
    expect(wrapper.text()).toContain('Datos simulados')
  })

  it('una sección que falla muestra su error con reintento sin tumbar las demás, nunca un 5xx', async () => {
    servidor.use(http.get('*/v1/ventas', () => new HttpResponse(null, { status: 503 })))
    const wrapper = await montarPanel()
    await esperar(() => wrapper.text().includes('Reintentar'))
    expect(wrapper.text()).toContain('El servicio tardó más de lo esperado')
    expect(wrapper.text()).not.toMatch(/503/)
    expect(tarjeta(wrapper, 'consumo').text()).toContain('842')
  })

  it('si el backend responde 401, vuelve al ingreso con el aviso de sesión vencida', async () => {
    servidor.use(
      http.get('*/v1/consumo', () => HttpResponse.json({ codigo: 'NO_AUTORIZADO', mensaje: 'x' }, { status: 401 })),
    )
    await montarPanel()
    await esperar(() => router.currentRoute.value.path === '/socios/ingreso')
    expect(router.currentRoute.value.path).toBe('/socios/ingreso')
    expect(useSesionSocio().estado.aviso).toBe('vencida')
  })

  it('«Cerrar sesión» borra la sesión técnica y vuelve al ingreso', async () => {
    const wrapper = await montarPanel()
    await boton(wrapper, 'Cerrar sesión').trigger('click')
    await esperar(() => router.currentRoute.value.path === '/socios/ingreso')
    expect(useSesionSocio().sesionActiva()).toBe(false)
    expect(useSesionSocio().estado.aviso).toBeNull()
  })

  it('las ventas se convierten con la API de socios y el marco no se sale de main (SO-01, SO-02)', async () => {
    const wrapper = await montarPanel()
    await esperar(() => wrapper.text().includes('Ventas') && wrapper.find('tbody').exists())
    expect(wrapper.get('main').classes()).toContain('relative')
    await cambiarMoneda('USD')
    await vi.waitFor(() => expect(wrapper.text()).toContain('US$'))
    await cambiarMoneda('COP')
  })
})
