// E2E por pantalla individual (KAN-203). Ver convención en pantallas/g-01.cy.ts.
// A diferencia de las demás pantallas de resultado de oferta, esta no exige una oferta previa en
// memoria: `contactarAsesor` envía un ofertaId vacío cuando no hay oferta (ver la nota en
// useCotizacion.contactarAsesor) y el mock no lo valida — por eso es alcanzable y funcional de
// forma totalmente aislada, visitada en frío.
describe('W01-05 · Contactar a un asesor (pantalla aislada)', () => {
  beforeEach(() => cy.visit('/cotizacion/asesor'))

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
      cy.contains('Un asesor te contactará con el resumen de tu trámite.').should('exist')
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
