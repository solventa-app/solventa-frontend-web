import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
  type RouterHistory,
} from 'vue-router'
import { pantallas, type Pantalla } from './pantallas'

declare module 'vue-router' {
  interface RouteMeta {
    pantalla?: Pantalla
  }
}

export function crearRutas(): RouteRecordRaw[] {
  const rutas: RouteRecordRaw[] = pantallas.map((pantalla) => ({
    path: pantalla.ruta,
    name: pantalla.id,
    component: pantalla.componente ?? (() => import('../views/PantallaPendiente.vue')),
    meta: { pantalla },
  }))

  // Índice de pantallas e índice de componentes solo en desarrollo: sirven para revisar el
  // prototipo y la librería de componentes (D-F1) sin navegar a mano.
  if (import.meta.env.DEV) {
    rutas.push({ path: '/_pantallas', component: () => import('../views/IndicePantallas.vue') })
    rutas.push({ path: '/_componentes', component: () => import('../views/IndiceComponentes.vue') })
  }

  rutas.push({ path: '/', redirect: '/login' })
  return rutas
}

export function crearRouter(history: RouterHistory = createWebHistory()) {
  return createRouter({ history, routes: crearRutas() })
}
