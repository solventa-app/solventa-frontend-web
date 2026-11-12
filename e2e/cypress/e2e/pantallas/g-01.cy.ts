// E2E por pantalla individual (Jira KAN-203, "además de" el E2E por historia que ya vive en
// cypress/e2e/<historia>.cy.ts — ver w01-oferta.cy.ts/w05-conciliacion.cy.ts): cada archivo de esta
// carpeta visita UNA sola ruta y solo hace aserciones dentro de [data-pantalla="<id>"] de esa
// pantalla. Cuando una acción navega a otra pantalla, se verifica solo la ruta resultante
// (cy.location) — nunca el contenido de la pantalla de destino: eso es responsabilidad del E2E de
// su propia historia.
describe('G-01 · Ingreso (pantalla aislada)', () => {
  beforeEach(() => cy.visit('/login'))

  it('existe con su data-pantalla y el formulario de ingreso', () => {
    cy.get('[data-pantalla="G-01"]').within(() => {
      cy.contains('h1, h2', 'Iniciar sesión').should('exist')
      cy.contains('label', 'Correo').parent().find('input').should('exist')
      cy.get('input[type="password"]').should('exist')
    })
  })

  it('"Ingresar" está deshabilitado hasta completar usuario y clave', () => {
    cy.get('[data-pantalla="G-01"]').within(() => {
      cy.contains('button', 'Ingresar').should('be.disabled')
      cy.contains('label', 'Correo').parent().find('input').type('asesor.demo')
      cy.contains('button', 'Ingresar').should('be.disabled')
      cy.get('input[type="password"]').type('secreta123')
      cy.contains('button', 'Ingresar').should('not.be.disabled')
    })
  })

  it('no pide elegir el rol: no hay chips de rol', () => {
    cy.get('[data-pantalla="G-01"]').within(() => {
      cy.get('[role="radio"], [role="radiogroup"]').should('not.exist')
    })
  })

  it('con credenciales válidas, el rol viene en el token y ingresar navega al inicio de ese rol (/asesor)', () => {
    cy.get('[data-pantalla="G-01"]').within(() => {
      cy.contains('label', 'Correo').parent().find('input').type('asesor.demo')
      cy.get('input[type="password"]').type('secreta123')
      cy.contains('button', 'Ingresar').click()
    })
    cy.location('pathname').should('eq', '/asesor')
  })

  it('con una clave errada muestra el error del BFF y no abre sesión', () => {
    cy.get('[data-pantalla="G-01"]').within(() => {
      cy.contains('label', 'Correo').parent().find('input').type('asesor.demo')
      cy.get('input[type="password"]').type('clave-erronea')
      cy.contains('button', 'Ingresar').click()
      cy.get('[role="alert"]').should('have.text', 'Usuario o clave incorrectos.')
    })
    cy.location('pathname').should('eq', '/login')
    cy.window().then((ventana) => expect(ventana.sessionStorage.getItem('solventa.token')).to.equal(null))
  })
})
