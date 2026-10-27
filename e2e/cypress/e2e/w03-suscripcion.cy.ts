import { describeConMocks } from '../support/entorno'
import { ingresar } from '../support/sesion'

// E2E de HU-W03 (KAN-26, parte web de KAN-216) contra los mocks de MSW (borrador de la v0.17): el ASESOR cotiza con el
// contacto del cliente (W01-A1), acepta la oferta (W03-01), verifica la identidad con el código y emite; el cliente
// abre el enlace desde el buzón simulado (/dev/correo), firma (W03-02 y W03-02b), paga en la pasarela simulada
// (/dev/pasarela) y ve su póliza (W03-04). Convenciones de demo en src/mocks/suscripcion.ts (NO son del backend real).
// Solo corre contra los mocks: staging todavía no tiene el bloque 9 del backend.

function cotizarComoAsesor(correo = 'cliente@correo.com') {
  ingresar('ASESOR')
  cy.contains('a', 'Nueva cotización').click()
  cy.get('[data-pantalla="W01-01"]').within(() => {
    cy.contains('label', 'Nombre completo del cliente').parent().find('input').type('Carlos Restrepo Gómez')
    cy.contains('label', 'Correo del cliente').parent().find('input').type(correo)
    cy.contains('label', 'Documento de identidad').parent().find('input').type('1020304050')
    cy.contains('label', 'Monto del crédito hipotecario').parent().find('input').type('185000000')
    cy.contains('label', 'Plazo (meses)').parent().find('input').type('60')
    cy.contains('label', 'Dirección del inmueble a asegurar').parent().find('input').type('Cra 45 # 22-18')
    cy.get('input[type="checkbox"]').check()
    cy.contains('button', 'Consultar oferta').click()
  })
  cy.location('pathname', { timeout: 10000 }).should('eq', '/cotizacion/oferta')
  cy.get('[data-pantalla="W01-03a"]').contains('a', 'Continuar a suscripción').click()
  cy.location('pathname').should('eq', '/suscripcion/oferta-completa')
}

function verificarYEmitir() {
  cy.get('[data-pantalla="W03-01"]').find('[data-prueba="aceptar"]').click()
  cy.get('[data-componente="modal-verificacion-asesor"]').within(() => {
    cy.get('[data-prueba="correo-enmascarado"]').should('have.text', 'c•••@correo.com')
    cy.get('[data-prueba="enviar-codigo"]').click()
    cy.get('[data-prueba="verificar"]').should('be.disabled')
    cy.get('input').type('000000')
    cy.get('[data-prueba="verificar"]').click()
    cy.get('[data-prueba="emitir"]').should('be.enabled').click()
  })
}

/** El cliente abre el enlace desde el buzón simulado. Sin recargar: los mocks viven en memoria. */
function abrirEnlaceDelCorreo() {
  cy.window().then((win) => {
    win.history.pushState(null, '', '/dev/correo')
    win.dispatchEvent(new PopStateEvent('popstate'))
  })
  cy.get('[data-prueba="correo-enlace"]').first().find('[data-prueba="abrir-enlace"]').click()
  cy.location('pathname').should('eq', '/firma')
  // El token sale de la barra de direcciones en cuanto se lee (D-3).
  cy.location('hash').should('eq', '')
}

function firmarConNombre() {
  cy.get('[data-pantalla="W03-02"]').within(() => {
    cy.get('[data-prueba="contrato-pdf"]').should('exist')
    cy.get('[data-prueba="firmar"]').should('be.disabled')
    cy.get('[data-prueba="modo-NOMBRE"]').click().should('have.attr', 'aria-pressed', 'true')
    // Se espera a que el campo del modo nuevo termine de pintarse antes de escribir.
    cy.contains('label', 'Tu nombre completo').parent().find('input').should('be.visible').and('be.enabled')
    cy.contains('label', 'Tu nombre completo').parent().find('input').type('Carlos Restrepo Gómez')
    cy.get('[data-prueba="vista-nombre"]').should('contain', 'Carlos Restrepo Gómez')
    cy.get('[data-prueba="acepta-terminos"]').should('not.be.checked').check()
    cy.get('[data-prueba="firmar"]').click()
  })
  cy.location('pathname').should('eq', '/firma/confirmar')
  cy.get('[data-pantalla="W03-02b"]').within(() => {
    cy.contains('tarjeta de crédito o débito').should('exist')
    cy.contains('junto con la cuota').should('not.exist')
    cy.get('[data-prueba="confirmar-firma"]').click()
  })
  cy.location('pathname').should('eq', '/firma/confirmada')
}

