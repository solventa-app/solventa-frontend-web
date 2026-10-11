import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import HomeOperador from '../src/views/HomeOperador.vue'
import ConciliacionDePagos from '../src/views/ConciliacionDePagos.vue'
import { restablecerCobrosDePrueba } from '../src/mocks/handlers'
import { servidor } from '../src/mocks/node'

function crearRouterDePrueba(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: { template: '<div data-pantalla="G-01" />' } },
      { path: '/operador', component: HomeOperador },
      { path: '/operador/conciliacion', component: ConciliacionDePagos },
    ],
  })
}

// Se desmontan todos los wrappers entre pruebas: useConciliacion usa un objeto reactive()
// singleton a nivel de módulo (mismo patrón que useCotizacion en HU-W01), y un wrapper sin
// desmontar de una prueba anterior se vuelve a renderizar cuando otra prueba muta ese estado
// compartido, lo que puede lanzar excepciones no capturadas.
const wrappers: VueWrapper[] = []
function montar(...args: Parameters<typeof mount>) {
  const w = mount(...args) as VueWrapper
  wrappers.push(w)
  return w
}

describe('HU-W05 · pantallas', () => {
  beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }))
  afterEach(() => {
    wrappers.forEach((w) => w.unmount())
    wrappers.length = 0
    servidor.resetHandlers()
  })
  afterAll(() => servidor.close())

  describe('G-02b · Home del Operador', () => {
    it('marca la pantalla y la tarjeta de Siniestros no es un enlace (sin ruta en el Sprint 1)', async () => {
      const router = crearRouterDePrueba()
      router.push('/operador')
      await router.isReady()
      const wrapper = montar(HomeOperador, { global: { plugins: [router] } })

      expect(wrapper.find('[data-pantalla="G-02b"]').exists()).toBe(true)
      expect(wrapper.text()).toContain('Siniestros')
      expect(wrapper.findAll('a').some((a) => a.text().includes('Siniestros'))).toBe(false)
    })

    it('tiene exactamente un <h1>', async () => {
      const router = crearRouterDePrueba()
      router.push('/operador')
      await router.isReady()
      const wrapper = montar(HomeOperador, { global: { plugins: [router] } })
      expect(wrapper.findAll('h1')).toHaveLength(1)
    })

    it('la tarjeta de Conciliación de pagos navega a /operador/conciliacion', async () => {
      const router = crearRouterDePrueba()
      router.push('/operador')
      await router.isReady()
      const wrapper = montar(HomeOperador, { global: { plugins: [router] } })

      const enlace = wrapper.findAll('a').find((a) => a.text().includes('Conciliación de pagos'))
      expect(enlace).toBeDefined()
      await enlace!.trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.path).toBe('/operador/conciliacion')
    })

    it('"Cerrar sesión" navega a /login', async () => {
      const router = crearRouterDePrueba()
      router.push('/operador')
      await router.isReady()
      const wrapper = montar(HomeOperador, { global: { plugins: [router] } })

      const enlace = wrapper.findAll('a').find((a) => a.text().includes('Cerrar sesión'))
      expect(enlace).toBeDefined()
      await enlace!.trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.path).toBe('/login')
    })
  })

  describe('W05-01 · Conciliación de pagos', () => {
    // reintentarCobro muta el arreglo `cobros` del mock en el sitio (a propósito, para que el
    // reintento persista entre pantallas en una demo real): hay que reiniciarlo antes de cada
    // prueba para que una prueba no arrastre el estado que dejó la anterior.
    beforeEach(() => restablecerCobrosDePrueba())

    async function montarConciliacion() {
      const router = crearRouterDePrueba()
      router.push('/operador/conciliacion')
      await router.isReady()
      const wrapper = montar(ConciliacionDePagos, { global: { plugins: [router] } })
      await flushPromises()
      return { wrapper, router }
    }

    it('marca la pantalla, tiene exactamente un <h1> y carga los 4 cobros del mock', async () => {
      const { wrapper } = await montarConciliacion()
      expect(wrapper.find('[data-pantalla="W05-01"]').exists()).toBe(true)
      expect(wrapper.findAll('h1')).toHaveLength(1)
      expect(wrapper.findAll('tbody tr')).toHaveLength(4)
    })

    it('trae las columnas Cliente e ID transacción (sí están en este contrato) y usa N.º de póliza / Monto', async () => {
      const { wrapper } = await montarConciliacion()
      const encabezados = wrapper.findAll('th').map((th) => th.text())
      expect(encabezados).toEqual(['Cliente', 'N.º de póliza', 'Monto', 'Estado', 'Fecha / hora', 'ID transacción', 'Acciones'])
      expect(wrapper.text()).toContain('Andrés Felipe Duarte')
      expect(wrapper.text()).toContain('SOL-VH-2026-004905')
      expect(wrapper.text()).toContain('txn_8a2f19c3')
    })

    it('el cobro Cobrando muestra "En curso" y "—" en vez de fecha/id de transacción', async () => {
      const { wrapper } = await montarConciliacion()
      const filaCobrando = wrapper.findAll('tbody tr').find((tr) => tr.text().includes('Andrés Felipe Duarte'))
      expect(filaCobrando?.text()).toContain('En curso')
      expect(filaCobrando?.text()).toContain('—')
    })

    it('filtra por pestaña y solo la fila Rechazado trae "Reintentar cobro"', async () => {
      const { wrapper } = await montarConciliacion()
      const rechazado = wrapper.findAll('[role="tab"]').find((t) => t.text() === 'Rechazado')
      expect(rechazado).toBeDefined()
      await rechazado!.trigger('click')

      expect(wrapper.findAll('tbody tr')).toHaveLength(1)
      const boton = wrapper.findAll('button').find((b) => b.text().includes('Reintentar cobro'))
      expect(boton).toBeDefined()
    })

    it('Pendiente no trae botón de reintentar (el reintento ahí es automático)', async () => {
      const { wrapper } = await montarConciliacion()
      const pendiente = wrapper.findAll('[role="tab"]').find((t) => t.text() === 'Pendiente')
      expect(pendiente).toBeDefined()
      await pendiente!.trigger('click')

      expect(wrapper.findAll('tbody tr')).toHaveLength(1)
      expect(wrapper.findAll('button').some((b) => b.text().includes('Reintentar cobro'))).toBe(false)
    })

    it('reintentar cobro mueve la fila Rechazado a Cobrando y muestra el toast de confirmación', async () => {
      const { wrapper } = await montarConciliacion()
      await wrapper.findAll('[role="tab"]').find((t) => t.text() === 'Rechazado')!.trigger('click')

      const boton = wrapper.findAll('button').find((b) => b.text().includes('Reintentar cobro'))
      await boton!.trigger('click')
      await flushPromises()

      // El cobro que estaba Rechazado ya no aparece en el filtro Rechazado: pasó a Cobrando.
      expect(wrapper.findAll('tbody tr')).toHaveLength(1)
      expect(wrapper.text()).toContain('No hay cobros en este estado.')
      expect(wrapper.get('[role="status"]').text()).toContain('Cobro reenviado a la pasarela')
    })

    it('el reintento persiste en el mock: volver a cargar cobros ya no trae el Rechazado', async () => {
      const { wrapper, router } = await montarConciliacion()
      await wrapper.findAll('[role="tab"]').find((t) => t.text() === 'Rechazado')!.trigger('click')
      const boton = wrapper.findAll('button').find((b) => b.text().includes('Reintentar cobro'))
      await boton!.trigger('click')
      await flushPromises()

      // Simula volver a entrar a la pantalla (nuevo montaje -> nueva consulta `cobros` al mock).
      await router.push('/operador')
      const wrapper2 = montar(ConciliacionDePagos, { global: { plugins: [router] } })
      await router.push('/operador/conciliacion')
      await flushPromises()

      await wrapper2.findAll('[role="tab"]').find((t) => t.text() === 'Rechazado')!.trigger('click')
      expect(wrapper2.text()).toContain('No hay cobros en este estado.')
    })

    it('la barra de navegación ("Inicio › Recaudo de prima") navega a /operador', async () => {
      const { wrapper, router } = await montarConciliacion()
      expect(wrapper.text()).toContain('Recaudo de prima')
      const enlace = wrapper.findAll('a').find((a) => a.text() === 'Inicio')
      expect(enlace).toBeDefined()
      await enlace!.trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.path).toBe('/operador')
    })
  })
})
