// W01-04 «Fuentes consultadas» (historial del asesor) y W01-04b (detalle de una consulta): QA 2026-11-10, Q-08.
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useConsultaFuentes, useConsultasFuentes } from '../src/composables/useConsultasFuentes'
import { useCotizacion } from '../src/composables/useCotizacion'
import { useSesion } from '../src/composables/useSesion'
import type { ConsultaFuentes } from '../src/graphql/tipos'
import { formatearFecha } from '../src/utils/formato'
import DetalleDeFuentes from '../src/views/DetalleDeFuentes.vue'
import FuentesConsultadas from '../src/views/FuentesConsultadas.vue'

function consulta(n: number, extra: Partial<ConsultaFuentes> = {}): ConsultaFuentes {
  return {
    id: `c-${n}`,
    creadaEn: `2026-11-0${(n % 9) + 1}T15:00:00Z`,
    documentoEnmascarado: '10••••3040',
    tipoOferta: 'COMPLETA',
    producto: 'VIDA_DEUDOR',
    ofertaId: `of-${n}`,
    fuentes: [
      { id: 'cuentas-bancarias', nombre: 'cuentas-bancarias', origen: 'OPEN_FINANCE', estado: 'OK', capturadoEn: null },
      {
        id: 'historial-crediticio',
        nombre: 'historial-crediticio',
        origen: 'OPEN_FINANCE',
        estado: 'CACHE',
        capturadoEn: '2026-11-08T10:00:00Z',
      },
      { id: 'afiliacion-pila', nombre: 'afiliacion-pila', origen: 'OPEN_DATA', estado: 'FALLO', capturadoEn: null },
    ],
    ...extra,
  } as ConsultaFuentes
}

/** Un BFF simulado: `consultasFuentes` pagina de `tamano` en `tamano`; `consultaFuentes` busca por id. */
function bff(lista: ConsultaFuentes[], opciones: { falla?: boolean } = {}) {
  const variables: Record<string, unknown>[] = []
  const fetchFn = (async (_url: string, init: RequestInit) => {
    const cuerpo = JSON.parse(String(init.body)) as { query: string; variables: Record<string, unknown> }
    variables.push(cuerpo.variables)
    if (opciones.falla) throw new TypeError('sin red')
    if (cuerpo.query.includes('consultaFuentes(id')) {
      const encontrada = lista.find((c) => c.id === cuerpo.variables.id) ?? null
      return new Response(JSON.stringify({ data: { consultaFuentes: encontrada } }))
    }
    const tamano = Number(cuerpo.variables.tamano ?? 10)
    const pagina = Number(cuerpo.variables.pagina ?? 1)
    return new Response(
      JSON.stringify({
        data: {
          consultasFuentes: {
            consultas: lista.slice((pagina - 1) * tamano, pagina * tamano),
            total: lista.length,
            pagina,
            tamano,
          },
        },
      }),
    )
  }) as unknown as typeof fetch
  return { fetchFn, variables }
}

describe('useConsultasFuentes', () => {
  it('pide la página al servidor, de 10 en 10', async () => {
    const { fetchFn, variables } = bff(Array.from({ length: 23 }, (_, i) => consulta(i)))
    const { estado, cargar, irAPagina } = useConsultasFuentes(fetchFn)

    await cargar()
    expect(estado.total).toBe(23)
    expect(estado.consultas).toHaveLength(10)
    await irAPagina(3)
    expect(estado.consultas).toHaveLength(3)
    expect(variables).toEqual([
      { pagina: 1, tamano: 10 },
      { pagina: 3, tamano: 10 },
    ])
  })

  it('una falla de red muestra el error genérico, nunca el técnico', async () => {
    const { estado, cargar } = useConsultasFuentes(bff([], { falla: true }).fetchFn)
    await cargar()
    expect(estado.error).toBe('No pudimos cargar tus consultas. Intenta nuevamente.')
    expect(estado.cargando).toBe(false)
  })
})

describe('useConsultaFuentes', () => {
  it('distingue la consulta ajena o inexistente (null) de una falla', async () => {
    const lista = [consulta(1)]
    const encontrada = useConsultaFuentes(bff(lista).fetchFn)
    await encontrada.cargar('c-1')
    expect(encontrada.estado.consulta?.id).toBe('c-1')
    expect(encontrada.estado.problema).toBeNull()

    const ajena = useConsultaFuentes(bff(lista).fetchFn)
    await ajena.cargar('otra')
    expect(ajena.estado.problema).toBe('no-encontrada')

    const caida = useConsultaFuentes(bff(lista, { falla: true }).fetchFn)
    await caida.cargar('c-1')
    expect(caida.estado.problema).toBe('error')
  })
})

