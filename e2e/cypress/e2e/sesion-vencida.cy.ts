import { ingresar } from '../support/sesion'

// T22: la sesión se renueva con el refresh (cookie httpOnly) y, si la renovación falla, la persona vuelve al ingreso
// con el aviso de sesión vencida. Corre contra los mocks de MSW (`npm run web:dev:mock`).
describe('T22 · Sesión con acceso corto y refresh largo', () => {
  it('si el refresh ya no sirve, la persona vuelve al ingreso con el aviso de sesión vencida', () => {
    // El reloj se controla desde antes de ingresar, para que el temporizador de renovación sea el de Cypress.
    cy.clock(Date.now(), ['setTimeout', 'clearTimeout', 'Date'])
    ingresar('CLIENTE')
    // El refresh deja de valer (revocado, vencido o reusado): el BFF responde SESION_VENCIDA a la renovación.
    cy.intercept('POST', '**/graphql/web', (req) => {
      if (String(req.body.query).includes('renovarSesion')) {
        req.reply({
          data: { renovarSesion: { mensaje: 'Tu sesión ya no es válida.', codigo: 'SESION_VENCIDA' } },
        })
      }
    })
    // Fuerza la renovación sin esperar 48 minutos: se llega al vencimiento del acceso.
    cy.tick(60 * 60 * 1000)

    cy.location('pathname').should('eq', '/login')
    cy.get('[data-testid="aviso-sesion-vencida"]').should('be.visible')
  })
})
