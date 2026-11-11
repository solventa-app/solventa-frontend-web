import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useAvisos, type AvisoPropuesta } from '../src/composables/useAvisos'
import { usePolizas } from '../src/composables/usePolizas'
import { useSesion } from '../src/composables/useSesion'
import DetallePoliza from '../src/views/DetallePoliza.vue'
import PolizasEmitidas from '../src/views/PolizasEmitidas.vue'
import type { Propuesta } from '../src/graphql/tipos'

function propuesta(id: string, extra: Partial<Propuesta> = {}): Propuesta {
  return {
    id,
    ofertaId: `of-${id}`,
    estado: 'EN_FIRMA',
    estadoVisible: 'EMITIENDO',
    prima: { valor: '100000', moneda: 'COP' },
    cobertura: { valor: '50000000', moneda: 'COP' },
    plazoMeses: 12,
    actualizadoEn: '2026-11-01T15:00:00Z',
    nombreTitular: 'Ana Pérez',
    ...extra,
  } as Propuesta
}

function bff(paginas: Propuesta[][], total?: number) {
  const variables: Record<string, unknown>[] = []
  const fetchFn = (async (_url: string, init: RequestInit) => {
    const cuerpo = JSON.parse(String(init.body)) as { variables: Record<string, unknown> }
    variables.push(cuerpo.variables)
    const lista = paginas[Number(cuerpo.variables.pagina ?? 1) - 1] ?? []
    return new Response(
      JSON.stringify({
        data: { propuestas: { propuestas: lista, total: total ?? paginas.flat().length, pagina: 1, tamano: 10 } },
      }),
    )
  }) as unknown as typeof fetch
  return { fetchFn, variables }
}

describe('usePolizas', () => {
  beforeEach(() => void vi.useFakeTimers())
  afterEach(() => void vi.useRealTimers())

  it('pide la página y el filtro al servidor', async () => {
    const { fetchFn, variables } = bff([[propuesta('p1')]])
    const polizas = usePolizas(fetchFn)
    await polizas.cargar()
    expect(polizas.estado.propuestas).toHaveLength(1)
    await polizas.filtrar('EMITIDA')
    expect(variables.at(-1)).toMatchObject({ estado: 'EMITIDA', pagina: 1, tamano: 10 })
  })

  it('un aviso actualiza la fila conocida sin pedir nada', async () => {
    const { fetchFn, variables } = bff([[propuesta('p1')]])
    const polizas = usePolizas(fetchFn)
    await polizas.cargar()
    polizas.aplicarAviso({ propuestaId: 'p1', estado: 'PAGO_RECHAZADO', estadoVisible: 'EMITIENDO' })
    expect(polizas.estado.propuestas[0].estado).toBe('PAGO_RECHAZADO')
    expect(variables).toHaveLength(1)
  })

  it('un aviso de una propuesta que no está en la página vuelve a consultar en silencio', async () => {
    const { fetchFn, variables } = bff([[propuesta('p1')]])
    const polizas = usePolizas(fetchFn)
    await polizas.cargar()
    polizas.aplicarAviso({ propuestaId: 'otra', estado: 'EMITIDA', estadoVisible: 'EMITIDA' })
    await vi.advanceTimersByTimeAsync(1_000)
    expect(variables).toHaveLength(2)
    expect(polizas.estado.cargando).toBe(false)
  })

  it('una falla de red muestra el error genérico, nunca el técnico', async () => {
    const polizas = usePolizas((async () => {
      throw new TypeError('red')
    }) as typeof fetch)
    await polizas.cargar()
    expect(polizas.estado.error).toBeTruthy()
    expect(polizas.estado.error).not.toMatch(/red|TypeError/)
  })

  it('una falla en silencio conserva la tabla', async () => {
    let falla = false
    const { fetchFn } = bff([[propuesta('p1')]])
    const polizas = usePolizas(((u: string, i: RequestInit) =>
      falla ? Promise.reject(new TypeError('x')) : fetchFn(u, i)) as typeof fetch)
    await polizas.cargar()
    falla = true
    await polizas.cargar({ silencioso: true })
    expect(polizas.estado.propuestas).toHaveLength(1)
    expect(polizas.estado.error).toBeNull()
  })
})

