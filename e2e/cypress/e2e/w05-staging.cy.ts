import { describeEnStaging } from '../support/entorno'
import { ingresar } from '../support/sesion'

// E2E de HU-W05 contra STAGING (FC-10 desde la web): Vercel + gateway + BFF + PAYMENTS + ACL + stub de la
// pasarela, con datos reales. Se salta solo cuando corre contra los mocks (ver support/entorno.ts).
//
// Requisitos antes de correrlo (docs de `solventa-backend`, plan de HU-W05):
//   - staging encendido (Actions → Costos staging → encender);
//   - cobros sembrados: `python3 scripts/sembrar_cobros.py` (deja uno RECHAZADO con reintentos);
//   - credenciales del operador en los secretos CYPRESS_USUARIO_BACKOFFICE / CYPRESS_CLAVE_BACKOFFICE.
//
// A propósito NO cuenta filas ni nombres fijos: los datos de staging cambian. Verifica el comportamiento.
// Ojo: reintentar un rechazado gasta uno de sus 3 reintentos reales; por eso solo se hace sobre uno que
// todavía tenga botón.
describeEnStaging('HU-W05 · Conciliación de pagos contra staging', () => {
  beforeEach(() => ingresar('BACKOFFICE'))

  it('el operador ve la tabla de cobros con sus columnas y ningún error técnico', () => {
    cy.contains('a', 'Conciliación de pagos').click()
    cy.location('pathname').should('eq', '/operador/conciliacion')

    cy.get('[data-pantalla="W05-01"]').within(() => {
      cy.get('table thead th').should('contain.text', 'Prima')
      cy.get('table thead th').should('contain.text', 'ID de transacción')
      cy.get('table tbody tr', { timeout: 20000 }).its('length').should('be.gte', 1)
      cy.contains('No pudimos cargar la conciliación').should('not.exist')
    })
  })

  it('las pestañas de estado filtran la tabla', () => {
    cy.contains('a', 'Conciliación de pagos').click()
    cy.get('[data-pantalla="W05-01"]').within(() => {
      cy.get('table tbody tr', { timeout: 20000 }).its('length').should('be.gte', 1)
      cy.get('[role="tab"]').contains('Cobrado').click()
      cy.get('table tbody tr').each(($fila) => {
        expect($fila.text()).not.to.match(/Rechazado|Pendiente/)
      })
    })
  })

  it('reintenta un cobro rechazado: confirma o explica por qué no, sin error técnico', function () {
    cy.contains('a', 'Conciliación de pagos').click()
    cy.get('[data-pantalla="W05-01"]').within(() => {
      cy.get('table tbody tr', { timeout: 20000 }).its('length').should('be.gte', 1)
      cy.get('[role="tab"]').contains('Rechazado').click()
    })
    cy.get('body').then(($cuerpo) => {
      if ($cuerpo.find('button:contains("Reintentar cobro")').length === 0) {
        cy.log('No hay un rechazado con reintentos: se siembra con scripts/sembrar_cobros.py')
        this.skip()
      }
    })
    cy.contains('button', 'Reintentar cobro').first().click()
    // O se muestra el aviso de reenvío (el aviso siempre está en el DOM: se mira que sea visible), o el BFF
    // explica por qué no (p. ej. «requiere otro medio de pago») en una alerta. Nunca un error técnico.
    cy.get('[data-pantalla="W05-01"]', { timeout: 20000 }).should(($pantalla) => {
      const avisoVisible = $pantalla.find('[role="status"]').css('opacity') === '1'
      const alerta = $pantalla.find('[role="alert"]').text()
      expect(avisoVisible || alerta.length > 0, 'aviso de reenvío o explicación').to.eq(true)
      expect(alerta).not.to.match(/Unexpected error|GraphQL|HTTP|500/)
    })
  })
})
