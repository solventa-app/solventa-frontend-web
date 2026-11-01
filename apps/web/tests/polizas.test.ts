import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useAvisos, type AvisoPropuesta } from '../src/composables/useAvisos'
import { usePolizas } from '../src/composables/usePolizas'
import { useSesion } from '../src/composables/useSesion'
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

function bff(paginas: Propuesta[][], total = paginas.flat().length) {
  const variables: Record<string, unknown>[] = []
  const fetchFn = (async (_url: string, init: RequestInit) => {
    const cuerpo = JSON.parse(String(init.body)) as { variables: Record<string, unknown> }
    variables.push(cuerpo.variables)
    const lista = paginas[Number(cuerpo.variables.pagina ?? 1) - 1] ?? []
    return new Response(JSON.stringify({ data: { propuestas: { propuestas: lista, total, pagina: 1, tamano: 10 } } }))
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
    const { fetchFn } = bff([lista])
    globalThis.fetch = ((url: string, init: RequestInit) =>
      String(url).includes('graphql') && String(init.body).includes('ticketAvisos')
        ? Promise.reject(new TypeError('sin sse'))
        : fetchFn(url, init)) as typeof fetch
    useSesion().estado.rol = rol
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/polizas', component: PolizasEmitidas }],
    })
    router.push('/polizas')
    await router.isReady()
    const w = mount(PolizasEmitidas, { global: { plugins: [router] } })
    await flushPromises()
    return w
  }

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
