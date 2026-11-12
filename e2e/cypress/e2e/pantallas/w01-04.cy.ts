import { describeConMocks } from '../../support/entorno'
import { responderBff, irARuta } from '../../support/msw'
import { ingresar, visitarComo } from '../../support/sesion'

// W01-04 «Fuentes consultadas» (historial del asesor) y W01-04b (detalle de una consulta): QA 2026-11-10, Q-07 y Q-08.
// Corre contra los mocks de MSW; cada caso fija con `responderBff` cuántas consultas devuelve el BFF.

type Fila = Record<string, unknown>

function consulta(n: number, extra: Fila = {}): Fila {
  return {
    id: `c-${n}`,
    creadaEn: '2026-11-01T15:00:00Z',
    documentoEnmascarado: `10••••30${String(n).padStart(2, '0')}`,
    tipoOferta: 'COMPLETA',
    producto: 'VIDA_DEUDOR',
    ofertaId: `of-${n}`,
    fuentes: [
      { id: 'cuentas-bancarias', nombre: 'cuentas-bancarias', origen: 'OPEN_FINANCE', estado: 'OK', capturadoEn: null },
      {
        id: 'historial-crediticio',
        nombre: 'historial-crediticio',
        origen: 'OPEN_FINANCE',
        estado: 'CACHE',
        capturadoEn: '2026-11-01T14:00:00Z',
      },
      { id: 'afiliacion-pila', nombre: 'afiliacion-pila', origen: 'OPEN_DATA', estado: 'OK', capturadoEn: null },
      { id: 'camara-comercio', nombre: 'camara-comercio', origen: 'OPEN_DATA', estado: 'OK', capturadoEn: null },
      {
        id: 'antecedentes-judiciales',
        nombre: 'antecedentes-judiciales',
        origen: 'OPEN_DATA',
        estado: 'FALLO',
        capturadoEn: null,
      },
    ],
    ...extra,
  }
}

/** Inicia sesión como ASESOR, fija las consultas que devuelve el BFF y abre `ruta` sin recargar. */
function abrirHistorial(lista: Fila[], ruta = '/cotizacion/fuentes') {
  ingresar('ASESOR')
  cy.window().then((win) => {
    responderBff(win, {
      consultasFuentes: ({ pagina, tamano }) => {
        const t = Number(tamano ?? 10)
        const p = Number(pagina ?? 1)
        return {
          data: {
            consultasFuentes: { consultas: lista.slice((p - 1) * t, p * t), total: lista.length, pagina: p, tamano: t },
          },
        }
      },
      consultaFuentes: ({ id }) => ({ data: { consultaFuentes: lista.find((c) => c.id === id) ?? null } }),
    })
    irARuta(win, ruta)
  })
}

