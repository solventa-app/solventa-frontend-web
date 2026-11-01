import { ingresar, visitarComo } from '../support/sesion'

// Contra el stack real (compose), no contra los mocks: está fuera de `cypress/e2e` para que el CI no la corra.
// Cómo correrla: `cypress/integracion/README.md`.
const psql = (bd: string, sql: string) => cy.task<string>('psql', { bd, sql })

function formularioAsesor(cuerpo: () => void) {
  cy.get('[data-pantalla="W01-01"]').within(cuerpo)
}

const campo = (etiqueta: string) => cy.contains('label', etiqueta).parent().find('input')

describe('HU-W01 · formulario contra el backend real', () => {
  it('el ASESOR debe dar nombre y correo válidos y llega a la oferta', () => {
    visitarComo('ASESOR', '/cotizacion')
    const documento = `CC${Date.now().toString().slice(-10)}`
    formularioAsesor(() => {
      campo('Nombre completo del cliente').should('be.visible')
      campo('Correo del cliente').should('be.visible')
      campo('Documento de identidad').type(documento)
      campo('Monto del crédito hipotecario').type('185000000')
      campo('Plazo (meses)').type('60')
      campo('Dirección del inmueble a asegurar').type('Cra 45 # 22-18, Bogotá D.C.')
      cy.get('input[type="checkbox"]').check()
      cy.contains('button', 'Consultar oferta').click()
      cy.contains('Ingresa el correo del cliente.').should('be.visible')

      campo('Nombre completo del cliente').type('Carlos Restrepo Gómez')
      campo('Correo del cliente').type('no-es-un-correo')
      cy.contains('button', 'Consultar oferta').click()
      cy.contains('Ingresa un correo válido').should('be.visible')

      campo('Correo del cliente').clear().type('carlos.restrepo@correo.com')
      cy.contains('button', 'Consultar oferta').click()
    })
    cy.get('[data-pantalla="W01-03a"]', { timeout: 20000 }).should('be.visible')
  })

  it('el CLIENTE no ve los campos de contacto', () => {
    visitarComo('CLIENTE', '/cotizacion')
    cy.get('[data-pantalla="W01-01"]').within(() => {
      cy.contains('label', 'Correo del cliente').should('not.exist')
      cy.contains('label', 'Nombre completo del cliente').should('not.exist')
    })
  })
})

describe('HU-W05 · W05-01 por SSE contra el backend real', () => {
  it('un cobro recurrente aparece solo, sin recargar', () => {
    psql(
      'payments',
      `UPDATE programacion_cobros SET proximo_cobro_en = now() WHERE id = (SELECT p.id FROM programacion_cobros p JOIN cobros c ON c.poliza_id = p.propuesta_id WHERE c.origen = 'RECURRENTE' AND c.estado = 'cobrado' AND p.activa ORDER BY c.creado_en DESC LIMIT 1) RETURNING propuesta_id`,
    ).then((salida) => {
      const propuesta = salida.split('\n')[0]
      const filas = '[data-pantalla="W05-01"] table tbody tr'
      const recurrentes = ($filas: JQuery<HTMLElement>) =>
        $filas.filter((_, fila) => fila.innerText.includes(propuesta) && fila.innerText.includes('Recurrente')).length

      ingresar('BACKOFFICE')
      cy.contains('a', 'Conciliación de pagos').click()
      cy.get(filas, { timeout: 20000 }).should('have.length.gte', 1)
      cy.window().then((ventana) => {
        ;(ventana as unknown as { sinRecargar: boolean }).sinRecargar = true
      })
      // Deja que la conexión SSE quede abierta antes de cobrar.
      cy.wait(1500)

      cy.get(filas)
        .then(recurrentes)
        .then((antes) => {
          cy.request('POST', 'http://localhost:8004/cobros/_generar-recurrentes')
            .its('body.generados')
            .should('eq', 1)
          cy.get(filas, { timeout: 10000 }).should(($filas) => {
            expect(recurrentes($filas)).to.eq(antes + 1)
          })
        })
      cy.window().its('sinRecargar').should('eq', true)
    })
  })
})
