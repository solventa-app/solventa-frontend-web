import { HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createMemoryHistory, createRouter, RouterView, type Router } from 'vue-router'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import DetalleSiniestro from '../src/views/DetalleSiniestro.vue'
import DerivarSiniestro from '../src/views/DerivarSiniestro.vue'
import ConfirmacionAprobacion from '../src/views/ConfirmacionAprobacion.vue'
import ConfirmacionRechazo from '../src/views/ConfirmacionRechazo.vue'
import { reiniciarEstadoSiniestros, useSiniestros } from '../src/composables/useSiniestros'
import { restablecerSiniestrosDePrueba } from '../src/mocks/siniestros'
import { servidor } from '../src/mocks/node'
import { cambiarIdioma } from '../src/i18n'
import { sinPuntoFinal } from '../src/utils/formato'

const bff = graphql.link('*/v1/graphql/web')

function crearRouterDePrueba(): Router {
  const vacio = (id: string) => ({ template: `<div data-pantalla="${id}" />` })
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/operador', component: vacio('G-02b') },
      { path: '/operador/siniestros', component: vacio('W04-01') },
      { path: '/operador/siniestros/:id', component: DetalleSiniestro },
      { path: '/operador/siniestros/:id/derivar', component: DerivarSiniestro },
      { path: '/operador/siniestros/:id/aprobado', component: ConfirmacionAprobacion },
      { path: '/operador/siniestros/:id/rechazado', component: ConfirmacionRechazo },
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
  await vi.waitFor(() => expect(useSiniestros().estado.cargandoDetalle).toBe(false))
  await flushPromises()
  return { wrapper, router }
}

const modal = (w: VueWrapper) => w.find('[data-componente="modal-rechazo"]')
const confirmarBtn = (w: VueWrapper) => w.get('[data-prueba="confirmar-rechazo"]')

async function abrirModal(id = 'sin-01') {
  const r = await montar(`/operador/siniestros/${id}`)
  await r.wrapper.get('[data-prueba="rechazar"]').trigger('click')
  await flushPromises()
  return r
}

