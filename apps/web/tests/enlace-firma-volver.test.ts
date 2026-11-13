// Volver a la página del enlace de firma sin el token en la URL ni en memoria (HU-W03).
// Al recargar o al volver con «Atrás» desde la pasarela de pago, la página se carga de nuevo: el token solo puede
// venir del puente del viaje a la pasarela (sessionStorage), que se lee una vez y se borra.
import { flushPromises, mount } from '@vue/test-utils'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import FirmaElectronica from '../src/views/FirmaElectronica.vue'
import { CLAVE_PUENTE, olvidarEnlace } from '../src/composables/useEnlaceFirma'
import { crearRutas } from '../src/router'
import { servidor } from '../src/mocks/node'
import { restablecerSuscripcionDePrueba } from '../src/mocks/suscripcion'

let fetchOriginal: typeof fetch
beforeAll(() => {
  servidor.listen({ onUnhandledFrame: 'error' })
  fetchOriginal = globalThis.fetch
  globalThis.fetch = ((url: RequestInfo | URL, init?: RequestInit) =>
    fetchOriginal(
      typeof url === 'string' && url.startsWith('/') ? new URL(url, 'http://localhost') : url,
      init,
    )) as typeof fetch
})
afterAll(() => {
  globalThis.fetch = fetchOriginal
  servidor.close()
})

async function abrirSinToken() {
  const router = createRouter({ history: createMemoryHistory(), routes: crearRutas() })
  await router.push('/firma')
  await router.isReady()
  const w = mount(FirmaElectronica, { global: { plugins: [router] }, attachTo: document.body })
  for (let i = 0; i < 30 && w.find('[data-prueba="acepta-terminos"]').exists() === false; i++) {
    await flushPromises()
    await new Promise((r) => setTimeout(r, 10))
  }
  return w
}
const puente = (vence: number) => sessionStorage.setItem(CLAVE_PUENTE, JSON.stringify({ t: 'demo', vence }))

describe('Volver a /firma sin token en la URL ni en memoria', () => {
  beforeEach(() => {
    restablecerSuscripcionDePrueba()
    olvidarEnlace()
    window.location.hash = ''
    sessionStorage.clear()
  })
  afterEach(() => {
    olvidarEnlace()
    sessionStorage.clear()
  })

  it('con el puente de la pasarela vigente reabre la firma y gasta el puente', async () => {
    puente(Date.now() + 10 * 60_000)
    const w = await abrirSinToken()
    expect(w.find('[data-prueba="acepta-terminos"]').exists()).toBe(true)
    expect(w.text()).not.toContain('Este enlace venció')
    expect(sessionStorage.getItem(CLAVE_PUENTE)).toBeNull()
    w.unmount()
  })

  it('sin puente (recarga normal) sigue diciendo que el enlace venció', async () => {
    const w = await abrirSinToken()
    expect(w.text()).toContain('Este enlace venció o ya no es válido')
    w.unmount()
  })

  it('con el puente vencido no lo usa y lo borra', async () => {
    puente(Date.now() - 1000)
    const w = await abrirSinToken()
    expect(w.text()).toContain('Este enlace venció o ya no es válido')
    expect(sessionStorage.getItem(CLAVE_PUENTE)).toBeNull()
    w.unmount()
  })
})
