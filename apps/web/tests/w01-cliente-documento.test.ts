import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { useCotizacion } from '../src/composables/useCotizacion'
import { useSesion } from '../src/composables/useSesion'
import SolicitudYConsentimiento from '../src/views/SolicitudYConsentimiento.vue'

// T6 (W03-34): el CLIENTE con documento en su cuenta lo ve enmascarado y de solo lectura.
describe('W01-01 · documento de la cuenta del cliente', () => {
  const originalFetch = globalThis.fetch
  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  async function montar(rol: 'CLIENTE' | 'ASESOR', documentoEnmascarado: string | null) {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ data: { yo: { documentoEnmascarado } } }))) as typeof fetch
    useSesion().estado.rol = rol
    useCotizacion().reiniciar()
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/cotizacion', component: SolicitudYConsentimiento }],
    })
    router.push('/cotizacion')
    await router.isReady()
    const w = mount(SolicitudYConsentimiento, { global: { plugins: [router] } })
    await flushPromises()
    return w
  }

  it('muestra el documento de la cuenta de solo lectura', async () => {
    const w = await montar('CLIENTE', '••••3040')
    const campo = w.find('[data-prueba="documento-de-cuenta"]')
    expect(campo.exists()).toBe(true)
    expect(w.html()).toContain('••••3040')
    expect(w.text()).toContain('no se puede cambiar')
    w.unmount()
  })

  it('sin documento en la cuenta el campo sigue editable', async () => {
    const w = await montar('CLIENTE', null)
    expect(w.find('[data-prueba="documento-de-cuenta"]').exists()).toBe(false)
    w.unmount()
  })

  it('el asesor siempre escribe el documento', async () => {
    const w = await montar('ASESOR', '••••3040')
    expect(w.find('[data-prueba="documento-de-cuenta"]').exists()).toBe(false)
    w.unmount()
  })
})
