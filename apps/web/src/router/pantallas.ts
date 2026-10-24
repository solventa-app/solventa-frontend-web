// Catálogo de pantallas del Sprint 1 (plano v21 del prototipo de Figma). Es la fuente de verdad de las
// rutas: el router, el índice de desarrollo y las pruebas salen de aquí. Cada pantalla arranca como
// `PantallaPendiente` y se reemplaza por su vista real (`componente`) al construirla.
import type { Rol } from '../composables/useSesion'

const CLIENTE_O_ASESOR: Rol[] = ['CLIENTE', 'ASESOR']

export interface Pantalla {
  id: string
  ruta: string
  nombre: string
  historia: 'HU-W01' | 'HU-W04' | 'HU-W05' | 'Global'
  sprint: 1 | 2 | 3
  /** Criterios de aceptación que cubre (CA-*), ver docs/plan-frontend.md. */
  criterios: string[]
  /** Roles con acceso (ver router/index.ts). Si se omite, la pantalla es pública. */
  roles?: Rol[]
  /** Ruta concreta para enlazar o probar una ruta con parámetros (p. ej. `:id`). Si se omite, se usa `ruta`. */
  rutaEjemplo?: string
  /** Si se omite, se usa `PantallaPendiente`. */
  componente?: () => Promise<unknown>
}