function pagarCon(numero: string) {
  cy.get('[data-pantalla="W03-03"]').find('[data-prueba="pagar"]').click()
  cy.location('pathname').should('match', /^\/dev\/pasarela\//)
  cy.get('[data-pantalla="DEV-pasarela"]').within(() => {
    cy.get('[data-prueba="numero"]').type(numero)
    cy.get('[data-prueba="titular"]').type('CARLOS RESTREPO')
    cy.get('[data-prueba="vencimiento"]').type('12/30')
    cy.get('[data-prueba="cvv"]').type('123')
    cy.get('[data-prueba="pagar-pasarela"]').click()
    cy.get('[data-prueba="resultado-pasarela"]', { timeout: 6000 }).should('exist')
    cy.get('[data-prueba="regresar-comercio"]').click()
  })
  cy.location('pathname').should('match', /^\/(pago\/retorno|firma\/poliza)$/)
}

describeConMocks('HU-W03 · Suscripción, firma y pago con el asesor', () => {
  it('W01-01 → W03-01 → modal → enlace → W03-02 → W03-02b → W03-03 → pasarela → W03-04', () => {
    cotizarComoAsesor()
    verificarYEmitir()
    cy.get('[data-prueba="enlace-enviado"]').should('contain', 'c•••@correo.com').and('not.contain', '/firma')

    abrirEnlaceDelCorreo()
    firmarConNombre()
    cy.get('[data-prueba="evidencia-firma"]').should('contain', 'Firmado electrónicamente')
    cy.contains(/biom[eé]trica/).should('not.exist')

    pagarCon('4242424242424242')
    cy.location('pathname').should('eq', '/firma/poliza')
    cy.get('[data-pantalla="W03-04"]').within(() => {
      cy.get('[data-prueba="numero-poliza"]').invoke('text').should('match', /SOL-\d{4}-\d{6}/)
      cy.contains('Ir al inicio').should('not.exist')
    })
    // Con la póliza emitida no queda el puente del token en sessionStorage.
    cy.window().then((win) => expect(win.sessionStorage.getItem('solventa.enlaceFirma')).to.equal(null))
  })

  it('un rechazo (fondos insuficientes) pide otra tarjeta sin perder la firma, y con otra se emite', () => {
    cotizarComoAsesor()
    verificarYEmitir()
    abrirEnlaceDelCorreo()
    firmarConNombre()
    pagarCon('4000000000000002')

    cy.get('[data-pantalla="W03-R"]').within(() => {
      cy.contains('Tu banco rechazó el pago').should('exist')
      cy.contains('Tu firma se conserva').should('exist')
      cy.get('[data-prueba="otra-tarjeta"]').click()
    })
    cy.get('[data-pantalla="DEV-pasarela"]').within(() => {
      cy.get('[data-prueba="numero"]').type('5555555555554444')
      cy.get('[data-prueba="titular"]').type('CARLOS RESTREPO')
      cy.get('[data-prueba="vencimiento"]').type('12/30')
      cy.get('[data-prueba="cvv"]').type('123')
      cy.get('[data-prueba="pagar-pasarela"]').click()
      cy.get('[data-prueba="regresar-comercio"]', { timeout: 6000 }).click()
    })
    cy.location('pathname').should('eq', '/firma/poliza')
  })

  it('la pasarela falla: reintentar y, al 3.er fallo seguido, otra tarjeta', () => {
    cotizarComoAsesor()
    verificarYEmitir()
    abrirEnlaceDelCorreo()
    firmarConNombre()
    pagarCon('4000000000000119')

    cy.get('[data-pantalla="W03-R"]').within(() => {
      cy.get('[data-prueba="fallos"]').should('contain', '1 de 3')
      cy.get('[data-prueba="reintentar-pago"]').click()
      cy.get('[data-prueba="fallos"]').should('contain', '2 de 3')
      cy.get('[data-prueba="reintentar-pago"]').click()
      cy.get('[data-prueba="fallos"]').should('contain', '3 de 3')
      cy.get('[data-prueba="reintentar-pago"]').should('not.exist')
      cy.get('[data-prueba="otra-tarjeta"]').should('exist')
    })
  })

  it('UNDER manda a revisión: no hay enlace y el asesor ve el mensaje', () => {
    cotizarComoAsesor('cliente@revision.test')
    cy.get('[data-pantalla="W03-01"]').find('[data-prueba="aceptar"]').click()
    cy.get('[data-componente="modal-verificacion-asesor"]').within(() => {
      cy.get('[data-prueba="enviar-codigo"]').click()
      cy.get('input').type('000000')
      cy.get('[data-prueba="verificar"]').click()
      cy.get('[data-prueba="emitir"]').click()
      cy.contains('La solicitud pasó a revisión').should('exist')
      cy.get('[data-prueba="mensaje-estado"]').should('not.be.empty')
    })
  })

  it('un enlace vencido muestra el estado vacío, sin botones', () => {
    cy.visit('/firma#t=vencido')
    cy.get('[data-pantalla="W03-02"]').within(() => {
      cy.contains('Este enlace venció o ya no es válido').should('exist')
      cy.get('main button').should('not.exist')
    })
  })

  it('responsive (375 px): W03-02 se puede firmar sin desplazamiento horizontal', () => {
    cy.viewport(375, 812)
    cy.visit('/firma#t=demo')
    cy.get('[data-pantalla="W03-02"]').should('exist')
    cy.document().then((doc) => expect(doc.documentElement.scrollWidth).to.be.at.most(375))
    cy.get('[data-prueba="lienzo-firma"]').should('be.visible')
  })
})
