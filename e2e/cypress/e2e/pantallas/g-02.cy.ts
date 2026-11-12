import { visitarComo } from '../../support/sesion'

// E2E por pantalla individual (KAN-203). Ver convención en pantallas/g-01.cy.ts.
describe('G-02 · Home del Cliente (pantalla aislada)', () => {
  beforeEach(() => visitarComo('CLIENTE', '/inicio'))

  // Q-07 (QA 2026-11-10): el cliente no ve las fuentes consultadas; solo las ve el asesor (G-02a).
  it('existe con sus 2 tarjetas de acceso y sin «Fuentes consultadas»', () => {
    cy.get('[data-pantalla="G-02"]').within(() => {
      cy.contains('Hola,').should('exist')
      cy.contains('a', 'Nueva cotización').should('have.attr', 'href', '/cotizacion')
      cy.contains('a', 'Mis pólizas').should('have.attr', 'href', '/polizas')
      cy.contains('a', 'Fuentes consultadas').should('not.exist')
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
