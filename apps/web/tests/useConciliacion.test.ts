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

  it('carga los 5 cobros del mock (los del prototipo W05-01)', () => {
    const { estado } = useConciliacion(fetchPrueba)
    expect(estado.cobros).toHaveLength(5)
    expect(estado.cargando).toBe(false)
    expect(estado.error).toBeNull()
  })

  it('trae los 4 estados de EstadoCobro representados', () => {
    const { estado } = useConciliacion(fetchPrueba)
    const estados = [...new Set(estado.cobros.map((c) => c.estado))].sort()
    expect(estados).toEqual(['COBRADO', 'COBRANDO', 'PENDIENTE', 'RECHAZADO'])
  })

  it('el cobro en COBRANDO no tiene idTransaccion todavía', () => {
    const { estado } = useConciliacion(fetchPrueba)
    const enCurso = estado.cobros.find((c) => c.estado === 'COBRANDO')
    expect(enCurso?.idTransaccion).toBeNull()
  })

  it('reintentarCobro vuelve a cobrar un RECHAZADO y le descuenta un reintento (CA-W05-02)', async () => {
    const { estado, reintentarCobro } = useConciliacion(fetchPrueba)
    const rechazado = estado.cobros.find((c) => c.estado === 'RECHAZADO')
    expect(rechazado).toBeDefined()

    const totalAntes = estado.cobros.length
    await reintentarCobro(rechazado!.id)

    expect(estado.cobros).toHaveLength(totalAntes)
    const actualizado = estado.cobros.find((c) => c.id === rechazado!.id)
    expect(actualizado?.estado).toBe('COBRADO')
    expect(actualizado?.reintentosRestantes).toBe(2)
    expect(actualizado?.idTransaccion).toBeTruthy()
    expect(actualizado?.cliente).toEqual(rechazado!.cliente)
    expect(estado.reintentando).toBeNull()
  })

  it('al agotar los reintentos muestra el mensaje del BFF, no uno genérico', async () => {
    servidor.use(
      http.post('*/graphql/web', () =>
        HttpResponse.json({
          data: null,
          errors: [{ message: 'Se agotaron los 3 reintentos: el cobro requiere otro medio de pago.', path: ['reintentarCobro'] }],
        }),
      ),
    )
    const { estado, reintentarCobro } = useConciliacion(fetchPrueba)

    await reintentarCobro('cobro-3')

    expect(estado.errorReintento).toBe('Se agotaron los 3 reintentos: el cobro requiere otro medio de pago.')
  })

  it('"Unexpected error." del BFF (falla interna enmascarada) se reemplaza por el mensaje genérico', async () => {
    servidor.use(
      http.post('*/graphql/web', () => HttpResponse.json({ data: null, errors: [{ message: 'Unexpected error.', path: ['reintentarCobro'] }] })),
    )
    const { estado, reintentarCobro } = useConciliacion(fetchPrueba)

    await reintentarCobro('cobro-3')

    expect(estado.errorReintento).toBe('No pudimos reintentar el cobro en este momento.')
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
      expect(consulta).toMatch(/\bcliente \{ id nombre \}/)
      expect(consulta).toMatch(/\bidTransaccion\b/)
      expect(consulta).toMatch(/\breintentosRestantes\b/)
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

  // Hallazgo ALTA de la revisión de QA: un reintento fallido escribía en `estado.error` (el mismo
  // campo que usa cargarCobros()), así que la vista reemplazaba toda la tabla por el mensaje de
  // error aunque la lista de cobros ya cargada seguía siendo válida. `errorReintento` es un campo
  // separado para que eso no vuelva a pasar.
  it('un reintento fallido escribe en errorReintento, no en error, y no toca la lista de cobros', async () => {
    const { estado, reintentarCobro } = useConciliacion(fetchPrueba)
    const rechazado = estado.cobros.find((c) => c.estado === 'RECHAZADO')
    expect(rechazado).toBeDefined()

    servidor.use(http.post('http://localhost/graphql/web', () => new HttpResponse(null, { status: 500 })))
    await reintentarCobro(rechazado!.id)

    expect(estado.errorReintento).toBeTruthy()
    expect(estado.errorReintento).not.toMatch(/500|BFF respondio|Error:/)
    expect(estado.error).toBeNull()
    expect(estado.reintentando).toBeNull()
    // El cobro sigue como estaba: el reintento no se confirmó.
    const siguenIguales = estado.cobros.find((c) => c.id === rechazado!.id)
    expect(siguenIguales?.estado).toBe('RECHAZADO')
  })

  it('un reintento exitoso posterior limpia un errorReintento anterior', async () => {
    const { estado, reintentarCobro } = useConciliacion(fetchPrueba)
    const rechazado = estado.cobros.find((c) => c.estado === 'RECHAZADO')
    expect(rechazado).toBeDefined()

    servidor.use(http.post('http://localhost/graphql/web', () => new HttpResponse(null, { status: 500 })))
    await reintentarCobro(rechazado!.id)
    expect(estado.errorReintento).toBeTruthy()

    servidor.resetHandlers()
    await reintentarCobro(rechazado!.id)
    expect(estado.errorReintento).toBeNull()
  })

  it('un error de validación del esquema (sin path) no se muestra crudo', async () => {
    servidor.use(
      http.post('*/graphql/web', () =>
        HttpResponse.json({ data: null, errors: [{ message: "Cannot query field 'x' on type 'Cobro'." }] }),
      ),
    )
    const { cargarCobros, estado } = useConciliacion(fetchPrueba)

    await cargarCobros()

    expect(estado.error).toBe('No pudimos cargar la conciliación de pagos en este momento.')
  })
})
