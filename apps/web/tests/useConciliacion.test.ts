import { http, HttpResponse } from 'msw'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { useConciliacion } from '../src/composables/useConciliacion'
import { restablecerCobrosDePrueba } from '../src/mocks/handlers'
import { servidor } from '../src/mocks/node'

// El cliente usa una URL relativa (/graphql/web); en Node se resuelve contra un origen de prueba
// (mismo patrón que tests/mocks.test.ts).
const fetchPrueba: typeof fetch = (url, init) => fetch(new URL(String(url), 'http://localhost'), init)

describe('useConciliacion', () => {
  beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }))
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

  it('reintentarCobro vuelve a cobrar un RECHAZADO, descuenta un reintento y conserva su cliente', async () => {
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
    expect(actualizado?.cliente?.nombre).toBe(rechazado!.cliente?.nombre)
    expect(estado.reintentando).toBeNull()
  })

  it('al agotar los reintentos muestra el mensaje del BFF, no uno genérico', async () => {
    const mensaje = 'Se agotaron los 3 reintentos: el cobro requiere otro medio de pago.'
    servidor.use(
      http.post('*/graphql/web', () =>
        HttpResponse.json({ data: null, errors: [{ message: mensaje, path: ['reintentarCobro'] }] }),
      ),
    )
    const { estado, reintentarCobro } = useConciliacion(fetchPrueba)

    await reintentarCobro('cobro-3')

    expect(estado.errorReintento).toBe(mensaje)
  })

  it('un error de esquema (sin path) o "Unexpected error." no se muestran crudos', async () => {
    const { estado, reintentarCobro } = useConciliacion(fetchPrueba)
    for (const error of [
      { message: "Cannot query field 'x' on type 'Cobro'." },
      { message: 'Unexpected error.', path: ['reintentarCobro'] },
    ]) {
      servidor.use(http.post('*/graphql/web', () => HttpResponse.json({ data: null, errors: [error] })))
      await reintentarCobro('cobro-3')
      expect(estado.errorReintento).toBe('No pudimos reintentar el cobro en este momento.')
    }
  })

  // MSW devuelve el objeto completo sin mirar el selection set: se inspecciona el texto enviado, porque
  // el BFF real solo devuelve lo que se pide.
  it('la query cobros y la mutation reintentarCobro piden el nombre del cliente', async () => {
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
      expect(consulta).toMatch(/cliente \{ id nombre \}/)
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
})
