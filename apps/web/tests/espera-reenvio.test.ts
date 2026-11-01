// Cuenta regresiva común del reenvío de códigos (T23).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { ESPERA_REENVIO_SEGUNDOS, formatearEspera, useEsperaReenvio } from '../src/composables/useEsperaReenvio'

beforeEach(() => vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] }))
afterEach(() => vi.useRealTimers())

describe('formatearEspera', () => {
  it('da m:ss', () => {
    expect(formatearEspera(60)).toBe('1:00')
    expect(formatearEspera(42)).toBe('0:42')
    expect(formatearEspera(5)).toBe('0:05')
    expect(formatearEspera(-3)).toBe('0:00')
  })
})

describe('useEsperaReenvio', () => {
  it('arranca inactiva, cuenta 60 s y se libera al terminar', () => {
    const espera = effectScope().run(() => useEsperaReenvio())!
    expect(espera.activa.value).toBe(false)
    espera.iniciar()
    expect(ESPERA_REENVIO_SEGUNDOS).toBe(60)
    expect(espera.texto.value).toBe('1:00')
    vi.advanceTimersByTime(30_000)
    expect(espera.texto.value).toBe('0:30')
    expect(espera.activa.value).toBe(true)
    vi.advanceTimersByTime(30_000)
    expect(espera.activa.value).toBe(false)
  })

  it('se reinicia con cada envío y acepta los segundos que mande el backend', () => {
    const espera = effectScope().run(() => useEsperaReenvio())!
    espera.iniciar()
    vi.advanceTimersByTime(40_000)
    espera.iniciar()
    expect(espera.restantes.value).toBe(60)
    espera.iniciar(17)
    expect(espera.restantes.value).toBe(17)
    espera.reiniciar()
    expect(espera.activa.value).toBe(false)
  })

  it('al destruir el alcance detiene el reloj', () => {
    const alcance = effectScope()
    const espera = alcance.run(() => useEsperaReenvio())!
    espera.iniciar()
    alcance.stop()
    vi.advanceTimersByTime(10_000)
    expect(espera.restantes.value).toBe(60)
  })
})
