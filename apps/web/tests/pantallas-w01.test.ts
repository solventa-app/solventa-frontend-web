// Pruebas de las 7 vistas reales de HU-W01 (ver src/views/*.vue y docs/plan-frontend.md). Se
// complementan con tests/pantallas.test.ts (que ya verifica que cada ruta monta su pantalla) y
// tests/useCotizacion.test.ts (que ya verifica el flujo de datos contra los mocks del BFF): aquí se
// prueba lo que cada pantalla le muestra al usuario a partir de ese estado.
//
// `estado` de useCotizacion es un singleton a nivel de módulo (ver useCotizacion.ts), así que cada
// wrapper montado se desmonta al terminar su prueba (`afterEach`): de lo contrario un wrapper viejo
// sigue reactivo y se vuelve a renderizar cuando una prueba posterior cambia el estado compartido.
import { http, HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import ConsultandoFuentes from '../src/views/ConsultandoFuentes.vue'
import ContactarAsesor from '../src/views/ContactarAsesor.vue'
import DetalleDeFuentes from '../src/views/DetalleDeFuentes.vue'
import HomeAsesor from '../src/views/HomeAsesor.vue'
import HomeCliente from '../src/views/HomeCliente.vue'
import IngresoConRol from '../src/views/IngresoConRol.vue'
import OfertaCompleta from '../src/views/OfertaCompleta.vue'
import OfertaError from '../src/views/OfertaError.vue'
import OfertaPreliminar from '../src/views/OfertaPreliminar.vue'
import SolicitudYConsentimiento from '../src/views/SolicitudYConsentimiento.vue'
import { useCotizacion } from '../src/composables/useCotizacion'
import { useSesion } from '../src/composables/useSesion'
import { crearRutas } from '../src/router'
import { servidor } from '../src/mocks/node'
import { formatearFecha } from '../src/utils/formato'

const fetchPrueba: typeof fetch = (url, init) => fetch(new URL(String(url), 'http://localhost'), init)

const wrappersMontados: VueWrapper[] = []
afterEach(() => {
  wrappersMontados.splice(0).forEach((w) => w.unmount())
})

function montar(componente: Parameters<typeof mount>[0], router: Router) {
  const wrapper = mount(componente, { global: { plugins: [router] } })
  wrappersMontados.push(wrapper)
  return wrapper
}

/** Espera hasta que la ruta activa cambie (o se agoten los intentos): cubre el import() dinámico de
 * las rutas sin `componente` propio (PantallaPendiente.vue), que no siempre resuelve con un solo
 * flushPromises() ni con un setTimeout de duración fija. */
async function esperarRuta(router: Router, ruta: string, intentos = 20) {
  for (let i = 0; i < intentos; i++) {
    await flushPromises()
    if (router.currentRoute.value.path === ruta) return
    await new Promise((r) => setTimeout(r, 10))
  }
}

function crearRouterDePrueba() {
  return createRouter({ history: createMemoryHistory(), routes: crearRutas() })
}

beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }))
afterEach(() => servidor.resetHandlers())
afterAll(() => servidor.close())

