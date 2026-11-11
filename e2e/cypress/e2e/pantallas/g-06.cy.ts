import { describeConMocks } from '../../support/entorno'
import { responderBff, irARuta } from '../../support/msw'
import { ingresar, type Rol } from '../../support/sesion'

// G-06 «Mis pólizas» (cliente) y «Pólizas emitidas» (asesor) y G-06b «Detalle de la póliza» (QA 2026-11-10, Q-09).
// Corre contra los mocks de MSW; cada caso fija con `cy.intercept` cuántas pólizas devuelve `propuestas`.

type Fila = Record<string, unknown>

function propuesta(n: number, extra: Fila = {}): Fila {
  const id = `prop-${n}`
  return {
    id,
    ofertaId: `of-${n}`,
    estado: 'EMITIDA',
    estadoVisible: 'EMITIDA',
    polizaId: `pol-${n}`,
    nombreTitular: `Titular ${n}`,
    actualizadoEn: '2026-11-01T15:00:00Z',
    creadaEn: '2026-11-01T14:00:00Z',
    plazoMeses: 12,
    motivoEstado: null,
    mensajeEstado: null,
    accionSugerida: null,
    prima: { valor: '100000', moneda: 'COP' },
    cobertura: { valor: '50000000', moneda: 'COP' },
    poliza: {
      id: `pol-${n}`,
      numero: `SOL-2026-${String(n).padStart(6, '0')}`,
      estado: 'VIGENTE',
      vigenciaDesde: '2026-11-01T15:00:00Z',
      vigenciaHasta: '2027-11-01T15:00:00Z',
      documentoUrl: `/mock/polizas/pol-${n}/documento.pdf`,
      ramo: 'VIDA_DEUDOR',
    },
    ...extra,
  }
}

/** Las pólizas que devuelve el BFF simulado: `propuestas` pagina de 10 en 10 y `propuesta(id)` busca por id. */
function conPolizas(win: Window, lista: Fila[], rol: Rol) {
  responderBff(win, {
    propuestas: ({ pagina, tamano }) => {
      const t = Number(tamano ?? 10)
      const p = Number(pagina ?? 1)
      return {
        data: {
          propuestas: { propuestas: lista.slice((p - 1) * t, p * t), total: lista.length, pagina: p, tamano: t },
        },
      }
    },
    propuesta: ({ id }) => {
      const fila = lista.find((p) => p.id === id)
      // El BFF solo manda el nombre del titular al asesor.
      return { data: { propuesta: fila ? { ...fila, ...(rol === 'CLIENTE' ? { nombreTitular: null } : {}) } : null } }
    },
  })
}

/** Inicia sesión, fija las pólizas y abre `ruta` sin recargar (no espera la ruta: con una sola salta al detalle). */
function abrirPolizas(rol: Rol, lista: Fila[], ruta = '/polizas') {
  ingresar(rol)
  cy.window().then((win) => {
    conPolizas(win, lista, rol)
    irARuta(win, ruta)
  })
}

