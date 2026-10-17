import { http, HttpResponse } from 'msw'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import HomeOperador from '../src/views/HomeOperador.vue'
import ConciliacionDePagos from '../src/views/ConciliacionDePagos.vue'
import { useSesion } from '../src/composables/useSesion'
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

    it('"Cerrar sesión" limpia el rol de la sesión y navega a /login', async () => {
      // Antes era un RouterLink directo a /login que nunca llamaba a cerrarSesion(): navegaba
      // bien, pero dejaba el rol de sesión sin limpiar (a diferencia de HomeCliente/HomeAsesor).
      const router = crearRouterDePrueba()
      const { establecerSesion, estado } = useSesion()
      establecerSesion('BACKOFFICE')
      router.push('/operador')
      await router.isReady()
      const wrapper = montar(HomeOperador, { global: { plugins: [router] } })

      const boton = wrapper.findAll('button').find((b) => b.text().includes('Cerrar sesión'))
      expect(boton).toBeDefined()
      await boton!.trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.path).toBe('/login')
      expect(estado.rol).toBe('CLIENTE')
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

    it('marca la pantalla, tiene exactamente un <h1> y carga los 5 cobros del mock', async () => {
      const { wrapper } = await montarConciliacion()
      expect(wrapper.find('[data-pantalla="W05-01"]').exists()).toBe(true)
      expect(wrapper.findAll('h1')).toHaveLength(1)
      expect(wrapper.findAll('tbody tr')).toHaveLength(5)
    })

    // Re-verificado contra el archivo correcto de Figma (nodo 2001:3156, confirmado con captura de
    // pantalla): las columnas son "Prima" (no "Monto"), "Fecha del intento" (no "Fecha / hora") e
    // "ID de transacción" (no "ID transacción") — una ronda anterior las había dejado con el texto
    // del archivo de Figma equivocado.
    it('trae las columnas Cliente e ID de transacción (sí están en este contrato) y usa N.º de póliza / Prima', async () => {
      const { wrapper } = await montarConciliacion()
      const encabezados = wrapper.findAll('th').map((th) => th.text())
      expect(encabezados).toEqual(['Cliente', 'N.º de póliza', 'Prima', 'Estado', 'Fecha del intento', 'ID de transacción', 'Acciones'])
      // El nombre llega como `cliente { nombre }` (contrato v0.6), no como texto suelto.
      expect(wrapper.text()).toContain('María Gutiérrez')
      expect(wrapper.text()).toContain('VH-2026-0048217')
      expect(wrapper.text()).toContain('pg-8a2f19c3')
    })

    it('el cobro Cobrando muestra "en curso" (minúscula, texto literal de Figma) y "—" en vez de fecha/id de transacción', async () => {
      const { wrapper } = await montarConciliacion()
      const filaCobrando = wrapper.findAll('tbody tr').find((tr) => tr.text().includes('Carlos Rincón'))
      expect(filaCobrando?.text()).toContain('en curso')
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
      // "Pendiente de reintento" es el texto literal del archivo correcto de Figma (nodo 2001:3177);
      // una ronda anterior lo había dejado como "Pendiente" a secas, citando el archivo equivocado.
      const pendiente = wrapper.findAll('[role="tab"]').find((t) => t.text().startsWith('Pendiente de reintento'))
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

    // Hallazgo ALTA de la revisión de QA: antes un reintento fallido escribía en el mismo
    // estado.error que usa la carga inicial, así que esta pantalla reemplazaba toda la tabla
    // (pestañas, pie, bloque legal) por el mensaje de error. Ahora debe quedar como una alerta no
    // bloqueante y el resto de la pantalla sigue visible.
    it('un reintento fallido muestra una alerta sin ocultar la tabla, las pestañas ni el pie', async () => {
      const { wrapper } = await montarConciliacion()
      await wrapper.findAll('[role="tab"]').find((t) => t.text() === 'Rechazado')!.trigger('click')

      servidor.use(http.post('/graphql/web', () => new HttpResponse(null, { status: 500 })))
      const boton = wrapper.findAll('button').find((b) => b.text().includes('Reintentar cobro'))
      await boton!.trigger('click')
      await flushPromises()

      const alertas = wrapper.findAll('[role="alert"]')
      expect(alertas.some((a) => a.text().includes('No pudimos reintentar el cobro'))).toBe(true)
      // La tabla, las pestañas y el bloque legal siguen ahí: no se reemplazó todo por el error.
      expect(wrapper.findAll('[role="tab"]').length).toBeGreaterThan(0)
      expect(wrapper.findAll('tbody tr').length).toBeGreaterThan(0)
      expect(wrapper.text()).toContain('Control de dispersión y reintentos automáticos')
      // No se confirma un reenvío que en realidad falló: el toast de éxito existe en el DOM
      // siempre (se anima con opacidad), así que se verifica que siga oculto, no su texto.
      expect(wrapper.get('[role="status"]').classes()).toContain('opacity-0')
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

    // Re-verificado contra el archivo correcto de Figma (nodo 2008:32, confirmado con captura de
    // pantalla): esta pantalla usa un enlace de texto suelto "‹ Volver a Inicio", no la Barra de
    // navegación compartida (MigasDePan, "Inicio › Sección") que sí usan las demás pantallas del
    // flujo — una ronda anterior la había cambiado a MigasDePan citando el archivo equivocado.
    it('el enlace "‹ Volver a Inicio" navega a /operador', async () => {
      const { wrapper, router } = await montarConciliacion()
      const enlace = wrapper.findAll('a').find((a) => a.text().includes('Volver a Inicio'))
      expect(enlace).toBeDefined()
      await enlace!.trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.path).toBe('/operador')
    })
  })
})
