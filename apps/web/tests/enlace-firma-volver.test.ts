// Volver a la página del enlace de firma sin el token en la URL ni en memoria (HU-W03).
// Al recargar o al volver con «Atrás» desde la pasarela de pago, la página se carga de nuevo: el token viene de la
// copia de la pestaña (sessionStorage), que dura lo que el enlace.
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

  it('con la copia vigente (recarga o vuelta de la pasarela) reabre la firma y la conserva', async () => {
    puente(Date.now() + 10 * 60_000)
    const w = await abrirSinToken()
    expect(w.find('[data-prueba="acepta-terminos"]').exists()).toBe(true)
    expect(w.text()).not.toContain('Este enlace venció')
    expect(JSON.parse(sessionStorage.getItem(CLAVE_PUENTE)!)).toMatchObject({ t: 'demo' })
    w.unmount()
  })

  it('sin copia (pestaña nueva sin el enlace) dice que abra de nuevo el enlace o pida uno nuevo', async () => {
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