describeConMocks('G-06 / G-06b · Pólizas emitidas y su detalle', () => {
  for (const rol of ['CLIENTE', 'ASESOR'] as const) {
    describe(`como ${rol}`, () => {
      it('sin pólizas muestra el estado vacío con el camino a cotizar', () => {
        abrirPolizas(rol, [])
        cy.get('[data-prueba="polizas-vacio"]').should('be.visible')
        cy.get('[data-prueba="polizas-vacio"] a').should('have.attr', 'href', '/cotizacion')
        cy.get('[data-prueba="fila-poliza"]').should('not.exist')
      })

      it('con una sola póliza emitida se abre directo su detalle', () => {
        abrirPolizas(rol, [propuesta(1)])
        cy.location('pathname').should('eq', '/polizas/prop-1')
        cy.get('[data-pantalla="G-06b"]').within(() => {
          cy.get('[data-prueba="detalle-numero"]').should('have.text', 'SOL-2026-000001')
          cy.get('[data-prueba="detalle-estado"]').should('contain.text', 'Emitida')
          cy.contains('12 meses').should('exist')
          cy.get('[data-prueba="detalle-vigencia"]').should('exist')
          cy.get('[data-prueba="detalle-pdf"]').should('be.enabled')
          // El titular solo lo ve el asesor.
          cy.get('[data-prueba="detalle-titular"]').should(rol === 'ASESOR' ? 'contain.text' : 'not.exist', 'Titular 1')
        })
      })

      it('«Volver» del detalle muestra la tabla aunque haya una sola póliza, sin rebotar', () => {
        abrirPolizas(rol, [propuesta(1)])
        cy.location('pathname').should('eq', '/polizas/prop-1')
        cy.contains('a', 'Volver a las pólizas').click()
        cy.location('pathname').should('eq', '/polizas')
        cy.location('search').should('eq', '?lista=1')
        cy.get('[data-prueba="fila-poliza"]').should('have.length', 1)
      })

      it('con varias pólizas, tocar una fila abre su detalle y el número es un enlace', () => {
        abrirPolizas(rol, [propuesta(1), propuesta(2), propuesta(3)])
        cy.get('[data-prueba="fila-poliza"]').should('have.length', 3)
        cy.get('a[href="/polizas/prop-2"]:visible').should('have.text', 'SOL-2026-000002')
        cy.get('[data-prueba="fila-poliza"]').eq(1).find('td').eq(3).click()
        cy.location('pathname').should('eq', '/polizas/prop-2')
        cy.get('[data-prueba="detalle-numero"]').should('have.text', 'SOL-2026-000002')
      })

      it('pagina de 10 en 10', () => {
        abrirPolizas(
          rol,
          Array.from({ length: 23 }, (_, i) => propuesta(i + 1)),
        )
        cy.get('[data-prueba="fila-poliza"]').should('have.length', 10)
        cy.contains('Mostrando 10 de 23 pólizas').should('exist')
        cy.contains('button', 'Siguiente').click()
        cy.get('[data-prueba="fila-poliza"]').should('have.length', 10)
        cy.contains('button', 'Siguiente').click()
        cy.get('[data-prueba="fila-poliza"]').should('have.length', 3)
        cy.contains('Mostrando 3 de 23 pólizas').should('exist')
      })

      it('una póliza que no existe o es ajena muestra «No encontramos esta póliza»', () => {
        abrirPolizas(rol, [], '/polizas/prop-999')
        cy.get('[data-prueba="poliza-no-encontrada"]').should('be.visible')
      })
    })
  }

  it('el asesor ve «Retomar» en una póliza en emisión y el detalle explica el estado', () => {
    abrirPolizas('ASESOR', [
      propuesta(1),
      propuesta(2, { estado: 'EN_FIRMA', estadoVisible: 'EMITIENDO', poliza: null }),
    ])
    cy.get('[data-prueba="fila-poliza"]').eq(1).click()
    cy.location('pathname').should('eq', '/polizas/prop-2')
    cy.get('[data-prueba="detalle-mensaje"]').should('contain.text', 'Estamos emitiendo')
    cy.get('[data-prueba="detalle-pdf"]').should('not.exist')
    cy.get('[data-prueba="detalle-retomar"]').should('exist')
  })

  it('en un teléfono no hay desplazamiento horizontal de la página', () => {
    cy.viewport(390, 844)
    abrirPolizas('CLIENTE', [propuesta(1), propuesta(2)])
    cy.get('[data-prueba="tarjeta-poliza"]').should('have.length', 2).and('be.visible')
    cy.get('[data-prueba="fila-poliza"]').should('not.be.visible')
    cy.get('[data-prueba="tarjeta-poliza"]').first().click()
    cy.location('pathname').should('eq', '/polizas/prop-1')
    cy.contains('a', 'Volver a las pólizas').click()
    cy.document().then((doc) => {
      expect(doc.documentElement.scrollWidth).to.be.lte(doc.documentElement.clientWidth)
    })
  })
})
