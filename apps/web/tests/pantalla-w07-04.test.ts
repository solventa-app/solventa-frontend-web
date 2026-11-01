// W07-04 · Estado del sistema para el BACKOFFICE (HU-W07, plan-hu-w07-front.md 5.6): CA-W07-14 y CA-W07-15.
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'
import { createMemoryHistory, createRouter } from 'vue-router'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { reiniciarEstadoSistema } from '../src/composables/useEstadoSistema'
import { estadoSistemaDeDemo } from '../src/mocks/estadoSistema'
import { servidor } from '../src/mocks/node'
import { crearRutas } from '../src/router'
import EstadoSistema from '../src/views/EstadoSistema.vue'
import HomeOperador from '../src/views/HomeOperador.vue'

const bff = graphql.link('*')
const montados: VueWrapper[] = []

async function esperar(condicion: () => boolean) {
  for (let i = 0; i < 40 && !condicion(); i++) {
    await flushPromises()
    await new Promise((r) => setTimeout(r, 5))
  }
}

async function montar(componente: Parameters<typeof mount>[0] = EstadoSistema) {
  const router = createRouter({ history: createMemoryHistory(), routes: crearRutas() })
  const wrapper = mount(componente, { global: { plugins: [router] } })
  montados.push(wrapper)
  return wrapper
}

beforeAll(() => {
  servidor.listen({ onUnhandledFrame: 'error' })
  const fetchConMsw = globalThis.fetch
  vi.stubGlobal('fetch', (url: RequestInfo | URL, init?: RequestInit) =>
    fetchConMsw(typeof url === 'string' ? new URL(url, 'http://localhost') : url, init),
  )
})
beforeEach(() => reiniciarEstadoSistema())
afterEach(() => {
  montados.splice(0).forEach((w) => w.unmount())
  servidor.resetHandlers()
  vi.useRealTimers()
})
afterAll(() => {
  servidor.close()
  vi.unstubAllGlobals()
})

describe('W07-04 · Estado del sistema', () => {
  it('G-02b tiene la tarjeta «Estado del sistema» que lleva a /operador/estado', async () => {
    const wrapper = await montar(HomeOperador)
    const enlace = wrapper.find('a[href="/operador/estado"]')
    expect(enlace.text()).toContain('Estado del sistema')
    expect(enlace.text()).toContain('Salud, disponibilidad y latencia por servicio')
  })

  it('CA-W07-14: caja de estado, tabla por servicio con peso, salud, p95 y /health, y APIs externas', async () => {
    const wrapper = await montar()
    await esperar(() => wrapper.find('[data-prueba="tabla-micros"]').exists())
    expect(wrapper.get('[data-prueba="caja-estado"]').text()).toContain('Operativo')

    const micros = wrapper.get('[data-prueba="tabla-micros"]')
    const filas = micros.findAll('tbody tr')
    expect(filas).toHaveLength(9)
    expect(filas[0].text()).toMatch(/bff.*20.*98 %.*99,9 %.*120 ms.*252 ms.*Responde/)
    expect(micros.text()).toMatch(/payments.*78 %/)
    expect(filas.at(-1)!.text()).toMatch(/consolidador-fuentes.*Sin tráfico/)

    const externas = wrapper.get('[data-prueba="tabla-externas"]')
    expect(externas.findAll('tbody tr')).toHaveLength(6)
    expect(externas.text()).toMatch(/kyc.*Emisión.*Medio abierto/)
    expect(externas.text()).toMatch(/open-finance.*Cotización.*Cerrado/)
  })

  it('CA-W07-14: la ventana de 15 min muestra «sin tráfico» en la caja y en los servicios', async () => {
    const wrapper = await montar()
    await esperar(() => wrapper.find('[data-prueba="tabla-micros"]').exists())
    await wrapper.findAll('[role="radio"]')[0].trigger('click')
    await esperar(() => wrapper.get('[data-prueba="metricas"]').text().includes('Sin tráfico'))
    expect(wrapper.get('[data-prueba="metricas"]').text()).toContain('Sin tráfico en la ventana')
    expect(wrapper.get('[data-prueba="tabla-micros"]').findAll('tbody tr')[0].text()).toContain('Sin tráfico')
  })

  it('CA-W07-15: si no responde al entrar, muestra el error con reintento, nunca un 5xx', async () => {
    servidor.use(bff.query('estadoSistema', () => new HttpResponse(null, { status: 503 }), { once: true }))
    const wrapper = await montar()
    await esperar(() => wrapper.find('[role="alert"]').exists())
    expect(wrapper.text()).toContain('No pudimos cargar el estado del sistema')
    expect(wrapper.text()).not.toMatch(/503/)
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Reintentar')!
      .trigger('click')
    await esperar(() => wrapper.find('[data-prueba="tabla-micros"]').exists())
    expect(wrapper.find('[data-prueba="tabla-micros"]').exists()).toBe(true)
  })

  it('CA-W07-15: se recarga sola cada 30 s y, si la recarga falla, conserva lo que ya mostraba', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    let consultas = 0
    servidor.use(
      bff.query('estadoSistema', () => {
        consultas += 1
        if (consultas === 2) return new HttpResponse(null, { status: 503 })
        const datos = estadoSistemaDeDemo()
        datos.micros[0].porcentaje = consultas === 1 ? 98 : 91
        return HttpResponse.json({ data: { estadoSistema: datos } })
      }),
    )
    const wrapper = await montar()
    await esperar(() => wrapper.find('[data-prueba="tabla-micros"]').exists())

    vi.advanceTimersByTime(30_000) // la 2.ª consulta falla: se conservan los datos, sin error
    await esperar(() => consultas === 2)
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(wrapper.get('[data-prueba="tabla-micros"]').text()).toContain('98 %')

    vi.advanceTimersByTime(30_000) // la 3.ª trae datos nuevos
    await esperar(() => wrapper.get('[data-prueba="tabla-micros"]').text().includes('91 %'))
    expect(wrapper.get('[data-prueba="tabla-micros"]').text()).toContain('91 %')
  })
})