describe('HU-W04 · Modal de rechazo (CA-W04-24/25/26)', () => {
  beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }))
  beforeEach(() => {
    reiniciarEstadoSiniestros()
    restablecerSiniestrosDePrueba()
    cambiarIdioma('ES')
  })
  afterEach(() => {
    wrappers.forEach((w) => w.unmount())
    wrappers.length = 0
    servidor.resetHandlers()
    cambiarIdioma('ES')
  })
  afterAll(() => servidor.close())

  it('Rechazar anuncia el diálogo y abre el modal con foco al motivo', async () => {
    const { wrapper } = await abrirModal()
    expect(wrapper.get('[data-prueba="rechazar"]').attributes('aria-haspopup')).toBe('dialog')
    const caja = modal(wrapper)
    expect(caja.attributes('role')).toBe('dialog')
    expect(caja.attributes('aria-modal')).toBe('true')
    expect(caja.get('h2').text()).toBe('Rechazar siniestro #SIN-2026-0141')
    expect(document.activeElement).toBe(caja.get('select').element)
  })

  it('5 motivos en orden del enum, Confirmar deshabilitado sin motivo y contador del comentario', async () => {
    const { wrapper } = await abrirModal()
    const opciones = modal(wrapper)
      .findAll('option')
      .map((o) => o.text())
    expect(opciones).toEqual([
      'Selecciona un motivo',
      'Evidencia insuficiente',
      'Fuera de cobertura',
      'Inconsistencia en el relato',
      'Otro',
      'Póliza no vigente',
    ])
    expect(confirmarBtn(wrapper).attributes('disabled')).toBeDefined()
    expect(wrapper.text()).toContain('Elige un motivo para confirmar el rechazo.')
    await modal(wrapper).get('select').setValue('OTRO')
    expect(confirmarBtn(wrapper).attributes('disabled')).toBeUndefined()
    expect(wrapper.text()).not.toContain('Elige un motivo para confirmar el rechazo.')
    const area = modal(wrapper).get('textarea')
    expect(area.attributes('maxlength')).toBe('500')
    await area.setValue('Hola')
    expect(modal(wrapper).text()).toContain('4 / 500')
  })

  it.each([
    ['Escape', (w: VueWrapper) => w.get('[data-prueba="velo"]').trigger('keydown', { key: 'Escape' })],
    ['X', (w: VueWrapper) => w.get('[data-prueba="cerrar"]').trigger('click')],
    ['Cancelar', (w: VueWrapper) => w.get('[data-prueba="cancelar"]').trigger('click')],
    ['velo', (w: VueWrapper) => w.get('[data-prueba="velo"]').trigger('click')],
  ])('%s cierra el modal y devuelve el foco a Rechazar', async (_, accion) => {
    const { wrapper } = await abrirModal()
    await accion(wrapper)
    await flushPromises()
    expect(modal(wrapper).exists()).toBe(false)
    expect(document.activeElement).toBe(wrapper.get('[data-prueba="rechazar"]').element)
  })

  it('atrapa el foco: Tab desde el último va al primero y Shift+Tab desde el primero al último', async () => {
    const { wrapper } = await abrirModal()
    await modal(wrapper).get('select').setValue('OTRO')
    const cerrar = wrapper.get('[data-prueba="cerrar"]').element as HTMLElement
    const confirmar = confirmarBtn(wrapper).element as HTMLElement
    confirmar.focus()
    await wrapper.get('[data-prueba="velo"]').trigger('keydown', { key: 'Tab' })
    expect(document.activeElement).toBe(cerrar)
    await wrapper.get('[data-prueba="velo"]').trigger('keydown', { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(confirmar)
  })

  it('enviando: "Rechazando…", todo deshabilitado y Escape no cierra; éxito navega a /rechazado', async () => {
    let liberar: () => void = () => {}
    const espera = new Promise<void>((r) => (liberar = r))
    servidor.use(
      bff.mutation('rechazarSiniestro', async () => {
        await espera
        return undefined
      }),
    )
    const { wrapper, router } = await abrirModal()
    await modal(wrapper).get('select').setValue('EVIDENCIA_INSUFICIENTE')
    await modal(wrapper).get('textarea').setValue('  Fotos borrosas  ')
    await confirmarBtn(wrapper).trigger('click')
    await flushPromises()
    expect(confirmarBtn(wrapper).text()).toContain('Rechazando…')
    expect(modal(wrapper).attributes('aria-busy')).toBe('true')
    expect(modal(wrapper).get('select').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-prueba="cancelar"]').attributes('disabled')).toBeDefined()
    await wrapper.get('[data-prueba="velo"]').trigger('keydown', { key: 'Escape' })
    expect(modal(wrapper).exists()).toBe(true)
    // El botón Aprobar no dice "Aprobando…" mientras se rechaza.
    expect(wrapper.get('[data-prueba="aprobar"]').text()).not.toContain('Aprobando')
    liberar()
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/operador/siniestros/sin-01/rechazado'))
    await flushPromises()
    const r = useSiniestros().estado.resultado
    expect(r && 'resolucion' in r ? r.resolucion?.comentario : null).toBe('Fotos borrosas')
  })

  it('error: queda abierto, conserva motivo y comentario y enfoca el banner', async () => {
    servidor.use(
      bff.mutation('rechazarSiniestro', () =>
        HttpResponse.json({
          data: { rechazarSiniestro: { __typename: 'ErrorSiniestro', mensaje: 'El siniestro ya fue resuelto.' } },
        }),
      ),
    )
    const { wrapper, router } = await abrirModal()
    await modal(wrapper).get('select').setValue('OTRO')
    await modal(wrapper).get('textarea').setValue('Detalle')
    await confirmarBtn(wrapper).trigger('click')
    await flushPromises()
    const banner = wrapper.get('[data-prueba="error-rechazo"]')
    expect(banner.text()).toContain('El siniestro ya fue resuelto.')
    expect(document.activeElement).toBe(banner.element)
    expect((modal(wrapper).get('select').element as HTMLSelectElement).value).toBe('OTRO')
    expect((modal(wrapper).get('textarea').element as HTMLTextAreaElement).value).toBe('Detalle')
    expect(router.currentRoute.value.path).toBe('/operador/siniestros/sin-01')
  })

  it('red caída: mensaje genérico sin códigos', async () => {
    servidor.use(bff.mutation('rechazarSiniestro', () => new HttpResponse(null, { status: 503 })))
    const { wrapper } = await abrirModal()
    await modal(wrapper).get('select').setValue('OTRO')
    await confirmarBtn(wrapper).trigger('click')
    await flushPromises()
    const texto = wrapper.get('[data-prueba="error-rechazo"]').text()
    expect(texto).not.toMatch(/\d{3}/)
    expect(modal(wrapper).exists()).toBe(true)
  })

  it('al reabrir limpia motivo y comentario', async () => {
    const { wrapper } = await abrirModal()
    await modal(wrapper).get('select').setValue('OTRO')
    await wrapper.get('[data-prueba="cancelar"]').trigger('click')
    await wrapper.get('[data-prueba="rechazar"]').trigger('click')
    await flushPromises()
    expect((modal(wrapper).get('select').element as HTMLSelectElement).value).toBe('')
  })
})

