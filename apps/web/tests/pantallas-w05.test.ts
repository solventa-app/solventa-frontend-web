import { http, HttpResponse } from 'msw'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import HomeOperador from '../src/views/HomeOperador.vue'
import { cambiarMoneda } from '../src/composables/useMoneda'
import ConciliacionDePagos from '../src/views/ConciliacionDePagos.vue'
import { useSesion } from '../src/composables/useSesion'
import { restablecerCobrosDePrueba } from '../src/mocks/handlers'
import { servidor } from '../src/mocks/node'

const fetchPrueba: typeof fetch = (url, init) => fetch(new URL(String(url), 'http://localhost'), init)

function crearRouterDePrueba(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: { template: '<div data-pantalla="G-01" />' } },
      { path: '/operador', component: HomeOperador },
      { path: '/operador/conciliacion', component: ConciliacionDePagos },
      { path: '/operador/siniestros', component: { template: '<div data-pantalla="W04-01" />' } },
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
  beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }))
  afterEach(() => {
    wrappers.forEach((w) => w.unmount())
    wrappers.length = 0
    servidor.resetHandlers()
  })
  afterAll(() => servidor.close())

  describe('G-02b · Home del Operador', () => {
    it('marca la pantalla y la tarjeta de Siniestros enlaza a la bandeja (HU-W04)', async () => {
      const router = crearRouterDePrueba()
      router.push('/operador')
      await router.isReady()
      const wrapper = montar(HomeOperador, { global: { plugins: [router] } })

      expect(wrapper.find('[data-pantalla="G-02b"]').exists()).toBe(true)
      expect(wrapper.find('a[href="/operador/estado"]').exists()).toBe(false)
      expect(wrapper.text()).toContain('Siniestros')
      const enlace = wrapper.findAll('a').find((a) => a.text().includes('Siniestros'))
      expect(enlace?.attributes('href')).toBe('/operador/siniestros')
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

    it('"Cerrar sesión" borra el token y el rol, y navega a /login', async () => {
      const router = crearRouterDePrueba()
      const { iniciarSesion, estado } = useSesion(fetchPrueba)
      await iniciarSesion('admin.solventa', 'secreta123')
      expect(estado.rol).toBe('BACKOFFICE')
      router.push('/operador')
      await router.isReady()
      const wrapper = montar(HomeOperador, { global: { plugins: [router] } })

      const boton = wrapper.findAll('button').find((b) => b.text().includes('Cerrar sesión'))
      expect(boton).toBeDefined()
      await boton!.trigger('click')
      await wrapper
        .get('[role="dialog"]')
        .findAll('button')
        .find((b) => b.text().includes('Cerrar sesión'))!
        .trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.path).toBe('/login')
      expect(estado.rol).toBeNull()
      expect(estado.token).toBeNull()
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
      // Con MSW 3 la respuesta del mock llega un poco después de un flushPromises(): se espera a los datos.
      await vi.waitFor(() => expect(wrapper.findAll('tbody tr').length).toBeGreaterThan(0))
      return { wrapper, router }
    }

    // W05-A5 (borrador de la v0.17): medio de pago y acciones según el origen del cobro.
    describe('medio de pago y origen del cobro', () => {
      const fila = (wrapper: VueWrapper, cliente: string) =>
        wrapper.findAll('tbody tr').find((tr) => tr.text().includes(cliente))!

      it('muestra marca y tipo con el origen, «—» sin medio y nunca dígitos de la tarjeta', async () => {
        const { wrapper } = await montarConciliacion()
        const medio = (cliente: string) => fila(wrapper, cliente).get('[data-prueba="medio-pago"]').text()

        expect(medio('Laura Gómez Rico')).toContain('Visa · Crédito')
        expect(medio('Laura Gómez Rico')).toContain('En línea')
        expect(medio('Julián Torres Mesa')).toContain('Mastercard · Débito')
        expect(medio('Julián Torres Mesa')).toContain('Recurrente')
        expect(medio('Andrés Felipe Duarte')).toContain('—')
        expect(wrapper.text()).not.toMatch(/\d{4}\s?\d{4}|•{2,}\d{4}/)
      })

      it('un pendiente en línea «Se concilia» y un rechazado recurrente se sigue reintentando', async () => {
        const { wrapper } = await montarConciliacion()
        expect(fila(wrapper, 'Carlos Andrés Peña').text()).toContain('Se concilia')
        expect(fila(wrapper, 'Julián Torres Mesa').text()).toContain('Reintentar cobro')
      })

      it('un rechazado en línea no se reintenta: «Lo resuelve el cliente»', async () => {
        servidor.use(
          http.post('*/graphql/web', () =>
            HttpResponse.json({
              data: {
                cobros: [
                  {
                    id: 'cobro-9',
                    cliente: { id: 'cliente-9', nombre: 'Mariana Ruiz' },
                    polizaId: 'SOL-2026-004899',
                    estado: 'RECHAZADO',
                    monto: { valor: '94680.00', moneda: 'COP' },
                    actualizadoEn: '2026-10-27T10:00:00Z',
                    idTransaccion: null,
                    motivo: 'fondos_insuficientes',
                    reintentosRestantes: 3,
                    origen: 'INTERACTIVO',
                    medio: { marca: 'Visa', tipo: 'CREDITO' },
                  },
                ],
              },
            }),
          ),
        )
        const { wrapper } = await montarConciliacion()
        const rechazada = fila(wrapper, 'Mariana Ruiz')
        expect(rechazada.text()).toContain('Lo resuelve el cliente')
        expect(rechazada.findAll('button').some((b) => b.text().includes('Reintentar cobro'))).toBe(false)
      })
    })

    describe('actualización por SSE', () => {
      afterEach(() => vi.useRealTimers())

      it('no consulta con la pestaña oculta y consulta una vez al volver a ella', async () => {
        const { wrapper } = await montarConciliacion()
        let consultas = 0
        servidor.use(
          http.post('*/graphql/web', async ({ request }) => {
            const { query } = (await request.json()) as { query: string }
            if (query.includes('query cobros')) consultas++
            return HttpResponse.json({ data: { cobros: [] } })
          }),
        )
        const estadoVisibilidad = vi.spyOn(document, 'visibilityState', 'get')

        estadoVisibilidad.mockReturnValue('hidden')
        document.dispatchEvent(new Event('visibilitychange'))
        await flushPromises()
        expect(consultas).toBe(0)

        estadoVisibilidad.mockReturnValue('visible')
        document.dispatchEvent(new Event('visibilitychange'))
        await vi.waitFor(() => expect(consultas).toBe(1))
        estadoVisibilidad.mockRestore()
        wrapper.unmount()
      })
    })

    it('marca la pantalla, tiene exactamente un <h1> y carga los 4 cobros del mock', async () => {
      const { wrapper } = await montarConciliacion()
      expect(wrapper.find('[data-pantalla="W05-01"]').exists()).toBe(true)
      expect(wrapper.findAll('h1')).toHaveLength(1)
      expect(wrapper.findAll('tbody tr')).toHaveLength(4)
    })

    // Columnas literales del frame de Figma (nodo 2001:3156).
    it('trae las columnas del prototipo y el nombre del cliente desde Cobro.cliente', async () => {
      const { wrapper } = await montarConciliacion()
      const encabezados = wrapper.findAll('th').map((th) => th.text())
      expect(encabezados).toEqual([
        'Cliente',
        'N.º de póliza',
        'Prima',
        'Medio de pago',
        'Estado',
        'Fecha del intento',
        'Acciones',
      ])
      expect(wrapper.text()).toContain('Andrés Felipe Duarte')
      expect(wrapper.text()).toContain('SOL-VH-2026-004905')
    })

    it('el cobro Cobrando muestra "en curso" (minúscula, texto literal de Figma)', async () => {
      const { wrapper } = await montarConciliacion()
      const filaCobrando = wrapper.findAll('tbody tr').find((tr) => tr.text().includes('Andrés Felipe Duarte'))
      expect(filaCobrando?.text()).toContain('en curso')
    })

    it('convierte montos y total a la moneda elegida, sin perder la fila (KAN-209)', async () => {
      const { wrapper } = await montarConciliacion()
      await cambiarMoneda('USD')
      await vi.waitFor(() => expect(wrapper.find('tbody').text()).toContain('US$'))
      expect(wrapper.text()).not.toContain(' COP')
      await cambiarMoneda('COP')
    })

    it('muestra controles de paginación y deshabilita Anterior en la primera página', async () => {
      const { wrapper } = await montarConciliacion()
      expect(wrapper.text()).toContain('Página 1 de 1')
      const botonAnterior = wrapper.findAll('button').find((b) => b.text() === 'Anterior')
      const botonSiguiente = wrapper.findAll('button').find((b) => b.text() === 'Siguiente')
      expect(botonAnterior?.attributes('disabled')).toBeDefined()
      expect(botonSiguiente?.attributes('disabled')).toBeDefined()
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

    it('reintentar cobro deja la fila Rechazado en Cobrado y muestra el toast de confirmación', async () => {
      const { wrapper } = await montarConciliacion()
      await wrapper
        .findAll('[role="tab"]')
        .find((t) => t.text() === 'Rechazado')!
        .trigger('click')

      const boton = wrapper.findAll('button').find((b) => b.text().includes('Reintentar cobro'))
      await boton!.trigger('click')
      await vi.waitFor(() => expect(wrapper.text()).toContain('No hay cobros en este estado.'))

      // El cobro que estaba Rechazado ya no aparece en el filtro Rechazado: quedó Cobrado.
      expect(wrapper.findAll('tbody tr')).toHaveLength(1)
      expect(wrapper.get('[role="status"]').text()).toContain('Cobro reenviado a la pasarela')
    })

    // Hallazgo ALTA de la revisión de QA: antes un reintento fallido escribía en el mismo
    // estado.error que usa la carga inicial, así que esta pantalla reemplazaba toda la tabla
    // (pestañas, pie, bloque legal) por el mensaje de error. Ahora debe quedar como una alerta no
    // bloqueante y el resto de la pantalla sigue visible.
    it('un reintento fallido muestra una alerta sin ocultar la tabla, las pestañas ni el pie', async () => {
      const { wrapper } = await montarConciliacion()
      await wrapper
        .findAll('[role="tab"]')
        .find((t) => t.text() === 'Rechazado')!
        .trigger('click')

      servidor.use(http.post('/graphql/web', () => new HttpResponse(null, { status: 500 })))
      const boton = wrapper.findAll('button').find((b) => b.text().includes('Reintentar cobro'))
      await boton!.trigger('click')
      await vi.waitFor(() => {
        const alertas = wrapper.findAll('[role="alert"]')
        expect(alertas.some((a) => a.text().includes('No pudimos reintentar el cobro'))).toBe(true)
      })
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
      await wrapper
        .findAll('[role="tab"]')
        .find((t) => t.text() === 'Rechazado')!
        .trigger('click')
      const boton = wrapper.findAll('button').find((b) => b.text().includes('Reintentar cobro'))
      await boton!.trigger('click')
      await vi.waitFor(() => expect(wrapper.text()).toContain('No hay cobros en este estado.'))

      // Simula volver a entrar a la pantalla (nuevo montaje -> nueva consulta `cobros` al mock).
      await router.push('/operador')
      const wrapper2 = montar(ConciliacionDePagos, { global: { plugins: [router] } })
      await router.push('/operador/conciliacion')
      await flushPromises()
      await vi.waitFor(() => expect(wrapper2.findAll('tbody tr').length).toBeGreaterThan(0))

      await wrapper2
        .findAll('[role="tab"]')
        .find((t) => t.text() === 'Rechazado')!
        .trigger('click')
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
