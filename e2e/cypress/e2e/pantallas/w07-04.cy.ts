// E2E por pantalla individual (ver la convención en g-01.cy.ts). W07-04 · Estado del sistema (HU-W07, operador), contra
// el mock de `estadoSistema` (src/mocks/estadoSistema.ts: PAYMENTS degradado, KYC medio abierto, 15 min sin tráfico).
import { describeConMocks } from '../../support/entorno'
import { visitarComo } from '../../support/sesion'

describeConMocks('W07-04 · Estado del sistema (pantalla aislada)', () => {
  it('se llega desde la tarjeta del inicio del operador', () => {
    visitarComo('BACKOFFICE', '/operador')
    cy.contains('a', 'Estado del sistema').click()
    cy.location('pathname').should('eq', '/operador/estado')
    cy.get('[data-pantalla="W07-04"]').should('exist')
  })

  it('muestra la caja de estado, los servicios con su salud y las APIs externas con su circuito', () => {
    visitarComo('BACKOFFICE', '/operador/estado')
    cy.get('[data-pantalla="W07-04"]').within(() => {
      cy.get('[data-prueba="caja-estado"]').should('contain.text', 'Operativo')
      cy.get('[data-prueba="tabla-micros"] tbody tr').should('have.length', 9)
      cy.get('[data-prueba="tabla-micros"]').should('contain.text', 'payments').and('contain.text', '78 %')
      cy.get('[data-prueba="tabla-externas"]').should('contain.text', 'Medio abierto')
      cy.contains('[role="radio"]', '15 min').click()
      cy.get('[data-prueba="metricas"]').should('contain.text', 'Sin tráfico en la ventana')
    })
  })

  for (const [ancho, alto] of [
    [1280, 720],
    [390, 844],
  ]) {
    it(`a ${ancho}px no se desborda la página`, () => {
      cy.viewport(ancho, alto)
      visitarComo('BACKOFFICE', '/operador/estado')
      cy.get('[data-prueba="tabla-micros"]').should('exist')
      cy.document().then((doc) => expect(doc.documentElement.scrollWidth).to.be.at.most(ancho))
      cy.screenshot(`w07-04-${ancho}`, { capture: 'viewport' })
    })
  }
})
