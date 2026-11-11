import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ModalInactividad from '../src/components/ui/ModalInactividad.vue'
import { detener, iniciarInactividad, useInactividad } from '../src/composables/useInactividad'
import { alSesionVencida, useSesion } from '../src/composables/useSesion'
import { tokenDeDemo } from '../src/mocks/handlers'

async function abrirSesion() {
  const sesion = useSesion(async (_u, init) => {
    const cuerpo = JSON.parse(String(init?.body ?? '{}')) as { query?: string }
    const dato = cuerpo.query?.includes('iniciarSesion')
      ? {
          iniciarSesion: {
            __typename: 'Sesion',
            token: tokenDeDemo('cliente.demo', 'CLIENTE'),
            refreshExpiraEn: null,
            usuario: { nombre: null },
          },
        }
      : { cerrarSesion: true }
    return new Response(JSON.stringify({ data: dato }), { status: 200 })
  })
  await sesion.iniciarSesion('cliente.demo', 'x')
  return sesion
}

describe('inactividad de la sesión (G-04b)', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    detener()
    useSesion().cerrarSesion()
    alSesionVencida(null)
    vi.useRealTimers()
  })

  it('avisa un minuto antes y la actividad suelta no lo cierra', async () => {
    await abrirSesion()
    iniciarInactividad({ limiteMs: 120_000, avisoMs: 60_000 })

    await vi.advanceTimersByTimeAsync(30_000)
    window.dispatchEvent(new Event('pointerdown'))
    await vi.advanceTimersByTimeAsync(30_000)
    expect(useInactividad().estado.avisando).toBe(false)

    await vi.advanceTimersByTimeAsync(61_000)
    expect(useInactividad().estado.avisando).toBe(true)
    window.dispatchEvent(new Event('pointerdown'))
    await vi.advanceTimersByTimeAsync(1_000)
    expect(useInactividad().estado.avisando).toBe(true)
  })

  it('«Seguir conectado» cierra el aviso y reinicia la cuenta', async () => {
    await abrirSesion()
    iniciarInactividad({ limiteMs: 120_000, avisoMs: 60_000 })
    await vi.advanceTimersByTimeAsync(61_000)
    expect(useInactividad().estado.avisando).toBe(true)

    useInactividad().seguirConectado()
    await vi.advanceTimersByTimeAsync(1_000)

    expect(useInactividad().estado.avisando).toBe(false)
    expect(useSesion().sesionActiva()).toBe(true)
  })

  it('sin hacer nada cierra la sesión con el aviso de inactividad y vuelve al ingreso', async () => {
    const alVencer = vi.fn()
    alSesionVencida(alVencer)
    const sesion = await abrirSesion()
    iniciarInactividad({ limiteMs: 120_000, avisoMs: 60_000 })

    await vi.advanceTimersByTimeAsync(121_000)
    await flushPromises()

    expect(sesion.estado.token).toBeNull()
    expect(sesion.estado.aviso).toBe('inactividad')
    expect(alVencer).toHaveBeenCalled()
  })

  it('el modal anuncia la cuenta regresiva y emite las dos opciones', async () => {
    const wrapper = mount(ModalInactividad, { props: { abierto: true, segundos: 42 } })
    expect(wrapper.get('[role="timer"]').text()).toContain('42')
    const botones = wrapper.findAll('button')
    await botones[0]!.trigger('click')
    await botones[1]!.trigger('click')
    expect(wrapper.emitted('seguir')).toHaveLength(1)
    expect(wrapper.emitted('cerrar')).toHaveLength(1)
  })
})
