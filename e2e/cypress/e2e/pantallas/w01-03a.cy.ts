import { visitarComo } from '../../support/sesion'

// E2E por pantalla individual (KAN-203). Ver convención en pantallas/g-01.cy.ts.
// Sin pasar por W01-01/W01-02 (estado en memoria, sin persistencia), /cotizacion/oferta en frío
// cae al estado "no hay oferta activa" — el guard real que ve cualquiera que entre por URL directa
// o refresque la página aquí. El camino feliz con una oferta real ya lo cubre w01-oferta.cy.ts.
describe('W01-03a · Oferta completa (pantalla aislada)', () => {
  it('sin una oferta activa en memoria, muestra el estado vacío con un enlace de vuelta', () => {
    visitarComo('CLIENTE', '/cotizacion/oferta')
    cy.get('[data-pantalla="W01-03a"]').within(() => {
      cy.contains('No hay una oferta activa en memoria todavía.').should('exist')
      cy.contains('a', 'Ir a la solicitud').should('have.attr', 'href', '/cotizacion')
    })
  })
})