describe('SolicitudYConsentimiento (W01-01)', () => {
  it('deshabilita "Consultar oferta" hasta marcar el consentimiento', async () => {
    useCotizacion(fetchPrueba).reiniciar()
    const wrapper = montar(SolicitudYConsentimiento, crearRouterDePrueba())

    expect(wrapper.find('button[disabled]').exists()).toBe(true)

    await wrapper.find('input[type="checkbox"]').setValue(true)

    expect(wrapper.find('button[disabled]').exists()).toBe(false)
  })

  it('los enlaces de demo marcan el consentimiento y completan el documento', async () => {
    const cotizacion = useCotizacion(fetchPrueba)
    cotizacion.reiniciar()
    const wrapper = montar(SolicitudYConsentimiento, crearRouterDePrueba())

    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('fallo total'))!
      .trigger('click')

    expect(cotizacion.captura.documentoIdentidad.endsWith('000')).toBe(true)
    expect(cotizacion.captura.consentimiento).toBe(true)
  })

  // Antes de esta prueba no había ninguna validación funcional más allá del consentimiento: el
  // botón "Consultar oferta" es `type="button"` (Boton.vue), así que nunca disparaba el `required`
  // nativo de los campos. Se podía enviar con el consentimiento marcado y todo lo demás vacío.
  it('no navega y muestra errores si se envía con el consentimiento marcado pero los campos vacíos', async () => {
    const cotizacion = useCotizacion(fetchPrueba)
    cotizacion.reiniciar()
    const router = crearRouterDePrueba()
    router.push('/cotizacion')
    await router.isReady()
    const wrapper = montar(SolicitudYConsentimiento, router)

    await wrapper.find('input[type="checkbox"]').setValue(true)
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Consultar oferta')!
      .trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/cotizacion')
    expect(wrapper.findAll('[role="alert"]').length).toBeGreaterThan(0)
    expect(wrapper.text()).toContain('Ingresa tu documento de identidad.')
  })

  it('valida que el monto del crédito sea numérico y mayor a cero', async () => {
    const cotizacion = useCotizacion(fetchPrueba)
    cotizacion.reiniciar()
    const wrapper = montar(SolicitudYConsentimiento, crearRouterDePrueba())

    await wrapper.find('input[type="checkbox"]').setValue(true)
    await wrapper.findAll('input')[1].setValue('no-es-un-numero') // input[1] = Monto del crédito
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Consultar oferta')!
      .trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Ingresa un monto válido, mayor a cero.')
  })

  // Antes esta aserción vivía (con un nombre que prometía cubrirla) dentro de la prueba de
  // valorCredito, pero el body nunca tocaba el campo de plazo: quedaba sin probar de verdad.
  it('valida que el plazo sea un entero entre 1 y 60', async () => {
    const cotizacion = useCotizacion(fetchPrueba)
    cotizacion.reiniciar()
    const wrapper = montar(SolicitudYConsentimiento, crearRouterDePrueba())

    await wrapper.find('input[type="checkbox"]').setValue(true)
    await wrapper.findAll('input')[2].setValue('3.5') // input[2] = Plazo (meses)
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Consultar oferta')!
      .trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Ingresa un plazo válido, entre 1 y 60 meses.')
  })

  // El máximo es 60 meses, igual que el BFF y la política de RATING.
  it.each([
    ['60', false],
    ['61', true],
  ])('con plazo de %s meses muestra el error: %s', async (plazo, conError) => {
    const cotizacion = useCotizacion(fetchPrueba)
    cotizacion.reiniciar()
    const wrapper = montar(SolicitudYConsentimiento, crearRouterDePrueba())

    await wrapper.find('input[type="checkbox"]').setValue(true)
    await wrapper.findAll('input')[2].setValue(plazo) // input[2] = Plazo (meses)
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Consultar oferta')!
      .trigger('click')
    await flushPromises()

    expect(wrapper.text().includes('Ingresa un plazo válido, entre 1 y 60 meses.')).toBe(conError)
  })

  it('valida que la dirección del inmueble no esté vacía', async () => {
    const cotizacion = useCotizacion(fetchPrueba)
    cotizacion.reiniciar()
    cotizacion.captura.documentoIdentidad = 'CC102030'
    cotizacion.captura.valorCredito = '185000000'
    cotizacion.captura.plazoMeses = '60'
    const wrapper = montar(SolicitudYConsentimiento, crearRouterDePrueba())

    await wrapper.find('input[type="checkbox"]').setValue(true)
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Consultar oferta')!
      .trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Ingresa la dirección del inmueble a asegurar.')
  })

  it('valida el formato del documento de identidad (no solo que no esté vacío)', async () => {
    const cotizacion = useCotizacion(fetchPrueba)
    cotizacion.reiniciar()
    const wrapper = montar(SolicitudYConsentimiento, crearRouterDePrueba())

    await wrapper.find('input[type="checkbox"]').setValue(true)
    await wrapper.findAll('input')[0].setValue('12') // claramente incompleto, no solo "vacío"
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Consultar oferta')!
      .trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Ingresa un número de documento válido')
  })
})

