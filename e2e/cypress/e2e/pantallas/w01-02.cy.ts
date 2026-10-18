import { visitarComo } from '../../support/sesion'

// E2E por pantalla individual (KAN-203). Ver convención en pantallas/g-01.cy.ts.
// Esta pantalla "avanza automáticamente según la respuesta del ACL" (ver comentario de cabecera de
// ConsultandoFuentes.vue): entrar en frío por URL directa, sin haber pasado por W01-01, es
// justamente el caso real que esta prueba aislada puede cubrir sin cruzar pantallas — el camino
// feliz (con datos capturados) ya lo cubre w01-oferta.cy.ts.
describe('W01-02 · Consultando fuentes (pantalla aislada)', () => {
  it('sin datos capturados, no deja el spinner girando: muestra un mensaje y un enlace para volver', () => {
    visitarComo('CLIENTE', '/cotizacion/consulta')
    cy.get('[data-pantalla="W01-02"]').within(() => {
      cy.contains('No hay una solicitud en curso para consultar.').should('exist')
      cy.get('svg.animate-spin').should('not.exist')
      cy.contains('a', 'Ir a la solicitud').should('have.attr', 'href', '/cotizacion')
    })
  })
})