describe('useAvisos · propuesta', () => {
  it('entrega el evento propuesta a su manejador', async () => {
    const escuchas: Record<string, (e: MessageEvent<string>) => void> = {}
    const fuente = { addEventListener: (t: string, f: never) => (escuchas[t] = f), close() {}, onerror: null }
    const ticket = (async () =>
      new Response(JSON.stringify({ data: { ticketAvisos: { ticket: 't', url: 'http://a/s' } } }))) as typeof fetch
    const recibidos: AvisoPropuesta[] = []
    const avisos = useAvisos(
      null,
      ticket,
      () => fuente as unknown as EventSource,
      (a) => recibidos.push(a),
    )
    await avisos.abrir()
    const aviso = { propuestaId: 'p1', estado: 'EMITIDA' }
    escuchas.propuesta({ data: JSON.stringify(aviso) } as MessageEvent<string>)
    expect(recibidos).toEqual([aviso])
    avisos.cerrar()
  })
})

describe('G-06 · PolizasEmitidas', () => {
  const originalFetch = globalThis.fetch
  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.unstubAllGlobals()
  })

  async function montar(rol: 'ASESOR' | 'CLIENTE', lista: Propuesta[]) {
    return (await montarConRouter(rol, lista)).w
  }

  async function montarConRouter(rol: 'ASESOR' | 'CLIENTE', lista: Propuesta[], ruta = '/polizas') {
    const { fetchFn } = bff([lista])
    globalThis.fetch = ((url: string, init: RequestInit) =>
      String(url).includes('graphql') && String(init.body).includes('ticketAvisos')
        ? Promise.reject(new TypeError('sin sse'))
        : fetchFn(url, init)) as typeof fetch
    useSesion().estado.rol = rol
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/polizas', component: PolizasEmitidas },
        { path: '/polizas/:propuestaId', component: { template: '<div />' } },
        { path: '/suscripcion/:ofertaId', component: { template: '<div />' } },
      ],
    })
    router.push(ruta)
    await router.isReady()
    const w = mount(PolizasEmitidas, { global: { plugins: [router] } })
    await flushPromises()
    return { w, router }
  }

  const emitida = (id: string) =>
    propuesta(id, {
      estado: 'EMITIDA',
      estadoVisible: 'EMITIDA',
      poliza: { id: `pol-${id}`, numero: `POL-${id}`, documentoUrl: '/d' } as Propuesta['poliza'],
    })

  it('el cliente con una sola póliza emitida pasa a su detalle', async () => {
    const { w, router } = await montarConRouter('CLIENTE', [emitida('p9')])
    expect(router.currentRoute.value.fullPath).toBe('/polizas/p9')
    w.unmount()
  })

  it('el cliente con varias pólizas ve la tabla', async () => {
    const { w, router } = await montarConRouter('CLIENTE', [emitida('a'), emitida('b')])
    expect(router.currentRoute.value.fullPath).toBe('/polizas')
    expect(w.text()).toContain('POL-a')
    w.unmount()
  })

  it('el asesor con una sola póliza emitida también pasa a su detalle', async () => {
    const { w, router } = await montarConRouter('ASESOR', [emitida('p9')])
    expect(router.currentRoute.value.fullPath).toBe('/polizas/p9')
    w.unmount()
  })

  it('con ?lista=1 (el «Volver» del detalle) una sola póliza conserva la tabla', async () => {
    const { w, router } = await montarConRouter('ASESOR', [emitida('p9')], '/polizas?lista=1')
    expect(router.currentRoute.value.fullPath).toBe('/polizas?lista=1')
    expect(w.text()).toContain('POL-p9')
    w.unmount()
  })

  it('una sola póliza que aún no está emitida conserva la tabla', async () => {
    const { w, router } = await montarConRouter('ASESOR', [propuesta('p1')])
    expect(router.currentRoute.value.fullPath).toBe('/polizas')
    w.unmount()
  })

  it('tocar una fila abre el detalle, y el botón de la fila no lo abre además de su acción', async () => {
    const { w, router } = await montarConRouter('ASESOR', [emitida('a'), propuesta('b')])
    const filas = w.findAll('[data-prueba="fila-poliza"]')
    expect(filas).toHaveLength(2)
    await filas[0]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/polizas/a')
    await router.push('/polizas')
    await filas[1]!.find('a[href^="/suscripcion/"]').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/suscripcion/of-b')
    w.unmount()
  })

  it('el número de póliza es un enlace al detalle (se alcanza con el teclado)', async () => {
    const w = await montar('CLIENTE', [emitida('a'), emitida('b')])
    expect(w.find('a[href="/polizas/a"]').text()).toBe('POL-a')
    w.unmount()
  })

  it('la primera póliza que llega por aviso desde el estado vacío lleva a W03-04', async () => {
    const lista: Propuesta[] = []
    const { w, router } = await montarConRouter('CLIENTE', lista)
    expect(w.find('[data-prueba="polizas-vacio"]').exists()).toBe(true)
    lista.push(emitida('p7')) // lo que verá la consulta silenciosa que dispara el aviso
    const { aplicarAviso } = (w.vm as unknown as { $: { setupState: { aplicarAviso: (a: AvisoPropuesta) => void } } }).$
      .setupState
    vi.useFakeTimers()
    aplicarAviso({ propuestaId: 'p7', estado: 'EMITIDA', estadoVisible: 'EMITIDA' })
    await vi.advanceTimersByTimeAsync(1_500)
    vi.useRealTimers()
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/polizas/p7')
    w.unmount()
  })

  it('sin pólizas muestra el estado vacío con camino a cotizar', async () => {
    const w = await montar('CLIENTE', [])
    expect(w.find('[data-prueba="polizas-vacio"]').exists()).toBe(true)
    expect(w.text()).toContain('Cotizar ahora')
    w.unmount()
  })

  it('el asesor ve al titular y puede retomar una propuesta en curso', async () => {
    const w = await montar('ASESOR', [propuesta('p1')])
    expect(w.text()).toContain('Ana Pérez')
    expect(w.html()).toContain('/suscripcion/of-p1')
    w.unmount()
  })

  it('una póliza emitida ofrece ver el PDF y el cliente no ve al titular', async () => {
    const emitida = propuesta('p2', {
      estado: 'EMITIDA',
      estadoVisible: 'EMITIDA',
      poliza: { id: 'pol', numero: 'POL-1', documentoUrl: '/polizas/pol/documento' } as Propuesta['poliza'],
    })
    const w = await montar('CLIENTE', [emitida])
    expect(w.text()).toContain('POL-1')
    expect(w.text()).toContain('Ver PDF')
    expect(w.text()).not.toContain('Ana Pérez')
    w.unmount()
  })
})

