// E2E de la historia HU-W01 (Jira KAN-203 pide, ADEMÁS de esto, un E2E por pantalla individual —
// ver cypress/e2e/pantallas/*.cy.ts): flujo completo de cotización cruzando varias pantallas, tal
// como lo recorre una persona real. Localiza por [data-pantalla="<id>"] y por roles/etiquetas
// accesibles, nunca por clases CSS (ver e2e/README.md). Corre contra los mocks de MSW
// (`npm run web:dev:mock`, ver handlers.ts): el documento termina en 999 → oferta preliminar, en
// 000 → error; cualquier otro → oferta completa.
describe('HU-W01 · Cotización de seguro de vida hipotecario', () => {
  beforeEach(() => {
    cy.visit('/login')
    cy.get('[data-pantalla="G-01"]').within(() => {
      cy.get('input:not([type="password"])').first().type('cliente.demo')
      cy.get('input[type="password"]').type('secreta123')
      cy.contains('button', 'Ingresar').click()
    })
    cy.location('pathname').should('eq', '/inicio')
  })

  it('W01-01 → W01-02 → W01-03a → W01-04: oferta completa y su detalle de fuentes', () => {
    cy.contains('a', 'Nueva cotización').click()
    cy.location('pathname').should('eq', '/cotizacion')

    cy.get('[data-pantalla="W01-01"]').within(() => {
      cy.contains('label', 'Documento de identidad').parent().find('input').type('1020304050')
      cy.contains('label', 'Monto del crédito hipotecario').parent().find('input').type('185000000')
      cy.contains('label', 'Plazo (meses)').parent().find('input').type('180')
      cy.contains('label', 'Dirección del inmueble a asegurar').parent().find('input').type('Cra 45 # 22-18, Bogotá D.C.')
      cy.get('input[type="checkbox"]').check()
      cy.contains('button', 'Consultar oferta').click()
    })

    // No se afirma que la ruta pase por /cotizacion/consulta (W01-02): esa pantalla "avanza
    // automáticamente" y, contra los mocks (sin delay artificial), resuelve casi al instante, así
    // que Cypress puede llegar a comprobarlo cuando la app ya navegó más allá (carrera perdida
    // contra el propio mock, confirmado corriendo este spec de verdad). El estado de carga de
    // W01-02 ya lo cubre, de forma determinista, la prueba de Vitest que retrasa la respuesta a
    // propósito (pantallas-w01.test.ts); aquí solo se afirma el destino final del viaje completo.
    cy.location('pathname', { timeout: 10000 }).should('eq', '/cotizacion/oferta')
    cy.get('[data-pantalla="W01-03a"]').within(() => {
      cy.contains('Tu oferta está lista').should('exist')
      cy.contains('180 meses').should('exist')
      cy.contains('a', 'Ver detalle de fuentes consultadas').click()
    })

    cy.location('pathname').should('eq', '/cotizacion/fuentes')
    cy.get('[data-pantalla="W01-04"]').within(() => {
      cy.contains('h2', 'Open Finance').should('exist')
      cy.contains('h2', 'Open Data').should('exist')
      cy.get('li').should('have.length', 5)
    })
  })

  it('W01-01 → W01-02 → W01-03b: oferta preliminar (fuente degradada, documento terminado en 999)', () => {
    cy.contains('a', 'Nueva cotización').click()
    cy.get('[data-pantalla="W01-01"]').within(() => {
      cy.contains('button', 'Simular oferta degradada: timeout de fuentes con valor en caché').click()
    })

    cy.location('pathname', { timeout: 10000 }).should('eq', '/cotizacion/oferta-preliminar')
    cy.get('[data-pantalla="W01-03b"]').within(() => {
      cy.contains('No pudimos verificar todo a tiempo, esta es una oferta preliminar').should('exist')
      cy.contains('Oferta preliminar').should('exist')
    })
  })

  it('W01-01 → W01-02 → W01-03c → W01-05: fallo total y contacto con un asesor', () => {
    cy.contains('a', 'Nueva cotización').click()
    cy.get('[data-pantalla="W01-01"]').within(() => {
      cy.contains('button', 'Simular fallo total de la consulta de fuentes').click()
    })

    cy.location('pathname', { timeout: 10000 }).should('eq', '/cotizacion/error')
    cy.get('[data-pantalla="W01-03c"]').within(() => {
      cy.contains('No pudimos consultar tu historial crediticio en este momento.').should('exist')
      cy.contains('a', 'Hablar con un asesor').click()
    })

    cy.location('pathname').should('eq', '/cotizacion/asesor')
    cy.get('[data-pantalla="W01-05"]').within(() => {
      cy.contains('button', 'Llamar').click()
      cy.contains('Un asesor te contactará en breve').should('exist')
    })
  })
})
