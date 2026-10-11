import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { describe, expect, it } from 'vitest'
import App from '../src/App.vue'
import { crearRutas } from '../src/router'
import { pantallas } from '../src/router/pantallas'

// Pantallas que el plan del Sprint 1 asigna a HU-W01 y HU-W05 (12 en total).
const SPRINT_1 = [
  'G-01', 'G-02', 'G-02a', 'G-02b',
  'W01-01', 'W01-02', 'W01-03a', 'W01-03b', 'W01-03c', 'W01-04', 'W01-05',
  'W05-01',
]

// G-06 no es parte del alcance de ninguna HU del Sprint 1: se agregó (router/pantallas.ts) solo
// como destino honesto de las tarjetas "Mis pólizas"/"Pólizas emitidas" de los homes (G-02/G-02a),
// que de otro modo no tenían a dónde llevar al hacer clic (cae en PantallaPendiente, no un enlace
// roto). Se cuenta aparte en vez de inflar el catálogo de 12 pantallas del Sprint 1.
const RUTAS_FUERA_DE_SPRINT_1 = ['G-06']

describe('catálogo de pantallas', () => {
  it('cubre exactamente las 12 pantallas del Sprint 1 (más las rutas honestas fuera de sprint)', () => {
    const idsEsperados = [...SPRINT_1, ...RUTAS_FUERA_DE_SPRINT_1].sort()
    expect(pantallas.map((p) => p.id).sort()).toEqual(idsEsperados)
  })

  it('no repite ids ni rutas', () => {
    expect(new Set(pantallas.map((p) => p.id)).size).toBe(pantallas.length)
    expect(new Set(pantallas.map((p) => p.ruta)).size).toBe(pantallas.length)
  })
})

describe('router', () => {
  it.each(pantallas)('renderiza $id en $ruta', async (pantalla) => {
    const router = createRouter({ history: createMemoryHistory(), routes: crearRutas() })
    router.push(pantalla.ruta)
    await router.isReady()

    const app = mount(App, { global: { plugins: [router] } })
    await new Promise((r) => setTimeout(r, 0)) // resuelve el componente cargado en diferido

    expect(app.find(`[data-pantalla="${pantalla.id}"]`).exists()).toBe(true)
  })

  it('redirige / a /login', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes: crearRutas() })
    router.push('/')
    await router.isReady()
    expect(router.currentRoute.value.path).toBe('/login')
  })
})