describe('G-06b · DetallePoliza', () => {
  const originalFetch = globalThis.fetch
  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.unstubAllGlobals()
  })

  const emitida = propuesta('p1', {
    estado: 'EMITIDA',
    estadoVisible: 'EMITIDA',
    poliza: {
      id: 'pol-1',
      numero: 'POL-0001',
      estado: 'VIGENTE',
      vigenciaDesde: '2026-11-01T15:00:00Z',
      vigenciaHasta: '2027-11-01T15:00:00Z',
      documentoUrl: '/polizas/pol-1/documento',
    } as unknown as Propuesta['poliza'],
  })

  async function montar(rol: 'ASESOR' | 'CLIENTE', respuesta: Propuesta | null | 'falla', id = 'p1') {
    const consultas: unknown[] = []
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      if (String(init.body).includes('ticketAvisos')) throw new TypeError('sin sse')
      consultas.push(JSON.parse(String(init.body)).variables)
      if (respuesta === 'falla') throw new TypeError('sin red')
      return new Response(JSON.stringify({ data: { propuesta: respuesta } }))
    }) as typeof fetch
    useSesion().estado.rol = rol
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/polizas', component: { template: '<div />' } },
        { path: '/polizas/:propuestaId', component: DetallePoliza },
        { path: '/suscripcion/:ofertaId', component: { template: '<div />' } },
      ],
    })
    router.push(`/polizas/${id}`)
    await router.isReady()
    const w = mount(DetallePoliza, { global: { plugins: [router] } })
    await flushPromises()
    return { w, consultas }
  }

  it('el asesor ve el titular, la prima, la cobertura, el plazo, la vigencia y el PDF', async () => {
    const { w, consultas } = await montar('ASESOR', emitida)
    expect(consultas).toEqual([{ id: 'p1' }])
    expect(w.find('[data-prueba="detalle-numero"]').text()).toBe('POL-0001')
    expect(w.find('[data-prueba="detalle-titular"]').text()).toContain('Ana Pérez')
    expect(w.text()).toContain('12 meses')
    expect(w.find('[data-prueba="detalle-vigencia"]').exists()).toBe(true)
    expect(w.find('[data-prueba="detalle-pdf"]').exists()).toBe(true)
    expect(w.find('[data-prueba="detalle-mensaje"]').exists()).toBe(false)
    w.unmount()
  })

  it('el cliente no ve el titular', async () => {
    const { w } = await montar('CLIENTE', { ...emitida, nombreTitular: null })
    expect(w.find('[data-prueba="detalle-titular"]').exists()).toBe(false)
    expect(w.text()).not.toContain('Ana Pérez')
    w.unmount()
  })

  it('una propuesta en emisión explica el estado y no ofrece el PDF; el asesor puede retomarla', async () => {
    const enEmision = propuesta('p1', { mensajeEstado: null })
    const asesor = await montar('ASESOR', enEmision)
    expect(asesor.w.find('[data-prueba="detalle-mensaje"]').text()).toContain('Estamos emitiendo')
    expect(asesor.w.find('[data-prueba="detalle-pdf"]').exists()).toBe(false)
    expect(asesor.w.find('[data-prueba="detalle-vigencia"]').exists()).toBe(false)
    expect(asesor.w.find('[data-prueba="detalle-retomar"]').exists()).toBe(true)
    asesor.w.unmount()
    const cliente = await montar('CLIENTE', enEmision)
    expect(cliente.w.find('[data-prueba="detalle-retomar"]').exists()).toBe(false)
    cliente.w.unmount()
  })

  it('el mensaje del estado que manda el backend tiene prioridad sobre el genérico', async () => {
    const { w } = await montar(
      'CLIENTE',
      propuesta('p1', {
        estadoVisible: 'NO_EMITIDA',
        estado: 'NO_EMITIDA',
        mensajeEstado: 'Pago rechazado por el banco.',
      }),
    )
    expect(w.find('[data-prueba="detalle-mensaje"]').text()).toBe('Pago rechazado por el banco.')
    w.unmount()
  })

  it('una póliza inexistente o ajena muestra «No encontramos esta póliza» con camino a la lista', async () => {
    const { w } = await montar('CLIENTE', null)
    expect(w.find('[data-prueba="poliza-no-encontrada"]').exists()).toBe(true)
    expect(w.html()).toContain('/polizas?lista=1')
    w.unmount()
  })

  it('una falla de red muestra el error genérico, nunca el técnico', async () => {
    const { w } = await montar('ASESOR', 'falla')
    expect(w.find('[role="alert"]').text()).toBe('No pudimos cargar la póliza. Intenta nuevamente.')
    expect(w.text()).not.toContain('sin red')
    w.unmount()
  })

  it('«Volver» lleva a la tabla con ?lista=1, para no rebotar al detalle', async () => {
    const { w } = await montar('CLIENTE', emitida)
    expect(w.find('a[href="/polizas?lista=1"]').exists()).toBe(true)
    w.unmount()
  })
})

