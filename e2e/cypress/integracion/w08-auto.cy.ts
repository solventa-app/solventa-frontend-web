import { ingresar } from '../support/sesion'

// HU-W08 (KAN-290): la póliza de auto contra el stack real (compose), no contra los mocks. Necesita el CLIENTE demo
// `cliente.siniestros` con su póliza de auto (tareas `crear-cliente-siniestros-demo` y `sembrar-polizas-demo`),
// `stub-vehiculos` y el BACKOFFICE local. Cómo correrla: `cypress/integracion/README.md`.
const GATEWAY = 'http://localhost:8080' // el gateway del compose
// La foto de prueba del reporte (PNG de 385 bytes, la misma de las colecciones de Newman del backend).
const FOTO =
  'iVBORw0KGgoAAAANSUhEUgAAASwAAABkCAYAAAA8AQ3AAAABSElEQVR42u3UwQkAQAgDwfTftFbgx5fCDKQBj9sUwBNxAkCwAAQLECwAwQIQLECwAAQLQLAAwQIQLADBAgQLQLAABAsQLADBAhAsQLAABAtAsADBAhAsAMECBAtAsAAECxAsAMECBAtAsAAECxAsAMECECxAsAAEC0CwAMECECzmB0ns0BAsBEuwECzBMsESLARLsBAsBEuwECzBMsESLARLsBAsBEuwECzBMsESLARLsBAsREKwECzBMsESLARLsBAswTLBQrAEywRLsBAswUKwBMsEC8ESLBMswUKwBAvBEiwTLP/DCQDBAhAsQLAABAtAsADBAhAsAMECBAtAsAAECxAsAMECECxAsAAEC0CwAMECECwAwQIEC0CwAAQLECwAwQIQLECwAAQLECwAwQIQLECwAAQLQLAAwQIQLADBAgQLQLAAFhq1xqymVJf2ZAAAAABJRU5ErkJggg=='

