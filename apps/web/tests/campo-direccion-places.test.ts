// CampoDireccion con Places: direcciones (hipotecario) y ciudades (auto), con las coordenadas de lo elegido.
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Oyente = () => void
interface Lugar {
  place_id?: string
  formatted_address?: string
  name?: string
  geometry?: { location: { lat: () => number; lng: () => number } }
}

let oyente: Oyente | null = null
let opciones: { types?: string[]; fields?: string[]; componentRestrictions?: { country: string } } = {}
let lugar: Lugar = {}

class AutocompleteFalso {
  constructor(_el: HTMLInputElement, op: typeof opciones) {
    opciones = op
  }
  addListener(_evento: string, fn: Oyente) {
    oyente = fn
  }
  getPlace() {
    return lugar
  }
}

async function montar(props: Record<string, unknown>) {
  vi.resetModules()
  vi.stubEnv('VITE_GOOGLE_PLACES_KEY', 'clave-de-prueba')
  ;(window as unknown as { google: unknown }).google = { maps: { places: { Autocomplete: AutocompleteFalso } } }
  const { default: CampoDireccion } = await import('../src/components/ui/CampoDireccion.vue')
  const w = mount(CampoDireccion, { props: { modelValue: '', label: 'Campo', ...props } })
  await flushPromises()
  return w
}

describe('CampoDireccion con Places', () => {
  beforeEach(() => {
    oyente = null
    opciones = {}
    lugar = {}
  })
  afterEach(() => {
    vi.unstubAllEnvs()
    delete (window as unknown as { google?: unknown }).google
  })

  it('una dirección sugiere direcciones del país y devuelve su texto, place_id y coordenadas', async () => {
    const w = await montar({ pais: 'CO' })
    expect(opciones.types).toEqual(['address'])
    expect(opciones.fields).toContain('geometry')
    expect(opciones.componentRestrictions).toEqual({ country: 'co' })

    lugar = {
      place_id: 'p-1',
      formatted_address: 'Cra 7 # 71-21, Bogotá',
      name: 'Cra 7',
      geometry: { location: { lat: () => 4.65, lng: () => -74.06 } },
    }
    oyente?.()
    await flushPromises()

    expect(w.emitted('update:modelValue')?.at(-1)).toEqual(['Cra 7 # 71-21, Bogotá'])
    expect(w.emitted('lugar')?.at(-1)).toEqual(['p-1'])
    expect(w.emitted('coordenadas')?.at(-1)).toEqual([{ latitud: 4.65, longitud: -74.06 }])
    expect(w.text()).toContain('Dirección verificada con Google')
  })

  it('una ciudad sugiere ciudades y deja solo su nombre', async () => {
    const w = await montar({ tipo: 'ciudad', pais: 'CO' })
    expect(opciones.types).toEqual(['(cities)'])

    lugar = {
      place_id: 'c-1',
      formatted_address: 'Medellín, Antioquia, Colombia',
      name: 'Medellín',
      geometry: { location: { lat: () => 6.24, lng: () => -75.58 } },
    }
    oyente?.()
    await flushPromises()

    expect(w.emitted('update:modelValue')?.at(-1)).toEqual(['Medellín'])
    expect(w.emitted('coordenadas')?.at(-1)).toEqual([{ latitud: 6.24, longitud: -75.58 }])
    expect(w.text()).toContain('Ciudad verificada con Google')
  })

  it('escribir a mano borra el lugar y las coordenadas: queda sin verificar', async () => {
    const w = await montar({ tipo: 'ciudad' })
    await w.get('input').setValue('Cali')

    expect(w.emitted('lugar')?.at(-1)).toEqual([null])
    expect(w.emitted('coordenadas')?.at(-1)).toEqual([null])
    expect(w.text()).toContain('Ciudad sin verificar')
  })

  it('una sugerencia sin geometría no inventa coordenadas', async () => {
    const w = await montar({})
    lugar = { place_id: 'p-2', formatted_address: 'Calle 1' }
    oyente?.()
    expect(w.emitted('coordenadas')?.at(-1)).toEqual([null])
  })
})