describe('ConsultandoFuentes (W01-02)', () => {
  // Hallazgo MEDIA de QA: antes el `return` temprano de onMounted era silencioso y dejaba el
  // spinner girando para siempre, sin ningún mensaje ni salida para el usuario.
  it('no llama al BFF ni navega si no hay captura todavía, y muestra un mensaje en vez de dejar el spinner girando', async () => {
    useCotizacion(fetchPrueba).reiniciar()
    const router = crearRouterDePrueba()
    router.push('/cotizacion/consulta')
    await router.isReady()

    const wrapper = montar(ConsultandoFuentes, router)
    await new Promise((r) => setTimeout(r, 0))

    expect(router.currentRoute.value.path).toBe('/cotizacion/consulta')
    expect(wrapper.text()).toContain('No hay una solicitud en curso para consultar.')
    expect(wrapper.find('svg.animate-spin').exists()).toBe(false)
    const enlace = wrapper.findAll('a').find((a) => a.text().includes('Ir a la solicitud'))
    expect(enlace).toBeDefined()
  })

  it('navega a la oferta completa cuando la captura ya está lista', async () => {
    const cotizacion = useCotizacion(fetchPrueba)
    cotizacion.reiniciar()
    cotizacion.captura.documentoIdentidad = '123'
    cotizacion.captura.valorCredito = '185000000'
    cotizacion.captura.plazoMeses = '60'
    cotizacion.captura.direccionInmueble = 'Cra 45 # 22-18'
    cotizacion.captura.consentimiento = true

    const router = crearRouterDePrueba()
    router.push('/cotizacion/consulta')
    await router.isReady()

    montar(ConsultandoFuentes, router)
    await new Promise((r) => setTimeout(r, 0))
    await router.isReady()

    expect(router.currentRoute.value.path).toBe('/cotizacion/oferta')
  })

  // CA-W01-02 exige mostrar progreso mientras se consulta, no solo navegar al terminar: las dos
  // pruebas de arriba cubren el guard y la navegación final, pero ninguna observaba el estado
  // intermedio. Se retrasa la respuesta del BFF a propósito para poder verlo antes de que la
  // pantalla navegue sola.
  it('muestra el spinner, el mensaje y la barra de progreso mientras se resuelve la consulta', async () => {
    const cotizacion = useCotizacion(fetchPrueba)
    cotizacion.reiniciar()
    cotizacion.captura.documentoIdentidad = '123'
    cotizacion.captura.valorCredito = '185000000'
    cotizacion.captura.plazoMeses = '60'
    cotizacion.captura.direccionInmueble = 'Cra 45 # 22-18'
    cotizacion.captura.consentimiento = true

    let liberar: () => void = () => {}
    let atendida = false
    servidor.use(
      graphql.link('*').mutation('solicitarOferta', () => {
        return new Promise((resolve) => {
          atendida = true
          liberar = () =>
            resolve(
              HttpResponse.json({
                data: {
                  solicitarOferta: {
                    id: 'oferta-completa',
                    tipo: 'COMPLETA',
                    prima: { valor: '48500.00', moneda: 'COP' },
                    rangoPrima: null,
                    cobertura: { valor: '250000000.00', moneda: 'COP' },
                    desgloseScore: [],
                    fuentes: [],
                  },
                },
              }),
            )
        })
      }),
    )

    const router = crearRouterDePrueba()
    router.push('/cotizacion/consulta')
    await router.isReady()
    const wrapper = montar(ConsultandoFuentes, router)
    await flushPromises()

    expect(wrapper.find('svg.animate-spin').exists()).toBe(true)
    expect(wrapper.text()).toContain('Verificando tus fuentes de Open Finance / Open Data')
    expect(wrapper.find('.barra-indeterminada').exists()).toBe(true)
    expect(wrapper.find('.animate-pulse').exists()).toBe(false)
    expect(router.currentRoute.value.path).toBe('/cotizacion/consulta')

    // Con MSW 3 el handler corre un poco después de montar: hay que esperarlo antes de liberar la respuesta.
    await vi.waitFor(() => expect(atendida).toBe(true))
    liberar()
    await flushPromises()
    await esperarRuta(router, '/cotizacion/oferta')
    expect(router.currentRoute.value.path).toBe('/cotizacion/oferta')
  })

  it('vuelve a /cotizacion con el checkbox desmarcado y aviso de re-autorización si el consentimiento no está vigente', async () => {
    const cotizacion = useCotizacion(fetchPrueba)
    cotizacion.reiniciar()
    cotizacion.captura.documentoIdentidad = '1020304998'
    cotizacion.captura.valorCredito = '185000000'
    cotizacion.captura.plazoMeses = '60'
    cotizacion.captura.direccionInmueble = 'Cra 45 # 22-18'
    cotizacion.captura.consentimiento = true

    const router = crearRouterDePrueba()
    router.push('/cotizacion/consulta')
    await router.isReady()

    montar(ConsultandoFuentes, router)
    await esperarRuta(router, '/cotizacion')

    expect(router.currentRoute.value.path).toBe('/cotizacion')
    expect(cotizacion.captura.consentimiento).toBe(false)
    expect(cotizacion.estado.consentimientoId).toBeNull()

    const solicitud = montar(SolicitudYConsentimiento, router)
    expect(solicitud.get('[role="alert"]').text()).toBe(
      'Tu autorización venció o fue revocada. Autoriza de nuevo para continuar.',
    )
  })
})

