// E2E por pantalla individual (KAN-203). Ver convención en pantallas/g-01.cy.ts.
describe('W01-01 · Solicitud y consentimiento (pantalla aislada)', () => {
  beforeEach(() => cy.visit('/cotizacion'))

  it('"Consultar oferta" está deshabilitado hasta marcar el consentimiento', () => {
    cy.get('[data-pantalla="W01-01"]').within(() => {
      cy.contains('button', 'Consultar oferta').should('be.disabled')
      cy.get('input[type="checkbox"]').check()
      cy.contains('button', 'Consultar oferta').should('not.be.disabled')
    })
  })

  it('con el consentimiento marcado pero los campos vacíos, muestra los errores y no navega', () => {
    cy.get('[data-pantalla="W01-01"]').within(() => {
      cy.get('input[type="checkbox"]').check()
      cy.contains('button', 'Consultar oferta').click()
      cy.contains('[role="alert"]', 'Ingresa tu documento de identidad.').should('exist')
      cy.contains('[role="alert"]', 'Ingresa un monto válido, mayor a cero.').should('exist')
      cy.contains('[role="alert"]', 'Ingresa un plazo válido en meses, mayor a cero.').should('exist')
      cy.contains('[role="alert"]', 'Ingresa la dirección del inmueble a asegurar.').should('exist')
    })
    cy.location('pathname').should('eq', '/cotizacion')
  })

  it('con todos los campos válidos y el consentimiento marcado, navega a /cotizacion/consulta', () => {
    cy.get('[data-pantalla="W01-01"]').within(() => {
      cy.contains('label', 'Documento de identidad').parent().find('input').type('1020304050')
      cy.contains('label', 'Monto del crédito hipotecario').parent().find('input').type('185000000')
      cy.contains('label', 'Plazo (meses)').parent().find('input').type('180')
      cy.contains('label', 'Dirección del inmueble a asegurar').parent().find('input').type('Cra 45 # 22-18, Bogotá D.C.')
      cy.get('input[type="checkbox"]').check()
      cy.contains('button', 'Consultar oferta').click()
    })
    cy.location('pathname').should('eq', '/cotizacion/consulta')
  })

  it('los dos enlaces de disparo de demo completan el formulario y marcan el consentimiento solos', () => {
    cy.get('[data-pantalla="W01-01"]').within(() => {
      cy.contains('button', 'Simular oferta degradada: timeout de fuentes con valor en caché').click()
    })
    cy.location('pathname').should('eq', '/cotizacion/consulta')
  })
})
