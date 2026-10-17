// La sesión se guarda en sessionStorage (apps/web/src/composables/useSesion.ts); igual se navega
// dentro de la SPA tras iniciar sesión por G-01 (pushState +
// popstate, que es lo que escucha vue-router) sin recargar.
//
// Contra los mocks, cualquier clave sirve y el rol sale del alias (ver src/mocks/handlers.ts). Contra
// staging, las credenciales se pasan por entorno: CYPRESS_USUARIO_CLIENTE, CYPRESS_CLAVE_CLIENTE, etc.

export type Rol = 'CLIENTE' | 'ASESOR' | 'BACKOFFICE'

const CHIP: Record<Rol, string> = { CLIENTE: 'Cliente', ASESOR: 'Asesor comercial', BACKOFFICE: 'Operador' }
const HOME: Record<Rol, string> = { CLIENTE: '/inicio', ASESOR: '/asesor', BACKOFFICE: '/operador' }
const USUARIO_DEMO: Record<Rol, string> = { CLIENTE: 'cliente.demo', ASESOR: 'asesor.demo', BACKOFFICE: 'admin.solventa' }

export function ingresar(rol: Rol = 'CLIENTE'): void {
  cy.visit('/login')
  cy.get('[data-pantalla="G-01"]').within(() => {
    cy.contains('label', 'Usuario').parent().find('input').type(Cypress.env(`USUARIO_${rol}`) ?? USUARIO_DEMO[rol])
    cy.get('input[type="password"]').type(Cypress.env(`CLAVE_${rol}`) ?? 'clave-demo-0001', { log: false })
    cy.contains('[role="radio"]', CHIP[rol]).click()
    cy.contains('button', 'Ingresar').click()
  })
  cy.location('pathname').should('eq', HOME[rol])
}

/** Inicia sesión y abre `ruta` sin recargar la página. */
export function visitarComo(rol: Rol, ruta: string): void {
  ingresar(rol)
  if (ruta === HOME[rol]) return
  cy.window().then((win) => {
    win.history.pushState(null, '', ruta)
    win.dispatchEvent(new PopStateEvent('popstate'))
  })
  cy.location('pathname').should('eq', ruta)
}