describe('Pantallas de resultado de oferta', () => {
  beforeEach(() => {
    const cotizacion = useCotizacion(fetchPrueba)
    cotizacion.reiniciar()
    cotizacion.captura.plazoMeses = '60'
  })

  it('OfertaCompleta (W01-03a) muestra la prima y el desglose real del score, no un número inventado', async () => {
    Object.assign(useCotizacion(fetchPrueba).estado, {
      resultado: {
        id: 'oferta-completa',
        tipo: 'COMPLETA',
        prima: { valor: '48500.00', moneda: 'COP' },
        rangoPrima: null,
        cobertura: { valor: '250000000.00', moneda: 'COP' },
        desgloseScore: [{ nombre: 'Ingresos', peso: 0.4 }],
        fuentes: [],
      },
    })
    const wrapper = montar(OfertaCompleta, crearRouterDePrueba())

    expect(wrapper.text()).toContain('Tu oferta está lista')
    expect(wrapper.text()).toContain('Ingresos')
    expect(wrapper.text()).toContain('60 meses')
    expect(wrapper.text()).not.toContain('782/850')
  })

  // Re-verificada contra el archivo correcto de Figma (yKWD8jrwERtJkuSj0mk0Gz "Solventa-web-Final",
  // nodo 2001:1262, confirmado con captura de pantalla): sí muestra un encabezado "Oferta
  // preliminar", la cobertura, la nota de caché y el desglose real del score (`desgloseScore`, el
  // mismo criterio contract-first que ya usa OfertaCompleta) — una ronda anterior había quitado todo
  // eso citando el archivo de Figma equivocado.
  it('OfertaPreliminar (W01-03b) muestra el banner de alerta, el rango de prima estimada y el desglose real del score', async () => {
    Object.assign(useCotizacion(fetchPrueba).estado, {
      resultado: {
        id: 'oferta-preliminar',
        tipo: 'PRELIMINAR',
        prima: null,
        rangoPrima: { minima: { valor: '178000', moneda: 'COP' }, maxima: { valor: '196000', moneda: 'COP' } },
        cobertura: { valor: '250000000.00', moneda: 'COP' },
        desgloseScore: [{ nombre: 'Zona del inmueble', peso: 0.25 }],
        fuentes: [],
      },
    })
    const wrapper = montar(OfertaPreliminar, crearRouterDePrueba())

    expect(wrapper.text()).toContain('No pudimos verificar todo a tiempo, esta es una oferta preliminar')
    expect(wrapper.text()).toContain('Oferta preliminar')
    expect(wrapper.text()).toContain('Cobertura:')
    expect(wrapper.text()).toContain('Zona del inmueble')
    expect(wrapper.text()).toContain('60 meses')
    expect(wrapper.text()).not.toContain('782/850')
  })

  it('OfertaError (W01-03c) muestra el mensaje real del contrato y oculta "Reintentar" si no se puede', async () => {
    Object.assign(useCotizacion(fetchPrueba).estado, {
      resultado: { mensaje: 'No pudimos calcular tu oferta en este momento.', puedeReintentar: false },
    })
    const wrapper = montar(OfertaError, crearRouterDePrueba())

    expect(wrapper.text()).toContain('No pudimos calcular tu oferta en este momento.')
    expect(wrapper.text()).not.toContain('Código de evento')
    expect(wrapper.findAll('button').some((b) => b.text() === 'Reintentar')).toBe(false)
  })

  // Hallazgo ALTA de QA: sin ningún ErrorOferta en memoria (p. ej. se entra directo a
  // /cotizacion/error escribiendo la URL), la pantalla no tenía ningún guard y caía al mensaje
  // genérico con un botón "Reintentar" que no reintentaba nada real.
  it('OfertaError (W01-03c) sin ErrorOferta en memoria muestra el fallback, no el mensaje genérico', async () => {
    useCotizacion(fetchPrueba).estado.resultado = null
    const wrapper = montar(OfertaError, crearRouterDePrueba())

    expect(wrapper.text()).toContain('No hay un error activo en memoria todavía.')
    expect(wrapper.text()).not.toContain('Intenta nuevamente o habla con un asesor')
    expect(wrapper.findAll('button').some((b) => b.text() === 'Reintentar')).toBe(false)
    const enlace = wrapper.findAll('a').find((a) => a.text().includes('Ir a la solicitud'))
    expect(enlace).toBeDefined()
  })
})

