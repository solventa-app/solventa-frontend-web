import { HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createMemoryHistory, createRouter, RouterView, type Router } from 'vue-router'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import DerivarSiniestro from '../src/views/DerivarSiniestro.vue'
import ConfirmacionDerivacion from '../src/views/ConfirmacionDerivacion.vue'
import { reiniciarEstadoSiniestros, useSiniestros } from '../src/composables/useSiniestros'
import { restablecerSiniestrosDePrueba } from '../src/mocks/siniestros'
import { servidor } from '../src/mocks/node'

const dummy = graphql.link('*/graphql/siniestros')

function crearRouterDePrueba(): Router {
  const vacio = (id: string) => ({ template: `<div data-pantalla="${id}" />` })
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/operador', component: vacio('G-02b') },
      { path: '/operador/siniestros', component: vacio('W04-01') },
      { path: '/operador/siniestros/:id', component: vacio('W04-02') },
      { path: '/operador/siniestros/:id/derivar', component: DerivarSiniestro },
      { path: '/operador/siniestros/:id/derivado', component: ConfirmacionDerivacion },
    ],
  })
}

const Raiz = defineComponent({ render: () => h(RouterView) })
const wrappers: VueWrapper[] = []

async function montar(ruta: string) {
  const router = crearRouterDePrueba()
  router.push(ruta)
  await router.isReady()
  const wrapper = mount(Raiz, { global: { plugins: [router] }, attachTo: document.body }) as VueWrapper
  wrappers.push(wrapper)
  await vi.waitFor(() => {
    const { estado } = useSiniestros()
    expect(estado.cargandoDetalle).toBe(false)
    expect(estado.cargandoPeritos).toBe(false)
  })
  await flushPromises()
  return { wrapper, router }
}
const montarDerivar = (id = 'sin-01') => montar(`/operador/siniestros/${id}/derivar`)

async function elegirPerito(wrapper: VueWrapper, valor = 'per-02') {
  await wrapper.get('[data-prueba="perito"] select').setValue(valor)
}