describe('W01-04 · FuentesConsultadas', () => {
  const originalFetch = globalThis.fetch
  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  async function montar(lista: ConsultaFuentes[], ruta = '/cotizacion/fuentes', opciones: { falla?: boolean } = {}) {
    const { fetchFn, variables } = bff(lista, opciones)
    globalThis.fetch = fetchFn
    useSesion().estado.rol = 'ASESOR'
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/cotizacion/fuentes', component: FuentesConsultadas },
        { path: '/cotizacion/fuentes/:consultaId', component: { template: '<div />' } },
        { path: '/cotizacion', component: { template: '<div />' } },
      ],
    })
    router.push(ruta)
    await router.isReady()
    const w = mount(FuentesConsultadas, { global: { plugins: [router] } })
    await flushPromises()
    return { w, router, variables }
  }

  it('sin consultas muestra el estado vacío con «Nueva cotización»', async () => {
    const { w } = await montar([])
    expect(w.find('[data-prueba="fuentes-vacio"]').exists()).toBe(true)
    expect(w.text()).toContain('Aún no has consultado fuentes')
    expect(w.find('[data-prueba="fuentes-nueva"]').attributes('href')).toBe('/cotizacion')
    w.unmount()
  })

  it('con una sola consulta pasa directo a su detalle', async () => {
    const { w, router } = await montar([consulta(1)])
    expect(router.currentRoute.value.fullPath).toBe('/cotizacion/fuentes/c-1')
    w.unmount()
  })

  it('con ?lista=1 (el «Volver» del detalle) una sola consulta conserva la tabla', async () => {
    const { w, router } = await montar([consulta(1)], '/cotizacion/fuentes?lista=1')
    expect(router.currentRoute.value.fullPath).toBe('/cotizacion/fuentes?lista=1')
    expect(w.findAll('[data-prueba="fila-consulta"]')).toHaveLength(1)
    w.unmount()
  })

  it('con varias muestra la tabla con el documento enmascarado y cuántas fuentes respondieron', async () => {
    const { w, router } = await montar([consulta(1), consulta(2, { tipoOferta: 'PRELIMINAR' })])
    expect(router.currentRoute.value.fullPath).toBe('/cotizacion/fuentes')
    const filas = w.findAll('[data-prueba="fila-consulta"]')
    expect(filas).toHaveLength(2)
    expect(filas[0]!.text()).toContain('10••••3040')
    expect(filas[0]!.text()).toContain('Completa')
    expect(filas[1]!.text()).toContain('Preliminar')
    expect(filas[0]!.text()).toContain('1 de 3 en línea')
    w.unmount()
  })

  it('tocar una fila abre el detalle, y la fecha es un enlace alcanzable con teclado', async () => {
    const { w, router } = await montar([consulta(1), consulta(2)])
    expect(w.find('a[href="/cotizacion/fuentes/c-2"]').exists()).toBe(true)
    await w.findAll('[data-prueba="fila-consulta"]')[1]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/cotizacion/fuentes/c-2')
    w.unmount()
  })

  it('en el teléfono hay una tarjeta por consulta, con la misma información', async () => {
    const { w } = await montar([consulta(1), consulta(2)])
    const tarjetas = w.findAll('[data-prueba="tarjeta-consulta"]')
    expect(tarjetas).toHaveLength(2)
    expect(tarjetas[0]!.text()).toContain('10••••3040')
    expect(w.find('[data-prueba="tarjetas-consultas"]').classes()).toContain('sm:hidden')
    w.unmount()
  })

  it('pagina de 10 en 10 y dice cuántas hay', async () => {
    const { w, variables } = await montar(Array.from({ length: 23 }, (_, i) => consulta(i)))
    expect(w.findAll('[data-prueba="fila-consulta"]')).toHaveLength(10)
    expect(w.text()).toContain('Mostrando 10 de 23 consultas')
    expect(variables[0]).toEqual({ pagina: 1, tamano: 10 })
    w.unmount()
  })

  it('una falla muestra el error genérico, nunca un 5xx', async () => {
    const { w } = await montar([], '/cotizacion/fuentes', { falla: true })
    expect(w.find('[role="alert"]').text()).toBe('No pudimos cargar tus consultas. Intenta nuevamente.')
    w.unmount()
  })
})

