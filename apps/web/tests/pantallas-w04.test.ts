import { HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'
import { nextTick } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import BandejaSiniestros from '../src/views/BandejaSiniestros.vue'
import { reiniciarEstadoSiniestros, useSiniestros } from '../src/composables/useSiniestros'
import { useSesion } from '../src/composables/useSesion'
import { crearRouter } from '../src/router'
import { restablecerSiniestrosDePrueba } from '../src/mocks/siniestros'
import { servidor } from '../src/mocks/node'

const bff = graphql.link('*/v1/graphql/web')
const fetchPrueba: typeof fetch = (url, init) => fetch(new URL(String(url), 'http://localhost'), init)

function crearRouterDePrueba(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/operador', component: { template: '<div data-pantalla="G-02b" />' } },
      { path: '/operador/siniestros', component: BandejaSiniestros },
      { path: '/operador/siniestros/:id', component: { template: '<div data-pantalla="W04-02" />' } },
    ],
  })
}

// useSiniestros es un singleton de módulo: se desmontan los wrappers y se reinicia su estado entre pruebas.
const wrappers: VueWrapper[] = []
async function montarBandeja() {
  const router = crearRouterDePrueba()
  router.push('/operador/siniestros')
  await router.isReady()
  const wrapper = mount(BandejaSiniestros, { global: { plugins: [router] } }) as VueWrapper
  wrappers.push(wrapper)
  // MSW responde en varias vueltas del event loop: se espera a que termine la carga.
  await vi.waitFor(() => expect(useSiniestros().estado.cargando).toBe(false))
  await flushPromises()
  return { wrapper, router }
}

const filas = (w: VueWrapper) => w.findAll('tbody tr')
const chip = (w: VueWrapper, texto: string) => w.findAll('[aria-pressed]').find((b) => b.text().startsWith(texto))!

