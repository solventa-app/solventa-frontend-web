import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { esErrorOferta, esOferta, useCotizacion } from '../src/composables/useCotizacion'
import { servidor } from '../src/mocks/node'

// El cliente GraphQL usa una URL relativa (/graphql/web); en Node se resuelve contra un origen de
// prueba (mismo patrón que tests/mocks.test.ts).
const fetchPrueba: typeof fetch = (url, init) => fetch(new URL(String(url), 'http://localhost'), init)

function llenarCaptura(cotizacion: ReturnType<typeof useCotizacion>, documentoIdentidad: string) {
  cotizacion.captura.documentoIdentidad = documentoIdentidad
  cotizacion.captura.valorCredito = '185000000'
  cotizacion.captura.plazoMeses = '180'
  cotizacion.captura.direccionInmueble = 'Cra 45 # 22-18, Bogotá D.C.'
  cotizacion.captura.consentimiento = true
}

describe('useCotizacion', () => {
  beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }))
  afterEach(() => servidor.resetHandlers())
  afterAll(() => servidor.close())

  it('registra el consentimiento antes de solicitar la oferta', async () => {
    const cotizacion = useCotizacion(fetchPrueba)
    llenarCaptura(cotizacion, '123')

    await cotizacion.solicitarOferta()

    expect(cotizacion.estado.consentimientoId).toBeTruthy()
    expect(cotizacion.estado.consentimiento?.vigente).toBe(true)
  })

  it('guarda una oferta COMPLETA para un documento sin sufijo de demo', async () => {
    const cotizacion = useCotizacion(fetchPrueba)
    llenarCaptura(cotizacion, '1020304050')

    await cotizacion.solicitarOferta()

    expect(esOferta(cotizacion.estado.resultado)).toBe(true)
    if (esOferta(cotizacion.estado.resultado)) {
      expect(cotizacion.estado.resultado.tipo).toBe('COMPLETA')
      expect(cotizacion.estado.resultado.prima).not.toBeNull()
    }
  })

  it('guarda una oferta PRELIMINAR cuando el documento termina en 999', async () => {
    const cotizacion = useCotizacion(fetchPrueba)
    llenarCaptura(cotizacion, 'CC10203040999')

    await cotizacion.solicitarOferta()

    expect(esOferta(cotizacion.estado.resultado)).toBe(true)
    if (esOferta(cotizacion.estado.resultado)) {
      expect(cotizacion.estado.resultado.tipo).toBe('PRELIMINAR')
      expect(cotizacion.estado.resultado.rangoPrima).not.toBeNull()
    }
  })

  it('guarda un ErrorOferta reintentable cuando el documento termina en 000', async () => {
    const cotizacion = useCotizacion(fetchPrueba)
    llenarCaptura(cotizacion, 'CC10203040000')

    await cotizacion.solicitarOferta()

    expect(esErrorOferta(cotizacion.estado.resultado)).toBe(true)
    if (esErrorOferta(cotizacion.estado.resultado)) {
      expect(cotizacion.estado.resultado.puedeReintentar).toBe(true)
      expect(cotizacion.estado.resultado.mensaje).toBeTruthy()
    }
  })

  it('contactarAsesor guarda la confirmación real del BFF (no un texto inventado)', async () => {
    const cotizacion = useCotizacion(fetchPrueba)

    const confirmacion = await cotizacion.contactarAsesor('LLAMAR')

    expect(confirmacion.canal).toBe('LLAMAR')
    expect(confirmacion.resumen).toBeTruthy()
    expect(cotizacion.estado.contacto).toEqual(confirmacion)
  })

  it('reiniciar limpia la captura y el resultado', async () => {
    const cotizacion = useCotizacion(fetchPrueba)
    llenarCaptura(cotizacion, '123')
    await cotizacion.solicitarOferta()

    cotizacion.reiniciar()

    expect(cotizacion.captura.documentoIdentidad).toBe('')
    expect(cotizacion.estado.resultado).toBeNull()
    expect(cotizacion.estado.consentimientoId).toBeNull()
  })
})
