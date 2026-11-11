import { ingresar } from '../support/sesion'

// HU-W03 (KAN-26, T6): el recorrido real del CLIENTE contra el stack del compose, no contra los mocks. Cotiza en el
// navegador y llega a firmar; firma, paga en la pasarela del compose (por su API: `cy.origin` falla con un error interno
// de Cypress 16 al entrar a la pasarela de `:8103`) y abre la póliza guardada. Comprueba que los documentos firmados
// quedaron **guardados y cifrados**: filas en `documentos_firmados`, objetos del bucket que empiezan por `SOLVENC1` y sin
// `%PDF` en claro, y que el PDF que se entrega es siempre el mismo.
// Necesita el CLIENTE demo `cliente.siniestros` (`crear-cliente-siniestros-demo`) y la pasarela del compose. Cómo correrla:
// `cypress/integracion/README.md`.
const GATEWAY = 'http://localhost:8080'
const PASARELA = 'http://localhost:8103' // stub de la pasarela del compose
const TARJETA = {
  numero: '4242424242424242',
  nombre: 'Titular Cypress',
  vencimiento: '12/30',
  cvv: '123',
  tipo: 'DEBITO',
}

function gql<T>(query: string, variables: object, token?: string) {
  return cy
    .request({
      method: 'POST',
      url: `${GATEWAY}/graphql/web`,
      body: { query, variables },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    .its('body.data') as Cypress.Chainable<T>
}

const pdf = (url: string, token: string) =>
  cy.request({ url: `${GATEWAY}${url}`, headers: { Authorization: `Bearer ${token}` }, encoding: 'binary' })

describe('HU-W03 · firmar, pagar y abrir los documentos guardados contra el backend real', () => {
  it('el CLIENTE cotiza, firma y paga; el contrato y la póliza quedan guardados cifrados y se sirven siempre iguales', () => {
    let token = ''
    let propuestaId = ''
    let version = ''
    let sesionId = ''
    let polizaId = ''
    let documentoUrl = ''
    let primero = ''

    // 1. Cotiza en el navegador y llega a firmar (W01-01 → W01-03a → W03-02).
    ingresar('CLIENTE')
    cy.contains('a', 'Nueva cotización').click()
    cy.get('[data-pantalla="W01-01"]').within(() => {
      cy.contains('label', 'Monto del crédito hipotecario').parent().find('input').type('185000000')
      cy.contains('label', 'Plazo (meses)').parent().find('input').type('60')
      cy.contains('label', 'Dirección del inmueble a asegurar')
        .parent()
        .find('input')
        .type('Cra 45 # 22-18, Bogotá D.C.')
      cy.get('input[type="checkbox"]').check()
      cy.contains('button', 'Consultar oferta').click()
    })
    cy.get('[data-pantalla="W01-03a"]', { timeout: 20000 }).should('be.visible')
    cy.get('[data-prueba="firmar"]').click()
    cy.location('pathname', { timeout: 20000 }).should('match', /^\/propuestas\/[^/]+\/firma$/)
    cy.location('pathname').then((ruta) => {
      propuestaId = ruta.split('/')[2]!
    })
    cy.get('[data-pantalla="W03-02"]').find('[data-prueba="contrato-pdf"]').should('exist')

    // 2. Firma y paga por la API, con la sesión del mismo cliente.
    cy.env(['USUARIO_CLIENTE', 'CLAVE_CLIENTE']).then((vars) => {
      gql<{ iniciarSesion: { token: string } }>(
        'mutation($e: CredencialesInput!) { iniciarSesion(entrada: $e) { ... on Sesion { token } } }',
        {
          e: { usuario: vars.USUARIO_CLIENTE ?? 'cliente.siniestros@demo.solventa.co', clave: vars.CLAVE_CLIENTE ?? 'Cliente-local-1' },
        },
      ).then((d) => {
        token = d.iniciarSesion.token
      })
    })
    cy.then(() => {
      gql<{ firmaPorEnlace: { documento: { version: string } } }>(
        'query($p: ID) { firmaPorEnlace(propuestaId: $p) { documento { version } } }',
        { p: propuestaId },
        token,
      ).then((d) => {
        version = d.firmaPorEnlace.documento.version
      })
    })
    cy.then(() => {
      gql<{ firmarPorEnlace: { __typename: string } }>(
        'mutation($e: FirmarPorEnlaceInput!) { firmarPorEnlace(entrada: $e) { __typename ... on ErrorFirma { mensaje } } }',
        {
          e: {
            propuestaId,
            versionDocumento: version,
            aceptaTerminos: true,
            autorizaCobro: true,
            modo: 'NOMBRE',
            nombreFirma: 'Cliente Cypress',
          },
        },
        token,
      ).then((d) => {
        expect(d.firmarPorEnlace.__typename).to.eq('FirmaRegistrada')
      })
    })

    // El contrato firmado quedó guardado, cifrado, apenas se firmó.
    cy.then(() => {
      cy.task<string>('psql', {
        bd: 'policy',
        sql: `select tipo from documentos_firmados where propuesta_id = '${propuestaId}'`,
      }).should('eq', 'contrato-firmado')
    })
    cy.then(() => {
      pdf(`/propuestas/${propuestaId}/contrato.pdf`, token).then((r) => {
        expect(r.status).to.eq(200)
        expect(r.body).to.match(/^%PDF-/)
        expect(r.body).to.contain('Contrato firmado')
      })
    })

    cy.then(() => {
      gql<{ iniciarPago: { sesionId: string } }>(
        'mutation($p: ID) { iniciarPago(propuestaId: $p) { __typename ... on SesionPago { sesionId } } }',
        { p: propuestaId },
        token,
      ).then((d) => {
        sesionId = d.iniciarPago.sesionId
      })
    })
    cy.then(() => {
      cy.request('POST', `${PASARELA}/checkout/${sesionId}/pagar`, TARJETA).its('status').should('be.lessThan', 400)
    })
    cy.then(() => {
      gql<{ confirmarPago: { __typename: string; id: string } }>(
        'mutation($s: ID!, $p: ID) { confirmarPago(sesionId: $s, propuestaId: $p) { __typename ... on Poliza { id } ... on ErrorPago { mensaje } } }',
        { s: sesionId, p: propuestaId },
        token,
      ).then((d) => {
        expect(d.confirmarPago.__typename).to.eq('Poliza')
        polizaId = d.confirmarPago.id
      })
    })

    // 3. La póliza se sirve siempre igual, y queda guardada cifrada.
    cy.then(() => {
      gql<{ poliza: { documentoUrl: string } }>(
        'query($id: ID!) { poliza(id: $id) { documentoUrl } }',
        { id: polizaId },
        token,
      ).then((d) => {
        documentoUrl = d.poliza.documentoUrl
      })
    })
    cy.then(() => {
      pdf(documentoUrl, token).then((r) => {
        expect(r.status).to.eq(200)
        expect(r.body).to.match(/^%PDF-/)
        primero = r.body as string
      })
    })
    cy.then(() => {
      pdf(documentoUrl, token).then((r) => {
        expect(r.body).to.eq(primero)
      })
    })
    cy.then(() => {
      cy.task<string>('psql', {
        bd: 'policy',
        sql: `select string_agg(tipo, ',' order by tipo) from documentos_firmados where propuesta_id = '${propuestaId}'`,
      }).should('eq', 'contrato-firmado,poliza-pdf')
    })

    // 4. En el bucket solo hay bytes opacos: contenedor cifrado, sin el PDF en claro.
    cy.task<{ tipoContenido: string; inicio: string; pdfEnClaro: boolean }[]>('objetosCifrados', {
      prefijos: ['contrato-firmado', 'poliza-pdf'],
    }).then((objetos) => {
      expect(objetos.length).to.be.greaterThan(1)
      for (const o of objetos) {
        expect(o.tipoContenido).to.eq('application/octet-stream')
        expect(o.inicio).to.eq('SOLVENC1')
        expect(o.pdfEnClaro).to.eq(false)
      }
    })

    // 5. La póliza abre en «Mis pólizas» y su detalle ofrece el PDF.
    cy.then(() => {
      cy.window().then((w) => {
        w.history.pushState(null, '', `/polizas/${propuestaId}`)
        w.dispatchEvent(new PopStateEvent('popstate'))
      })
    })
    cy.get('[data-pantalla="G-06b"]', { timeout: 15000 }).within(() => {
      cy.get('[data-prueba="detalle-estado"]').should('contain', 'Emitida')
      cy.get('[data-prueba="detalle-pdf"]').should('be.enabled')
    })
  })
})
