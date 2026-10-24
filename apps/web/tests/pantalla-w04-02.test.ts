import { HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import DetalleSiniestro from '../src/views/DetalleSiniestro.vue'
import Boton from '../src/components/ui/Boton.vue'
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
      { path: '/operador/siniestros/:id', component: DetalleSiniestro },
      { path: '/operador/siniestros/:id/derivar', component: vacio('W04-02b') },
      { path: '/operador/siniestros/:id/aprobado', component: vacio('W04-03a') },
    ],
  })
}

const wrappers: VueWrapper[] = []
async function montar(id = 'sin-01') {
  const router = crearRouterDePrueba()
  router.push(`/operador/siniestros/${id}`)
  await router.isReady()
  const wrapper = mount(DetalleSiniestro, { global: { plugins: [router] } }) as VueWrapper
  wrappers.push(wrapper)
  await vi.waitFor(() => expect(useSiniestros().estado.cargandoDetalle).toBe(false))
  await flushPromises()
  return { wrapper, router }
}

describe('HU-W04 · W04-02 Detalle del siniestro', () => {
  beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }))
  beforeEach(() => {
    reiniciarEstadoSiniestros()
    restablecerSiniestrosDePrueba()
  })
  afterEach(() => {
    wrappers.forEach((w) => w.unmount())
    wrappers.length = 0
    servidor.resetHandlers()
    vi.useRealTimers()
  })
  afterAll(() => servidor.close())

  it('marca la pantalla, migas "Inicio › Siniestros › Detalle #radicado" y h1 sr-only', async () => {
    const { wrapper } = await montar()
    expect(wrapper.find('[data-pantalla="W04-02"]').exists()).toBe(true)
    expect(wrapper.get('nav [aria-current="page"]').text()).toBe('Detalle #SIN-2026-0141')
    expect(wrapper.get('nav a[href="/operador/siniestros"]').text()).toBe('Siniestros')
    expect(wrapper.get('h1').text()).toBe('Siniestro #SIN-2026-0141')
    expect(wrapper.text()).toContain('Operador de back-office activo')
  })

  it('tarjeta de datos con asegurado, póliza SOL-…, coordenadas, suma e insignia', async () => {
    const { wrapper } = await montar()
    const datos = wrapper.get('[data-prueba="datos"]').text()
    expect(datos).toContain('Asegurado de prueba 1')
    expect(datos).toContain('SOL-2026-048211')
    expect(datos).toContain('Calle 80, puente de Guadua, Bogotá')
    expect(datos).toContain('Lat: 4.7236, Lon: -74.1215')
    expect(datos).toContain('Banco Aliado S.A.')
    expect(wrapper.get('[data-prueba="suma"]').text()).toMatch(/\$\s8\.650\.000/)
    expect(wrapper.text()).toContain('!Pendiente de dictamen')
  })

  it('galería: cuenta las evidencias, geoetiqueta solo en la foto, documento con object-contain', async () => {
    const { wrapper } = await montar()
    expect(wrapper.text()).toContain('2 archivos verificados')
    const [foto, doc] = wrapper.findAll('[data-prueba="evidencia"]')
    expect(foto.text()).toContain('Geoetiquetada')
    expect(foto.get('img').classes()).toContain('object-cover')
    expect(foto.text()).toContain('· 4.7236, -74.1215 · tomada en sitio')
    expect(doc.text()).not.toContain('Geoetiquetada')
    expect(doc.get('img').classes()).toContain('object-contain')
    expect(doc.get('a').attributes('target')).toBe('_blank')
    expect(doc.get('a').attributes('aria-label')).toBe('Abrir Factura de reparación del taller en una pestaña nueva')
  })

  it('imagen fallida → "Imagen no disponible", conserva título y etiqueta, sin enlace', async () => {
    const { wrapper } = await montar()
    const foto = wrapper.findAll('[data-prueba="evidencia"]')[0]
    await foto.get('img').trigger('error')
    const tras = wrapper.findAll('[data-prueba="evidencia"]')[0]
    expect(tras.text()).toContain('Imagen no disponible')
    expect(tras.find('img').exists()).toBe(false)
    expect(tras.find('a').exists()).toBe(false)
    expect(tras.text()).toContain('Foto: daño frontal del vehículo')
    expect(tras.text()).toContain('sin-01-foto-1.jpg')
  })

  it('verificación que no cumple: ícono y texto "No cumple" (no solo color)', async () => {
    const { wrapper } = await montar('sin-04')
    const items = wrapper.get('[data-prueba="verificaciones"]').findAll('li')
    expect(items[0].text()).toContain('Cumple:')
    expect(items[2].text()).toContain('No cumple:')
    expect(items[2].text()).toContain('· No cumple')
  })

  it('tiempo restante "{h}h {mm}m" que se recalcula cada minuto y pasa a "Vencido"', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
    const { wrapper } = await montar()
    const { estado } = useSiniestros()
    estado.detalle!.venceDictamenEn = new Date(Date.now() + (2 * 60 + 5) * 60_000 + 30_000).toISOString()
    await flushPromises()
    const caja = () => wrapper.get('[data-prueba="tiempo-restante"]')
    expect(caja().get('time').text()).toBe('2h 05m')
    vi.advanceTimersByTime(60_000)
    await flushPromises()
    expect(caja().get('time').text()).toBe('2h 04m')
    vi.advanceTimersByTime(3 * 3_600_000)
    await flushPromises()
    expect(caja().get('time').text()).toBe('Vencido')
    expect(caja().classes()).toContain('border-error')
  })

  it('con más de 24 h muestra "{d} d {h}h"', async () => {
    const { wrapper } = await montar()
    useSiniestros().estado.detalle!.venceDictamenEn = new Date(Date.now() + 50 * 3_600_000 + 60_000).toISOString()
    await flushPromises()
    expect(wrapper.get('[data-prueba="tiempo-restante"] time').text()).toBe('2 d 2h')
  })

  it('PENDIENTE: Derivar (enlace), Rechazar y Aprobar activos; Aprobar es el único primario', async () => {
    const { wrapper } = await montar()
    expect(wrapper.get('[data-prueba="derivar"]').attributes('href')).toBe('/operador/siniestros/sin-01/derivar')
    expect(wrapper.get('[data-prueba="rechazar"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('[data-prueba="aprobar"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.findAll('main .bg-primario')).toHaveLength(1)
    expect(wrapper.text()).toContain('La decisión adoptada notificará de inmediato a la entidad financiera.')
  })

  it('Rechazar no rompe la pantalla (el modal llega en el bloque 5)', async () => {
    const { wrapper, router } = await montar()
    await wrapper.get('[data-prueba="rechazar"]').trigger('click')
    expect(router.currentRoute.value.path).toBe('/operador/siniestros/sin-01')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('EN_REVISION derivado: perito y fecha del informe; Derivar deshabilitado; Aprobar/Rechazar activos', async () => {
    const { wrapper } = await montar('sin-02')
    const perito = wrapper.get('[data-prueba="perito"]')
    expect(perito.text()).toContain('Peritajes Andes Ltda. · Bogotá · Red Preferente Centro')
    expect(perito.text()).toContain('Informe esperado para el')
    const derivar = wrapper.get('[data-prueba="derivar"]')
    expect(derivar.element.tagName).toBe('BUTTON')
    expect(derivar.attributes('disabled')).toBeDefined()
    expect(derivar.attributes('aria-describedby')).toBe('perito-asignado')
    expect(wrapper.get('[data-prueba="aprobar"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('[data-prueba="rechazar"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('[data-prueba="tiempo-restante"]').exists()).toBe(true)
  })

  it('APROBADO: solo lectura con la resolución y sin tiempo restante', async () => {
    const { wrapper } = await montar('sin-03')
    expect(wrapper.find('[data-prueba="acciones"]').exists()).toBe(false)
    expect(wrapper.find('[data-prueba="tiempo-restante"]').exists()).toBe(false)
    const r = wrapper.get('[data-prueba="resolucion"]').text()
    expect(r).toContain('Resolución')
    expect(r).toContain('✓Aprobado')
    expect(r).toMatch(/Indemnización\s*\$\s8\.650\.000/)
    expect(r).toContain('ACH Colombia Interbancario')
    expect(r).toContain('1 a 3 días hábiles')
    expect(wrapper.get('[data-prueba="resolucion"] a').attributes('href')).toBe('/operador/siniestros')
  })

  it('RECHAZADO: solo lectura con motivo traducido, vía de recurso y notificación', async () => {
    const { wrapper } = await montar('sin-04')
    expect(wrapper.find('[data-prueba="acciones"]').exists()).toBe(false)
    const r = wrapper.get('[data-prueba="resolucion"]').text()
    expect(r).toContain('Fuera de cobertura')
    expect(r).toContain('Disponible en los próximos 10 días hábiles.')
    expect(r).toContain('Enviada vía correo certificado y Open Finance')
    expect(r).not.toContain('Comentario')
  })

  it('Aprobar con éxito navega a la confirmación', async () => {
    const { wrapper, router } = await montar()
    await wrapper.get('[data-prueba="aprobar"]').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/operador/siniestros/sin-01/aprobado'))
    expect(useSiniestros().estado.resultado).toMatchObject({ estado: 'APROBADO' })
  })

  it('Aprobar con ErrorSiniestro muestra el banner con foco y reactiva los botones', async () => {
    servidor.use(
      dummy.mutation('aprobarSiniestro', () =>
        HttpResponse.json({
          data: { aprobarSiniestro: { __typename: 'ErrorSiniestro', mensaje: 'El siniestro ya fue resuelto.' } },
        }),
      ),
    )
    const { wrapper, router } = await montar()
    document.body.appendChild(wrapper.element)
    await wrapper.get('[data-prueba="aprobar"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[role="alert"]').exists()).toBe(true))
    await flushPromises()
    const alerta = wrapper.get('[role="alert"]')
    expect(alerta.text()).toContain('El siniestro ya fue resuelto.')
    expect(document.activeElement).toBe(alerta.element)
    expect(wrapper.get('[data-prueba="aprobar"]').attributes('disabled')).toBeUndefined()
    expect(router.currentRoute.value.path).toBe('/operador/siniestros/sin-01')
  })

  it('Aprobar con 503 muestra un mensaje genérico sin códigos', async () => {
    servidor.use(dummy.mutation('aprobarSiniestro', () => new HttpResponse(null, { status: 503 })))
    const { wrapper } = await montar()
    await wrapper.get('[data-prueba="aprobar"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[role="alert"]').exists()).toBe(true))
    expect(wrapper.get('[role="alert"]').text()).not.toMatch(/50\d/)
  })

  it('id inexistente: "No encontramos este siniestro." con regreso a la bandeja', async () => {
    const { wrapper } = await montar('sin-99')
    expect(wrapper.text()).toContain('No encontramos este siniestro.')
    expect(wrapper.get('main a').attributes('href')).toBe('/operador/siniestros')
    expect(wrapper.get('nav [aria-current="page"]').text()).toBe('Detalle')
  })

  it('error de carga con "Reintentar" que vuelve a cargar', async () => {
    servidor.use(dummy.query('siniestro', () => new HttpResponse(null, { status: 503 }), { once: true }))
    const { wrapper } = await montar()
    const alerta = wrapper.get('[role="alert"]')
    expect(alerta.text()).toContain('No pudimos cargar el siniestro en este momento.')
    expect(alerta.text()).not.toMatch(/50\d/)
    await alerta.get('button').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[data-prueba="datos"]').exists()).toBe(true))
  })
})

describe('Boton · variante peligroBorde', () => {
  it('borde y texto de error sobre error-fondo, sin relleno sólido', () => {
    const b = mount(Boton, { props: { variante: 'peligroBorde' }, slots: { default: 'Rechazar' } })
    expect(b.classes()).toEqual(expect.arrayContaining(['border', 'border-error', 'bg-error-fondo', 'text-error']))
    expect(b.classes()).not.toContain('bg-error')
  })
})
