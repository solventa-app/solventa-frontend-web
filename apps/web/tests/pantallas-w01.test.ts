// Pruebas de las 7 vistas reales de HU-W01 (ver src/views/*.vue y docs/plan-frontend.md). Se
// complementan con tests/pantallas.test.ts (que ya verifica que cada ruta monta su pantalla) y
// tests/useCotizacion.test.ts (que ya verifica el flujo de datos contra los mocks del BFF): aquí se
// prueba lo que cada pantalla le muestra al usuario a partir de ese estado.
//
// `estado` de useCotizacion es un singleton a nivel de módulo (ver useCotizacion.ts), así que cada
// wrapper montado se desmonta al terminar su prueba (`afterEach`): de lo contrario un wrapper viejo
// sigue reactivo y se vuelve a renderizar cuando una prueba posterior cambia el estado compartido.
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import ConsultandoFuentes from '../src/views/ConsultandoFuentes.vue'
import ContactarAsesor from '../src/views/ContactarAsesor.vue'
import DetalleDeFuentes from '../src/views/DetalleDeFuentes.vue'
import OfertaCompleta from '../src/views/OfertaCompleta.vue'
import OfertaError from '../src/views/OfertaError.vue'
import OfertaPreliminar from '../src/views/OfertaPreliminar.vue'
import SolicitudYConsentimiento from '../src/views/SolicitudYConsentimiento.vue'
import { useCotizacion } from '../src/composables/useCotizacion'
import { crearRutas } from '../src/router'
import { servidor } from '../src/mocks/node'

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

function crearRouterDePrueba() {
  return createRouter({ history: createMemoryHistory(), routes: crearRutas() })
}

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }))
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

    await wrapper.findAll('button').find((b) => b.text().includes('fallo total'))!.trigger('click')

    expect(cotizacion.captura.documentoIdentidad.endsWith('000')).toBe(true)
    expect(cotizacion.captura.consentimiento).toBe(true)
  })
})

describe('ConsultandoFuentes (W01-02)', () => {
  it('no llama al BFF ni navega si no hay captura todavía', async () => {
    useCotizacion(fetchPrueba).reiniciar()
    const router = crearRouterDePrueba()
    router.push('/cotizacion/consulta')
    await router.isReady()

    montar(ConsultandoFuentes, router)
    await new Promise((r) => setTimeout(r, 0))

    expect(router.currentRoute.value.path).toBe('/cotizacion/consulta')
  })

  it('navega a la oferta completa cuando la captura ya está lista', async () => {
    const cotizacion = useCotizacion(fetchPrueba)
    cotizacion.reiniciar()
    cotizacion.captura.documentoIdentidad = '123'
    cotizacion.captura.valorCredito = '185000000'
    cotizacion.captura.plazoMeses = '180'
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
})

describe('Pantallas de resultado de oferta', () => {
  beforeEach(() => {
    const cotizacion = useCotizacion(fetchPrueba)
    cotizacion.reiniciar()
    cotizacion.captura.plazoMeses = '180'
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
    expect(wrapper.text()).toContain('180 meses')
    expect(wrapper.text()).not.toContain('782/850')
  })

  it('OfertaPreliminar (W01-03b) muestra el rango de prima', async () => {
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

    expect(wrapper.text()).toContain('Oferta preliminar')
    expect(wrapper.text()).toContain('Zona del inmueble')
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
})

describe('DetalleDeFuentes (W01-04)', () => {
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
})

describe('ContactarAsesor (W01-05)', () => {
  it('muestra el resumen real que devuelve contactarAsesor, no un número de solicitud inventado', async () => {
    useCotizacion(fetchPrueba).reiniciar()
    const wrapper = montar(ContactarAsesor, crearRouterDePrueba())

    expect(wrapper.text()).not.toContain('SOL-24817')

    await wrapper.findAll('button').find((b) => b.text() === 'Llamar')!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Un asesor te contactará')
  })
})
