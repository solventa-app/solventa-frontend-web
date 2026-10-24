import { graphql } from 'msw/graphql'
import { HttpResponse } from 'msw'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { usarToken } from '../src/graphql/cliente'
import {
  esErrorSiniestro,
  esSiniestro,
  reiniciarEstadoSiniestros,
  useSiniestros,
} from '../src/composables/useSiniestros'
import { MENSAJES_SINIESTROS, restablecerSiniestrosDePrueba } from '../src/mocks/siniestros'
import { servidor } from '../src/mocks/node'

const fetchPrueba: typeof fetch = (url, init) => fetch(new URL(String(url), 'http://localhost'), init)
const dummy = graphql.link('*/graphql/siniestros')

describe('useSiniestros', () => {
  beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }))
  afterEach(() => {
    servidor.resetHandlers()
    usarToken(null)
  })
  afterAll(() => servidor.close())
  beforeEach(() => {
    restablecerSiniestrosDePrueba()
    reiniciarEstadoSiniestros()
  })

  it('carga la bandeja con los 4 estados, la más reciente primero', async () => {
    const { estado, cargarSiniestros } = useSiniestros(fetchPrueba)
    await cargarSiniestros()
    expect(estado.error).toBeNull()
    expect(estado.cargando).toBe(false)
    expect(estado.siniestros.map((s) => s.estado).sort()).toEqual(['APROBADO', 'EN_REVISION', 'PENDIENTE', 'RECHAZADO'])
    expect(estado.siniestros[0].id).toBe('sin-04')
  })

  it('filtra la bandeja por estado', async () => {
    const { estado, cargarSiniestros } = useSiniestros(fetchPrueba)
    await cargarSiniestros('PENDIENTE')
    expect(estado.siniestros.map((s) => s.id)).toEqual(['sin-01'])
  })

  it('llama a /graphql/siniestros sin Authorization aunque haya sesión', async () => {
    usarToken('jwt-de-prueba')
    const espia = vi.fn(fetchPrueba)
    await useSiniestros(espia).cargarSiniestros()
    const [url, init] = espia.mock.calls[0]
    expect(String(url)).toBe('/graphql/siniestros')
    expect((init?.headers as Record<string, string>).Authorization).toBeUndefined()
  })

  it('carga el detalle con evidencias, póliza y resolución', async () => {
    const { estado, cargarSiniestro } = useSiniestros(fetchPrueba)
    await cargarSiniestro('sin-02')
    expect(estado.noEncontrado).toBe(false)
    expect(estado.detalle?.radicado).toBe('SIN-2026-0142')
    expect(estado.detalle?.evidencias[0].url).toBe('/graphql/siniestros/medios/sin-02-foto-1.jpg')
    expect(estado.detalle?.resolucion?.perito?.id).toBe('per-01')
  })

  it('un id inexistente queda como "no encontrado", no como error', async () => {
    const { estado, cargarSiniestro } = useSiniestros(fetchPrueba)
    await cargarSiniestro('sin-99')
    expect(estado.detalle).toBeNull()
    expect(estado.noEncontrado).toBe(true)
    expect(estado.errorDetalle).toBeNull()
  })

  it('carga los peritos con su vencimiento de informe', async () => {
    const { estado, cargarPeritos } = useSiniestros(fetchPrueba)
    await cargarPeritos('sin-01')
    expect(estado.peritos.map((p) => p.id)).toEqual(['per-01', 'per-02'])
    expect(estado.peritos[0].vencimientoInforme).toBeTruthy()
  })

  it('aprobar deja el siniestro APROBADO y guarda el resultado para la confirmación', async () => {
    const { estado, cargarSiniestros, aprobar } = useSiniestros(fetchPrueba)
    await cargarSiniestros()
    const r = await aprobar('sin-01')
    expect(r?.estado).toBe('APROBADO')
    expect(esSiniestro(estado.resultado)).toBe(true)
    expect(estado.siniestros.find((s) => s.id === 'sin-01')?.estado).toBe('APROBADO')
    expect(estado.errorAccion).toBeNull()
  })

  it('aprobar uno ya resuelto devuelve el mensaje de negocio', async () => {
    const { estado, aprobar } = useSiniestros(fetchPrueba)
    expect(await aprobar('sin-03')).toBeNull()
    expect(esErrorSiniestro(estado.resultado)).toBe(true)
    expect(estado.errorAccion).toBe(MENSAJES_SINIESTROS.yaResuelto)
  })

  it('rechazar guarda motivo y comentario', async () => {
    const { estado, rechazar } = useSiniestros(fetchPrueba)
    const r = await rechazar('sin-01', 'EVIDENCIA_INSUFICIENTE', 'Fotos borrosas')
    expect(r?.estado).toBe('RECHAZADO')
    expect(r?.resolucion?.motivo).toBe('EVIDENCIA_INSUFICIENTE')
    expect(r?.resolucion?.comentario).toBe('Fotos borrosas')
    expect(estado.errorAccion).toBeNull()
  })

  it('rechazar con un comentario de más de 500 caracteres devuelve el mensaje de negocio', async () => {
    const { estado, rechazar } = useSiniestros(fetchPrueba)
    expect(await rechazar('sin-01', 'OTRO', 'x'.repeat(501))).toBeNull()
    expect(estado.errorAccion).toBe(MENSAJES_SINIESTROS.textoLargo)
  })

  it('derivar deja el siniestro EN_REVISION con el perito en la resolución', async () => {
    const { estado, cargarSiniestro, derivar } = useSiniestros(fetchPrueba)
    await cargarSiniestro('sin-01')
    const r = await derivar('sin-01', 'per-02', 'Revisar chasis')
    expect(r?.estado).toBe('EN_REVISION')
    expect(r?.resolucion?.tipo).toBe('DERIVACION')
    expect(r?.resolucion?.perito?.id).toBe('per-02')
    expect(estado.detalle?.resolucion?.instrucciones).toBe('Revisar chasis')
  })

  it('derivar uno que ya tiene perito o a un perito inexistente devuelve el mensaje de negocio', async () => {
    const { estado, derivar } = useSiniestros(fetchPrueba)
    expect(await derivar('sin-02', 'per-02')).toBeNull()
    expect(estado.errorAccion).toBe(MENSAJES_SINIESTROS.yaDerivado)
    expect(await derivar('sin-01', 'per-99')).toBeNull()
    expect(estado.errorAccion).toBe(MENSAJES_SINIESTROS.perito)
  })

  it('una falla técnica (5xx) da mensajes seguros, nunca el error crudo', async () => {
    servidor.use(
      dummy.query('siniestros', () => new HttpResponse(null, { status: 500 })),
      dummy.query('siniestro', () => new HttpResponse(null, { status: 503 })),
      dummy.query('peritos', () => HttpResponse.json({ errors: [{ message: 'Unexpected error.' }] })),
      dummy.mutation('aprobarSiniestro', () => new HttpResponse(null, { status: 500 })),
    )
    const { estado, cargarSiniestros, cargarSiniestro, cargarPeritos, aprobar } = useSiniestros(fetchPrueba)
    await cargarSiniestros()
    await cargarSiniestro('sin-01')
    await cargarPeritos('sin-01')
    await aprobar('sin-01')
    expect(estado.error).toBe('No pudimos cargar los siniestros en este momento.')
    expect(estado.errorDetalle).toBe('No pudimos cargar el siniestro en este momento.')
    expect(estado.noEncontrado).toBe(false)
    expect(estado.errorPeritos).toBe('No pudimos cargar los peritos disponibles en este momento.')
    expect(estado.errorAccion).toBe('No pudimos registrar la decisión en este momento. Intenta nuevamente.')
    for (const m of [estado.error, estado.errorDetalle, estado.errorPeritos, estado.errorAccion]) {
      expect(m).not.toMatch(/500|503|BFF|Unexpected/)
    }
  })
})
