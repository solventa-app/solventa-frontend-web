import { http, HttpResponse } from 'msw'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import HeaderPantalla from '../src/components/ui/HeaderPantalla.vue'
import MiPerfil from '../src/views/MiPerfil.vue'
import { useSesion } from '../src/composables/useSesion'
import { servidor } from '../src/mocks/node'

const fetchPrueba: typeof fetch = (url, init) => fetch(new URL(String(url), 'http://localhost'), init)

function crearRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: { template: '<div />' } },
      { path: '/inicio', component: { template: '<div />' } },
      { path: '/operador', component: { template: '<div />' } },
      { path: '/perfil', component: MiPerfil },
    ],
  })
}

const montados: VueWrapper[] = []

describe('G-05 · Mi perfil', () => {
  beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }))
  afterEach(() => {
    montados.forEach((w) => w.unmount())
    montados.length = 0
    servidor.resetHandlers()
    useSesion().cerrarSesion()
  })
  afterAll(() => servidor.close())

  async function montarPerfil() {
    const router = crearRouter()
    router.push('/perfil')
    await router.isReady()
    const wrapper = mount(MiPerfil, { props: { fetchFn: fetchPrueba }, global: { plugins: [router] } })
    montados.push(wrapper)
    await flushPromises()
    await vi.waitFor(() => expect(wrapper.find('[data-dato="nombre-campo"]').exists()).toBe(true))
    return { wrapper, router }
  }

  it('muestra los datos reales de `yo`: nombre, cédula, correo, rol y fecha de registro', async () => {
    await useSesion(fetchPrueba).iniciarSesion('admin.solventa', 'secreta123')
    const { wrapper } = await montarPerfil()

    expect(wrapper.find('[data-pantalla="G-05"]').exists()).toBe(true)
    expect(wrapper.find('[data-dato="usuario"]').exists()).toBe(false)
    expect(wrapper.get('[data-dato="nombre-campo"]').text()).toBe('Admin Solventa')
    // El operador no tiene cédula ni correo: se ve «—», nunca el alias.
    expect(wrapper.get('[data-dato="documento-campo"]').text()).toBe('—')
    expect(wrapper.get('[data-dato="correo-campo"]').text()).toBe('—')
    expect(wrapper.get('[data-dato="rol"]').text()).toBe('Operador')
    expect(wrapper.get('[data-dato="nombre"]').text()).not.toBe('')
    expect(wrapper.get('[data-dato="registro"]').text()).toMatch(/\d{4}/)
    expect(wrapper.text()).toContain('Cuenta activa')
    expect(wrapper.findAll('h1')).toHaveLength(1)
  })

  it('el cliente ve su cédula enmascarada y su correo, bloqueados y sin campos de edición', async () => {
    await useSesion(fetchPrueba).iniciarSesion('cliente.demo', 'secreta123')
    const { wrapper } = await montarPerfil()

    expect(wrapper.get('[data-dato="documento-campo"]').text()).toBe('10••••3040')
    expect(wrapper.get('[data-dato="correo-campo"]').text()).toBe('cliente.demo@correo.com')
    expect(wrapper.findAll('main input, main textarea')).toHaveLength(0)
  })

  it('si el BFF falla muestra un mensaje amable, nunca un error técnico', async () => {
    await useSesion(fetchPrueba).iniciarSesion('admin.solventa', 'secreta123')
    servidor.use(http.post('http://localhost/graphql/web', () => new HttpResponse(null, { status: 500 })))
    const router = crearRouter()
    router.push('/perfil')
    await router.isReady()
    const wrapper = mount(MiPerfil, { props: { fetchFn: fetchPrueba }, global: { plugins: [router] } })
    montados.push(wrapper)
    await vi.waitFor(() => expect(wrapper.find('[role="alert"]').exists()).toBe(true))

    expect(wrapper.get('[role="alert"]').text()).toBe('No pudimos cargar tu perfil en este momento.')
  })

  it('"Volver al inicio" lleva al home de su rol', async () => {
    await useSesion(fetchPrueba).iniciarSesion('admin.solventa', 'secreta123')
    const { wrapper } = await montarPerfil()

    expect(wrapper.get('a[href="/operador"]').text()).toContain('Volver al inicio')
  })

  it('el avatar del header lleva a /perfil', async () => {
    const router = crearRouter()
    router.push('/inicio')
    await router.isReady()
    const wrapper = mount(HeaderPantalla, { global: { plugins: [router] } })
    montados.push(wrapper)

    await wrapper.get('button[aria-label="Mi perfil"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/perfil')
  })
})
