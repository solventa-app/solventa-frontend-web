import { visitarComo } from '../../support/sesion'

// E2E por pantalla individual (KAN-203). Ver convención en pantallas/w01-03a.cy.ts.
describe('W01-04 · Detalle de fuentes consultadas (pantalla aislada)', () => {
  it('sin ninguna oferta consultada en memoria, muestra el estado vacío con un enlace de vuelta', () => {
    visitarComo('CLIENTE', '/cotizacion/fuentes')
    cy.get('[data-pantalla="W01-04"]').within(() => {
      cy.contains('No hay fuentes para mostrar: aún no se ha consultado ninguna oferta.').should('exist')
      cy.contains('a', 'Ir a la solicitud').should('have.attr', 'href', '/cotizacion')
    })
  })
})
