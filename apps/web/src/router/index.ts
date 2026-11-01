import { createRouter, createWebHistory, type RouteRecordRaw, type RouterHistory } from 'vue-router'
import { esperarRestauracion, useSesion } from '../composables/useSesion'
import { useSesionSocio } from '../composables/useSesionSocio'
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

  // Firma y pago del CLIENTE en su sesión (T7, W03-33): las mismas cuatro páginas del enlace, bajo la propuesta y con
  // sesión de CLIENTE. No son pantallas nuevas del catálogo: reutilizan los componentes de W03-02, 02b, 03 y 04.
  for (const pantalla of pantallas.filter((p) => ['W03-02', 'W03-02b', 'W03-03', 'W03-04'].includes(p.id))) {
    rutas.push({
      path: `/propuestas/:propuestaId${pantalla.ruta}`,
      name: `${pantalla.id}-sesion`,
      component: pantalla.componente ?? (() => import('../views/PantallaPendiente.vue')),
      meta: { pantalla: { ...pantalla, roles: ['CLIENTE'] } },
    })
  }

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

  // T22: ruta para provocar un error y ver que llega a Sentry; nunca en producción.
  if (import.meta.env.VITE_AMBIENTE !== 'production') {
    rutas.push({ path: '/prueba-sentry', component: () => import('../views/dev/PruebaSentry.vue') })
  }

  rutas.push({ path: '/', redirect: '/login' })
  return rutas
}

export function crearRouter(history: RouterHistory = createWebHistory()) {
  const router = createRouter({ history, routes: crearRutas() })

  // Sin sesión vigente se vuelve a G-01; con un rol sin acceso, al home de ese rol. El BFF aplica los
  // mismos permisos del lado del servidor: esto solo evita mostrar pantallas que van a fallar.
  router.beforeEach(async (destino) => {
    // Portal de socios (HU-W07): sin sesión técnica vigente se vuelve a su login, con el aviso si venció.
    if (destino.meta.pantalla?.socio) {
      const sesionSocio = useSesionSocio()
      if (sesionSocio.sesionActiva()) return true
      if (sesionSocio.estado.token) sesionSocio.vencerSesion()
      return '/socios/ingreso'
    }
    const roles = destino.meta.pantalla?.roles
    if (!roles) return true
    const { estado, sesionActiva, cerrarSesion, rutaInicio } = useSesion()
    // Al abrir la web puede estar renovándose el acceso con el refresh (T22): se espera antes de decidir.
    await esperarRestauracion()
    if (!sesionActiva()) {
      cerrarSesion()
      return '/login'
    }
    return estado.rol && roles.includes(estado.rol) ? true : rutaInicio()
  })

  return router
}