describe('W01-04b · DetalleDeFuentes', () => {
  const originalFetch = globalThis.fetch
  afterEach(() => {
    globalThis.fetch = originalFetch
    useCotizacion().reiniciar()
  })

  async function montar(ruta: string, lista: ConsultaFuentes[] = [], opciones: { falla?: boolean } = {}) {
    globalThis.fetch = bff(lista, opciones).fetchFn
    useSesion().estado.rol = 'ASESOR'
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/cotizacion/fuentes', component: { template: '<div />' } },
        { path: '/cotizacion/fuentes/:consultaId', component: DetalleDeFuentes },
        { path: '/cotizacion', component: { template: '<div />' } },
      ],
    })
    router.push(ruta)
    await router.isReady()
    const w = mount(DetalleDeFuentes, { global: { plugins: [router] } })
    await flushPromises()
    return { w, router }
  }

  it('una consulta del historial muestra su fecha, el documento enmascarado y cada fuente con su estado', async () => {
    const { w } = await montar('/cotizacion/fuentes/c-1', [consulta(1)])
    expect(w.find('[data-prueba="consulta-datos"]').text()).toContain('10••••3040')
    expect(w.text()).toContain('Open Finance')
    expect(w.text()).toContain('Open Data')
    expect(w.text()).toContain('Cuentas bancarias')
    expect(w.text()).toContain('Usando último valor cacheado')
    expect(w.text()).toContain('No disponible')
    w.unmount()
  })

  // CA-W01-06 pide «5 filas (2 Open Finance + 3 Open Data)» con su insignia y su fecha: salen de la consulta, no de la
  // última oferta en memoria.
  it('CA-W01-06: muestra las 5 filas reales (2 Open Finance + 3 Open Data) con su insignia de estado y fecha', async () => {
    const capturadoEn = '2026-09-12T10:41:00.000Z'
    const cinco = consulta(1, {
      fuentes: [
        { id: 'of-1', nombre: 'Cuentas y saldos', origen: 'OPEN_FINANCE', estado: 'OK', capturadoEn: null },
        { id: 'of-2', nombre: 'Historial crediticio', origen: 'OPEN_FINANCE', estado: 'CACHE', capturadoEn },
        { id: 'od-1', nombre: 'Catastro', origen: 'OPEN_DATA', estado: 'OK', capturadoEn: null },
        { id: 'od-2', nombre: 'Registro de propiedad', origen: 'OPEN_DATA', estado: 'OK', capturadoEn: null },
        { id: 'od-3', nombre: 'Indicadores de la zona', origen: 'OPEN_DATA', estado: 'FALLO', capturadoEn: null },
      ],
    })
    const { w } = await montar('/cotizacion/fuentes/c-1', [cinco])
    const secciones = w.findAll('section')
    expect(secciones).toHaveLength(2)
    expect(secciones[0].findAll('li')).toHaveLength(2)
    expect(secciones[1].findAll('li')).toHaveLength(3)
    expect(w.text().match(/Consultado en línea/g)).toHaveLength(3)
    expect(w.text()).toContain('Usando último valor cacheado')
    expect(w.text()).toContain('No disponible')
    expect(w.text()).toContain(formatearFecha(capturadoEn))
    w.unmount()
  })

  it('«Volver al historial» lleva a la tabla con ?lista=1, para no rebotar al detalle', async () => {
    const { w } = await montar('/cotizacion/fuentes/c-1', [consulta(1)])
    expect(w.find('a[href="/cotizacion/fuentes?lista=1"]').text()).toContain('Volver al historial')
    w.unmount()
  })

  it('una consulta ajena o inexistente muestra «No encontramos esta consulta» con camino al historial', async () => {
    const { w } = await montar('/cotizacion/fuentes/otra', [consulta(1)])
    expect(w.find('[data-prueba="consulta-no-encontrada"]').text()).toContain('No encontramos esta consulta.')
    expect(w.html()).toContain('/cotizacion/fuentes?lista=1')
    w.unmount()
  })

  it('una falla de red muestra el error genérico', async () => {
    const { w } = await montar('/cotizacion/fuentes/c-1', [consulta(1)], { falla: true })
    expect(w.find('[role="alert"]').text()).toBe('No pudimos cargar esta consulta. Intenta nuevamente.')
    w.unmount()
  })

  it('/cotizacion/fuentes/oferta sin la oferta en memoria vuelve al historial', async () => {
    useCotizacion().reiniciar()
    const { w, router } = await montar('/cotizacion/fuentes/oferta')
    expect(router.currentRoute.value.fullPath).toBe('/cotizacion/fuentes')
    w.unmount()
  })
})
