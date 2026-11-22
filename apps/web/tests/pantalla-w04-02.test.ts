import { HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import DetalleSiniestro from '../src/views/DetalleSiniestro.vue'
import Boton from '../src/components/ui/Boton.vue'
import { reiniciarEstadoSiniestros, useSiniestros } from '../src/composables/useSiniestros'
import { restablecerSiniestrosDePrueba } from '../src/mocks/siniestros'
import { servidor } from '../src/mocks/node'
import type { Siniestro, TipoSiniestroAuto } from '../src/graphql/tipos'
import { cambiarIdioma } from '../src/i18n'
import { cambiarMoneda } from '../src/composables/useMoneda'

const bff = graphql.link('*/v1/graphql/web')

function crearRouterDePrueba(): Router {
  const vacio = (id: string) => ({ template: `<div data-pantalla="${id}" />` })
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/operador', component: vacio('G-02b') },
      { path: '/operador/siniestros', component: vacio('W04-01') },
      { path: '/operador/siniestros/:id', component: DetalleSiniestro },
      { path: '/operador/siniestros/:id/derivar', component: vacio('W04-02b') },
      { path: '/operador/siniestros/:id/aprobado', component: vacio('W04-03a') },
    ],
  })
}

const wrappers: VueWrapper[] = []
async function montar(id = 'sin-01') {
  const router = crearRouterDePrueba()
  router.push(`/operador/siniestros/${id}`)
  await router.isReady()
  const wrapper = mount(DetalleSiniestro, { global: { plugins: [router] } }) as VueWrapper
  wrappers.push(wrapper)
  await vi.waitFor(() => expect(useSiniestros().estado.cargandoDetalle).toBe(false))
  await flushPromises()
  return { wrapper, router }
}

/** W04-02 de un siniestro de auto (KAN-290): parte de sin-01 y le pone el tipo y la moneda de la póliza. */
async function montarSiniestroDeAuto(tipo: TipoSiniestroAuto = 'CHOQUE_PARCIAL', moneda = 'COP') {
  await montar()
  const dato = JSON.parse(JSON.stringify(useSiniestros().estado.detalle)) as Siniestro
  dato.tipoSiniestroAuto = tipo
  dato.sumaReclamada = { ...dato.sumaReclamada, moneda }
  servidor.use(bff.query('siniestro', () => HttpResponse.json({ data: { siniestro: dato } })))
  return montar()
}

