// G-07 y G-08 · Olvidé mi contraseña (KAN-26, contrato v0.43).
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import ReglasClave from '../src/components/ui/ReglasClave.vue'
import { olvidarTokenDeRestablecimiento } from '../src/composables/useRestablecerClave'
import { servidor } from '../src/mocks/node'
import { crearRutas } from '../src/router'
import IngresoConRol from '../src/views/IngresoConRol.vue'
import OlvideClave from '../src/views/OlvideClave.vue'
import RestablecerClave from '../src/views/RestablecerClave.vue'
import { evaluarClave } from '../src/utils/reglasClave'

const montados: VueWrapper[] = []
const crearRouterDePrueba = () => createRouter({ history: createMemoryHistory(), routes: crearRutas() })
function montar(componente: Parameters<typeof mount>[0], router: Router) {
  const wrapper = mount(componente, { global: { plugins: [router] } })
  montados.push(wrapper)
  return wrapper
}
async function esperar(ms = 30) {
  await flushPromises()
  await new Promise((r) => setTimeout(r, ms))
  await flushPromises()
}

beforeAll(() => {
  servidor.listen({ onUnhandledFrame: 'error' })
  const fetchConMsw = globalThis.fetch
  vi.stubGlobal('fetch', (url: RequestInfo | URL, init?: RequestInit) =>
    fetchConMsw(typeof url === 'string' ? new URL(url, 'http://localhost') : url, init),
  )
})
afterEach(() => {
  montados.splice(0).forEach((w) => w.unmount())
  servidor.resetHandlers()
  olvidarTokenDeRestablecimiento()
  window.history.replaceState(null, '', '/')
})
afterAll(() => servidor.close())

function abrirEnlace(token: string) {
  window.history.replaceState(null, '', `/restablecer-clave#t=${token}`)
}

describe('reglas de la clave', () => {
  it('son las mismas que exige el backend', () => {
    expect(evaluarClave('Abcdef1!').cumple).toBe(true)
    expect(evaluarClave('abcdef1!').mayuscula).toBe(false)
    expect(evaluarClave('ABCDEF1!').minuscula).toBe(false)
    expect(evaluarClave('Abcdefg1').especial).toBe(false)
    expect(evaluarClave('Ab1!').longitud).toBe(false)
    expect(evaluarClave('Ñandú-ñu1').cumple).toBe(true)
    expect(evaluarClave('A'.repeat(129) + 'a!').longitud).toBe(false)
  })

  it('los indicadores marcan cada regla y la coincidencia', async () => {
    const wrapper = mount(ReglasClave, { props: { clave: 'Abcdef1!', confirmacion: 'otra' } })
    const marca = (id: string) => wrapper.get(`[data-regla="${id}"]`).attributes('data-cumple')
    expect(['longitud', 'mayuscula', 'minuscula', 'especial'].map(marca)).toEqual(['true', 'true', 'true', 'true'])
    expect(marca('coincide')).toBe('false')
    await wrapper.setProps({ confirmacion: 'Abcdef1!' })
    expect(marca('coincide')).toBe('true')
  })
})

describe('G-07 · pedir el enlace', () => {
  it('pide solo el correo y responde igual sin decir si la cuenta existe', async () => {
    const router = crearRouterDePrueba()
    const wrapper = montar(OlvideClave, router)
    expect(wrapper.findAll('input')).toHaveLength(1)
    const boton = wrapper.get('button[aria-busy]')
    expect(boton.attributes('disabled')).toBeDefined()
    await wrapper.get('input').setValue('nadie@ejemplo.com')
    await boton.trigger('click')
    await esperar()
    expect(wrapper.get('[data-testid="olvide-enviado"]').text()).toContain('Si hay una cuenta con ese correo')
  })

  it('G-01 enlaza a la pantalla y avisa cuando la clave cambió', async () => {
    const router = crearRouterDePrueba()
    await router.push('/login?clave=cambiada')
    const wrapper = montar(IngresoConRol, router)
    expect(wrapper.find('a[href="/olvide-clave"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="aviso-sesion-vencida"]').text()).toContain('Cambiaste tu contraseña')
  })
})

describe('G-08 · nueva contraseña', () => {
  it('quita el token de la barra de direcciones y lo manda en la cabecera', async () => {
    abrirEnlace('TokenDePrueba-valido-123456')
    const router = crearRouterDePrueba()
    const wrapper = montar(RestablecerClave, router)
    await esperar()
    expect(window.location.hash).toBe('')
    expect(wrapper.findAll('input[type="password"]')).toHaveLength(2)
  })

  it('exige las reglas y que las dos claves coincidan antes de habilitar «Guardar»', async () => {
    abrirEnlace('TokenDePrueba-valido-123456')
    const router = crearRouterDePrueba()
    const wrapper = montar(RestablecerClave, router)
    await esperar()
    const [clave, confirmacion] = wrapper.findAll('input')
    const guardar = wrapper.get('button[aria-busy]')
    await clave.setValue('debil')
    await confirmacion.setValue('debil')
    expect(guardar.attributes('disabled')).toBeDefined()
    await clave.setValue('Nueva-clave-9')
    expect(wrapper.text()).toContain('Las contraseñas no coinciden.')
    expect(guardar.attributes('disabled')).toBeDefined()
    await confirmacion.setValue('Nueva-clave-9')
    expect(guardar.attributes('disabled')).toBeUndefined()
  })

  it('al guardar vuelve a G-01 con el aviso', async () => {
    abrirEnlace('TokenDePrueba-valido-123456')
    const router = crearRouterDePrueba()
    const wrapper = montar(RestablecerClave, router)
    await esperar()
    const [clave, confirmacion] = wrapper.findAll('input')
    await clave.setValue('Nueva-clave-9')
    await confirmacion.setValue('Nueva-clave-9')
    await wrapper.get('button[aria-busy]').trigger('click')
    await esperar()
    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.clave).toBe('cambiada')
  })

  it('un enlace vencido o sin token muestra el mismo mensaje y deja pedir otro', async () => {
    for (const token of ['TokenVencido-123456789012', null]) {
      if (token) abrirEnlace(token)
      const router = crearRouterDePrueba()
      const wrapper = montar(RestablecerClave, router)
      await esperar()
      expect(wrapper.get('[data-testid="enlace-invalido"]').text()).toContain('El enlace no es válido o ya venció')
      expect(wrapper.find('a[href="/olvide-clave"]').exists()).toBe(true)
      expect(wrapper.find('input').exists()).toBe(false)
      olvidarTokenDeRestablecimiento()
    }
  })
})