describe('DetalleDeFuentes (W01-04)', () => {
  it('muestra con nombre legible los identificadores de fuente que devuelve el BFF real', () => {
    const cotizacion = useCotizacion(fetchPrueba)
    cotizacion.reiniciar()
    Object.assign(cotizacion.estado, {
      resultado: {
        id: 'oferta-completa',
        tipo: 'COMPLETA',
        prima: { valor: '94680.00', moneda: 'COP' },
        rangoPrima: null,
        cobertura: { valor: '200000000', moneda: 'COP' },
        desgloseScore: [],
        fuentes: [
          {
            id: 'cuentas-bancarias',
            nombre: 'cuentas-bancarias',
            origen: 'OPEN_FINANCE',
            estado: 'OK',
            capturadoEn: null,
          },
          { id: 'afiliacion-pila', nombre: 'afiliacion-pila', origen: 'OPEN_DATA', estado: 'OK', capturadoEn: null },
        ],
      },
    })
    const wrapper = montar(DetalleDeFuentes, crearRouterDePrueba())

    expect(wrapper.text()).toContain('Cuentas bancarias')
    expect(wrapper.text()).toContain('Afiliación a seguridad social (PILA)')
    expect(wrapper.text()).not.toContain('cuentas-bancarias')
  })

  it('agrupa las fuentes por origen con el nombre real de cada una', () => {
    const cotizacion = useCotizacion(fetchPrueba)
    cotizacion.reiniciar()
    Object.assign(cotizacion.estado, {
      resultado: {
        id: 'oferta-completa',
        tipo: 'COMPLETA',
        prima: { valor: '48500.00', moneda: 'COP' },
        rangoPrima: null,
        cobertura: { valor: '250000000.00', moneda: 'COP' },
        desgloseScore: [],
        fuentes: [
          { id: 'of-1', nombre: 'Cuentas y saldos', origen: 'OPEN_FINANCE', estado: 'OK', capturadoEn: null },
          { id: 'od-1', nombre: 'Catastro', origen: 'OPEN_DATA', estado: 'FALLO', capturadoEn: null },
        ],
      },
    })
    const wrapper = montar(DetalleDeFuentes, crearRouterDePrueba())

    expect(wrapper.text()).toContain('Cuentas y saldos')
    expect(wrapper.text()).toContain('Catastro')
    expect(wrapper.text()).toContain('No disponible')
  })

  // CA-W01-06 pide explícitamente "5 filas (2 Open Finance + 3 Open Data)" (ver comentario de
  // cabecera del componente): la prueba de arriba solo pasaba 2 fuentes de muestra, así que nunca
  // verificaba el conteo real ni la insignia/fecha de cada fila. Esta reproduce la forma real de
  // `fuentes()` en src/mocks/handlers.ts (caso "degradada": una fuente CACHE con fecha y una FALLO).
  it('CA-W01-06: muestra las 5 filas reales (2 Open Finance + 3 Open Data) con su insignia de estado y fecha', () => {
    const cotizacion = useCotizacion(fetchPrueba)
    cotizacion.reiniciar()
    const capturadoEn = '2026-09-12T10:41:00.000Z'
    Object.assign(cotizacion.estado, {
      resultado: {
        id: 'oferta-completa',
        tipo: 'COMPLETA',
        prima: { valor: '48500.00', moneda: 'COP' },
        rangoPrima: null,
        cobertura: { valor: '250000000.00', moneda: 'COP' },
        desgloseScore: [],
        fuentes: [
          { id: 'of-1', nombre: 'Cuentas y saldos', origen: 'OPEN_FINANCE', estado: 'OK', capturadoEn: null },
          { id: 'of-2', nombre: 'Historial crediticio', origen: 'OPEN_FINANCE', estado: 'CACHE', capturadoEn },
          { id: 'od-1', nombre: 'Catastro', origen: 'OPEN_DATA', estado: 'OK', capturadoEn: null },
          { id: 'od-2', nombre: 'Registro de propiedad', origen: 'OPEN_DATA', estado: 'OK', capturadoEn: null },
          { id: 'od-3', nombre: 'Indicadores de la zona', origen: 'OPEN_DATA', estado: 'FALLO', capturadoEn: null },
        ],
      },
    })
    const wrapper = montar(DetalleDeFuentes, crearRouterDePrueba())

    const secciones = wrapper.findAll('section')
    expect(secciones).toHaveLength(2)
    expect(secciones[0].text()).toContain('Open Finance')
    expect(secciones[1].text()).toContain('Open Data')
    expect(secciones[0].findAll('li')).toHaveLength(2)
    expect(secciones[1].findAll('li')).toHaveLength(3)
    expect(wrapper.findAll('section li')).toHaveLength(5)

    expect(wrapper.text()).toContain('Cuentas y saldos')
    expect(wrapper.text()).toContain('Historial crediticio')
    expect(wrapper.text()).toContain('Catastro')
    expect(wrapper.text()).toContain('Registro de propiedad')
    expect(wrapper.text()).toContain('Indicadores de la zona')

    // 3 fuentes OK ("Consultado en línea"), 1 CACHE ("Usando último valor cacheado") y 1 FALLO
    // ("No disponible"): el conteo exacto, no solo la presencia de alguna insignia.
    expect(wrapper.text().match(/Consultado en línea/g)).toHaveLength(3)
    expect(wrapper.text()).toContain('Usando último valor cacheado')
    expect(wrapper.text()).toContain('No disponible')

    // Solo la fuente CACHE trae `capturadoEn`: es la única fila con fecha visible.
    expect(wrapper.text()).toContain(formatearFecha(capturadoEn))
  })
})

