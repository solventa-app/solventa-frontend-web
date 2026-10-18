import { visitarComo } from '../../support/sesion'

// E2E por pantalla individual (KAN-203). Ver convención en pantallas/g-01.cy.ts.
// No exige una oferta previa: `contactarAsesor` envía un ofertaId vacío y el mock no lo valida.
describe('W01-05 · Contactar a un asesor (pantalla aislada)', () => {
  beforeEach(() => visitarComo('CLIENTE', '/cotizacion/asesor'))

  it('muestra los 3 canales de contacto', () => {
    cy.get('[data-pantalla="W01-05"]').within(() => {
      cy.contains('button', 'Llamar').should('exist')
      cy.contains('button', 'Iniciar chat').should('exist')
      cy.contains('button', 'Agendar').should('exist')
    })
  })

  it('elegir "Llamar" muestra la confirmación con el resumen real del contrato', () => {
    cy.get('[data-pantalla="W01-05"]').within(() => {
      cy.contains('button', 'Llamar').click()
      cy.contains('[role="status"]', 'Un asesor te contactará en breve').should('exist')
      cy.contains('Un asesor te contactará para continuar tu cotización.').should('exist')
    })
  })

  it('"Volver al inicio" de la confirmación navega al home del rol activo (Cliente por defecto: /inicio)', () => {
    cy.get('[data-pantalla="W01-05"]').within(() => {
      cy.contains('button', 'Llamar').click()
      cy.contains('a', 'Volver al inicio').click()
    })
    cy.location('pathname').should('eq', '/inicio')
  })
})
