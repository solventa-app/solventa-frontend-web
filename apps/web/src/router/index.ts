import { createRouter, createWebHistory, type RouteRecordRaw, type RouterHistory } from 'vue-router'
import { useSesion } from '../composables/useSesion'
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

  // Correo y pasarela simulados de HU-W03, solo con los mocks (decisión D-5): no entran al build de producción.
  if (import.meta.env.MODE === 'mock') {
    rutas.push({ path: '/dev/correo', component: () => import('../views/dev/BuzonSimulado.vue') })
    rutas.push({ path: '/dev/pasarela/:sesion', component: () => import('../views/dev/PasarelaSimulada.vue') })
  }

  rutas.push({ path: '/', redirect: '/login' })
  return rutas
}

export function crearRouter(history: RouterHistory = createWebHistory()) {
  const router = createRouter({ history, routes: crearRutas() })

  // Sin sesión vigente se vuelve a G-01; con un rol sin acceso, al home de ese rol. El BFF aplica los
  // mismos permisos del lado del servidor: esto solo evita mostrar pantallas que van a fallar.
  router.beforeEach((destino) => {
    const roles = destino.meta.pantalla?.roles
    if (!roles) return true
    const { estado, sesionActiva, cerrarSesion, rutaInicio } = useSesion()
    if (!sesionActiva()) {
      cerrarSesion()
      return '/login'
    }
    return estado.rol && roles.includes(estado.rol) ? true : rutaInicio()
  })

  return router
}
