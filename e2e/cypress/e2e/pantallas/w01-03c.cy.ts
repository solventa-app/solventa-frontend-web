import { visitarComo } from '../../support/sesion'

// E2E por pantalla individual (KAN-203). Ver convención en pantallas/w01-03a.cy.ts.
describe('W01-03c · Error con reintento y asesor (pantalla aislada)', () => {
  it('sin un error activo en memoria, muestra el estado vacío (no el mensaje genérico ni "Reintentar")', () => {
    visitarComo('CLIENTE', '/cotizacion/error')
    cy.get('[data-pantalla="W01-03c"]').within(() => {
      cy.contains('No hay un error activo en memoria todavía.').should('exist')
      cy.contains('button', 'Reintentar').should('not.exist')
      cy.contains('a', 'Ir a la solicitud').should('have.attr', 'href', '/cotizacion')
    })
  })
})
