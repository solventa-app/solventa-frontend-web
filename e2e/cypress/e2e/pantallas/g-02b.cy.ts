import { visitarComo } from '../../support/sesion'

// E2E por pantalla individual (KAN-203). Ver convención en pantallas/g-01.cy.ts.
describe('G-02b · Home del Operador (pantalla aislada)', () => {
  beforeEach(() => visitarComo('BACKOFFICE', '/operador'))

  it('existe con la tarjeta de Conciliación de pagos (Siniestros está deshabilitada, fuera de alcance)', () => {
    cy.get('[data-pantalla="G-02b"]').within(() => {
      cy.contains('a', 'Conciliación de pagos').should('have.attr', 'href', '/operador/conciliacion')
      cy.contains('Siniestros').parents('[aria-disabled="true"]').should('exist')
    })
  })

  it('"Cerrar sesión" limpia la sesión y vuelve a /login', () => {
    cy.get('[data-pantalla="G-02b"]').within(() => {
      cy.contains('button', 'Cerrar sesión').click()
    })
    cy.location('pathname').should('eq', '/login')
  })
})
