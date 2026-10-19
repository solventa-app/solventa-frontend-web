import { visitarComo } from '../../support/sesion'

// E2E por pantalla individual (KAN-203). Ver convención en pantallas/g-01.cy.ts.
describe('G-02 · Home del Cliente (pantalla aislada)', () => {
  beforeEach(() => visitarComo('CLIENTE', '/inicio'))

  it('existe con sus 3 tarjetas de acceso', () => {
    cy.get('[data-pantalla="G-02"]').within(() => {
      cy.contains('Hola,').should('exist')
      cy.contains('a', 'Nueva cotización').should('have.attr', 'href', '/cotizacion')
      cy.contains('a', 'Mis pólizas').should('have.attr', 'href', '/polizas')
      cy.contains('a', 'Fuentes consultadas').should('have.attr', 'href', '/cotizacion/fuentes')
    })
  })

  it('"Cerrar sesión" vuelve a /login', () => {
    cy.get('[data-pantalla="G-02"]').within(() => {
      cy.contains('button', 'Cerrar sesión').click()
    })
    // G-04: se confirma en el modal, que muestra el nombre de quien cierra.
    cy.get('[role="dialog"]').contains('button', 'Cerrar sesión').click()
    cy.location('pathname').should('eq', '/login')
  })
})
