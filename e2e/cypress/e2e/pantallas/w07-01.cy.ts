// E2E por pantalla individual (ver la convención en g-01.cy.ts). W07-01 · Ingreso al portal de socios (HU-W07),
// contra los mocks de MSW: la clave `clave-erronea` responde el error genérico y una `sk_test…` es de pruebas
// (convenciones de demo de src/mocks/socios.ts, no del backend real).
import { describeConMocks } from '../../support/entorno'

const llenar = (socioId: string, clave: string) => {
  cy.contains('label', 'ID de socio').parent().find('input').type(socioId)
  cy.get('input[type="password"]').type(clave, { log: false })
}

describeConMocks('W07-01 · Ingreso al portal de socios (pantalla aislada)', () => {
  beforeEach(() => cy.visit('/socios/ingreso'))

  it('existe con su data-pantalla, el formulario y el regreso al login de Solventa', () => {
    cy.get('[data-pantalla="W07-01"]').within(() => {
      cy.contains('h1, h2', 'Portal de socios').should('exist')
      cy.contains('label', 'ID de socio').should('exist')
      cy.contains('label', 'Clave de acceso').should('exist')
      cy.contains('Tu clave de producción').should('exist')
      cy.contains('a', 'Volver al inicio de sesión de Solventa').should('have.attr', 'href', '/login')
    })
  })

  it('«Ingresar» está deshabilitado hasta completar el ID y la clave; con la de producción entra al panel', () => {
    cy.get('[data-pantalla="W07-01"]').within(() => {
      cy.contains('button', 'Ingresar').should('be.disabled')
      llenar('retail-fintech-042', 'sk_live_9f2c41d7e8a05b36c1f4')
      cy.contains('button', 'Ingresar').should('not.be.disabled').click()
    })
    cy.location('pathname').should('eq', '/socios/panel')
  })

  it('con credenciales incorrectas muestra el error genérico; con la clave de pruebas no entra', () => {
    cy.get('[data-pantalla="W07-01"]').within(() => {
      llenar('retail-fintech-042', 'clave-erronea')
      cy.contains('button', 'Ingresar').click()
      cy.get('[role="alert"]').should('have.text', 'ID de socio o clave incorrectos.')
      cy.get('input[type="password"]').type('sk_test_3b8e0a62d19c74f5e2a7', { log: false })
      cy.contains('button', 'Ingresar').click()
      cy.get('[role="alert"]').should('contain.text', 'clave de producción')
    })
    cy.location('pathname').should('eq', '/socios/ingreso')
  })

  it('G-01 lleva al portal de socios', () => {
    cy.visit('/login')
    cy.contains('a', 'socio de distribución').click()
    cy.location('pathname').should('eq', '/socios/ingreso')
  })

  for (const [ancho, alto] of [
    [1280, 720],
    [390, 844],
  ]) {
    it(`se ve completa y sin desbordes a ${ancho}px`, () => {
      cy.viewport(ancho, alto)
      cy.get('[data-pantalla="W07-01"]').should('be.visible')
      cy.document().then((doc) => expect(doc.documentElement.scrollWidth).to.be.at.most(ancho))
      cy.contains('button', 'Ingresar').should('be.visible')
      cy.screenshot(`w07-01-${ancho}`, { capture: 'viewport' })
    })
  }
})
