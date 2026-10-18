import { describeConMocks } from '../support/entorno'
import { ingresar } from '../support/sesion'

// E2E de la historia HU-W05 (ver nota de convención en w01-oferta.cy.ts: esta cruza varias
// pantallas a propósito, el E2E por pantalla individual vive en cypress/e2e/pantallas/*.cy.ts).
// Solo corre contra los mocks de MSW (contra staging, ver w05-staging.cy.ts): 4 cobros fijos (ver handlers.ts), uno de ellos RECHAZADO
// ("Julián Torres Mesa") es el único con botón "Reintentar cobro".
describeConMocks('HU-W05 · Conciliación de pagos (back-office)', () => {
  beforeEach(() => ingresar('BACKOFFICE'))

  it('G-02b → W05-01: entra a conciliación, filtra por estado y reintenta un cobro rechazado', () => {
    cy.contains('a', 'Conciliación de pagos').click()
    cy.location('pathname').should('eq', '/operador/conciliacion')

    cy.get('[data-pantalla="W05-01"]').within(() => {
      cy.get('table tbody tr').should('have.length', 4)
      cy.contains('td', 'Julián Torres Mesa').should('exist')

      cy.get('[role="tab"]').contains('Rechazado').click()
      cy.get('table tbody tr').should('have.length', 1)
      cy.contains('td', 'Julián Torres Mesa').should('exist')

      // El mock de `reintentarCobro` resuelve sin demora artificial (ver handlers.ts), así que no
      // se afirma el texto transitorio "Reintentando…" del botón (sería una aserción frágil que
      // depende de ganarle una carrera al propio mock): se verifica el resultado, el toast de
      // confirmación.
      cy.contains('button', 'Reintentar cobro').click()
      cy.contains('Cobro reenviado a la pasarela').should('exist')

      // Al quedar "Cobrado" desaparece de la pestaña "Rechazado" (filtro sigue activo).
      cy.contains('td', 'Julián Torres Mesa').should('not.exist')
      cy.contains('No hay cobros en este estado.').should('exist')

      cy.get('[role="tab"]').contains('Cobrado').click()
      cy.contains('td', 'Julián Torres Mesa').should('exist')
    })
  })
})