describe('W01-04 · Fuentes consultadas sin oferta en memoria', () => {
  const originalFetch = globalThis.fetch
  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  const OFERTA = {
    id: 'of-1',
    tipo: 'COMPLETA',
    cobertura: { valor: '1', moneda: 'COP' },
    fuentes: [{ id: 'f1', nombre: 'buro-credito', origen: 'OPEN_FINANCE', estado: 'OK', capturadoEn: null }],
  }

  function responder(propuestas: unknown[]) {
    globalThis.fetch = (async (_u: string, init: RequestInit) => {
      const cuerpo = String(init.body)
      if (cuerpo.includes('ticketAvisos')) throw new TypeError('sin sse')
      const datos = cuerpo.includes('ultimaPropuesta') ? { propuestas: { propuestas } } : { oferta: OFERTA }
      return new Response(JSON.stringify({ data: datos }))
    }) as typeof fetch
  }

  async function montar() {
    const { default: Detalle } = await import('../src/views/DetalleDeFuentes.vue')
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: Detalle }] })
    router.push('/')
    await router.isReady()
    const w = mount(Detalle, { global: { plugins: [router] } })
    await flushPromises()
    return w
  }

  it('carga la última oferta de la persona desde el backend', async () => {
    responder([{ id: 'p1', ofertaId: 'of-1' }])
    const w = await montar()
    expect(w.text()).toContain('Open Finance')
    w.unmount()
  })

  it('sin consultas muestra el estado vacío con «Nueva cotización»', async () => {
    responder([])
    const w = await montar()
    expect(w.find('[data-prueba="fuentes-nueva"]').exists()).toBe(true)
    expect(w.text()).toContain('Nueva cotización')
    w.unmount()
  })
})
