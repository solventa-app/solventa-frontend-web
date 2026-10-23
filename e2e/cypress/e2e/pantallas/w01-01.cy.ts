import { visitarComo } from '../../support/sesion'

// E2E por pantalla individual (KAN-203). Ver convención en pantallas/g-01.cy.ts.
describe('W01-01 · Solicitud y consentimiento (pantalla aislada)', () => {
  beforeEach(() => visitarComo('CLIENTE', '/cotizacion'))

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
      cy.contains('[role="alert"]', 'Ingresa un plazo válido, entre 1 y 60 meses.').should('exist')
      cy.contains('[role="alert"]', 'Ingresa la dirección del inmueble a asegurar.').should('exist')
    })
    cy.location('pathname').should('eq', '/cotizacion')
  })

  // La navegación real al hacer clic es /cotizacion/consulta (W01-02), pero esa pantalla "avanza
  // automáticamente según la respuesta del ACL" (ver su propio comentario de cabecera) y, contra
  // los mocks, resuelve casi al instante: en la práctica, lo único observable de forma estable es
  // dónde termina aterrizando. Por eso se afirma la ruta final (con más margen de tiempo, igual
  // que w01-oferta.cy.ts) en vez de la ruta intermedia, que un `cy.location().should('eq', …)`
  // sin margen puede no alcanzar a ver nunca (carrera perdida contra el propio mock).
  it('con todos los campos válidos y el consentimiento marcado, termina en la oferta completa', () => {
    cy.get('[data-pantalla="W01-01"]').within(() => {
      cy.contains('label', 'Documento de identidad').parent().find('input').type('1020304050')
      cy.contains('label', 'Monto del crédito hipotecario').parent().find('input').type('185000000')
      cy.contains('label', 'Plazo (meses)').parent().find('input').type('60')
      cy.contains('label', 'Dirección del inmueble a asegurar').parent().find('input').type('Cra 45 # 22-18, Bogotá D.C.')
      cy.get('input[type="checkbox"]').check()
      cy.contains('button', 'Consultar oferta').click()
    })
    cy.location('pathname', { timeout: 10000 }).should('eq', '/cotizacion/oferta')
  })

  it('el enlace de disparo de demo de oferta degradada completa el formulario y termina en la oferta preliminar', () => {
    cy.get('[data-pantalla="W01-01"]').within(() => {
      cy.contains('button', 'Simular oferta degradada: timeout de fuentes con valor en caché').click()
    })
    cy.location('pathname', { timeout: 10000 }).should('eq', '/cotizacion/oferta-preliminar')
  })

  it('el enlace de disparo de demo de fallo total completa el formulario y termina en el error', () => {
    cy.get('[data-pantalla="W01-01"]').within(() => {
      cy.contains('button', 'Simular fallo total de la consulta de fuentes').click()
    })
    cy.location('pathname', { timeout: 10000 }).should('eq', '/cotizacion/error')
  })
})
