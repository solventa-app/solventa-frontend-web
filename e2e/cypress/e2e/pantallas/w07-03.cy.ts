// E2E por pantalla individual (ver la convención en g-01.cy.ts). W07-03 · Documentación de la API (HU-W07), contra los
// mocks de MSW: el Swagger de pruebas cotiza contra src/mocks/socios.ts (documento terminado en 999 → PRELIMINAR).
import { describeConMocks } from '../../support/entorno'

function ingresarComoSocio() {
  cy.visit('/socios/ingreso')
  cy.get('[data-pantalla="W07-01"]').within(() => {
    cy.contains('label', 'ID de socio').parent().find('input').type('retail-fintech-042')
    cy.get('input[type="password"]').type('sk_live_9f2c41d7e8a05b36c1f4', { log: false })
    cy.contains('button', 'Ingresar').click()
  })
  cy.location('pathname').should('eq', '/socios/panel')
}

describeConMocks('W07-03 · Documentación de la API (pantalla aislada)', () => {
  beforeEach(() => {
    ingresarComoSocio()
    cy.contains('button', 'Documentación de la API').click()
    cy.location('pathname').should('eq', '/socios/documentacion')
  })

  it('abre en la guía (aún sin PDF publicado) y recorre las tres pestañas con la URL', () => {
    cy.get('[data-pantalla="W07-03"]').within(() => {
      cy.contains('[role="tab"]', 'Guía de integración').should('have.attr', 'aria-selected', 'true')
      cy.get('[data-prueba="guia-pendiente"]').should('be.visible')
      cy.contains('[role="tab"]', 'Pruebas (sandbox)').click()
      cy.get('[data-prueba="caja-pruebas"]').should('contain.text', '000000')
      cy.contains('[role="tab"]', 'Producción').click()
      cy.get('[data-prueba="alerta-produccion"]').should('contain.text', 'descuenta presupuesto real')
    })
    cy.location('search').should('eq', '?pestana=produccion')
  })

  it('en pruebas, «Try it out» de una cotización responde con la oferta simulada', () => {
    cy.contains('[role="tab"]', 'Pruebas (sandbox)').click()
    cy.get('[data-prueba="swagger"] .opblock-summary-path', { timeout: 15000 }).should('have.length.greaterThan', 5)
    cy.contains('.opblock-summary-path', /^\/cotizaciones$/).click()
    cy.get('.opblock.is-open').within(() => {
      cy.contains('button', 'Try it out').click()
      cy.get('textarea.body-param__text').invoke(
        'val',
        JSON.stringify({
          consentimientoId: 'c-1',
          documentoIdentidad: '1020789999',
          valorCredito: { valor: '185000000', moneda: 'COP' },
          plazoMeses: 240,
          direccionInmueble: 'Calle 80 # 10-20',
        }),
      )
      cy.get('textarea.body-param__text').type(' ')
      cy.contains('button', 'Execute').click()
      cy.get('.responses-wrapper .live-responses-table .response-col_status', { timeout: 10000 }).should('contain.text', '200')
      cy.get('.responses-wrapper .live-responses-table').should('contain.text', 'PRELIMINAR')
    })
  })

  for (const [ancho, alto] of [
    [1280, 720],
    [390, 844],
  ]) {
    it(`a ${ancho}px no se desborda`, () => {
      cy.viewport(ancho, alto)
      cy.contains('[role="tab"]', 'Pruebas (sandbox)').click()
      cy.get('[data-prueba="swagger"] .opblock-summary-path', { timeout: 15000 }).should('exist')
      cy.document().then((doc) => expect(doc.documentElement.scrollWidth).to.be.at.most(ancho))
      cy.screenshot(`w07-03-${ancho}`, { capture: 'viewport' })
    })
  }
})
