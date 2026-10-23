import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ejecutar } from '../src/graphql/cliente'
import { servidor } from '../src/mocks/node'

const SOLICITAR = `mutation solicitarOferta($entrada: SolicitudOfertaInput!) {
  solicitarOferta(entrada: $entrada) {
    __typename
    ... on Oferta { tipo }
    ... on ErrorOferta { puedeReintentar }
  }
}`

const entrada = (documentoIdentidad: string) => ({
  entrada: {
    consentimientoId: 'consentimiento-1',
    documentoIdentidad,
    valorCredito: '250000000',
    plazoMeses: 60,
    direccionInmueble: 'Calle 1 # 2-3',
  },
})

// El cliente usa una URL relativa (/graphql/web); en Node se resuelve contra un origen de prueba.
const fetchPrueba: typeof fetch = (url, init) => fetch(new URL(String(url), 'http://localhost'), init)

describe('mocks del BFF', () => {
  beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }))
  afterAll(() => servidor.close())

  it('devuelve oferta COMPLETA por defecto', async () => {
    const r = await ejecutar<{ solicitarOferta: { tipo: string } }>(SOLICITAR, entrada('123'), fetchPrueba)
    expect(r.solicitarOferta.tipo).toBe('COMPLETA')
  })

  it('devuelve oferta PRELIMINAR con documento terminado en 999', async () => {
    const r = await ejecutar<{ solicitarOferta: { tipo: string } }>(SOLICITAR, entrada('999'), fetchPrueba)
    expect(r.solicitarOferta.tipo).toBe('PRELIMINAR')
  })

  it('devuelve ErrorOferta con reintento con documento terminado en 000', async () => {
    const r = await ejecutar<{ solicitarOferta: { puedeReintentar: boolean } }>(SOLICITAR, entrada('000'), fetchPrueba)
    expect(r.solicitarOferta.puedeReintentar).toBe(true)
  })

  it('devuelve ErrorOferta por consentimiento no vigente cuando termina en 998', async () => {
    const r = await ejecutar<{ solicitarOferta: { puedeReintentar: boolean } }>(SOLICITAR, entrada('998'), fetchPrueba)
    expect(r.solicitarOferta.puedeReintentar).toBe(false)
  })

  it('cliente GraphQL lanza ErrorGraphQL con mensaje amigable de reintento ante HTTP 502, 503 o 504', async () => {
    for (const status of [502, 503, 504]) {
      const fetchGateway: typeof fetch = async () => new Response(null, { status })
      await expect(ejecutar(SOLICITAR, entrada('123'), fetchGateway)).rejects.toThrow(
        'El servicio tardó más de lo esperado. Intenta nuevamente.',
      )
    }
  })
})
