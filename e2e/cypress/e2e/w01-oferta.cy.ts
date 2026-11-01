import { ingresar } from '../support/sesion'

// E2E de la historia HU-W01 (Jira KAN-203 pide, ADEMÁS de esto, un E2E por pantalla individual —
// ver cypress/e2e/pantallas/*.cy.ts): flujo completo de cotización cruzando varias pantallas, tal
// como lo recorre una persona real. Localiza por [data-pantalla="<id>"] y por roles/etiquetas
// accesibles, nunca por clases CSS (ver e2e/README.md). Corre contra los mocks de MSW
// (`npm run web:dev:mock`, ver handlers.ts): el documento termina en 999 → oferta preliminar, en
// 000 → error; cualquier otro → oferta completa.
describe('HU-W01 · Cotización de seguro de vida hipotecario', () => {
  beforeEach(() => ingresar('CLIENTE'))

  it('W01-01 → W01-02 → W01-03a → W01-04: oferta completa y su detalle de fuentes', () => {
    cy.contains('a', 'Nueva cotización').click()
    cy.location('pathname').should('eq', '/cotizacion')

    cy.get('[data-pantalla="W01-01"]').within(() => {
      cy.contains('label', 'Documento de identidad').parent().find('input').type('1020304050')
      cy.contains('label', 'Monto del crédito hipotecario').parent().find('input').type('185000000')
      cy.contains('label', 'Plazo (meses)').parent().find('input').type('60')
      cy.contains('label', 'Dirección del inmueble a asegurar').parent().find('input').type('Cra 45 # 22-18, Bogotá D.C.')
      cy.get('input[type="checkbox"]').check()
      cy.contains('button', 'Consultar oferta').click()
    })

    // No se afirma que la ruta pase por /cotizacion/consulta (W01-02): esa pantalla "avanza
    // automáticamente" y, contra los mocks (sin delay artificial), resuelve casi al instante, así
    // que Cypress puede llegar a comprobarlo cuando la app ya navegó más allá (carrera perdida
    // contra el propio mock, confirmado corriendo este spec de verdad). El estado de carga de
    // W01-02 ya lo cubre, de forma determinista, la prueba de Vitest que retrasa la respuesta a
    // propósito (pantallas-w01.test.ts); aquí solo se afirma el destino final del viaje completo.
    cy.location('pathname', { timeout: 10000 }).should('eq', '/cotizacion/oferta')
    cy.get('[data-pantalla="W01-03a"]').within(() => {
      cy.contains('Tu oferta está lista').should('exist')
      cy.contains('60 meses').should('exist')
      cy.contains('a', 'Ver detalle de fuentes consultadas').click()
    })

    cy.location('pathname').should('eq', '/cotizacion/fuentes')
    cy.get('[data-pantalla="W01-04"]').within(() => {
      cy.contains('h2', 'Open Finance').should('exist')
      cy.contains('h2', 'Open Data').should('exist')
      cy.get('li').should('have.length', 5)
    })
  })

  it('W01-01 → W01-02 → W01-03b: oferta preliminar (fuente degradada, documento terminado en 999)', () => {
    cy.contains('a', 'Nueva cotización').click()
    cy.get('[data-pantalla="W01-01"]').within(() => {
      cy.contains('button', 'Simular oferta degradada: timeout de fuentes con valor en caché').click()
    })

    cy.location('pathname', { timeout: 10000 }).should('eq', '/cotizacion/oferta-preliminar')
    cy.get('[data-pantalla="W01-03b"]').within(() => {
      cy.contains('No pudimos verificar todo a tiempo, esta es una oferta preliminar').should('exist')
      cy.contains('Oferta preliminar').should('exist')
    })
  })

  it('W01-01 → W01-02 → W01-03c → W01-05: fallo total y contacto con un asesor', () => {
    cy.contains('a', 'Nueva cotización').click()
    cy.get('[data-pantalla="W01-01"]').within(() => {
      cy.contains('button', 'Simular fallo total de la consulta de fuentes').click()
    })

    cy.location('pathname', { timeout: 10000 }).should('eq', '/cotizacion/error')
    cy.get('[data-pantalla="W01-03c"]').within(() => {
      cy.contains('No pudimos consultar tu historial crediticio en este momento.').should('exist')
      cy.contains('a', 'Hablar con un asesor').click()
    })

    cy.location('pathname').should('eq', '/cotizacion/asesor')
    cy.get('[data-pantalla="W01-05"]').within(() => {
      cy.contains('button', 'Llamar').click()
      cy.contains('Un asesor te contactará en breve').should('exist')
    })
  })

  describe('W01-01 · valores límite (FC-01)', () => {
    const campo = (etiqueta: string) => cy.contains('label', etiqueta).parent().find('input')
    const llenar = (datos: { documento: string; monto: string; plazo: string; direccion: string }) => {
      campo('Documento de identidad').clear()
      if (datos.documento) campo('Documento de identidad').type(datos.documento)
      campo('Monto del crédito hipotecario').clear()
      if (datos.monto) campo('Monto del crédito hipotecario').type(datos.monto)
      campo('Plazo (meses)').clear()
      if (datos.plazo) campo('Plazo (meses)').type(datos.plazo)
      campo('Dirección del inmueble a asegurar').clear()
      if (datos.direccion) campo('Dirección del inmueble a asegurar').type(datos.direccion)
      cy.get('input[type="checkbox"]').check()
    }
    const valido = { documento: '123456', monto: '185000000', plazo: '60', direccion: 'Cra 45 # 22-18, Bogotá D.C.' }

    beforeEach(() => {
      cy.contains('a', 'Nueva cotización').click()
      cy.location('pathname').should('eq', '/cotizacion')
    })

    it('rechaza documento de 5 dígitos, monto 0, plazo 0 y dirección vacía, sin salir de W01-01', () => {
      cy.get('[data-pantalla="W01-01"]').within(() => {
        llenar({ documento: '12345', monto: '0', plazo: '0', direccion: '' })
        cy.contains('button', 'Consultar oferta').click()
        cy.contains('[role="alert"]', 'Ingresa un número de documento válido').should('exist')
        cy.contains('[role="alert"]', 'Ingresa un monto válido, mayor a cero.').should('exist')
        cy.contains('[role="alert"]', 'Ingresa un plazo válido, entre 1 y 60 meses.').should('exist')
        cy.contains('[role="alert"]', 'Ingresa la dirección del inmueble a asegurar.').should('exist')
      })
      cy.location('pathname').should('eq', '/cotizacion')
    })

    it('rechaza un plazo de 61 meses', () => {
      cy.get('[data-pantalla="W01-01"]').within(() => {
        llenar({ ...valido, plazo: '61' })
        cy.contains('button', 'Consultar oferta').click()
        cy.contains('[role="alert"]', 'Ingresa un plazo válido').should('exist')
      })
      cy.location('pathname').should('eq', '/cotizacion')
    })

    for (const plazo of ['1', '60']) {
      it(`acepta documento de 6 dígitos con plazo de ${plazo} mes(es) y llega a la oferta`, () => {
        cy.get('[data-pantalla="W01-01"]').within(() => {
          llenar({ ...valido, plazo })
          cy.contains('button', 'Consultar oferta').click()
        })
        cy.location('pathname', { timeout: 10000 }).should('eq', '/cotizacion/oferta')
      })
    }
  })
})
