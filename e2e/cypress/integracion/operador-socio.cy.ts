// Revisión QA, desarrollador B: Operador y Socio contra el stack real (compose), no contra los mocks.
// Cómo correrla: `cypress/integracion/README.md`. Necesita `operador.demo` y los socios y siniestros de la semilla.
const OPERADOR = { usuario: 'operador.demo', clave: 'Operador-local-0001' }
const SOCIO = { clientId: 'sol_prod_demo1', clave: 'solo-local-socio-demo-1-produccion' }

function ingresarOperador() {
  cy.visit('/login')
  cy.get('[data-pantalla="G-01"]').within(() => {
    cy.contains('label', 'Usuario').parent().find('input').type(OPERADOR.usuario)
    cy.get('input[type="password"]').type(OPERADOR.clave, { log: false })
    cy.contains('[role="radio"]', 'Operador').click()
    cy.contains('button', 'Ingresar').click()
  })
  cy.location('pathname').should('eq', '/operador')
}

function ingresarSocio() {
  cy.visit('/socios/ingreso')
  cy.get('input').eq(0).type(SOCIO.clientId)
  cy.get('input[type="password"]').type(SOCIO.clave, { log: false })
  cy.contains('button', /Ingresar|Entrar|Acceder/).click()
  cy.location('pathname').should('eq', '/socios/panel')
}

const elegirMoneda = (moneda: string) => cy.get('header select').select(moneda)
const documentoSinDesborde = () =>
  cy.document().should((d) => expect(d.documentElement.scrollHeight).to.be.at.most(d.documentElement.clientHeight))

describe('Operador', () => {
  before(() => cy.request('POST', 'http://localhost:8012/_demo/reiniciar'))

  it('no ve el estado del sistema (D-1)', () => {
    ingresarOperador()
    cy.get('[data-pantalla="G-02b"]').should('be.visible')
    cy.contains('Estado del sistema').should('not.exist')
  })

  it('la bandeja pagina y muestra el plazo de los pendientes', () => {
    ingresarOperador()
    cy.contains('a', 'Siniestros').click()
    cy.get('[data-componente="paginador"]').should('contain.text', 'Página 1 de 2')
    cy.get('[data-prueba="plazo"]').should('exist')
    cy.contains('[data-componente="paginador"] button', 'Siguiente').click()
    cy.get('[data-componente="paginador"]').should('contain.text', 'Página 2 de 2')
    cy.contains('button', 'Aprobado').click()
    cy.get('[data-componente="paginador"]').should('contain.text', 'Página 1 de 1')
  })

  it('la moneda convierte, sobrevive a navegar, a recargar y a volver a entrar', () => {
    ingresarOperador()
    elegirMoneda('USD')
    cy.get('[data-prueba="aviso-moneda"]').should('contain.text', 'referencia')
    cy.contains('a', 'Siniestros').click()
    cy.get('tbody a').first().click()
    cy.contains('US$').should('be.visible')
    cy.reload()
    cy.get('header select').should('have.value', 'USD')
    cy.contains('US$').should('be.visible')
    cy.clearAllSessionStorage()
    cy.clearLocalStorage()
    ingresarOperador()
    cy.get('header select').should('have.value', 'USD')
    elegirMoneda('COP')
    cy.get('[data-prueba="aviso-moneda"]').should('not.exist')
  })
})

describe('Socio', () => {
  it('el marco queda fijo y la barra lleva a todas las secciones', () => {
    ingresarSocio()
    cy.get('[data-prueba="tarjeta-consumo"]', { timeout: 8000 }).should('be.visible')
    cy.get('[data-prueba="tabla-consumo"]', { timeout: 8000 }).should('exist')
    documentoSinDesborde()
    cy.contains('[role="tab"]', 'API Pruebas').click()
    cy.location('search').should('eq', '?pestana=pruebas')
    cy.get('main nav').should('not.exist')
    documentoSinDesborde()
    cy.get('[role="tablist"]').should('be.visible')
    cy.contains('[role="tab"]', 'Panel').click()
    cy.location('pathname').should('eq', '/socios/panel')
  })

  it('el Swagger dice con qué clave se autentica y «Try it out» lleva el token', () => {
    ingresarSocio()
    cy.contains('[role="tab"]', 'API Pruebas').click()
    cy.get('[data-prueba="token-activo"]', { timeout: 8000 }).should('contain.text', 'Pruebas (sandbox)')
    cy.intercept('GET', '**/v1/consumo*').as('consumo')
    cy.contains('.opblock-summary-path', /^\/v1\/consumo$/, { timeout: 15000 }).click()
    cy.get('.opblock.is-open').within(() => {
      cy.contains('button', 'Try it out').click()
      cy.contains('button', 'Execute').click()
    })
    cy.wait('@consumo').then(({ request, response }) => {
      expect(request.headers.authorization).to.match(/^Bearer /)
      expect(response?.statusCode).to.eq(200)
    })
  })

  it('las ventas se muestran en la moneda elegida, con la API de socios', () => {
    ingresarSocio()
    cy.intercept('POST', '**/v1/conversiones').as('conversion')
    elegirMoneda('USD')
    cy.wait('@conversion').its('response.statusCode').should('eq', 200)
    cy.get('[data-prueba="aviso-moneda"]').should('contain.text', 'referencia')
    elegirMoneda('COP')
  })
})