describe('HU-W04 · W04-03a y W04-03b (CA-W04-27/28/29)', () => {
  beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }))
  beforeEach(() => {
    reiniciarEstadoSiniestros()
    restablecerSiniestrosDePrueba()
    cambiarIdioma('ES')
  })
  afterEach(() => {
    wrappers.forEach((w) => w.unmount())
    wrappers.length = 0
    servidor.resetHandlers()
    cambiarIdioma('ES')
  })
  afterAll(() => servidor.close())

  it('Aprobar navega con replace a W04-03a: insignia, subtítulo, monto es-CO, método y plazo; foco al h1', async () => {
    const { wrapper, router } = await montar('/operador/siniestros/sin-01')
    const replace = vi.spyOn(router, 'replace')
    await wrapper.get('[data-prueba="aprobar"]').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/operador/siniestros/sin-01/aprobado'))
    await flushPromises()
    expect(replace).toHaveBeenCalledWith('/operador/siniestros/sin-01/aprobado')
    expect(wrapper.find('[data-pantalla="W04-03a"]').exists()).toBe(true)
    expect(wrapper.get('nav [aria-current="page"]').text()).toBe('Aprobación')
    expect(wrapper.text()).toContain('✓Trámite liquidado')
    const h1 = wrapper.get('h1')
    expect(h1.text()).toBe('Siniestro aprobado')
    expect(document.activeElement).toBe(h1.element)
    const sub = wrapper.get('[data-prueba="subtitulo"]')
    expect(sub.text()).toMatch(
      /^Siniestro #SIN-2026-0141 aprobado\. Indemnización de \$\s?[\d.]+ será depositada en 1 a 3 días hábiles\.$/,
    )
    expect(sub.findAll('span.font-semibold').map((s) => s.text())[0]).toBe('#SIN-2026-0141')
    const panel = wrapper.get('[data-prueba="panel"]').text()
    expect(panel).toContain('Resumen de liquidación bancaria')
    expect(panel).toContain('ACH Colombia Interbancario')
    expect(panel).toContain('1 a 3 días hábiles')
    expect(wrapper.get('[data-prueba="monto"]').text()).toMatch(/^\$\s?\d{1,3}(\.\d{3})+$/)
    expect(wrapper.get('[data-prueba="confirmacion"]').findAll('button')).toHaveLength(0)
  })

  it('W04-03b: insignia, motivo en minúscula inicial, comentario, notificación, fecha, vía de recurso y migas', async () => {
    const { wrapper } = await abrirModal()
    await modal(wrapper).get('select').setValue('EVIDENCIA_INSUFICIENTE')
    await modal(wrapper).get('textarea').setValue('Fotos borrosas')
    await confirmarBtn(wrapper).trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[data-pantalla="W04-03b"]').exists()).toBe(true))
    await flushPromises()
    expect(wrapper.get('nav [aria-current="page"]').text()).toBe('Resolución #SIN-2026-0141')
    expect(wrapper.text()).toContain('✕Trámite rechazado')
    expect(document.activeElement).toBe(wrapper.get('h1').element)
    expect(wrapper.get('[data-prueba="subtitulo"]').text()).toBe(
      'Siniestro #SIN-2026-0141 rechazado. Motivo: evidencia insuficiente.',
    )
    const panel = wrapper.get('[data-prueba="panel"]').text()
    expect(panel).toContain('Enviada vía correo certificado y Open Finance')
    expect(panel).toContain('Fecha y hora de resolución')
    expect(panel).toContain('Disponible en los próximos 10 días hábiles.')
    expect(wrapper.get('[data-prueba="comentario"]').text()).toContain('Fotos borrosas')
  })

  it('W04-03b sin comentario no pinta la fila; en inglés el motivo va tal cual', async () => {
    const { wrapper } = await abrirModal()
    await modal(wrapper).get('select').setValue('FUERA_DE_COBERTURA')
    await confirmarBtn(wrapper).trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[data-pantalla="W04-03b"]').exists()).toBe(true))
    await flushPromises()
    expect(wrapper.find('[data-prueba="comentario"]').exists()).toBe(false)
    cambiarIdioma('EN')
    await flushPromises()
    expect(wrapper.get('[data-prueba="subtitulo"]').text()).toBe(
      'Claim #SIN-2026-0141 rejected. Reason: Outside coverage.',
    )
  })

  it.each([
    ['W04-03a', '/operador/siniestros/sin-01/aprobado', 'Aprobación'],
    ['W04-03b', '/operador/siniestros/sin-01/rechazado', 'Resolución'],
  ])('%s por URL directa muestra el vacío sin llamar al backend', async (id, ruta, miga) => {
    const llamadas = vi.fn()
    servidor.events.on('request:start', llamadas)
    const router = crearRouterDePrueba()
    router.push(ruta)
    await router.isReady()
    const wrapper = mount(Raiz, { global: { plugins: [router] }, attachTo: document.body }) as VueWrapper
    wrappers.push(wrapper)
    await flushPromises()
    servidor.events.removeAllListeners()
    expect(llamadas).not.toHaveBeenCalled()
    expect(wrapper.find(`[data-pantalla="${id}"]`).exists()).toBe(true)
    expect(wrapper.find('[data-prueba="sin-resultado"]').exists()).toBe(true)
    expect(wrapper.get('h1').text()).toBe('No hay una resolución reciente para mostrar.')
    expect(document.activeElement).toBe(wrapper.get('h1').element)
    expect(wrapper.get('nav [aria-current="page"]').text()).toBe(miga)
  })

  it('W04-03a no acepta un resultado de rechazo (tipo distinto) y muestra vacío', async () => {
    const { wrapper, router } = await abrirModal()
    await modal(wrapper).get('select').setValue('OTRO')
    await confirmarBtn(wrapper).trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/operador/siniestros/sin-01/rechazado'))
    await router.push('/operador/siniestros/sin-01/aprobado')
    await flushPromises()
    expect(wrapper.find('[data-prueba="sin-resultado"]').exists()).toBe(true)
  })
})

describe('Ajustes del bloque 4', () => {
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

  it('sinPuntoFinal quita el punto final de un dato', () => {
    expect(sinPuntoFinal('Avalúos del Caribe S.A.S.')).toBe('Avalúos del Caribe S.A.S')
    expect(sinPuntoFinal('Sin punto')).toBe('Sin punto')
  })

  it.each([
    ['sin-03', '✓Aprobado'],
    ['sin-04', '✕Rechazado'],
  ])('W04-02b de %s muestra la insignia del estado junto al h1', async (id, insignia) => {
    const { wrapper } = await montar(`/operador/siniestros/${id}/derivar`)
    await vi.waitFor(() => expect(useSiniestros().estado.cargandoPeritos).toBe(false))
    await flushPromises()
    expect(wrapper.text()).toContain(insignia)
  })
})
