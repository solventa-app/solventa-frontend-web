// KAN-290: la póliza de auto en la web (W01-01, W01-02, W01-03a/b y la mesa de siniestros). Contra los mocks de MSW,
// que siguen las placas de demo de stub-vehiculos (NOX000 no existe, STU901 hurtado, YZA456 preliminar).
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import DetalleOfertaAuto from '../src/components/DetalleOfertaAuto.vue'
import SolicitudYConsentimiento from '../src/views/SolicitudYConsentimiento.vue'
import { esErrorOferta, esOferta, useCotizacion } from '../src/composables/useCotizacion'
import { crearRutas } from '../src/router'
import { ofertaAutoDeDemo } from '../src/mocks/handlers'
import { servidor } from '../src/mocks/node'

const fetchPrueba: typeof fetch = (url, init) => fetch(new URL(String(url), 'http://localhost'), init)
const montados: VueWrapper[] = []

beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  montados.splice(0).forEach((w) => w.unmount())
  servidor.resetHandlers()
})
afterAll(() => servidor.close())

async function montarFormulario() {
  const router = createRouter({ history: createMemoryHistory(), routes: crearRutas() })
  router.push('/cotizacion')
  await router.isReady()
  const wrapper = mount(SolicitudYConsentimiento, { global: { plugins: [router] } })
  montados.push(wrapper)
  return { wrapper, router }
}

const campo = (wrapper: VueWrapper, prueba: string) => wrapper.find(`[data-prueba="${prueba}"] input`)

describe('W01-01 · cotizar la póliza de auto', () => {
  it('el selector cambia los campos: auto pide placa, kilometraje, ciudad, uso y deducible', async () => {
    useCotizacion(fetchPrueba).reiniciar()
    const { wrapper } = await montarFormulario()
    expect(wrapper.text()).toContain('Monto del crédito hipotecario')
    expect(wrapper.find('[data-prueba="placa"]').exists()).toBe(false)

    await wrapper.find('[data-prueba="producto-auto"]').trigger('click')

    expect(wrapper.find('[data-prueba="producto-auto"]').attributes('aria-checked')).toBe('true')
    expect(wrapper.text()).toContain('Solicitud de seguro de auto todo riesgo')
    expect(wrapper.text()).not.toContain('Monto del crédito hipotecario')
    for (const prueba of ['placa', 'kilometraje', 'ciudad', 'uso', 'deducible']) {
      expect(wrapper.find(`[data-prueba="${prueba}"]`).exists()).toBe(true)
    }
    expect(wrapper.text()).toContain('RUNT')
  })

  it('valida la placa, el kilometraje y la ciudad antes de consultar', async () => {
    useCotizacion(fetchPrueba).reiniciar()
    const { wrapper, router } = await montarFormulario()
    await wrapper.find('[data-prueba="producto-auto"]').trigger('click')
    await campo(wrapper, 'placa').setValue('12ABC')
    await campo(wrapper, 'kilometraje').setValue('300000')
    await wrapper.find('input[type="checkbox"]').setValue(true)
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Consultar oferta')!
      .trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/cotizacion')
    expect(wrapper.text()).toContain('Escribe una placa válida, como ABC123.')
    expect(wrapper.text()).toContain('Escribe un número entre 0 y 200.000.')
    expect(wrapper.text()).toContain('Escribe la ciudad donde circula el vehículo.')
  })

  it('cambiar de producto olvida el consentimiento registrado (otra finalidad)', async () => {
    const cotizacion = useCotizacion(fetchPrueba)
    cotizacion.reiniciar()
    cotizacion.estado.consentimientoId = 'c-vida'
    const { wrapper } = await montarFormulario()
    await wrapper.find('[data-prueba="producto-auto"]').trigger('click')
    expect(cotizacion.estado.consentimientoId).toBeNull()
  })
})

describe('W01-02 · la oferta de auto por el BFF (mocks)', () => {
  async function cotizar(placa: string) {
    const cotizacion = useCotizacion(fetchPrueba)
    cotizacion.reiniciar()
    Object.assign(cotizacion.captura, {
      producto: 'AUTO',
      documentoIdentidad: '1020304050',
      placa,
      kilometrajeAnual: '12000',
      ciudadCirculacion: 'Bogotá',
      consentimiento: true,
    })
    await cotizacion.solicitarOferta()
    return cotizacion.estado.resultado
  }

  it('una placa asegurable devuelve la oferta de auto con vehículo y coberturas', async () => {
    const resultado = await cotizar('abc 123')
    expect(esOferta(resultado) && resultado.producto).toBe('AUTO')
    expect(esOferta(resultado) && resultado.coberturas).toHaveLength(6)
  })

  it('una placa inexistente o un vehículo hurtado vuelven como error con su motivo', async () => {
    const noExiste = await cotizar('NOX000')
    expect(esErrorOferta(noExiste) && noExiste.motivo).toBe('VEHICULO_NO_ENCONTRADO')
    const hurtado = await cotizar('STU901')
    expect(esErrorOferta(hurtado) && hurtado.motivo).toBe('VEHICULO_NO_ASEGURABLE')
  })
})

describe('W01-03 · detalle de la oferta de auto', () => {
  it('muestra el vehículo con la placa enmascarada, las coberturas con deducible y los factores', () => {
    const wrapper = mount(DetalleOfertaAuto, { props: { oferta: ofertaAutoDeDemo('COMPLETA') } })
    montados.push(wrapper)
    expect(wrapper.text()).toContain('MAZDA 3 GRAND TOURING · 2024')
    expect(wrapper.get('[data-prueba="placa-enmascarada"]').text()).toBe('ABC•••')
    const coberturas = wrapper.findAll('[data-prueba="coberturas"] li')
    expect(coberturas).toHaveLength(6)
    expect(coberturas[0].text()).toContain('Responsabilidad civil extracontractual')
    expect(coberturas[2].text()).toContain('deducible 10 % mín. 1 SMMLV')
    expect(coberturas[5].text()).toContain('Incluida')
    expect(wrapper.findAll('[data-prueba="factores"] li')).toHaveLength(7)
    expect(wrapper.text()).toContain('Siniestros de los últimos 3 años')
  })
})

vi.setConfig({ testTimeout: 10_000 })
