import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import { SILENCIO_MAXIMO_MS, useAvisos, type AvisoCobro } from '../src/composables/useAvisos'
import { useConciliacion } from '../src/composables/useConciliacion'
import type { Cobro } from '../src/graphql/tipos'

class FuenteFalsa {
  onerror: (() => void) | null = null
  cerrada = false
  escuchas: Record<string, (evento: MessageEvent<string>) => void> = {}
  constructor(public url: string) {}
  addEventListener(tipo: string, escucha: (evento: MessageEvent<string>) => void) {
    this.escuchas[tipo] = escucha
  }
  close() {
    this.cerrada = true
  }
  emitir(aviso: AvisoCobro) {
    this.escuchas.cobro({ data: JSON.stringify(aviso) } as MessageEvent<string>)
  }
}

const TICKET = { data: { ticketAvisos: { ticket: 'a b', url: 'http://avisos/stream' } } }
const conTicket = (async () => new Response(JSON.stringify(TICKET))) as typeof fetch
const AVISO: AvisoCobro = { cobroId: 'c-1', polizaId: 'p-1', estado: 'COBRADO' }

function preparar(fetchFn = conTicket) {
  const fuentes: FuenteFalsa[] = []
  const recibidos: AvisoCobro[] = []
  const crear = (url: string) => {
    const fuente = new FuenteFalsa(url)
    fuentes.push(fuente)
    return fuente as unknown as EventSource
  }
  return { fuentes, recibidos, avisos: useAvisos((a) => recibidos.push(a), fetchFn, crear) }
}

describe('useAvisos', () => {
  beforeEach(() => void vi.useFakeTimers())
  afterEach(() => void vi.useRealTimers())

  it('abre con el ticket en la URL y entrega los avisos de cobro', async () => {
    const { fuentes, recibidos, avisos } = preparar()
    await avisos.abrir()

    expect(fuentes[0].url).toBe('http://avisos/stream?ticket=a%20b')
    fuentes[0].emitir(AVISO)
    expect(recibidos).toEqual([AVISO])
  })

  it('un ticket que falla no rompe la pantalla ni abre nada', async () => {
    const { fuentes, avisos } = preparar((async () => {
      throw new TypeError('red')
    }) as typeof fetch)

    await expect(avisos.abrir()).resolves.toBeUndefined()
    expect(fuentes).toHaveLength(0)
  })

  it('cierra tras 15 min sin eventos y un evento reinicia la cuenta', async () => {
    const { fuentes, avisos } = preparar()
    await avisos.abrir()

    vi.advanceTimersByTime(SILENCIO_MAXIMO_MS - 1)
    fuentes[0].emitir(AVISO)
    vi.advanceTimersByTime(SILENCIO_MAXIMO_MS - 1)
    expect(fuentes[0].cerrada).toBe(false)

    vi.advanceTimersByTime(1)
    expect(fuentes[0].cerrada).toBe(true)
  })

  it('un error cierra el stream en vez de reconectar con un ticket usado', async () => {
    const { fuentes, avisos } = preparar()
    await avisos.abrir()

    fuentes[0].onerror?.()

    expect(fuentes[0].cerrada).toBe(true)
  })

  it('cerrar mientras se pide el ticket no deja un stream abierto', async () => {
    const { fuentes, avisos } = preparar()
    const abriendo = avisos.abrir()
    avisos.cerrar()
    await abriendo

    expect(fuentes).toHaveLength(0)
  })
})

describe('aplicarAviso', () => {
  const cobro = (id: string) => ({ id, estado: 'PENDIENTE', actualizadoEn: '' }) as Cobro
  const fetchFalso = vi.fn(
    async () => new Response(JSON.stringify({ data: { cobros: [cobro('c-1'), cobro('c-2')] } })),
  ) as unknown as typeof fetch

  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(fetchFalso).mockClear()
    useConciliacion(fetchFalso).estado.cobros = reactive([cobro('c-1'), cobro('c-2')])
  })
  afterEach(() => void vi.useRealTimers())

  it('un estado intermedio cambia solo su fila y no consulta', () => {
    const { estado, aplicarAviso } = useConciliacion(fetchFalso)

    aplicarAviso({ ...AVISO, estado: 'COBRANDO' })
    vi.advanceTimersByTime(5_000)

    expect(estado.cobros.map((c) => c.estado)).toEqual(['COBRANDO', 'PENDIENTE'])
    expect(fetchFalso).not.toHaveBeenCalled()
  })

  it('varios avisos finales o de cobros nuevos consultan una sola vez', () => {
    const { aplicarAviso } = useConciliacion(fetchFalso)

    aplicarAviso(AVISO)
    aplicarAviso({ ...AVISO, cobroId: 'recurrente-nuevo', estado: 'COBRANDO' })
    vi.advanceTimersByTime(1_000)

    expect(fetchFalso).toHaveBeenCalledTimes(1)
  })
})