function gql<T>(canal: 'web' | 'app', query: string, variables: object, token?: string) {
  return cy
    .request({
      method: 'POST',
      url: `${GATEWAY}/graphql/${canal}`,
      body: { query, variables },
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    .its('body.data') as Cypress.Chainable<T>
}

/** Crea por la API un choque parcial sobre la póliza de auto del CLIENTE demo y devuelve el id del caso. Comandos en
 * secuencia que comparten variables: sin anidar cadenas, que en Cypress devuelven el sujeto equivocado. */
function reportarChoqueDeAuto(): Cypress.Chainable<string> {
  const idReporte = crypto.randomUUID()
  const tamano = Cypress.Buffer.from(FOTO, 'base64').length
  const ocurrido = new Date(Date.now() - 2 * 3_600_000).toISOString()
  let token = ''
  let poliza = ''
  let subida = { url: '', metodo: 'PUT', encabezados: [] as { nombre: string; valor: string }[], archivo: { id: '' } }
  let caso = ''
  cy.env(['USUARIO_CLIENTE', 'CLAVE_CLIENTE']).then((vars) => {
    gql<{ iniciarSesion: { token: string } }>(
      'app',
      'mutation($e: CredencialesInput!) { iniciarSesion(entrada: $e) { ... on Sesion { token } } }',
      { e: { usuario: vars.USUARIO_CLIENTE ?? 'cliente.siniestros', clave: vars.CLAVE_CLIENTE ?? 'Cliente-local-1' } },
    ).then((d) => {
      token = d.iniciarSesion.token
    })
  })
  cy.then(() => {
    gql<{ propuestas: { propuestas: { producto: string; poliza: { id: string } | null }[] } }>(
      'app',
      '{ propuestas(pagina: 1, tamano: 50) { propuestas { producto poliza { id } } } }',
      {},
      token,
    ).then((d) => {
      poliza = d.propuestas.propuestas.find((p) => p.producto === 'AUTO' && p.poliza)!.poliza!.id
    })
  })
  cy.then(() => {
    gql<{ solicitarSubidaEvidenciaSiniestro: typeof subida }>(
      'app',
      'mutation($i: ID!, $t: String!, $n: Int!) { solicitarSubidaEvidenciaSiniestro(idReporte: $i, tipoContenido: $t, ' +
        'tamanoBytes: $n) { ... on SubidaArchivo { url metodo encabezados { nombre valor } archivo { id } } } }',
      { i: idReporte, t: 'image/png', n: tamano },
      token,
    ).then((d) => {
      subida = d.solicitarSubidaEvidenciaSiniestro
    })
  })
  cy.then(() => {
    cy.task('subirArchivo', {
      url: subida.url,
      metodo: subida.metodo,
      encabezados: subida.encabezados,
      base64: FOTO,
    }).should('be.oneOf', [200, 201])
  })
  cy.then(() => {
    gql('app', 'mutation($i: ID!) { confirmarSubidaArchivo(id: $i) { __typename } }', { i: subida.archivo.id }, token)
  })
  cy.then(() => {
    gql<{ reportarSiniestro: { id?: string; mensaje?: string } }>(
      'app',
      'mutation($e: ReporteSiniestroInput!) { reportarSiniestro(entrada: $e) { ... on SiniestroReportado { id } ... on ErrorSiniestro { mensaje } } }',
      {
        e: {
          idReporte,
          polizaId: poliza,
          tipoSiniestroAuto: 'CHOQUE_PARCIAL',
          ocurridoEn: ocurrido,
          descripcion: 'Choque leve en la calle 80 con 30: el otro carro me golpeó el costado.',
          ubicacion: { descripcion: 'Calle 80 con 30', ciudad: 'Bogotá', latitud: 4.68, longitud: -74.07 },
          fotos: [{ archivoId: subida.archivo.id, tomadaEn: ocurrido }],
        },
      },
      token,
    ).then((d) => {
      expect(d.reportarSiniestro.id, JSON.stringify(d.reportarSiniestro)).to.be.a('string')
      caso = d.reportarSiniestro.id ?? ''
    })
  })
  return cy.then(() => caso)
}

describe('HU-W08 · póliza de auto contra el backend real', () => {
  it('el CLIENTE cotiza su auto, ve el vehículo y las coberturas y llega a firmar', () => {
    ingresar('CLIENTE')
    cy.contains('a', 'Nueva cotización').click()
    cy.get('[data-prueba="producto-auto"]').click()
    cy.get('[data-prueba="placa"] input').type('abc 123')
    cy.get('[data-prueba="kilometraje"] input').type('12000')
    cy.get('[data-prueba="ciudad"] input').type('Bogotá')
    cy.get('input[type="checkbox"]').check()
    cy.contains('button', 'Consultar oferta').click()

    cy.get('[data-pantalla="W01-03a"]', { timeout: 20000 }).should('be.visible')
    cy.get('[data-prueba="detalle-auto"]').should('contain', 'MAZDA 3 GRAND TOURING')
    cy.get('[data-prueba="placa-enmascarada"]').should('have.text', 'ABC•••')
    cy.get('[data-prueba="coberturas"] li').should('have.length', 6)
    cy.get('[data-prueba="firmar"]').click()
    cy.location('pathname', { timeout: 20000 }).should('match', /^\/propuestas\/[^/]+\/firma$/)
    cy.get('[data-pantalla="W03-02"]').find('[data-prueba="contrato-pdf"]').should('exist')
  })

  it('el operador aprueba un choque de auto con el valor del daño y ve la indemnización con deducible', () => {
    reportarChoqueDeAuto().then((id) => {
      cy.log(`caso ${JSON.stringify(id)}`)
      ingresar('BACKOFFICE')
      cy.window().then((w) => {
        w.history.pushState(null, '', `/operador/siniestros/${id}`)
        w.dispatchEvent(new PopStateEvent('popstate'))
      })
      cy.get('[data-prueba="valor-dano"] input', { timeout: 15000 }).should('be.visible')
      cy.get('[data-prueba="aprobar"]').click()
      cy.contains('Digita el valor del daño en pesos').should('be.visible')
      cy.get('[data-prueba="valor-dano"] input').type('8000000')
      cy.get('[data-prueba="aprobar"]').click()
      cy.location('pathname', { timeout: 15000 }).should('match', /\/aprobado$/)
      // 8.000.000 − 1 SMMLV de deducible.
      cy.contains('6.576.500').should('be.visible')
    })
  })
})
