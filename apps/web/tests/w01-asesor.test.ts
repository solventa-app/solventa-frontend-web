// W01-A1 (KAN-24): un ASESOR captura en W01-01 el nombre y el correo del cliente. Viven solo en memoria, cotizar no
// los envía (viajan en `aceptarOferta`, W03-01) y se borran al cerrar sesión, al reiniciar y si el consentimiento vence.
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import SolicitudYConsentimiento from '../src/views/SolicitudYConsentimiento.vue'
import {
  contactoCapturado,
  correoClienteValido,
  nombreClienteValido,
  useCotizacion,
} from '../src/composables/useCotizacion'
import { useSesion } from '../src/composables/useSesion'
import { crearRutas } from '../src/router'
import { servidor } from '../src/mocks/node'

const cuerpos: string[] = []
const fetchPrueba: typeof fetch = (url, init) => {
  if (typeof init?.body === 'string') cuerpos.push(init.body)
  return fetch(new URL(String(url), 'http://localhost'), init)
}

const montados: VueWrapper[] = []
function montar() {
  const router = createRouter({ history: createMemoryHistory(), routes: crearRutas() })
  const wrapper = mount(SolicitudYConsentimiento, { global: { plugins: [router] } })
  montados.push(wrapper)
  return { wrapper, router }
}

function campo(wrapper: VueWrapper, etiqueta: string) {
  const label = wrapper.findAll('label').find((l) => l.text().startsWith(etiqueta))
  if (!label) return null
  return wrapper.find(`[id="${label.attributes('for')}"]`)
}

async function enviar(wrapper: VueWrapper) {
  await wrapper.find('input[type="checkbox"]').setValue(true)
  await wrapper
    .findAll('button')
    .find((b) => b.text() === 'Consultar oferta')!
    .trigger('click')
  await flushPromises()
}

beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }))
afterEach(() => {
  montados.splice(0).forEach((w) => w.unmount())
  servidor.resetHandlers()
  useSesion(fetchPrueba).cerrarSesion()
  cuerpos.length = 0
})
afterAll(() => servidor.close())

describe('W01-01 con un ASESOR (W01-A1)', () => {
  it('un CLIENTE no ve los campos del contacto', async () => {
    await useSesion(fetchPrueba).iniciarSesion('cliente.demo', 'secreta123')
    const { wrapper } = montar()

    expect(campo(wrapper, 'Nombre completo del cliente')).toBeNull()
    expect(campo(wrapper, 'Correo del cliente')).toBeNull()
  })

  it('un ASESOR los ve arriba del documento y son obligatorios', async () => {
    await useSesion(fetchPrueba).iniciarSesion('asesor.demo', 'secreta123')
    const { wrapper, router } = montar()
    await router.push('/cotizacion')

    const etiquetas = wrapper.findAll('label').map((l) => l.text())
    expect(etiquetas.indexOf('Nombre completo del cliente *')).toBeLessThan(
      etiquetas.indexOf('Documento de identidad *'),
    )

    await enviar(wrapper)
    expect(wrapper.text()).toContain('Ingresa el nombre completo del cliente.')
    expect(wrapper.text()).toContain('Ingresa el correo del cliente.')
    expect(router.currentRoute.value.path).toBe('/cotizacion')
  })

  it('valida el largo del nombre y la forma del correo', async () => {
    await useSesion(fetchPrueba).iniciarSesion('asesor.demo', 'secreta123')
    useCotizacion(fetchPrueba).reiniciar()
    const { wrapper } = montar()

    await campo(wrapper, 'Nombre completo del cliente')!.setValue('A')
    await campo(wrapper, 'Correo del cliente')!.setValue('cliente@correo')
    await enviar(wrapper)

    expect(wrapper.text()).toContain('El nombre debe tener entre 2 y 100 caracteres.')
    expect(wrapper.text()).toContain('Ingresa un correo válido')
  })

  it('valores límite: 1, 2, 100 y 101 caracteres; solo espacios no cuenta', () => {
    expect(nombreClienteValido('A')).toBe(false)
    expect(nombreClienteValido('Al')).toBe(true)
    expect(nombreClienteValido('a'.repeat(100))).toBe(true)
    expect(nombreClienteValido('a'.repeat(101))).toBe(false)
    expect(nombreClienteValido('    ')).toBe(false)
    expect(correoClienteValido('cliente@correo.com')).toBe(true)
    expect(correoClienteValido('cliente correo.com')).toBe(false)
  })

  it('cotizar no envía el nombre ni el correo, y el contacto queda listo para aceptar en minúsculas', async () => {
    await useSesion(fetchPrueba).iniciarSesion('asesor.demo', 'secreta123')
    const cotizacion = useCotizacion(fetchPrueba)
    cotizacion.reiniciar()
    Object.assign(cotizacion.captura, {
      nombreCliente: ' Carlos Restrepo Gómez ',
      correoCliente: 'Cliente@Correo.com',
      documentoIdentidad: '1020304050',
      valorCredito: '185000000',
      plazoMeses: '60',
      direccionInmueble: 'Cra 45 # 22-18',
      consentimiento: true,
    })

    await cotizacion.solicitarOferta()

    expect(cuerpos.some((c) => c.includes('registrarConsentimiento'))).toBe(true)
    expect(cuerpos.some((c) => c.includes('solicitarOferta'))).toBe(true)
    for (const cuerpo of cuerpos) {
      expect(cuerpo).not.toContain('Restrepo')
      expect(cuerpo.toLowerCase()).not.toContain('cliente@correo.com')
    }
    expect(contactoCapturado()).toEqual({ nombre: 'Carlos Restrepo Gómez', correo: 'cliente@correo.com' })
  })

  it('cerrar sesión borra el contacto capturado', async () => {
    const sesion = useSesion(fetchPrueba)
    await sesion.iniciarSesion('asesor.demo', 'secreta123')
    const { captura } = useCotizacion(fetchPrueba)
    captura.nombreCliente = 'Carlos Restrepo Gómez'
    captura.correoCliente = 'cliente@correo.com'

    sesion.cerrarSesion()

    expect(captura.nombreCliente).toBe('')
    expect(captura.correoCliente).toBe('')
    expect(contactoCapturado()).toBeNull()
  })
})
