// E2E por pantalla individual (Jira KAN-203, "además de" el E2E por historia que ya vive en
// cypress/e2e/<historia>.cy.ts — ver w01-oferta.cy.ts/w05-conciliacion.cy.ts): cada archivo de esta
// carpeta visita UNA sola ruta y solo hace aserciones dentro de [data-pantalla="<id>"] de esa
// pantalla. Cuando una acción navega a otra pantalla, se verifica solo la ruta resultante
// (cy.location) — nunca el contenido de la pantalla de destino: eso es responsabilidad del E2E de
// su propia historia.
describe('G-01 · Ingreso con selector de rol (pantalla aislada)', () => {
  beforeEach(() => cy.visit('/login'))

  it('existe con su data-pantalla y el formulario de ingreso', () => {
    cy.get('[data-pantalla="G-01"]').within(() => {
      cy.contains('h1, h2', 'Iniciar sesión').should('exist')
      cy.contains('label', 'Usuario').parent().find('input').should('exist')
      cy.get('input[type="password"]').should('exist')
    })
  })

  it('"Ingresar" está deshabilitado hasta completar usuario y clave', () => {
    cy.get('[data-pantalla="G-01"]').within(() => {
      cy.contains('button', 'Ingresar').should('be.disabled')
      cy.contains('label', 'Usuario').parent().find('input').type('asesor.demo')
      cy.contains('button', 'Ingresar').should('be.disabled')
      cy.get('input[type="password"]').type('secreta123')
      cy.contains('button', 'Ingresar').should('not.be.disabled')
    })
  })

  it('el chip de rol seleccionado marca aria-checked y por defecto es "Cliente"', () => {
    cy.get('[data-pantalla="G-01"]').within(() => {
      cy.contains('[role="radio"]', 'Cliente').should('have.attr', 'aria-checked', 'true')
      cy.contains('[role="radio"]', 'Operador').should('have.attr', 'aria-checked', 'false')
      cy.contains('[role="radio"]', 'Operador').click()
      cy.contains('[role="radio"]', 'Operador').should('have.attr', 'aria-checked', 'true')
      cy.contains('[role="radio"]', 'Cliente').should('have.attr', 'aria-checked', 'false')
    })
  })

  it('con el rol "Asesor comercial" y credenciales válidas, ingresar navega a /asesor', () => {
    cy.get('[data-pantalla="G-01"]').within(() => {
      cy.contains('label', 'Usuario').parent().find('input').type('asesor.demo')
      cy.get('input[type="password"]').type('secreta123')
      cy.contains('[role="radio"]', 'Asesor comercial').click()
      cy.contains('button', 'Ingresar').click()
    })
    cy.location('pathname').should('eq', '/asesor')
  })
})
