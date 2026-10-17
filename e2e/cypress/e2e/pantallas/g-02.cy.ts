// E2E por pantalla individual (KAN-203). Ver convención en pantallas/g-01.cy.ts.
// Nota: la sesión es un singleton en memoria (useSesion.ts) sin persistencia: al visitar /inicio
// directo (sin pasar por /login) el rol por defecto es CLIENTE, así que esta pantalla sí es
// alcanzable y coherente de forma aislada.
describe('G-02 · Home del Cliente (pantalla aislada)', () => {
  beforeEach(() => cy.visit('/inicio'))

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
    cy.location('pathname').should('eq', '/login')
  })
})
