import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { buildSchema, graphql } from 'graphql'
import { http, HttpResponse } from 'msw'
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
  beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }))
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

  // Antes de esta prueba, una falla técnica/de red en `solicitarOferta` dejaba `estado.resultado`
  // sin cambios (ni Oferta ni ErrorOferta): W01-02 (ConsultandoFuentes.vue) no tenía a dónde navegar
  // y se quedaba mostrando el spinner para siempre, sin que el usuario viera ningún mensaje.
  it('una falla técnica/de red en solicitarOferta se guarda como ErrorOferta reintentable, nunca como texto crudo (CLAUDE.md regla 5)', async () => {
    servidor.use(http.post('http://localhost/graphql/web', () => new HttpResponse(null, { status: 500 })))

    const cotizacion = useCotizacion(fetchPrueba)
    llenarCaptura(cotizacion, '123')
    await cotizacion.solicitarOferta()

    expect(esErrorOferta(cotizacion.estado.resultado)).toBe(true)
    if (esErrorOferta(cotizacion.estado.resultado)) {
      expect(cotizacion.estado.resultado.puedeReintentar).toBe(true)
      expect(cotizacion.estado.resultado.mensaje).not.toMatch(/500|BFF respondio|BFF respondió|Error:/)
    }
    expect(cotizacion.estado.cargando).toBe(false)
  })

  // Antes de esta prueba, `contactarAsesor` (W01-05) no tenía ningún manejo de error: una falla
  // del BFF se propagaba sin que la pantalla mostrara ningún mensaje al usuario.
  it('contactarAsesor propaga la falla para que la pantalla pueda mostrar un mensaje seguro', async () => {
    servidor.use(http.post('http://localhost/graphql/web', () => new HttpResponse(null, { status: 500 })))

    const cotizacion = useCotizacion(fetchPrueba)

    await expect(cotizacion.contactarAsesor('LLAMAR')).rejects.toBeTruthy()
    expect(cotizacion.estado.contacto).toBeNull()
  })

  it('pide al BFF solo los campos del consentimiento del contrato desplegado (hotfix hasta el #184 del backend)', async () => {
    // A diferencia de MSW, el BFF real solo devuelve los campos pedidos. Este handler ejecuta la
    // consulta contra el contrato (contrato/schema.graphql), igual que el BFF: si la mutación no
    // pide `otorgadoEn`, la pantalla W01-04 (DetalleDeFuentes.vue) no tendría fecha que mostrar.
    const esquema = buildSchema(readFileSync(resolve(process.cwd(), '../../contrato/schema.graphql'), 'utf8'))
    const completo = {
      id: 'consentimiento-real',
      finalidad: 'perfilamiento',
      versionTexto: 'v1',
      otorgadoEn: '2026-10-17T12:00:00+00:00',
      revocadoEn: null,
      venceEn: '2026-11-16T12:00:00+00:00',
      vigente: true,
      estado: 'VIGENTE',
    }
    let variablesRecibidas: Record<string, unknown> | null = null
    servidor.use(
      http.post('*/graphql/web', async ({ request }) => {
        const { query, variables } = (await request.json()) as { query: string; variables: Record<string, unknown> }
        variablesRecibidas = variables
        const resultado = await graphql({
          schema: esquema,
          source: query,
          variableValues: variables,
          rootValue: { registrarConsentimiento: () => completo },
        })
        return HttpResponse.json(resultado)
      }),
    )
    const cotizacion = useCotizacion(fetchPrueba)
    cotizacion.captura.documentoIdentidad = '1020304050'

    const recibido = await cotizacion.registrarConsentimiento()

    // `venceEn` y `estado` no existen en el BFF desplegado: no se piden (llegan con el #184 del backend).
    expect(recibido).toEqual({
      id: completo.id,
      finalidad: completo.finalidad,
      versionTexto: completo.versionTexto,
      otorgadoEn: completo.otorgadoEn,
      revocadoEn: completo.revocadoEn,
      vigente: completo.vigente,
    })
    expect(cotizacion.estado.consentimiento?.otorgadoEn).toBe('2026-10-17T12:00:00+00:00')
    expect(variablesRecibidas).toEqual({
      entrada: {
        finalidad: 'perfilamiento',
        versionTexto: 'v1',
      },
    })
  })

  it('cuando solicitarOferta responde CONSENTIMIENTO_NO_VIGENTE, descarta el consentimiento y desmarca el checkbox', async () => {
    const cotizacion = useCotizacion(fetchPrueba)
    llenarCaptura(cotizacion, '1020304998')
    cotizacion.estado.consentimientoId = 'con-vencido'

    await cotizacion.solicitarOferta()

    expect(cotizacion.estado.consentimientoId).toBeNull()
    expect(cotizacion.estado.consentimiento).toBeNull()
    expect(cotizacion.captura.consentimiento).toBe(false)
    expect(esErrorOferta(cotizacion.estado.resultado)).toBe(true)
    if (esErrorOferta(cotizacion.estado.resultado)) {
      expect(cotizacion.estado.resultado.motivo).toBe('CONSENTIMIENTO_NO_VIGENTE')
      expect(cotizacion.estado.resultado.puedeReintentar).toBe(false)
      expect(cotizacion.estado.resultado.mensaje).toBe(
        'Tu autorización venció o fue revocada. Autoriza de nuevo para continuar.',
      )
    }
  })

  it('un 502, 503 o 504 del API Gateway se guarda como ErrorOferta reintentable con mensaje amigable (Bloque 10)', async () => {
    for (const codigo of [502, 503, 504]) {
      servidor.use(http.post('http://localhost/graphql/web', () => new HttpResponse(null, { status: codigo })))

      const cotizacion = useCotizacion(fetchPrueba)
      llenarCaptura(cotizacion, '1020304050')
      await cotizacion.solicitarOferta()

      expect(esErrorOferta(cotizacion.estado.resultado)).toBe(true)
      if (esErrorOferta(cotizacion.estado.resultado)) {
        expect(cotizacion.estado.resultado.puedeReintentar).toBe(true)
        expect(cotizacion.estado.resultado.mensaje).toBe('El servicio tardó más de lo esperado. Intenta nuevamente.')
        expect(cotizacion.estado.resultado.mensaje).not.toMatch(/502|503|504|BFF/)
      }
    }
  })
})