describe('ContactarAsesor (W01-05)', () => {
  it('muestra el resumen real que devuelve contactarAsesor, no un número de solicitud inventado', async () => {
    useCotizacion(fetchPrueba).reiniciar()
    const wrapper = montar(ContactarAsesor, crearRouterDePrueba())

    expect(wrapper.text()).not.toContain('SOL-24817')

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Llamar')!
      .trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Un asesor te contactará')
  })

  // Antes de esta prueba, `elegirCanal` no tenía ningún `catch`: una falla del BFF dejaba al
  // usuario sin ningún mensaje (solo se reactivaban los botones, sin ninguna pista de qué pasó).
  it('muestra un mensaje seguro (nunca texto técnico crudo) si contactarAsesor falla', async () => {
    // Ruta comodín (no http://localhost/graphql/web): la vista monta useCotizacion() sin
    // fetchPrueba, así que usa el fetch global del entorno de pruebas (jsdom), cuyo origen por
    // defecto no es http://localhost a secas.
    servidor.use(http.post('*/graphql/web', () => new HttpResponse(null, { status: 500 })))
    useCotizacion().reiniciar()
    const wrapper = montar(ContactarAsesor, crearRouterDePrueba())

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Llamar')!
      .trigger('click')
    await flushPromises()

    const alerta = wrapper.get('[role="alert"]')
    expect(alerta.text()).toBeTruthy()
    expect(alerta.text()).not.toMatch(/500|BFF respondio|BFF respondió|Error:/)
  })
})

