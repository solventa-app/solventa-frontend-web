import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import TarjetaEnlace from '../src/components/TarjetaEnlace.vue'

const fuente = (ruta: string) => readFileSync(resolve(__dirname, '..', ruta), 'utf8')

describe('indicadores de carga (T12)', () => {
  it('la tarjeta de carga del enlace gira el ícono', () => {
    const w = mount(TarjetaEnlace, {
      props: { pantalla: 'X', tituloHeader: 'X', icono: 'progress_activity', titulo: 'Cargando' },
      global: { stubs: { RouterLink: true }, mocks: { $route: {}, $router: {} } },
    })
    expect(w.find('svg.animate-spin').exists()).toBe(true)
  })

  it('ConsultandoFuentes usa una barra indeterminada, no una de ancho fijo con pulso', () => {
    const vista = fuente('src/views/ConsultandoFuentes.vue')
    expect(vista).toContain('barra-indeterminada')
    expect(vista).not.toMatch(/w-2\/3[^"]*animate-pulse/)
    expect(vista).not.toContain('animate-pulse')
  })

  it('con «reducir movimiento» el indicador cambia en vez de congelarse', () => {
    const css = fuente('src/styles/base.css')
    const bloque = css.slice(css.indexOf('prefers-reduced-motion'))
    expect(bloque).toContain('.animate-spin')
    expect(bloque).toContain('carga-alterna')
  })
})
