// E2E por pantalla individual (KAN-203). Ver convención en pantallas/w01-03a.cy.ts.
describe('W01-03b · Oferta preliminar (pantalla aislada)', () => {
  it('sin una oferta preliminar activa en memoria, muestra el estado vacío con un enlace de vuelta', () => {
    cy.visit('/cotizacion/oferta-preliminar')
    cy.get('[data-pantalla="W01-03b"]').within(() => {
      cy.contains('No hay una oferta preliminar activa en memoria todavía.').should('exist')
      cy.contains('a', 'Ir a la solicitud').should('have.attr', 'href', '/cotizacion')
    })
  })
})
