// Avisos en vivo del servicio `avisos` por SSE (W03-37, W05-A6). `EventSource` no manda cabeceras: se pide un ticket de
// un solo uso por GraphQL y va en la URL. Sin datos personales. Si el ticket falla o el stream se cae, la pantalla sigue
// con lo que tiene: la consulta al reabrir es la que la pone al día.
import { ejecutar } from '../graphql/cliente'
import type { EstadoCobro, TicketAvisos } from '../graphql/tipos'

const TICKET = `query ticketAvisos { ticketAvisos { ticket url } }`

/** Sin eventos en este tiempo se cierra la conexión: no vale la pena sostenerla. */
export const SILENCIO_MAXIMO_MS = 15 * 60_000

export interface AvisoCobro {
  cobroId: string
  polizaId: string
  estado: EstadoCobro
}

type CrearFuente = (url: string) => EventSource

export function useAvisos(
  alCobro: (aviso: AvisoCobro) => void,
  fetchFn: typeof fetch = fetch,
  crearFuente: CrearFuente = (url) => new EventSource(url),
) {
  let fuente: EventSource | null = null
  let silencio: ReturnType<typeof setTimeout> | undefined
  // Cada apertura invalida a la anterior: un `cerrar` mientras se pide el ticket no debe dejar un stream abierto.
  let apertura = 0

  function vigilarSilencio() {
    clearTimeout(silencio)
    silencio = setTimeout(cerrar, SILENCIO_MAXIMO_MS)
  }

  function cerrar() {
    apertura++
    clearTimeout(silencio)
    fuente?.close()
    fuente = null
  }

  async function abrir() {
    cerrar()
    const estaApertura = apertura
    try {
      const { ticketAvisos } = await ejecutar<{ ticketAvisos: TicketAvisos }>(TICKET, {}, fetchFn)
      if (estaApertura !== apertura) return
      fuente = crearFuente(`${ticketAvisos.url}?ticket=${encodeURIComponent(ticketAvisos.ticket)}`)
    } catch {
      return
    }
    fuente.addEventListener('cobro', (evento) => {
      vigilarSilencio()
      alCobro(JSON.parse((evento as MessageEvent<string>).data) as AvisoCobro)
    })
    // El ticket no sirve dos veces, así que la reconexión automática del navegador fallaría.
    fuente.onerror = cerrar
    vigilarSilencio()
  }

  return { abrir, cerrar }
}
