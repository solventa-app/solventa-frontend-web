import { visitarComo } from '../../support/sesion'

// G-05 · Mi perfil (pantalla aislada): datos de `yo` para el rol que entra. Funciona contra los mocks y
// contra staging (no cuenta datos fijos: solo que el alias que se ve es con el que se entró).
describe('G-05 · Mi perfil (pantalla aislada)', () => {
  it('el cliente ve nombre, cédula y correo bloqueados y su rol, y vuelve a su inicio', () => {
    visitarComo('CLIENTE', '/perfil')
    cy.get('[data-pantalla="G-05"]').within(() => {
      cy.get('[data-dato="nombre-campo"]').should('not.be.empty')
      cy.get('[data-dato="documento-campo"]').should('not.be.empty')
      cy.get('[data-dato="correo-campo"]').should('not.be.empty')
      cy.get('main input, main textarea').should('not.exist')
      cy.get('[data-dato="rol"]').should('have.text', 'Cliente')
      cy.contains('a', 'Volver al inicio').should('have.attr', 'href', '/inicio')
    })
  })

  it('el avatar del header lleva a Mi perfil', () => {
    visitarComo('BACKOFFICE', '/operador')
    cy.get('button[aria-label="Mi perfil"]').click()
    cy.location('pathname').should('eq', '/perfil')
    cy.get('[data-dato="rol"]').should('have.text', 'Operador')
  })
})