describe('HU-W04 · W04-02b Derivar a perito y W04-03c Confirmación', () => {
  beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }))
  beforeEach(() => {
    reiniciarEstadoSiniestros()
    restablecerSiniestrosDePrueba()
  })
  afterEach(() => {
    wrappers.forEach((w) => w.unmount())
    wrappers.length = 0
    servidor.resetHandlers()
  })
  afterAll(() => servidor.close())

  it('marca la pantalla con migas, título, insignia, metadatos y foco al h1', async () => {
    const { wrapper } = await montarDerivar()
    expect(wrapper.find('[data-pantalla="W04-02b"]').exists()).toBe(true)
    expect(wrapper.get('nav [aria-current="page"]').text()).toBe('Derivar')
    const h1 = wrapper.get('h1')
    expect(h1.text()).toBe('Derivar siniestro #SIN-2026-0141 a peritaje')
    expect(document.activeElement).toBe(h1.element)
    expect(wrapper.text()).toContain('!Pendiente de valoración')
    const meta = wrapper.get('[data-prueba="metadatos"]').text()
    expect(meta).toContain('Asegurado de prueba 1')
    expect(meta).toContain('SOL-2026-048211')
    expect(meta).toContain('(Hora de Colombia)')
  })

  it('selector vacío sin preselección y Confirmar deshabilitado con aviso', async () => {
    const { wrapper } = await montarDerivar()
    const select = wrapper.get('[data-prueba="perito"] select').element as HTMLSelectElement
    expect(select.value).toBe('')
    const opciones = wrapper.findAll('[data-prueba="perito"] option').map((o) => o.text())
    expect(opciones).toContain('Peritajes Andes Ltda. — Bogotá (Red Preferente Centro)')
    const confirmar = wrapper.get('[data-prueba="confirmar"]')
    expect(confirmar.attributes('disabled')).toBeDefined()
    expect(confirmar.attributes('aria-describedby')).toBe('aviso-elegir-perito')
    expect(wrapper.get('#aviso-elegir-perito').text()).toBe('Elige un perito para continuar.')
    expect(wrapper.get('[data-prueba="tiempo"]').text()).toContain('Selecciona un perito')
  })

  it('muestra tiempo, vencimiento y registro del perito elegido y se actualiza al cambiar', async () => {
    const { wrapper } = await montarDerivar()
    await elegirPerito(wrapper, 'per-01')
    expect(wrapper.get('[data-prueba="tiempo"]').text()).toContain('Tiempo estimado de respuesta: 4 días hábiles')
    expect(wrapper.get('[data-prueba="tiempo"]').text()).toContain('Vencimiento legal de informe:')
    expect(wrapper.text()).toContain('Registro RNPL-SFC 2024-0117')
    expect(wrapper.get('[data-prueba="confirmar"]').attributes('disabled')).toBeUndefined()
    await elegirPerito(wrapper, 'per-02')
    expect(wrapper.get('[data-prueba="tiempo"]').text()).toContain('5 días hábiles')
    expect(wrapper.text()).toContain('Registro RNPL-SFC 2023-0342')
  })

  it('cuenta los caracteres de las instrucciones', async () => {
    const { wrapper } = await montarDerivar()
    expect(wrapper.get('[data-contador]').text()).toBe('0 / 500 caracteres')
    await wrapper.get('[data-prueba="instrucciones"] textarea').setValue('Revisar chasis')
    expect(wrapper.get('[data-contador]').text()).toBe('14 / 500 caracteres')
  })

  it('Cancelar enlaza al detalle', async () => {
    const { wrapper } = await montarDerivar()
    expect(wrapper.get('[data-prueba="cancelar"]').attributes('href')).toBe('/operador/siniestros/sin-01')
  })

  it('éxito: replace a /derivado y la confirmación muestra perito, tiempo, notificación e instrucciones', async () => {
    const { wrapper, router } = await montarDerivar()
    const replace = vi.spyOn(router, 'replace')
    await elegirPerito(wrapper, 'per-02')
    await wrapper.get('[data-prueba="instrucciones"] textarea').setValue('  Verificar radiador  ')
    await wrapper.get('form').trigger('submit')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/operador/siniestros/sin-01/derivado'))
    expect(replace).toHaveBeenCalledWith('/operador/siniestros/sin-01/derivado')
    await flushPromises()
    expect(wrapper.find('[data-pantalla="W04-03c"]').exists()).toBe(true)
    const h1 = wrapper.get('h1')
    expect(h1.text()).toBe('Siniestro derivado a peritaje')
    expect(document.activeElement).toBe(h1.element)
    expect(wrapper.text()).toContain('→Trámite derivado')
    expect(wrapper.get('[data-prueba="subtitulo"]').text()).toBe(
      'Siniestro #SIN-2026-0141 derivado a peritaje. Perito asignado: Avalúos del Caribe S.A.S.. Tiempo estimado: 5 días hábiles.',
    )
    expect(wrapper.get('[data-prueba="subtitulo"] .font-semibold').text()).toBe('#SIN-2026-0141')
    const panel = wrapper.get('[data-prueba="panel"]').text()
    expect(panel).toContain('Avalúos del Caribe S.A.S. — Barranquilla')
    expect(panel).toMatch(/5 días hábiles \(informe a más tardar el .+\)/)
    expect(panel).toContain('Correo certificado y expediente digital de siniestros')
    expect(panel).toContain('Verificar radiador')
    expect(useSiniestros().estado.detalle).toMatchObject({ estado: 'EN_REVISION' })
  })

  it('error de negocio: banner con el mensaje, foco y valores conservados', async () => {
    servidor.use(
      dummy.mutation('derivarSiniestro', () =>
        HttpResponse.json({
          data: {
            derivarSiniestro: { __typename: 'ErrorSiniestro', mensaje: 'El perito seleccionado no está disponible.' },
          },
        }),
      ),
    )
    const { wrapper, router } = await montarDerivar()
    await elegirPerito(wrapper)
    await wrapper.get('[data-prueba="instrucciones"] textarea').setValue('Nota')
    await wrapper.get('form').trigger('submit')
    await vi.waitFor(() => expect(wrapper.find('[data-prueba="error-derivar"]').exists()).toBe(true))
    await flushPromises()
    const banner = wrapper.get('[data-prueba="error-derivar"]')
    expect(banner.attributes('role')).toBe('alert')
    expect(banner.text()).toContain('El perito seleccionado no está disponible.')
    expect(document.activeElement).toBe(banner.element)
    expect((wrapper.get('[data-prueba="perito"] select').element as HTMLSelectElement).value).toBe('per-02')
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('Nota')
    expect(router.currentRoute.value.path).toBe('/operador/siniestros/sin-01/derivar')
  })

  it('error de red: mensaje genérico sin códigos y valores conservados', async () => {
    servidor.use(dummy.mutation('derivarSiniestro', () => new HttpResponse(null, { status: 500 })))
    const { wrapper } = await montarDerivar()
    await elegirPerito(wrapper)
    await wrapper.get('form').trigger('submit')
    await vi.waitFor(() => expect(wrapper.find('[data-prueba="error-derivar"]').exists()).toBe(true))
    const texto = wrapper.get('[data-prueba="error-derivar"]').text()
    expect(texto).toContain('No pudimos derivar el siniestro. Intenta nuevamente.')
    expect(texto).not.toMatch(/500|5\d\d/)
    expect((wrapper.get('[data-prueba="perito"] select').element as HTMLSelectElement).value).toBe('per-02')
  })

  it('ya derivado: sin formulario, con el perito asignado y enlace al detalle', async () => {
    const { wrapper } = await montarDerivar('sin-02')
    expect(wrapper.find('form').exists()).toBe(false)
    const aviso = wrapper.get('[data-prueba="no-admite"]')
    expect(aviso.text()).toContain('Este siniestro ya no admite una nueva derivación.')
    expect(aviso.text()).toContain('Ya tiene un perito asignado: Peritajes Andes Ltda.')
    expect(aviso.get('a').attributes('href')).toBe('/operador/siniestros/sin-02')
  })

  it('ya resuelto (aprobado o rechazado): sin formulario', async () => {
    let r = await montarDerivar('sin-03')
    expect(r.wrapper.find('form').exists()).toBe(false)
    expect(r.wrapper.get('[data-prueba="no-admite"]').text()).toContain('Ya fue aprobado.')
    reiniciarEstadoSiniestros()
    r = await montarDerivar('sin-04')
    expect(r.wrapper.get('[data-prueba="no-admite"]').text()).toContain('Ya fue rechazado.')
  })

  it('id inexistente: no encontrado con regreso a la bandeja', async () => {
    const { wrapper } = await montarDerivar('sin-99')
    expect(wrapper.text()).toContain('No encontramos este siniestro.')
    expect(wrapper.find('form').exists()).toBe(false)
    expect(wrapper.get('main a[href="/operador/siniestros"]').text()).toContain('Volver a la bandeja')
  })

  it('error al cargar peritos: banner con Reintentar y Confirmar deshabilitado; reintentar recupera', async () => {
    servidor.use(dummy.query('peritos', () => new HttpResponse(null, { status: 500 }), { once: true }))
    const { wrapper } = await montarDerivar()
    const banner = wrapper.get('[data-prueba="error-peritos"]')
    expect(banner.text()).toContain('No pudimos cargar los peritos disponibles.')
    expect(wrapper.get('[data-prueba="perito"] select').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-prueba="confirmar"]').attributes('disabled')).toBeDefined()
    await banner.get('button').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[data-prueba="error-peritos"]').exists()).toBe(false))
    await flushPromises()
    expect(wrapper.findAll('[data-prueba="perito"] option').length).toBe(3)
  })

  it('sin peritos: selector deshabilitado con el aviso', async () => {
    servidor.use(dummy.query('peritos', () => HttpResponse.json({ data: { peritos: [] } })))
    const { wrapper } = await montarDerivar()
    expect(wrapper.get('[data-prueba="perito"] select').attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('No hay peritos disponibles para este siniestro.')
    expect(wrapper.get('[data-prueba="confirmar"]').attributes('disabled')).toBeDefined()
  })

  it('confirmación sin resultado en memoria: estado vacío con foco al h1 y sin llamar al backend', async () => {
    const llamadas = vi.fn()
    servidor.events.on('request:start', llamadas)
    const { wrapper } = await montar('/operador/siniestros/sin-01/derivado')
    servidor.events.removeAllListeners('request:start')
    expect(wrapper.find('[data-pantalla="W04-03c"]').exists()).toBe(true)
    expect(wrapper.get('nav [aria-current="page"]').text()).toBe('Derivación')
    const h1 = wrapper.get('h1')
    expect(h1.text()).toBe('No hay una resolución reciente para mostrar.')
    expect(document.activeElement).toBe(h1.element)
    expect(wrapper.get('main a[href="/operador/siniestros"]').text()).toContain('Volver a la bandeja')
    expect(llamadas).not.toHaveBeenCalled()
  })

  it('confirmación con un ErrorSiniestro en memoria: estado vacío', async () => {
    const { estado } = useSiniestros()
    estado.resultado = { mensaje: 'x' }
    const { wrapper } = await montar('/operador/siniestros/sin-02/derivado')
    expect(wrapper.find('[data-prueba="sin-resultado"]').exists()).toBe(true)
  })
})