describeConMocks('W01-04 / W01-04b · Fuentes consultadas del asesor', () => {
  it('sin consultas muestra el estado vacío con «Nueva cotización»', () => {
    abrirHistorial([])
    cy.get('[data-pantalla="W01-04"]').within(() => {
      cy.get('[data-prueba="fuentes-vacio"]').should('be.visible')
      cy.get('[data-prueba="fuentes-nueva"]').should('have.attr', 'href', '/cotizacion')
      cy.get('[data-prueba="fila-consulta"]').should('not.exist')
    })
  })

  it('con una sola consulta se abre directo su detalle, con cada fuente y su estado', () => {
    abrirHistorial([consulta(1)])
    cy.location('pathname').should('eq', '/cotizacion/fuentes/c-1')
    cy.get('[data-pantalla="W01-04b"]').within(() => {
      cy.get('[data-prueba="consulta-datos"]').should('contain.text', '10••••3001')
      cy.contains('h2', 'Open Finance').should('exist')
      cy.contains('h2', 'Open Data').should('exist')
      cy.get('section li').should('have.length', 5)
      cy.contains('Usando último valor cacheado').should('exist')
      cy.contains('No disponible').should('exist')
    })
  })

  it('«Volver al historial» muestra la tabla aunque haya una sola consulta, sin rebotar', () => {
    abrirHistorial([consulta(1)])
    cy.location('pathname').should('eq', '/cotizacion/fuentes/c-1')
    cy.contains('a', 'Volver al historial').click()
    cy.location('pathname').should('eq', '/cotizacion/fuentes')
    cy.location('search').should('eq', '?lista=1')
    cy.get('[data-prueba="fila-consulta"]').should('have.length', 1)
  })

  it('con varias, tocar una fila abre su detalle y la fecha es un enlace', () => {
    abrirHistorial([consulta(1), consulta(2), consulta(3)])
    cy.get('[data-prueba="fila-consulta"]').should('have.length', 3)
    cy.get('a[href="/cotizacion/fuentes/c-2"]:visible').should('exist')
    cy.get('[data-prueba="fila-consulta"]').eq(1).find('td').eq(2).click()
    cy.location('pathname').should('eq', '/cotizacion/fuentes/c-2')
    cy.get('[data-prueba="consulta-datos"]').should('contain.text', '10••••3002')
  })

  it('pagina de 10 en 10', () => {
    abrirHistorial(Array.from({ length: 23 }, (_, i) => consulta(i + 1)))
    cy.get('[data-prueba="fila-consulta"]').should('have.length', 10)
    cy.contains('Mostrando 10 de 23 consultas').should('exist')
    cy.contains('button', 'Siguiente').click()
    cy.get('[data-prueba="fila-consulta"]').should('have.length', 10)
    cy.contains('button', 'Siguiente').click()
    cy.get('[data-prueba="fila-consulta"]').should('have.length', 3)
    cy.contains('Mostrando 3 de 23 consultas').should('exist')
  })

  it('una consulta ajena o inexistente muestra «No encontramos esta consulta»', () => {
    abrirHistorial([], '/cotizacion/fuentes/c-999')
    cy.get('[data-prueba="consulta-no-encontrada"]').should('contain.text', 'No encontramos esta consulta.')
    cy.contains('a', 'Volver al historial').should('have.attr', 'href', '/cotizacion/fuentes?lista=1')
  })

  it('en un teléfono hay tarjetas, no tabla, y no hay desplazamiento horizontal de la página', () => {
    cy.viewport(390, 844)
    abrirHistorial([consulta(1), consulta(2)])
    cy.get('[data-prueba="tarjeta-consulta"]').should('have.length', 2).and('be.visible')
    cy.get('[data-prueba="fila-consulta"]').should('not.be.visible')
    cy.document().then((doc) => {
      expect(doc.documentElement.scrollWidth).to.be.lte(doc.documentElement.clientWidth)
    })
    cy.get('[data-prueba="tarjeta-consulta"]').first().click()
    cy.location('pathname').should('eq', '/cotizacion/fuentes/c-1')
  })

  it('/cotizacion/fuentes/oferta sin la oferta en memoria vuelve al historial', () => {
    abrirHistorial([consulta(1), consulta(2)], '/cotizacion/fuentes/oferta')
    cy.location('pathname').should('eq', '/cotizacion/fuentes')
    cy.get('[data-pantalla="W01-04"]').should('exist')
  })
})

// Q-07: el cliente no ve las fuentes consultadas.
describeConMocks('W01-04 · El cliente no ve las fuentes consultadas', () => {
  it('su inicio no tiene la opción «Fuentes consultadas»', () => {
    visitarComo('CLIENTE', '/inicio')
    cy.get('[data-pantalla="G-02"]').should('exist')
    cy.contains('a', 'Fuentes consultadas').should('not.exist')
  })

  it('la ruta del historial y la del detalle lo mandan a «sin acceso»', () => {
    ingresar('CLIENTE')
    cy.window().then((win) => irARuta(win, '/cotizacion/fuentes'))
    cy.location('pathname').should('eq', '/sin-acceso')
    cy.window().then((win) => irARuta(win, '/cotizacion/fuentes/c-1'))
    cy.location('pathname').should('eq', '/sin-acceso')
  })
})