describe('HU-W04 · W04-02 Detalle del siniestro', () => {
  beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }))
  beforeEach(() => {
    reiniciarEstadoSiniestros()
    restablecerSiniestrosDePrueba()
  })
  afterEach(() => {
    cambiarIdioma('ES')
    wrappers.forEach((w) => w.unmount())
    wrappers.length = 0
    servidor.resetHandlers()
    vi.useRealTimers()
  })
  afterAll(() => servidor.close())

  it('marca la pantalla, migas "Inicio › Siniestros › Detalle #radicado" y h1 sr-only', async () => {
    const { wrapper } = await montar()
    expect(wrapper.find('[data-pantalla="W04-02"]').exists()).toBe(true)
    expect(wrapper.get('nav [aria-current="page"]').text()).toBe('Detalle #SIN-2026-0141')
    expect(wrapper.get('nav a[href="/operador/siniestros"]').text()).toBe('Siniestros')
    expect(wrapper.get('h1').text()).toBe('Siniestro #SIN-2026-0141')
    expect(wrapper.text()).toContain('Operador de back-office activo')
  })

  it('tarjeta de datos con asegurado, póliza SOL-…, coordenadas, suma e insignia', async () => {
    const { wrapper } = await montar()
    const datos = wrapper.get('[data-prueba="datos"]').text()
    expect(datos).toContain('Asegurado de prueba 1')
    expect(datos).toContain('SOL-2026-048211')
    expect(datos).toContain('Calle 80, puente de Guadua, Bogotá')
    expect(datos).toContain('Lat: 4.7236, Lon: -74.1215')
    expect(datos).toContain('Banco Aliado S.A.')
    expect(wrapper.get('[data-prueba="suma"]').text()).toMatch(/\$\s8\.650\.000/)
    expect(wrapper.text()).toContain('!Pendiente de dictamen')
  })

  it('galería: cuenta las evidencias, geoetiqueta solo en la foto, documento con object-contain', async () => {
    const { wrapper } = await montar()
    expect(wrapper.text()).toContain('2 archivos verificados')
    const [foto, doc] = wrapper.findAll('[data-prueba="evidencia"]')
    expect(foto.text()).toContain('Geoetiquetada')
    expect(foto.get('img').classes()).toContain('object-cover')
    expect(foto.text()).toContain('· 4.7236, -74.1215 · tomada en sitio')
    expect(doc.text()).not.toContain('Geoetiquetada')
    expect(doc.get('img').classes()).toContain('object-contain')
    expect(doc.get('a').attributes('target')).toBe('_blank')
    expect(doc.get('a').attributes('aria-label')).toBe('Abrir Factura de reparación del taller en una pestaña nueva')
  })

  it('imagen fallida → "Imagen no disponible", conserva título y etiqueta, sin enlace', async () => {
    const { wrapper } = await montar()
    const foto = wrapper.findAll('[data-prueba="evidencia"]')[0]
    // El mock devuelve la misma URL al renovar: no hay nada nuevo que intentar.
    await foto.get('img').trigger('error')
    await flushPromises()
    const tras = wrapper.findAll('[data-prueba="evidencia"]')[0]
    expect(tras.text()).toContain('Imagen no disponible')
    expect(tras.find('img').exists()).toBe(false)
    expect(tras.find('a').exists()).toBe(false)
    expect(tras.text()).toContain('Foto: daño frontal del vehículo')
    expect(tras.text()).toContain('sin-01-foto-1.jpg')
  })

  describe('URL firmada de la evidencia vencida (ajuste 10)', () => {
    /** El BFF firma una URL nueva en cada consulta del caso, como el almacenamiento real. */
    function firmarEnCadaConsulta() {
      let consultas = 0
      const base = JSON.parse(JSON.stringify(useSiniestros().estado.detalle)) as Siniestro
      servidor.use(
        bff.query('siniestro', () => {
          consultas += 1
          const dato = JSON.parse(JSON.stringify(base)) as Siniestro
          dato.evidencias = dato.evidencias.map((e) => ({ ...e, url: `${e.url}?firma=${consultas}` }))
          return HttpResponse.json({ data: { siniestro: dato } })
        }),
      )
      return () => consultas
    }

    it('una imagen que falla pide URLs nuevas y se vuelve a mostrar, sin recargar la pantalla', async () => {
      const { wrapper } = await montar()
      const consultas = firmarEnCadaConsulta()
      const foto = () => wrapper.findAll('[data-prueba="evidencia"]')[0]
      await foto().get('img').trigger('error')
      await flushPromises()
      expect(consultas()).toBe(1)
      expect(foto().get('img').attributes('src')).toMatch(/\?firma=1$/)
      expect(foto().text()).not.toContain('Imagen no disponible')
      expect(wrapper.find('[data-pantalla="W04-02"]').exists()).toBe(true)
    })

    it('si la URL nueva también falla → "Imagen no disponible" (una sola renovación)', async () => {
      const { wrapper } = await montar()
      const consultas = firmarEnCadaConsulta()
      const foto = () => wrapper.findAll('[data-prueba="evidencia"]')[0]
      await foto().get('img').trigger('error')
      await flushPromises()
      await foto().get('img').trigger('error')
      await flushPromises()
      expect(consultas()).toBe(1)
      expect(foto().text()).toContain('Imagen no disponible')
    })

    it('otra evidencia también se renueva una vez, y al cargar bien puede renovarse de nuevo', async () => {
      const { wrapper } = await montar()
      const consultas = firmarEnCadaConsulta()
      const evidencia = (i: number) => wrapper.findAll('[data-prueba="evidencia"]')[i]
      await evidencia(0).get('img').trigger('error')
      await flushPromises()
      await evidencia(1).get('img').trigger('error')
      await flushPromises()
      expect(consultas()).toBe(2)
      expect(evidencia(1).text()).not.toContain('Imagen no disponible')
      // Cargó bien con la URL nueva y vuelve a vencer más tarde: se renueva otra vez.
      await evidencia(0).get('img').trigger('load')
      await evidencia(0).get('img').trigger('error')
      await flushPromises()
      expect(consultas()).toBe(3)
      expect(evidencia(0).text()).not.toContain('Imagen no disponible')
    })

    it('varias imágenes que fallan a la vez hacen una sola consulta', async () => {
      const { wrapper } = await montar()
      const consultas = firmarEnCadaConsulta()
      const [a, b] = wrapper.findAll('[data-prueba="evidencia"]')
      await Promise.all([a.get('img').trigger('error'), b.get('img').trigger('error')])
      await flushPromises()
      expect(consultas()).toBe(1)
    })

    it('el enlace abre la URL tal cual mientras está vigente', async () => {
      const { wrapper } = await montar()
      const abrir = vi.spyOn(window, 'open').mockImplementation(() => null)
      const enlace = wrapper.findAll('[data-prueba="evidencia"]')[0].get('a')
      const evento = new MouseEvent('click', { cancelable: true })
      enlace.element.dispatchEvent(evento)
      await flushPromises()
      expect(evento.defaultPrevented).toBe(false)
      expect(abrir).not.toHaveBeenCalled()
      abrir.mockRestore()
    })

    it('pasados 4 min, el enlace renueva antes de abrir y nunca lleva a una URL vencida', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const { wrapper } = await montar()
      const consultas = firmarEnCadaConsulta()
      const pestana = { opener: {} as unknown, location: { href: '' }, close: vi.fn() }
      const abrir = vi.spyOn(window, 'open').mockImplementation(() => pestana as unknown as Window)
      vi.setSystemTime(Date.now() + 4 * 60_000 + 1_000)
      const enlace = wrapper.findAll('[data-prueba="evidencia"]')[0].get('a')
      const evento = new MouseEvent('click', { cancelable: true })
      enlace.element.dispatchEvent(evento)
      await flushPromises()
      expect(evento.defaultPrevented).toBe(true)
      expect(abrir).toHaveBeenCalledWith('', '_blank')
      expect(pestana.opener).toBeNull()
      await vi.waitFor(() => expect(pestana.location.href).toMatch(/sin-01-foto-1\.jpg\?firma=1$/))
      expect(consultas()).toBe(1)
      abrir.mockRestore()
    })

    it('si no se pudo renovar al abrir, cierra la pestaña y muestra "Imagen no disponible"', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      const { wrapper } = await montar()
      servidor.use(bff.query('siniestro', () => HttpResponse.json({ errors: [{ message: 'x' }] })))
      const pestana = { opener: {} as unknown, location: { href: '' }, close: vi.fn() }
      const abrir = vi.spyOn(window, 'open').mockImplementation(() => pestana as unknown as Window)
      vi.setSystemTime(Date.now() + 5 * 60_000)
      wrapper
        .findAll('[data-prueba="evidencia"]')[0]
        .get('a')
        .element.dispatchEvent(new MouseEvent('click', { cancelable: true }))
      await vi.waitFor(() => expect(pestana.close).toHaveBeenCalled())
      expect(pestana.location.href).toBe('')
      expect(wrapper.findAll('[data-prueba="evidencia"]')[0].text()).toContain('Imagen no disponible')
      abrir.mockRestore()
    })

    it('al cambiar de siniestro se olvidan las renovaciones', async () => {
      const { wrapper, router } = await montar()
      const consultas = firmarEnCadaConsulta()
      await wrapper.findAll('[data-prueba="evidencia"]')[0].get('img').trigger('error')
      await flushPromises()
      expect(consultas()).toBe(1)
      const listo = async () => {
        await vi.waitFor(() => expect(useSiniestros().estado.cargandoDetalle).toBe(false))
        await flushPromises()
      }
      await router.push('/operador/siniestros/sin-02')
      await listo()
      await router.push('/operador/siniestros/sin-01')
      await listo()
      const antes = consultas()
      await wrapper.findAll('[data-prueba="evidencia"]')[0].get('img').trigger('error')
      await flushPromises()
      expect(consultas()).toBe(antes + 1)
    })
  })

  it('verificación que no cumple: ícono y texto "No cumple" (no solo color)', async () => {
    const { wrapper } = await montar('sin-04')
    const items = wrapper.get('[data-prueba="verificaciones"]').findAll('li')
    expect(items[0].text()).toContain('Cumple:')
    expect(items[2].text()).toContain('No cumple:')
    expect(items[2].text()).toContain('· No cumple')
  })

  it('tiempo restante "{h} h {m} min" que se recalcula y pasa a "Vencido"', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] })
    const { wrapper } = await montar()
    const { estado } = useSiniestros()
    estado.detalle!.venceDictamenEn = new Date(Date.now() + (2 * 60 + 5) * 60_000 + 30_000).toISOString()
    await flushPromises()
    const caja = () => wrapper.get('[data-prueba="tiempo-restante"]')
    expect(caja().get('time').text()).toBe('2 h 5 min')
    vi.advanceTimersByTime(60_000)
    await flushPromises()
    expect(caja().get('time').text()).toBe('2 h 4 min')
    vi.advanceTimersByTime(3 * 3_600_000)
    await flushPromises()
    expect(caja().get('time').text()).toBe('Vencido')
    expect(caja().classes()).toContain('border-error')
  })

  // QA 2026-11-10 (Q-03): al llegar a cero el caso cambiaba en CLAIMS, pero la pantalla se quedaba en «Vencido».
  it('al vencer sigue pidiendo el caso en silencio y muestra la aprobación automática sin recargar', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'] })
    const { wrapper } = await montar()
    const { estado } = useSiniestros()
    const original = JSON.parse(JSON.stringify(estado.detalle))
    let aprobado = false
    servidor.use(
      bff.query('siniestro', () =>
        HttpResponse.json({
          data: {
            siniestro: aprobado
              ? {
                  ...original,
                  estado: 'APROBADO',
                  resolucion: {
                    ...(original.resolucion ?? {}),
                    tipo: 'APROBACION',
                    automatica: true,
                    resueltaEn: new Date().toISOString(),
                  },
                }
              : { ...original, venceDictamenEn: estado.detalle!.venceDictamenEn },
          },
        }),
      ),
    )
    estado.detalle!.venceDictamenEn = new Date(Date.now() + 10_000).toISOString()
    await flushPromises()

    vi.advanceTimersByTime(11_000)
    await flushPromises()
    expect(wrapper.get('[data-prueba="tiempo-restante"] time').text()).toBe('Vencido')
    expect(wrapper.get('[data-prueba="aprobando-automatica"]').text()).toBe(
      'Se aprobará automáticamente en el próximo minuto.',
    )

    aprobado = true
    vi.advanceTimersByTime(30_000)
    await vi.waitFor(() => expect(wrapper.find('[data-prueba="automatica"]').exists()).toBe(true))
    expect(wrapper.find('[data-prueba="tiempo-restante"]').exists()).toBe(false)
    expect(wrapper.find('[data-prueba="acciones"]').exists()).toBe(false)
  })

  // QA 2026-11-18 (KAN-27): un auto parcial o de RC vencido seguía prometiendo «se aprobará en el próximo minuto»,
  // pero CLAIMS lo salta en cada pasada porque necesita el valor del daño del operador.
  it.each(['CHOQUE_PARCIAL', 'HURTO_PARCIAL', 'RESPONSABILIDAD_CIVIL'] as TipoSiniestroAuto[])(
    'vencido y %s: pide el valor del daño, no promete la aprobación ni vuelve a consultar',
    async (tipo) => {
      vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'] })
      const { wrapper } = await montar()
      const { estado } = useSiniestros()
      estado.detalle!.tipoSiniestroAuto = tipo
      estado.detalle!.venceDictamenEn = new Date(Date.now() - 60_000).toISOString()
      await flushPromises()
      let consultas = 0
      servidor.use(
        bff.query('siniestro', () => {
          consultas += 1
          return HttpResponse.json({ data: { siniestro: estado.detalle } })
        }),
      )

      vi.advanceTimersByTime(60_000)
      await flushPromises()
      expect(wrapper.find('[data-prueba="aprobando-automatica"]').exists()).toBe(false)
      expect(wrapper.get('[data-prueba="vencido-requiere-valor"]').text()).toBe(
        'Plazo vencido: este siniestro no se aprueba solo. Digita el valor del daño y apruébalo.',
      )
      expect(wrapper.get('[data-prueba="aprobar"]').attributes('disabled')).toBeUndefined()
      expect(consultas).toBe(0)
    },
  )

  it('vencido y pérdida total: sí espera la aprobación automática', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'setTimeout', 'clearTimeout', 'Date'] })
    const { wrapper } = await montar()
    const { estado } = useSiniestros()
    estado.detalle!.tipoSiniestroAuto = 'PERDIDA_TOTAL_DANOS'
    estado.detalle!.venceDictamenEn = new Date(Date.now() - 60_000).toISOString()
    await flushPromises()
    expect(wrapper.find('[data-prueba="aprobando-automatica"]').exists()).toBe(true)
    expect(wrapper.find('[data-prueba="vencido-requiere-valor"]').exists()).toBe(false)
  })

  it('con más de 24 h también muestra los minutos"', async () => {
    const { wrapper } = await montar()
    useSiniestros().estado.detalle!.venceDictamenEn = new Date(Date.now() + 50 * 3_600_000 + 90_000).toISOString()
    await flushPromises()
    expect(wrapper.get('[data-prueba="tiempo-restante"] time').text()).toBe('2 d 2 h 1 min')
  })

  it('PENDIENTE: Derivar (enlace), Rechazar y Aprobar activos; Aprobar es el único primario', async () => {
    const { wrapper } = await montar()
    expect(wrapper.get('[data-prueba="derivar"]').attributes('href')).toBe('/operador/siniestros/sin-01/derivar')
    expect(wrapper.get('[data-prueba="rechazar"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('[data-prueba="aprobar"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.findAll('main .bg-primario')).toHaveLength(1)
    expect(wrapper.text()).toContain('La decisión adoptada notificará de inmediato a la entidad financiera.')
  })

  it('Rechazar no rompe la pantalla (el modal llega en el bloque 5)', async () => {
    const { wrapper, router } = await montar()
    await wrapper.get('[data-prueba="rechazar"]').trigger('click')
    expect(router.currentRoute.value.path).toBe('/operador/siniestros/sin-01')
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  })

  it('EN_REVISION derivado: perito y fecha del informe; Derivar deshabilitado; Aprobar/Rechazar activos', async () => {
    const { wrapper } = await montar('sin-02')
    const perito = wrapper.get('[data-prueba="perito"]')
    expect(perito.text()).toContain('Peritajes Andes Ltda. · Bogotá · Red Preferente Centro')
    expect(perito.text()).toContain('Informe esperado para el')
    const derivar = wrapper.get('[data-prueba="derivar"]')
    expect(derivar.element.tagName).toBe('BUTTON')
    expect(derivar.attributes('disabled')).toBeDefined()
    expect(derivar.attributes('aria-describedby')).toBe('perito-asignado')
    expect(wrapper.get('[data-prueba="aprobar"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('[data-prueba="rechazar"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.find('[data-prueba="tiempo-restante"]').exists()).toBe(true)
  })

  it('derivado: el dictamen queda en pausa y cuenta el informe del perito (D-3b)', async () => {
    const { wrapper } = await montar('sin-02')
    const { estado } = useSiniestros()
    estado.detalle!.resolucion!.vencimientoInforme = new Date(Date.now() + 3 * 3_600_000 + 30_000).toISOString()
    await flushPromises()
    const caja = wrapper.get('[data-prueba="tiempo-restante"]')
    expect(caja.text()).toContain('informe del perito')
    expect(caja.get('time').text()).toBe('3 h 0 min')
  })

  it('una aprobación por vencimiento se identifica como automática', async () => {
    const { wrapper } = await montar('sin-03')
    expect(wrapper.find('[data-prueba="automatica"]').exists()).toBe(false)
    useSiniestros().estado.detalle!.resolucion!.automatica = true
    await flushPromises()
    expect(wrapper.get('[data-prueba="automatica"]').text()).toBe('Aprobado automáticamente por vencimiento')
  })

  it('v0.67: la resolución dice qué operador la tomó, o el sistema si fue automática', async () => {
    const { wrapper } = await montar('sin-03')
    expect(wrapper.get('[data-prueba="resuelta-por"]').text()).toBe('Aprobado por Laura Gómez')
    expect(wrapper.find('[data-prueba="derivada-por"]').exists()).toBe(false)
    const resolucion = useSiniestros().estado.detalle!.resolucion!
    resolucion.resueltaPor = { sistema: true, nombre: null }
    await flushPromises()
    expect(wrapper.get('[data-prueba="resuelta-por"]').text()).toBe('Aprobado por el sistema')
    resolucion.resueltaPor = { sistema: false, nombre: null }
    await flushPromises()
    expect(wrapper.get('[data-prueba="resuelta-por"]').text()).toBe('Aprobado por un operador')
  })

  it('v0.67: rechazado tras pasar por perito muestra quién rechazó y quién derivó', async () => {
    const { wrapper } = await montar('sin-04')
    const resolucion = useSiniestros().estado.detalle!.resolucion!
    resolucion.derivadaPor = { sistema: false, nombre: 'Andrés Ruiz' }
    resolucion.derivadaEn = '2026-10-13T15:00:00Z'
    await flushPromises()
    expect(wrapper.get('[data-prueba="resuelta-por"]').text()).toBe('Rechazado por Laura Gómez')
    expect(wrapper.get('[data-prueba="derivada-por"]').text()).toContain('Derivado a perito por Andrés Ruiz el')
  })

  it('v0.67: en revisión, el recuadro del perito dice quién lo derivó', async () => {
    const { wrapper } = await montar('sin-02')
    expect(wrapper.get('[data-prueba="derivada-por"]').text()).toContain('Derivado a perito por Laura Gómez el')
  })

  it('APROBADO: solo lectura con la resolución y sin tiempo restante', async () => {
    const { wrapper } = await montar('sin-03')
    expect(wrapper.find('[data-prueba="acciones"]').exists()).toBe(false)
    expect(wrapper.find('[data-prueba="tiempo-restante"]').exists()).toBe(false)
    const r = wrapper.get('[data-prueba="resolucion"]').text()
    expect(r).toContain('Resolución')
    expect(r).toContain('✓Aprobado')
    expect(r).toMatch(/Indemnización\s*\$\s8\.650\.000/)
    expect(r).toContain('ACH Colombia Interbancario')
    expect(r).toContain('1 a 3 días hábiles')
    expect(wrapper.get('[data-prueba="resolucion"] a').attributes('href')).toBe('/operador/siniestros')
  })

  it('RECHAZADO: solo lectura con motivo traducido, vía de recurso y notificación', async () => {
    const { wrapper } = await montar('sin-04')
    expect(wrapper.find('[data-prueba="acciones"]').exists()).toBe(false)
    const r = wrapper.get('[data-prueba="resolucion"]').text()
    expect(r).toContain('Fuera de cobertura')
    expect(r).toContain('Disponible en los próximos 10 días hábiles.')
    expect(r).toContain('Enviada vía correo certificado y Open Finance')
    expect(r).not.toContain('Comentario')
  })

  it('Aprobar con éxito navega a la confirmación', async () => {
    const { wrapper, router } = await montar()
    await wrapper.get('[data-prueba="aprobar"]').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/operador/siniestros/sin-01/aprobado'))
    expect(useSiniestros().estado.resultado).toMatchObject({ estado: 'APROBADO' })
  })

  it('Aprobar con ErrorSiniestro muestra el banner con foco y reactiva los botones', async () => {
    servidor.use(
      bff.mutation('aprobarSiniestro', () =>
        HttpResponse.json({
          data: { aprobarSiniestro: { __typename: 'ErrorSiniestro', mensaje: 'El siniestro ya fue resuelto.' } },
        }),
      ),
    )
    const { wrapper, router } = await montar()
    document.body.appendChild(wrapper.element)
    await wrapper.get('[data-prueba="aprobar"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[role="alert"]').exists()).toBe(true))
    await flushPromises()
    const alerta = wrapper.get('[role="alert"]')
    expect(alerta.text()).toContain('El siniestro ya fue resuelto.')
    expect(document.activeElement).toBe(alerta.element)
    expect(wrapper.get('[data-prueba="aprobar"]').attributes('disabled')).toBeUndefined()
    expect(router.currentRoute.value.path).toBe('/operador/siniestros/sin-01')
  })

  it('Aprobar con 503 muestra un mensaje genérico sin códigos', async () => {
    servidor.use(bff.mutation('aprobarSiniestro', () => new HttpResponse(null, { status: 503 })))
    const { wrapper } = await montar()
    await wrapper.get('[data-prueba="aprobar"]').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[role="alert"]').exists()).toBe(true))
    expect(wrapper.get('[role="alert"]').text()).not.toMatch(/50\d/)
  })

  describe('KAN-290 · valor del daño en un siniestro de auto parcial', () => {
    const selectorMoneda = (wrapper: VueWrapper) => wrapper.get('header select').element as HTMLSelectElement

    it('va en su propio bloque (no entre las acciones), con la moneda del dato', async () => {
      const { wrapper } = await montarSiniestroDeAuto('CHOQUE_PARCIAL', 'USD')
      const campo = wrapper.get('[data-prueba="valor-dano"]')
      expect(campo.text()).toContain('Valor del daño (USD)')
      expect(campo.text()).toContain('Se le resta el deducible de la póliza.')
      // La fila de botones (Derivar, Rechazar, Aprobar) no lleva el campo adentro.
      expect(wrapper.get('[data-prueba="aprobar"]').element.parentElement!.contains(campo.element)).toBe(false)
      // El selector sigue libre; el campo sigue en la moneda de la póliza.
      expect(selectorMoneda(wrapper).disabled).toBe(false)
    })

    it('la suma reclamada se ve en la moneda de la póliza si el selector está en ella', async () => {
      const { wrapper } = await montarSiniestroDeAuto()
      expect(wrapper.get('[data-prueba="suma"]').text()).toMatch(/\$\s8\.650\.000/)
    })

    it('con el selector en otra moneda el campo avisa que se digita en la de la póliza', async () => {
      const { wrapper } = await montarSiniestroDeAuto('CHOQUE_PARCIAL', 'USD')
      await cambiarMoneda('COP')
      await wrapper.vm.$nextTick()
      const campo = wrapper.get('[data-prueba="valor-dano"]')
      expect(campo.text()).toContain('Valor del daño (USD)')
      expect(campo.text()).toContain('Se digita en la moneda de la póliza (USD)')
      await cambiarMoneda('USD')
    })

    it('en pérdida total no se pide el valor y el selector de moneda sigue libre', async () => {
      const { wrapper } = await montarSiniestroDeAuto('PERDIDA_TOTAL_DANOS')
      expect(wrapper.find('[data-prueba="valor-dano"]').exists()).toBe(false)
      expect(selectorMoneda(wrapper).disabled).toBe(false)
    })

    it('se digita con los separadores del idioma y al BFF viaja solo con dígitos', async () => {
      let valorDano: unknown = null
      servidor.use(
        bff.mutation('aprobarSiniestro', ({ variables }) => {
          valorDano = variables.valorDano
          return HttpResponse.json({
            data: { aprobarSiniestro: { __typename: 'ErrorSiniestro', mensaje: 'Detenido en la prueba.' } },
          })
        }),
      )
      const { wrapper } = await montarSiniestroDeAuto()
      const entrada = wrapper.get('[data-prueba="valor-dano"] input')
      expect(entrada.attributes('placeholder')).toBe('Ej: 8.000.000')
      await entrada.setValue('8000000')
      expect((entrada.element as HTMLInputElement).value).toBe('8.000.000')
      await wrapper.get('[data-prueba="aprobar"]').trigger('click')
      await vi.waitFor(() => expect(valorDano).toBe('8000000'))
    })

    it('en inglés la etiqueta, el ejemplo y los separadores cambian con el idioma', async () => {
      cambiarIdioma('EN')
      const { wrapper } = await montarSiniestroDeAuto()
      const campo = wrapper.get('[data-prueba="valor-dano"]')
      expect(campo.text()).toContain('Damage amount (COP)')
      expect(campo.text()).toContain('The policy deductible is subtracted.')
      const entrada = campo.get('input')
      expect(entrada.attributes('placeholder')).toBe('E.g. 8,000,000')
      await entrada.setValue('8000000')
      expect((entrada.element as HTMLInputElement).value).toBe('8,000,000')
    })

    it('sin valor, o en cero, muestra el error y no llama a aprobar', async () => {
      let llamadas = 0
      servidor.use(
        bff.mutation('aprobarSiniestro', () => {
          llamadas++
          return HttpResponse.json({ data: { aprobarSiniestro: { __typename: 'ErrorSiniestro', mensaje: 'x' } } })
        }),
      )
      const { wrapper } = await montarSiniestroDeAuto()
      await wrapper.get('[data-prueba="aprobar"]').trigger('click')
      const mensaje = 'Digita el valor del daño con números, mayor a cero.'
      expect(wrapper.get('[data-prueba="valor-dano"]').text()).toContain(mensaje)
      await wrapper.get('[data-prueba="valor-dano"] input').setValue('0')
      expect(wrapper.get('[data-prueba="valor-dano"]').text()).not.toContain(mensaje)
      await wrapper.get('[data-prueba="aprobar"]').trigger('click')
      expect(wrapper.get('[data-prueba="valor-dano"]').text()).toContain(mensaje)
      expect(llamadas).toBe(0)
    })
  })

  it('id inexistente: "No encontramos este siniestro." con regreso a la bandeja', async () => {
    const { wrapper } = await montar('sin-99')
    expect(wrapper.text()).toContain('No encontramos este siniestro.')
    expect(wrapper.get('main a').attributes('href')).toBe('/operador/siniestros')
    expect(wrapper.get('nav [aria-current="page"]').text()).toBe('Detalle')
  })

  it('error de carga con "Reintentar" que vuelve a cargar', async () => {
    servidor.use(bff.query('siniestro', () => new HttpResponse(null, { status: 503 }), { once: true }))
    const { wrapper } = await montar()
    const alerta = wrapper.get('[role="alert"]')
    expect(alerta.text()).toContain('No pudimos cargar el siniestro en este momento.')
    expect(alerta.text()).not.toMatch(/50\d/)
    await alerta.get('button').trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[data-prueba="datos"]').exists()).toBe(true))
  })
})

describe('Boton · variante peligroBorde', () => {
  it('borde y texto de error sobre error-fondo, sin relleno sólido', () => {
    const b = mount(Boton, { props: { variante: 'peligroBorde' }, slots: { default: 'Rechazar' } })
    expect(b.classes()).toEqual(expect.arrayContaining(['border', 'border-error', 'bg-error-fondo', 'text-error']))
    expect(b.classes()).not.toContain('bg-error')
  })
})
