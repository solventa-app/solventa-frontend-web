import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { useConciliacion } from '../src/composables/useConciliacion'
import { servidor } from '../src/mocks/node'

// El cliente usa una URL relativa (/graphql/web); en Node se resuelve contra un origen de prueba
// (mismo patrón que tests/mocks.test.ts).
const fetchPrueba: typeof fetch = (url, init) => fetch(new URL(String(url), 'http://localhost'), init)

describe('useConciliacion', () => {
  beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }))
  afterEach(() => servidor.resetHandlers())
  afterAll(() => servidor.close())

  // Composable singleton (reactive a nivel de módulo, igual que useCotizacion): se recarga la
  // lista completa al inicio de cada prueba para no arrastrar estado de la prueba anterior.
  beforeEach(async () => {
    const { cargarCobros } = useConciliacion(fetchPrueba)
    await cargarCobros()
  })

  it('carga los 5 cobros del mock', () => {
    const { estado } = useConciliacion(fetchPrueba)
    expect(estado.cobros).toHaveLength(5)
    expect(estado.cargando).toBe(false)
    expect(estado.error).toBeNull()
  })

  it('trae los 4 estados de EstadoCobro representados', () => {
    const { estado } = useConciliacion(fetchPrueba)
    const estados = new Set(estado.cobros.map((c) => c.estado))
    expect(estados).toEqual(new Set(['COBRADO', 'COBRANDO', 'RECHAZADO', 'PENDIENTE']))
  })

  it('reintentarCobro mueve un cobro RECHAZADO a COBRANDO sin tocar los demás', async () => {
    const { estado, reintentarCobro } = useConciliacion(fetchPrueba)
    const rechazado = estado.cobros.find((c) => c.estado === 'RECHAZADO')
    expect(rechazado).toBeDefined()

    const totalAntes = estado.cobros.length
    await reintentarCobro(rechazado!.id)

    expect(estado.cobros).toHaveLength(totalAntes)
    const actualizado = estado.cobros.find((c) => c.id === rechazado!.id)
    expect(actualizado?.estado).toBe('COBRANDO')
    expect(estado.reintentando).toBeNull()
  })
})