export const pantallas: Pantalla[] = [
  {
    id: 'G-01',
    ruta: '/login',
    nombre: 'Ingreso con selector de rol',
    historia: 'Global',
    sprint: 1,
    criterios: [],
    componente: () => import('../views/IngresoConRol.vue'),
  },
  {
    id: 'G-02',
    ruta: '/inicio',
    nombre: 'Inicio del cliente',
    historia: 'Global',
    sprint: 1,
    roles: ['CLIENTE'],
    criterios: [],
    componente: () => import('../views/HomeCliente.vue'),
  },
  {
    id: 'G-02a',
    ruta: '/asesor',
    nombre: 'Inicio del asesor comercial',
    historia: 'Global',
    sprint: 1,
    roles: ['ASESOR'],
    criterios: ['CA-W01-11'],
    componente: () => import('../views/HomeAsesor.vue'),
  },
  {
    id: 'G-02b',
    ruta: '/operador',
    nombre: 'Inicio del operador (back-office)',
    historia: 'Global',
    sprint: 1,
    roles: ['BACKOFFICE'],
    criterios: ['CA-W05-01'],
    componente: () => import('../views/HomeOperador.vue'),
  },
  {
    id: 'G-05',
    ruta: '/perfil',
    nombre: 'Mi perfil',
    historia: 'Global',
    sprint: 1,
    roles: ['CLIENTE', 'ASESOR', 'BACKOFFICE'],
    criterios: [],
    componente: () => import('../views/MiPerfil.vue'),
  },
  // G-06 no tiene pantalla propia todavía (ninguna HU de este sprint cubre consultar pólizas
  // emitidas): se registra solo como destino honesto de las tarjetas "Mis pólizas"/"Pólizas
  // emitidas" de los homes (G-02/G-02a), que sin esto no tenían a dónde llevar al hacer clic.
  {
    id: 'G-06',
    ruta: '/polizas',
    nombre: 'Mis pólizas',
    historia: 'Global',
    sprint: 1,
    roles: CLIENTE_O_ASESOR,
    criterios: [],
  },
  {
    id: 'W01-01',
    ruta: '/cotizacion',
    nombre: 'Captura de datos y consentimiento',
    historia: 'HU-W01',
    sprint: 1,
    roles: CLIENTE_O_ASESOR,
    criterios: ['CA-W01-01', 'CA-W01-02', 'CA-W01-08'],
    componente: () => import('../views/SolicitudYConsentimiento.vue'),
  },
  {
    id: 'W01-02',
    ruta: '/cotizacion/consulta',
    nombre: 'Consulta de fuentes en curso',
    historia: 'HU-W01',
    sprint: 1,
    roles: CLIENTE_O_ASESOR,
    criterios: ['CA-W01-02'],
    componente: () => import('../views/ConsultandoFuentes.vue'),
  },
  {
    id: 'W01-03a',
    ruta: '/cotizacion/oferta',
    nombre: 'Oferta completa',
    historia: 'HU-W01',
    sprint: 1,
    roles: CLIENTE_O_ASESOR,
    criterios: ['CA-W01-03'],
    componente: () => import('../views/OfertaCompleta.vue'),
  },
  {
    id: 'W01-03b',
    ruta: '/cotizacion/oferta-preliminar',
    nombre: 'Oferta preliminar (degradada)',
    historia: 'HU-W01',
    sprint: 1,
    roles: CLIENTE_O_ASESOR,
    criterios: ['CA-W01-04'],
    componente: () => import('../views/OfertaPreliminar.vue'),
  },
  {
    id: 'W01-03c',
    ruta: '/cotizacion/error',
    nombre: 'Error con reintento y asesor',
    historia: 'HU-W01',
    sprint: 1,
    roles: CLIENTE_O_ASESOR,
    criterios: ['CA-W01-05'],
    componente: () => import('../views/OfertaError.vue'),
  },
  {
    id: 'W01-04',
    ruta: '/cotizacion/fuentes',
    nombre: 'Detalle de fuentes consultadas',
    historia: 'HU-W01',
    sprint: 1,
    roles: CLIENTE_O_ASESOR,
    criterios: ['CA-W01-06'],
    componente: () => import('../views/DetalleDeFuentes.vue'),
  },
  {
    id: 'W01-05',
    ruta: '/cotizacion/asesor',
    nombre: 'Contacto con asesor',
    historia: 'HU-W01',
    sprint: 1,
    roles: CLIENTE_O_ASESOR,
    criterios: ['CA-W01-07'],
    componente: () => import('../views/ContactarAsesor.vue'),
  },
  {
    id: 'W05-01',
    ruta: '/operador/conciliacion',
    nombre: 'Conciliación de pagos',
    historia: 'HU-W05',
    sprint: 1,
    roles: ['BACKOFFICE'],
    criterios: ['CA-W05-01', 'CA-W05-02'],
    componente: () => import('../views/ConciliacionDePagos.vue'),
  },
  // HU-W04 · Mesa de siniestros (KAN-27). Criterios CA-W04 propuestos en docs/plan-ejecucion-hu-w04-siniestros.md.
  // W04-01 ya tiene vista (bloque 2); las demás llegan en los bloques 3 a 5.
  {
    id: 'W04-01',
    ruta: '/operador/siniestros',
    nombre: 'Bandeja de siniestros',
    historia: 'HU-W04',
    sprint: 2,
    roles: ['BACKOFFICE'],
    criterios: ['CA-W04-01', 'CA-W04-02', 'CA-W04-03', 'CA-W04-04', 'CA-W04-05', 'CA-W04-06', 'CA-W04-07'],
    componente: () => import('../views/BandejaSiniestros.vue'),
  },
  {
    id: 'W04-02',
    ruta: '/operador/siniestros/:id',
    rutaEjemplo: '/operador/siniestros/sin-01',
    nombre: 'Detalle del siniestro',
    historia: 'HU-W04',
    sprint: 2,
    roles: ['BACKOFFICE'],
    criterios: ['CA-W04-02'],
  },
  {
    id: 'W04-02b',
    ruta: '/operador/siniestros/:id/derivar',
    rutaEjemplo: '/operador/siniestros/sin-01/derivar',
    nombre: 'Derivar a perito',
    historia: 'HU-W04',
    sprint: 2,
    roles: ['BACKOFFICE'],
    criterios: ['CA-W04-04'],
  },
  {
    id: 'W04-03a',
    ruta: '/operador/siniestros/:id/aprobado',
    rutaEjemplo: '/operador/siniestros/sin-01/aprobado',
    nombre: 'Confirmación de aprobación',
    historia: 'HU-W04',
    sprint: 2,
    roles: ['BACKOFFICE'],
    criterios: ['CA-W04-03'],
  },
  {
    id: 'W04-03b',
    ruta: '/operador/siniestros/:id/rechazado',
    rutaEjemplo: '/operador/siniestros/sin-01/rechazado',
    nombre: 'Confirmación de rechazo',
    historia: 'HU-W04',
    sprint: 2,
    roles: ['BACKOFFICE'],
    criterios: ['CA-W04-03'],
  },
  {
    id: 'W04-03c',
    ruta: '/operador/siniestros/:id/derivado',
    rutaEjemplo: '/operador/siniestros/sin-01/derivado',
    nombre: 'Confirmación de derivación',
    historia: 'HU-W04',
    sprint: 2,
    roles: ['BACKOFFICE'],
    criterios: ['CA-W04-04'],
  },
]
