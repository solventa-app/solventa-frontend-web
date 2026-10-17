// E2E por pantalla individual (KAN-203). Ver convención en pantallas/g-01.cy.ts.
describe('G-02a · Home del Asesor comercial (pantalla aislada)', () => {
  beforeEach(() => cy.visit('/asesor'))

  it('existe con sus 3 tarjetas de acceso', () => {
    cy.get('[data-pantalla="G-02a"]').within(() => {
      cy.contains('a', 'Nueva cotización para un cliente').should('have.attr', 'href', '/cotizacion')
      cy.contains('a', 'Pólizas emitidas').should('have.attr', 'href', '/polizas')
      cy.contains('a', 'Fuentes consultadas').should('have.attr', 'href', '/cotizacion/fuentes')
      cy.contains('Portal Asesor Comercial').should('exist')
    })
  })

  it('"Cerrar sesión" vuelve a /login', () => {
    cy.get('[data-pantalla="G-02a"]').within(() => {
      cy.contains('button', 'Cerrar sesión').click()
    })
    cy.location('pathname').should('eq', '/login')
  })
})
