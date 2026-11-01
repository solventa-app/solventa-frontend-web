import { flushPromises, mount } from '@vue/test-utils'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import PerfilSocio from '../src/views/PerfilSocio.vue'
import { CLAVE_TOKEN_SOCIO, restaurarSesionSocio, useSesionSocio } from '../src/composables/useSesionSocio'
import { cambiarIdioma, idioma } from '../src/i18n'
import { servidor } from '../src/mocks/node'
import { NOMBRE_SOCIO_DEMO, restablecerSociosDePrueba, tokenSocioDeDemo } from '../src/mocks/socios'

function router() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/socios/perfil', component: PerfilSocio },
      { path: '/socios/panel', component: { template: '<div />' } },
      { path: '/socios/documentacion', component: { template: '<div />' } },
      { path: '/socios/ingreso', component: { template: '<div />' } },
    ],
  })
}

beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }))
beforeEach(() => restablecerSociosDePrueba())
afterEach(() => {
  servidor.resetHandlers()
  useSesionSocio().cerrarSesion()
  cambiarIdioma('ES')
})
afterAll(() => servidor.close())

describe('W07-05 · Perfil del socio', () => {
  async function montar() {
    const r = router()
    r.push('/socios/perfil')
    await r.isReady()
    const wrapper = mount(PerfilSocio, { global: { plugins: [r] } })
    await flushPromises()
    return { wrapper, r }
  }

  // Abre la sesión técnica con un token de demostración y trae el nombre desde la API (mock).
  async function abrirSesion() {
    const sesion = useSesionSocio((url, init) => fetch(new URL(String(url), 'http://localhost'), init))
    sessionStorage.setItem(CLAVE_TOKEN_SOCIO, tokenSocioDeDemo('socio-demo', 'PRODUCCION'))
    restaurarSesionSocio()
    await sesion.cargarNombre()
    return { sesion }
  }

  it('vive en el marco fijo del portal con la pestaña Perfil activa y datos de solo lectura', async () => {
    const { sesion } = await abrirSesion()
    expect(sesion.sesionActiva()).toBe(true)
    const { wrapper } = await montar()
    expect(wrapper.find('[data-pantalla="W07-05"]').exists()).toBe(true)
    expect(wrapper.get('[data-pantalla="W07-05"]').classes()).toContain('h-screen')
    const activa = wrapper.get('[role="tab"][aria-selected="true"]')
    expect(activa.text()).toBe('Perfil')
    expect(wrapper.get('[data-dato="nombre-campo"]').text()).toBe(NOMBRE_SOCIO_DEMO)
    expect(wrapper.get('[data-dato="id-campo"]').text()).not.toBe('—')
    expect(wrapper.findAll('main input, main textarea')).toHaveLength(0)
  })

  it('las preferencias solo llevan idioma y moneda, sin país, y el idioma cambia toda la pantalla', async () => {
    await abrirSesion()
    const { wrapper } = await montar()
    const bloque = wrapper.get('[data-bloque="preferencias"]')
    expect(bloque.text()).toContain('Idioma')
    expect(bloque.text()).toContain('Moneda')
    expect(bloque.text()).not.toMatch(/Pa[ií]s/)
    cambiarIdioma('EN')
    await flushPromises()
    expect(idioma.value).toBe('EN')
    expect(wrapper.get('[data-bloque="preferencias"]').text()).toContain('Preferences')
    expect(wrapper.get('[role="tab"][aria-selected="true"]').text()).toBe('Profile')
  })
})