describe('Pantallas globales: G-01 (login), G-02 (home cliente), G-02a (home asesor)', () => {
  beforeEach(() => useSesion().cerrarSesion())
  afterEach(() => useSesion().cerrarSesion())

  it('G-01 deshabilita "Ingresar" hasta completar usuario y clave, e inicia sesión con el rol del token', async () => {
    const router = crearRouterDePrueba()
    router.push('/login')
    await router.isReady()
    const wrapper = montar(IngresoConRol, router)

    expect(
      wrapper
        .findAll('button')
        .find((b) => b.text() === 'Ingresar')!
        .attributes('disabled'),
    ).toBeDefined()

    await wrapper
      .findAll('input')
      .find((i) => i.attributes('type') !== 'password')!
      .setValue('asesor.demo')
    await wrapper.find('input[type="password"]').setValue('secreta123')
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Asesor comercial')!
      .trigger('click')
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Ingresar')!
      .trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/asesor')
    expect(useSesion().estado.rol).toBe('ASESOR')
    // El nombre sale de Usuario.nombre (no del token ni de un valor fijo del frontend).
    expect(useSesion().estado.nombre).toBe('Asesor Demo')
  })

  it('G-01 rechaza el ingreso si el rol del token no coincide con el chip elegido', async () => {
    const router = crearRouterDePrueba()
    router.push('/login')
    await router.isReady()
    const wrapper = montar(IngresoConRol, router)

    await wrapper
      .findAll('input')
      .find((i) => i.attributes('type') !== 'password')!
      .setValue('cliente.demo')
    await wrapper.find('input[type="password"]').setValue('secreta123')
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Operador')!
      .trigger('click')
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Ingresar')!
      .trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/login')
    expect(wrapper.get('[role="alert"]').text()).toBe('Tu rol es Cliente. Selecciónalo e ingresa de nuevo.')
    expect(useSesion().sesionActiva()).toBe(false)
    // Queda preseleccionado su rol y la clave se borra.
    expect(
      wrapper
        .findAll('[role="radio"]')
        .find((b) => b.text() === 'Cliente')!
        .attributes('aria-checked'),
    ).toBe('true')
    expect((wrapper.find('input[type="password"]').element as HTMLInputElement).value).toBe('')
  })

  it('G-01 el botón del ojo muestra y oculta la contraseña', async () => {
    const router = crearRouterDePrueba()
    router.push('/login')
    await router.isReady()
    const wrapper = montar(IngresoConRol, router)
    const boton = wrapper.get('button[aria-label="Mostrar contraseña"]')

    await wrapper.find('input[type="password"]').setValue('secreta123')
    await boton.trigger('click')
    expect(wrapper.find('input[type="password"]').exists()).toBe(false)
    expect(boton.attributes('aria-label')).toBe('Ocultar contraseña')
    expect(boton.attributes('aria-pressed')).toBe('true')

    await boton.trigger('click')
    expect(wrapper.find('input[type="password"]').exists()).toBe(true)
  })

  it('G-01 no muestra el avatar de perfil en el header (todavía no hay sesión)', async () => {
    const router = crearRouterDePrueba()
    router.push('/login')
    await router.isReady()
    const wrapper = montar(IngresoConRol, router)

    expect(wrapper.find('header').exists()).toBe(true)
    expect(wrapper.find('header').html()).not.toMatch(/[Pp]erfil/)
  })

  it('G-01 muestra el mensaje genérico del BFF con credenciales incorrectas', async () => {
    const router = crearRouterDePrueba()
    router.push('/login')
    await router.isReady()
    const wrapper = montar(IngresoConRol, router)

    await wrapper
      .findAll('input')
      .find((i) => i.attributes('type') !== 'password')!
      .setValue('cliente.demo')
    await wrapper.find('input[type="password"]').setValue('clave-erronea')
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Ingresar')!
      .trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/login')
    expect(wrapper.get('[role="alert"]').text()).toBe('Usuario o clave incorrectos.')
  })

  it('G-02 (home cliente): "Cerrar sesión" vuelve a /login y la tarjeta navega a /cotizacion', async () => {
    await useSesion(fetchPrueba).iniciarSesion('maria.restrepo', 'secreta123')
    const router = crearRouterDePrueba()
    router.push('/inicio')
    await router.isReady()
    const wrapper = montar(HomeCliente, router)

    expect(wrapper.text()).toContain('Nueva cotización')
    expect(wrapper.text()).toContain('Hola, Maria Restrepo')

    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('Cerrar sesión'))!
      .trigger('click')
    await flushPromises()

    // G-04: primero confirma, mostrando el nombre real; Cancelar no cierra nada.
    const modal = wrapper.get('[role="dialog"]')
    expect(modal.text()).toContain('¿Deseas cerrar tu sesión?')
    expect(modal.get('[data-dato="nombre"]').text()).toBe('Maria Restrepo')
    expect(router.currentRoute.value.path).toBe('/inicio')
    await modal
      .findAll('button')
      .find((b) => b.text().includes('Cerrar sesión'))!
      .trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('G-04: "Cancelar" cierra el modal sin cerrar la sesión', async () => {
    await useSesion(fetchPrueba).iniciarSesion('maria.restrepo', 'secreta123')
    const router = crearRouterDePrueba()
    router.push('/inicio')
    await router.isReady()
    const wrapper = montar(HomeCliente, router)

    await wrapper
      .findAll('button')
      .find((b) => b.text().includes('Cerrar sesión'))!
      .trigger('click')
    await wrapper
      .get('[role="dialog"]')
      .findAll('button')
      .find((b) => b.text() === 'Cancelar')!
      .trigger('click')

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(useSesion().sesionActiva()).toBe(true)
  })

  it('G-02a (home asesor): copy distinto al del cliente, mismo destino /cotizacion', async () => {
    await useSesion(fetchPrueba).iniciarSesion('asesor.demo', 'secreta123')
    const router = crearRouterDePrueba()
    router.push('/asesor')
    await router.isReady()
    const wrapper = montar(HomeAsesor, router)

    expect(wrapper.text()).toContain('Nueva cotización para un cliente')
    expect(wrapper.text()).toContain('Hola, Asesor Demo')
    expect(wrapper.text()).toContain('Portal Asesor Comercial')
    expect(wrapper.find('a[href="/cotizacion"]').exists()).toBe(true)
  })

  it('G-01: un usuario BACKOFFICE con el chip "Operador" navega a /operador', async () => {
    const router = crearRouterDePrueba()
    router.push('/login')
    await router.isReady()
    const wrapper = montar(IngresoConRol, router)

    await wrapper
      .findAll('input')
      .find((i) => i.attributes('type') !== 'password')!
      .setValue('admin.solventa')
    await wrapper.find('input[type="password"]').setValue('secreta123')
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Operador')!
      .trigger('click')
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Ingresar')!
      .trigger('click')
    await esperarRuta(router, '/operador')

    expect(router.currentRoute.value.path).toBe('/operador')
    expect(useSesion().estado.rol).toBe('BACKOFFICE')
  })

  // El "Inicio" de la Barra de navegación debe volver al home del rol activo: Cliente/Asesor
  // comparten las mismas 7 pantallas de /cotizacion/*, pero cada uno tiene su propio home.
  it('la Barra de navegación de W01-01 vuelve a /asesor cuando la sesión activa es Asesor comercial', async () => {
    await useSesion(fetchPrueba).iniciarSesion('asesor.demo', 'secreta123')
    useCotizacion(fetchPrueba).reiniciar()
    const wrapper = montar(SolicitudYConsentimiento, crearRouterDePrueba())

    expect(wrapper.get('a').attributes('href') ?? wrapper.get('a').attributes('to')).toContain('/asesor')
  })
})
