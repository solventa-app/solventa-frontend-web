// Catálogo de pantallas del Sprint 1 (plano v21 del prototipo de Figma). Es la fuente de verdad de las
// rutas: el router, el índice de desarrollo y las pruebas salen de aquí. Cada pantalla arranca como
// `PantallaPendiente` y se reemplaza por su vista real (`componente`) al construirla.

export interface Pantalla {
  id: string
  ruta: string
  nombre: string
  historia: 'HU-W01' | 'HU-W05' | 'Global'
  sprint: 1 | 2 | 3
  /** Criterios de aceptación que cubre (CA-*), ver docs/plan-frontend.md. */
  criterios: string[]
  /** Si se omite, se usa `PantallaPendiente`. */
  componente?: () => Promise<unknown>
}

export const pantallas: Pantalla[] = [
  { id: 'G-01', ruta: '/login', nombre: 'Ingreso con selector de rol', historia: 'Global', sprint: 1, criterios: [] },
  { id: 'G-02', ruta: '/inicio', nombre: 'Inicio del cliente', historia: 'Global', sprint: 1, criterios: [] },
  { id: 'G-02a', ruta: '/asesor', nombre: 'Inicio del asesor comercial', historia: 'Global', sprint: 1, criterios: ['CA-W01-11'] },
  { id: 'G-02b', ruta: '/operador', nombre: 'Inicio del operador (back-office)', historia: 'Global', sprint: 1, criterios: ['CA-W05-01'], componente: () => import('../views/HomeOperador.vue') },
  { id: 'W01-01', ruta: '/cotizacion', nombre: 'Captura de datos y consentimiento', historia: 'HU-W01', sprint: 1, criterios: ['CA-W01-01', 'CA-W01-02', 'CA-W01-08'] },
  { id: 'W01-02', ruta: '/cotizacion/consulta', nombre: 'Consulta de fuentes en curso', historia: 'HU-W01', sprint: 1, criterios: ['CA-W01-02'] },
  { id: 'W01-03a', ruta: '/cotizacion/oferta', nombre: 'Oferta completa', historia: 'HU-W01', sprint: 1, criterios: ['CA-W01-03'] },
  { id: 'W01-03b', ruta: '/cotizacion/oferta-preliminar', nombre: 'Oferta preliminar (degradada)', historia: 'HU-W01', sprint: 1, criterios: ['CA-W01-04'] },
  { id: 'W01-03c', ruta: '/cotizacion/error', nombre: 'Error con reintento y asesor', historia: 'HU-W01', sprint: 1, criterios: ['CA-W01-05'] },
  { id: 'W01-04', ruta: '/cotizacion/fuentes', nombre: 'Detalle de fuentes consultadas', historia: 'HU-W01', sprint: 1, criterios: ['CA-W01-06'] },
  { id: 'W01-05', ruta: '/cotizacion/asesor', nombre: 'Contacto con asesor', historia: 'HU-W01', sprint: 1, criterios: ['CA-W01-07'] },
  { id: 'W05-01', ruta: '/operador/conciliacion', nombre: 'Conciliación de pagos', historia: 'HU-W05', sprint: 1, criterios: ['CA-W05-01', 'CA-W05-02'], componente: () => import('../views/ConciliacionDePagos.vue') },
]