describe('HU-W04 · W04-01 Bandeja de siniestros', () => {
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

  it('marca la pantalla, un solo h1, migas "Inicio › Siniestros" y la pastilla de operador', async () => {
    const { wrapper } = await montarBandeja()
    expect(wrapper.find('[data-pantalla="W04-01"]').exists()).toBe(true)
    expect(wrapper.findAll('h1')).toHaveLength(1)
    expect(wrapper.get('h1').text()).toBe('Siniestros pendientes')
    expect(wrapper.get('nav [aria-current="page"]').text()).toBe('Siniestros')
    expect(wrapper.text()).toContain('Operador de back-office activo')
  })

  it('lista los siniestros del más reciente al más antiguo, con radicado, fecha corta e insignia', async () => {
    const { wrapper } = await montarBandeja()
    const nombres = filas(wrapper).map((f) => f.find('td p').text())
    expect(nombres).toEqual([
      'Asegurado de prueba 4',
      'Asegurado de prueba 3',
      'Asegurado de prueba 2',
      'Asegurado de prueba 1',
    ])
    const primera = filas(wrapper)[0]
    expect(primera.text()).toContain('Radicado: SIN-2026-0144')
    expect(primera.get('time').text()).toBe('14 oct 2026')
    expect(primera.get('time').attributes('datetime')).toBe('2026-10-14T16:15:00Z')
    expect(primera.text()).toContain('✕')
    expect(primera.text()).toContain('Rechazado')
  })

  it('"Todos" lleva el contador total; un chip por estado filtra sin contador; no hay "Derivado"', async () => {
    const { wrapper } = await montarBandeja()
    const chips = wrapper.findAll('[aria-label="Filtrar por estado"] [aria-pressed]')
    expect(chips.map((c) => c.text().replace(/\s+/g, ' '))).toEqual([
      'Todos 4(4 siniestros)',
      'Pendiente',
      'En revisión',
      'Aprobado',
      'Rechazado',
    ])
    expect(chips[0].attributes('aria-pressed')).toBe('true')
    // El número visible no se lee: solo el sr-only "(n siniestros)".
    expect(chips[0].get('span[aria-hidden="true"]').text()).toBe('4')
    expect(chips[0].get('.sr-only').text()).toBe('(4 siniestros)')

    await chip(wrapper, 'Pendiente').trigger('click')
    expect(chip(wrapper, 'Pendiente').attributes('aria-pressed')).toBe('true')
    expect(filas(wrapper)).toHaveLength(1)
    expect(filas(wrapper)[0].text()).toContain('Asegurado de prueba 1')

    await chip(wrapper, 'En revisión').trigger('click')
    expect(filas(wrapper)).toHaveLength(1)
    expect(filas(wrapper)[0].text()).toContain('Asegurado de prueba 2')
    expect(wrapper.get('[data-prueba="mostrando"]').text()).toBe(
      'Mostrando 1 de 4 siniestros asignados a la mesa de control operativo',
    )

    await chip(wrapper, 'Aprobado').trigger('click')
    expect(chip(wrapper, 'Aprobado').attributes('aria-pressed')).toBe('true')
    expect(filas(wrapper).every((f) => f.text().includes('Aprobado'))).toBe(true)

    await chip(wrapper, 'Rechazado').trigger('click')
    expect(filas(wrapper).length).toBeGreaterThan(0)
    expect(filas(wrapper).every((f) => f.text().includes('Rechazado'))).toBe(true)
  })

  it('"Total en cola" cuenta solo los abiertos (PENDIENTE y EN_REVISION)', async () => {
    const { wrapper } = await montarBandeja()
    expect(wrapper.get('[data-prueba="total-cola"]').text()).toBe('Total en cola: 2 casos')
  })

  it('pie "Mostrando X de Y" con aria-live y el tiempo de respuesta normativa', async () => {
    const { wrapper } = await montarBandeja()
    const pie = wrapper.get('[data-prueba="mostrando"]')
    expect(pie.attributes('aria-live')).toBe('polite')
    expect(pie.text()).toBe('Mostrando 4 de 4 siniestros asignados a la mesa de control operativo')
    expect(wrapper.text()).toContain('Tiempo promedio de respuesta normativa: 24 h')
  })

  it('"Abrir" enlaza al detalle por id con nombre accesible de cliente y radicado', async () => {
    const { wrapper, router } = await montarBandeja()
    const enlace = filas(wrapper)[3].get('a')
    expect(enlace.attributes('href')).toBe('/operador/siniestros/sin-01')
    expect(enlace.attributes('aria-label')).toBe('Abrir caso de Asegurado de prueba 1, radicado SIN-2026-0141')
    await enlace.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/operador/siniestros/sin-01')
  })

  it('bandeja vacía: aviso propio y "0 casos" en cola', async () => {
    servidor.use(bff.query('siniestros', () => HttpResponse.json({ data: { siniestros: [] } })))
    const { wrapper } = await montarBandeja()
    expect(wrapper.text()).toContain('No hay siniestros asignados a la mesa de control.')
    expect(wrapper.get('[data-prueba="total-cola"]').text()).toBe('Total en cola: 0 casos')
  })

  it('un filtro sin filas muestra "No hay siniestros en este estado." y el pie "Mostrando 0 de Y"', async () => {
    const { wrapper } = await montarBandeja()
    // Se quita el pendiente del estado compartido: el filtro Pendiente queda sin filas.
    const { estado } = useSiniestros()
    estado.siniestros = estado.siniestros.filter((s) => s.estado !== 'PENDIENTE')
    await chip(wrapper, 'Pendiente').trigger('click')
    expect(filas(wrapper)).toHaveLength(1)
    expect(filas(wrapper)[0].text()).toBe('No hay siniestros en este estado.')
    expect(wrapper.get('[data-prueba="mostrando"]').text()).toContain('Mostrando 0 de 3')
  })

  it('muestra el plazo solo en los PENDIENTE y lo marca al vencer', async () => {
    const { wrapper } = await montarBandeja()
    const { estado } = useSiniestros()
    const [base] = estado.siniestros
    estado.siniestros = [
      {
        ...base,
        id: 'a',
        estado: 'PENDIENTE',
        venceDictamenEn: new Date(Date.now() + 90 * 60_000 + 5_000).toISOString(),
      },
      { ...base, id: 'b', estado: 'PENDIENTE', venceDictamenEn: new Date(Date.now() - 60_000).toISOString() },
      { ...base, id: 'c', estado: 'EN_REVISION', venceDictamenEn: new Date(Date.now() - 60_000).toISOString() },
    ]
    await nextTick()
    const plazos = wrapper.findAll('[data-prueba="plazo"]')
    expect(plazos.map((p) => p.text())).toEqual(['Plazo: 1 h 30 min', 'Plazo: Vencido'])
    expect(plazos[1].classes()).toContain('text-error')
  })

  it('pagina de a 10, y cambiar de filtro vuelve a la página 1', async () => {
    const { wrapper } = await montarBandeja()
    const { estado } = useSiniestros()
    const base = estado.siniestros[0]
    estado.siniestros = Array.from({ length: 23 }, (_, i) => ({
      ...base,
      id: `sin-${i}`,
      radicado: `SIN-2026-${i}`,
      estado: 'PENDIENTE' as const,
    }))
    await nextTick()
    const paginador = () => wrapper.get('[data-componente="paginador"]')
    const boton = (texto: string) =>
      paginador()
        .findAll('button')
        .find((b) => b.text() === texto)!

    expect(filas(wrapper)).toHaveLength(10)
    expect(paginador().text()).toContain('Página 1 de 3')
    expect(boton('Anterior').attributes('disabled')).toBeDefined()

    await boton('Siguiente').trigger('click')
    await boton('Siguiente').trigger('click')
    expect(paginador().text()).toContain('Página 3 de 3')
    expect(filas(wrapper)).toHaveLength(3)
    expect(boton('Siguiente').attributes('disabled')).toBeDefined()

    await chip(wrapper, 'Pendiente').trigger('click')
    expect(paginador().text()).toContain('Página 1 de 3')
  })

  it('si la carga falla muestra un mensaje amigable con "Reintentar" que vuelve a cargar', async () => {
    servidor.use(bff.query('siniestros', () => new HttpResponse(null, { status: 503 }), { once: true }))
    const { wrapper } = await montarBandeja()
    const alerta = wrapper.get('[role="alert"]')
    expect(alerta.text()).toContain('No pudimos cargar los siniestros en este momento.')
    expect(alerta.text()).not.toMatch(/50\d/)
    expect(wrapper.find('[data-prueba="total-cola"]').exists()).toBe(false)

    await alerta.get('button').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(filas(wrapper)).toHaveLength(4)
  })

  it('mientras carga muestra "Cargando siniestros…" y oculta la cola y el contador', async () => {
    const router = crearRouterDePrueba()
    router.push('/operador/siniestros')
    await router.isReady()
    const wrapper = mount(BandejaSiniestros, { global: { plugins: [router] } }) as VueWrapper
    wrappers.push(wrapper)
    await nextTick()
    expect(wrapper.get('[role="status"]').text()).toBe('Cargando siniestros…')
    expect(wrapper.find('[data-prueba="total-cola"]').exists()).toBe(false)
    expect(chip(wrapper, 'Todos').text()).toBe('Todos')
    await flushPromises()
  })

  describe('acceso por rol', () => {
    afterEach(() => useSesion().cerrarSesion())

    it('un BACKOFFICE entra a /operador/siniestros', async () => {
      await useSesion(fetchPrueba).iniciarSesion('admin.solventa', 'x')
      const router = crearRouter(createMemoryHistory())
      await router.push('/operador/siniestros')
      expect(router.currentRoute.value.path).toBe('/operador/siniestros')
    })

    it('otro rol no entra: vuelve a su home', async () => {
      await useSesion(fetchPrueba).iniciarSesion('cliente.demo', 'x')
      const router = crearRouter(createMemoryHistory())
      await router.push('/operador/siniestros')
      expect(router.currentRoute.value.path).toBe('/inicio')
    })
  })
})
