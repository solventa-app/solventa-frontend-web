import { http, HttpResponse } from 'msw'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { useConciliacion } from '../src/composables/useConciliacion'
import { restablecerCobrosDePrueba } from '../src/mocks/handlers'
import { servidor } from '../src/mocks/node'

// El cliente usa una URL relativa (/graphql/web); en Node se resuelve contra un origen de prueba
// (mismo patrón que tests/mocks.test.ts).
const fetchPrueba: typeof fetch = (url, init) => fetch(new URL(String(url), 'http://localhost'), init)

describe('useConciliacion', () => {
  beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }))
  afterEach(() => servidor.resetHandlers())
  afterAll(() => servidor.close())

  // Composable singleton (reactive a nivel de módulo, igual que useCotizacion): se reinicia el
  // mock y se recarga la lista completa al inicio de cada prueba para no arrastrar estado de la
  // prueba anterior (reintentarCobro muta `cobros` en el sitio, ver mocks/handlers.ts).
  beforeEach(async () => {
    restablecerCobrosDePrueba()
    const { cargarCobros } = useConciliacion(fetchPrueba)
    await cargarCobros()
  })

  it('carga los 4 cobros del mock', () => {
    const { estado } = useConciliacion(fetchPrueba)
    expect(estado.cobros).toHaveLength(4)
    expect(estado.cargando).toBe(false)
    expect(estado.error).toBeNull()
  })

  it('trae los 4 estados de EstadoCobro representados, uno cada uno', () => {
    const { estado } = useConciliacion(fetchPrueba)
    const estados = estado.cobros.map((c) => c.estado).sort()
    expect(estados).toEqual(['COBRADO', 'COBRANDO', 'PENDIENTE', 'RECHAZADO'])
  })

  it('el cobro en COBRANDO no tiene idTransaccion todavía', () => {
    const { estado } = useConciliacion(fetchPrueba)
    const enCurso = estado.cobros.find((c) => c.estado === 'COBRANDO')
    expect(enCurso?.idTransaccion).toBeNull()
  })

  it('reintentarCobro mueve un cobro RECHAZADO a COBRANDO y limpia su idTransaccion', async () => {
    const { estado, reintentarCobro } = useConciliacion(fetchPrueba)
    const rechazado = estado.cobros.find((c) => c.estado === 'RECHAZADO')
    expect(rechazado).toBeDefined()

    const totalAntes = estado.cobros.length
    await reintentarCobro(rechazado!.id)

    expect(estado.cobros).toHaveLength(totalAntes)
    const actualizado = estado.cobros.find((c) => c.id === rechazado!.id)
    expect(actualizado?.estado).toBe('COBRANDO')
    expect(actualizado?.idTransaccion).toBeNull()
    expect(actualizado?.cliente).toBe(rechazado!.cliente)
    expect(estado.reintentando).toBeNull()
  })

  // QA independiente encontro que las queries no pedian cliente/idTransaccion: el mock de MSW
  // ignora el selection set y devuelve igual el objeto completo, asi que el bug pasaba en verde
  // hasta aqui. Esta prueba inspecciona el texto real de la query/mutation enviada (no la
  // respuesta) para que una regresion futura si falle.
  it('la query cobros y la mutation reintentarCobro piden cliente e idTransaccion', async () => {
    let consultaCobros = ''
    let consultaReintentar = ''
    const fetchQueCaptura: typeof fetch = async (url, init) => {
      const cuerpo = JSON.parse(String(init?.body)) as { query: string }
      if (cuerpo.query.includes('reintentarCobro(')) consultaReintentar = cuerpo.query
      else consultaCobros = cuerpo.query
      return fetchPrueba(url, init)
    }

    const { cargarCobros, reintentarCobro, estado } = useConciliacion(fetchQueCaptura)
    await cargarCobros()
    const rechazado = estado.cobros.find((c) => c.estado === 'RECHAZADO')
    await reintentarCobro(rechazado!.id)

    for (const consulta of [consultaCobros, consultaReintentar]) {
      expect(consulta).toMatch(/\bcliente\b/)
      expect(consulta).toMatch(/\bidTransaccion\b/)
    }
  })

  it('un error del BFF nunca llega como texto tecnico/5xx crudo (CLAUDE.md regla 5)', async () => {
    servidor.use(http.post('http://localhost/graphql/web', () => new HttpResponse(null, { status: 500 })))

    const { cargarCobros, estado } = useConciliacion(fetchPrueba)
    await cargarCobros()

    expect(estado.error).toBeTruthy()
    expect(estado.error).not.toMatch(/500|BFF respondio|Error:/)
    expect(estado.cargando).toBe(false)
  })
})
