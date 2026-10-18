import { visitarComo } from '../support/sesion'

// Prueba de humo: la app arranca y el catálogo de pantallas del Sprint 1 es alcanzable.
// Los flujos reales (W01 → W03) se agregan cuando existan las pantallas y el BFF.

describe('humo', () => {
  it('redirige la raíz al login (G-01)', () => {
    cy.visit('/')
    cy.location('pathname').should('eq', '/login')
    cy.get('[data-pantalla="G-01"]').should('exist')
  })

  it('abre la captura de cotización (W01-01)', () => {
    visitarComo('CLIENTE', '/cotizacion')
    cy.get('[data-pantalla="W01-01"]').should('exist')
  })
})
