// E2E de la historia HU-W05 (ver nota de convención en w01-oferta.cy.ts: esta cruza varias
// pantallas a propósito, el E2E por pantalla individual vive en cypress/e2e/pantallas/*.cy.ts).
// Corre contra los mocks de MSW: los 5 cobros del prototipo (ver handlers.ts); el RECHAZADO
// ("Luisa Fernanda Parra") es el único con botón "Reintentar cobro" (hasta 3 reintentos).
describe('HU-W05 · Conciliación de pagos (back-office)', () => {
  beforeEach(() => {
    cy.visit('/login')
    cy.get('[data-pantalla="G-01"]').within(() => {
      cy.get('input:not([type="password"])').first().type('operador.demo')
      cy.get('input[type="password"]').type('secreta123')
      cy.contains('button', 'Operador').click()
      cy.contains('button', 'Ingresar').click()
    })
    cy.location('pathname').should('eq', '/operador')
  })

  it('G-02b → W05-01: entra a conciliación, filtra por estado y reintenta un cobro rechazado', () => {
    cy.contains('a', 'Conciliación de pagos').click()
    cy.location('pathname').should('eq', '/operador/conciliacion')

    cy.get('[data-pantalla="W05-01"]').within(() => {
      cy.get('table tbody tr').should('have.length', 5)
      cy.contains('td', 'Luisa Fernanda Parra').should('exist')

      cy.get('[role="tab"]').contains('Rechazado').click()
      cy.get('table tbody tr').should('have.length', 1)
      cy.contains('td', 'Luisa Fernanda Parra').should('exist')

      // El mock de `reintentarCobro` resuelve sin demora artificial (ver handlers.ts), así que no
      // se afirma el texto transitorio "Reintentando…" del botón (sería una aserción frágil que
      // depende de ganarle una carrera al propio mock): se verifica el resultado, el toast de
      // confirmación.
      cy.contains('button', 'Reintentar cobro').click()
      cy.contains('Cobro reenviado a la pasarela').should('exist')

      // Al quedar "Cobrado" desaparece de la pestaña "Rechazado" (filtro sigue activo).
      cy.contains('td', 'Luisa Fernanda Parra').should('not.exist')
      cy.contains('No hay cobros en este estado.').should('exist')

      cy.get('[role="tab"]').contains('Cobrado').click()
      cy.contains('td', 'Luisa Fernanda Parra').should('exist')
    })
  })
})
