// E2E por pantalla individual (KAN-203). Ver convención en pantallas/g-01.cy.ts.
// `cargarCobros()` trae la lista completa de los mocks al montar (sin depender de ninguna otra
// pantalla): por eso esta pantalla es alcanzable y funcional de forma totalmente aislada.
describe('W05-01 · Conciliación de pagos (pantalla aislada)', () => {
  beforeEach(() => cy.visit('/operador/conciliacion'))

  it('muestra las 5 transacciones con sus columnas reales', () => {
    cy.get('[data-pantalla="W05-01"]').within(() => {
      cy.get('table thead th').should('contain.text', 'Prima')
      cy.get('table thead th').should('contain.text', 'Fecha del intento')
      cy.get('table thead th').should('contain.text', 'ID de transacción')
      cy.get('table tbody tr').should('have.length', 5)
      cy.contains('Mostrando 5 transacciones sincronizadas con Core Asegurador').should('exist')
    })
  })

  it('las pestañas de estado filtran la tabla (y "Todos" lleva el contador total)', () => {
    cy.get('[data-pantalla="W05-01"]').within(() => {
      cy.contains('[role="tab"]', 'Todos').should('contain.text', '5')
      cy.contains('[role="tab"]', 'Rechazado').click()
      cy.get('table tbody tr').should('have.length', 1)
      cy.contains('td', 'Luisa Fernanda Parra').should('exist')
    })
  })

  it('"Reintentar cobro" solo aparece para el cobro Rechazado, y al reintentarlo muestra el toast de confirmación', () => {
    cy.get('[data-pantalla="W05-01"]').within(() => {
      cy.get('table tbody tr').should('have.length', 5)
      cy.contains('button', 'Reintentar cobro').should('have.length', 1)
      cy.contains('button', 'Reintentar cobro').click()
      cy.contains('Cobro reenviado a la pasarela').should('exist')
    })
  })
})
