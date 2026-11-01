// HU-W03 con mocks (contrato v0.18): el lado del asesor (useSuscripcion), la página del enlace (useEnlaceFirma)
// y, sobre todo, el cuidado del token del enlace (D-3): memoria primero, sessionStorage solo como puente de la pasarela.
import { HttpResponse, http } from 'msw'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  CLAVE_PUENTE,
  esErrorPago,
  esSesionPago,
  hayToken,
  olvidarEnlace,
  pasoDelEnlace,
  tomarTokenDelFragmento,
  tomarTokenDelPuente,
  useEnlaceFirma,
} from '../src/composables/useEnlaceFirma'
import { useCotizacion } from '../src/composables/useCotizacion'
import { useSesion } from '../src/composables/useSesion'
import { esEnlaceEnviado, useSuscripcion } from '../src/composables/useSuscripcion'
import { servidor } from '../src/mocks/node'
import { base64DeBytes } from '../src/utils/firma'
import {
  CODIGO_DEMO,
  buzonSimulado,
  pagarSesionSimulada,
  restablecerSuscripcionDePrueba,
} from '../src/mocks/suscripcion'

interface Llamada {
  url: string
  cuerpo: string
  cabeceras: Record<string, string>
}
const llamadas: Llamada[] = []
const fetchPrueba: typeof fetch = (url, init) => {
  llamadas.push({
    url: String(url),
    cuerpo: typeof init?.body === 'string' ? init.body : '',
    cabeceras: (init?.headers ?? {}) as Record<string, string>,
  })
  return fetch(new URL(String(url), 'http://localhost'), init)
}

beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }))
beforeEach(() => {
  restablecerSuscripcionDePrueba()
  olvidarEnlace()
  sessionStorage.clear()
  localStorage.clear()
  llamadas.length = 0
  window.history.replaceState(null, '', '/')
})
afterEach(() => {
  servidor.resetHandlers()
  useSesion(fetchPrueba).cerrarSesion()
})
afterAll(() => servidor.close())

/** Asesor con la oferta completa y el contacto capturado, como sale de W01. */
async function asesorConOferta(correo = 'cliente@correo.com') {
  await useSesion(fetchPrueba).iniciarSesion('asesor.demo', 'secreta123')
  const cotizacion = useCotizacion(fetchPrueba)
  cotizacion.reiniciar()
  Object.assign(cotizacion.captura, {
    nombreCliente: 'Carlos Restrepo Gómez',
    correoCliente: correo,
    documentoIdentidad: '1020304050',
    valorCredito: '185000000',
    plazoMeses: '60',
    direccionInmueble: 'Cra 45',
    consentimiento: true,
  })
  await cotizacion.solicitarOferta()
  return useSuscripcion(fetchPrueba)
}

/** Recorre el lado del asesor hasta enviar el enlace y devuelve el token que «llegó» al correo. */
async function enlaceEnviado(): Promise<string> {
  const suscripcion = await asesorConOferta()
  expect(await suscripcion.aceptar('oferta-completa')).toBe(true)
  expect(await suscripcion.enviarCodigo()).toBeNull()
  expect(await suscripcion.verificarCodigo(CODIGO_DEMO)).toBeNull()
  expect(esEnlaceEnviado(await suscripcion.emitir())).toBe(true)
  return buzonSimulado().find((c) => c.tipo === 'enlace')!.valor
}

describe('lado del asesor (W03-01 y su modal)', () => {
  it('acepta con el contacto capturado: el correo viaja en aceptarOferta, no al cotizar', async () => {
    const suscripcion = await asesorConOferta()
    llamadas.length = 0
    await suscripcion.aceptar('oferta-completa')

    const aceptar = llamadas.find((l) => l.cuerpo.includes('aceptarOferta'))!
    expect(JSON.parse(aceptar.cuerpo).variables.contacto).toEqual({
      nombre: 'Carlos Restrepo Gómez',
      correo: 'cliente@correo.com',
    })
    expect(suscripcion.estado.propuesta?.estado).toBe('ACEPTADA')
  })

  it('una oferta preliminar no se acepta: ofrece recalcular (D-11)', async () => {
    const suscripcion = await asesorConOferta()
    expect(await suscripcion.aceptar('oferta-preliminar')).toBe(false)
    expect(suscripcion.estado.errorAceptacion).toMatchObject({ motivo: 'OFERTA_PRELIMINAR', puedeReintentar: true })
  })

  it('el código: inválido descuenta intentos, válido verifica la identidad y solo entonces se puede emitir', async () => {
    const suscripcion = await asesorConOferta()
    await suscripcion.aceptar('oferta-completa')
    expect((await suscripcion.emitir()) as { mensaje: string }).toMatchObject({ puedeReintentar: false })

    await suscripcion.enviarCodigo()
    expect(suscripcion.estado.codigo?.correoEnmascarado).toBe('c•••@correo.com')
    expect(await suscripcion.verificarCodigo('111111')).toMatchObject({
      motivo: 'CODIGO_INVALIDO',
      intentosRestantes: 4,
    })
    expect(await suscripcion.verificarCodigo('999999')).toMatchObject({ motivo: 'CODIGO_VENCIDO' })
    expect(await suscripcion.verificarCodigo(CODIGO_DEMO)).toBeNull()
    expect(suscripcion.estado.propuesta?.estado).toBe('IDENTIDAD_VERIFICADA')
  })

  it('al recargar la página recupera la propuesta de la oferta y retoma donde iba', async () => {
    const suscripcion = await asesorConOferta()
    expect(await suscripcion.aceptar('oferta-completa')).toBe(true)
    expect(await suscripcion.enviarCodigo()).toBeNull()
    expect(await suscripcion.verificarCodigo(CODIGO_DEMO)).toBeNull()
    const id = suscripcion.estado.propuesta?.id

    suscripcion.reiniciar() // como una recarga: la memoria queda vacía
    expect(suscripcion.estado.propuesta).toBeNull()
    await suscripcion.recuperarPropuesta('oferta-completa')

    expect(suscripcion.estado.propuesta?.id).toBe(id)
    expect(suscripcion.estado.propuesta?.estado).toBe('IDENTIDAD_VERIFICADA')
    // Con la identidad verificada ya se puede emitir, sin repetir el código.
    const emision = await suscripcion.emitir()
    expect(esEnlaceEnviado(emision)).toBe(true)
  })

  it('recuperar la propuesta de una oferta sin propuesta no inventa nada', async () => {
    const suscripcion = await asesorConOferta()
    await suscripcion.recuperarPropuesta('oferta-completa')
    expect(suscripcion.estado.propuesta).toBeNull()
    expect(suscripcion.estado.error).toBeNull()
  })

  it('al 5.º código errado se agotan los intentos', async () => {
    const suscripcion = await asesorConOferta()
    await suscripcion.aceptar('oferta-completa')
    await suscripcion.enviarCodigo()
    for (let i = 0; i < 4; i++) await suscripcion.verificarCodigo('111111')
    expect(await suscripcion.verificarCodigo('111111')).toMatchObject({ motivo: 'INTENTOS_AGOTADOS' })
  })

  it('UNDER en revisión o rechazo no envía enlace y muestra mensajeEstado', async () => {
    const suscripcion = await asesorConOferta('cliente@revision.test')
    await suscripcion.aceptar('oferta-completa')
    await suscripcion.enviarCodigo()
    await suscripcion.verificarCodigo(CODIGO_DEMO)
    const resultado = await suscripcion.emitir()

    expect(esEnlaceEnviado(resultado)).toBe(false)
    expect(suscripcion.estado.propuesta).toMatchObject({ estado: 'EN_REVISION', accionSugerida: 'ESPERAR' })
    expect(buzonSimulado().some((c) => c.tipo === 'enlace')).toBe(false)
  })

  it('emitir nunca devuelve la URL del enlace al asesor (W07-17) y reenviar anula el anterior', async () => {
    const token = await enlaceEnviado()
    const suscripcion = useSuscripcion(fetchPrueba)
    expect(JSON.stringify(suscripcion.estado.enlace)).not.toContain(token)

    await suscripcion.reenviarEnlace()
    const nuevo = buzonSimulado().find((c) => c.tipo === 'enlace')!.valor
    expect(nuevo).not.toBe(token)

    window.location.hash = `#t=${token}`
    tomarTokenDelFragmento()
    expect(await useEnlaceFirma(fetchPrueba).cargar()).toBe('vencido')
  })
})

describe('cuidado del token del enlace (D-3)', () => {
  it('se toma del fragmento, se quita de la barra de direcciones y no toca ningún almacenamiento', () => {
    window.history.replaceState(null, '', '/firma#t=demo')

    expect(tomarTokenDelFragmento()).toBe(true)
    expect(window.location.hash).toBe('')
    expect(window.location.href).not.toContain('demo')
    expect(sessionStorage.length).toBe(0)
    expect(localStorage.length).toBe(0)
  })

  it('ignora un fragmento con formato raro', () => {
    window.history.replaceState(null, '', '/firma#t=<script>')
    expect(tomarTokenDelFragmento()).toBe(false)
    expect(hayToken()).toBe(false)
  })

  it('viaja solo en la cabecera X-Enlace-Firma: nunca en la URL ni en el cuerpo, y sin JWT', async () => {
    window.history.replaceState(null, '', '/firma#t=demo')
    tomarTokenDelFragmento()
    await useEnlaceFirma(fetchPrueba).cargar()

    const llamada = llamadas.find((l) => l.cuerpo.includes('firmaPorEnlace'))!
    expect(llamada.cabeceras['X-Enlace-Firma']).toBe('demo')
    expect(llamada.cabeceras.Authorization).toBeUndefined()
    expect(llamada.url).not.toContain('demo')
    expect(llamada.cuerpo).not.toContain('demo')
  })

  it('el puente se escribe solo al salir a la pasarela, se lee una vez y se borra', async () => {
    window.history.replaceState(null, '', '/firma#t=firmado')
    tomarTokenDelFragmento()
    const enlace = useEnlaceFirma(fetchPrueba)
    await enlace.cargar()
    expect(sessionStorage.getItem(CLAVE_PUENTE)).toBeNull()

    const sesion = await enlace.iniciarPago()
    expect(esSesionPago(sesion)).toBe(true)
    expect(JSON.parse(sessionStorage.getItem(CLAVE_PUENTE)!)).toMatchObject({ t: 'firmado' })

    // Vuelve de la pasarela en una carga nueva: la memoria está vacía.
    olvidarEnlace()
    sessionStorage.setItem(CLAVE_PUENTE, JSON.stringify({ t: 'firmado', vence: Date.now() + 60_000 }))
    expect(tomarTokenDelPuente()).toBe(true)
    expect(sessionStorage.getItem(CLAVE_PUENTE)).toBeNull()
  })

  it('descarta un puente vencido o manipulado', () => {
    sessionStorage.setItem(CLAVE_PUENTE, JSON.stringify({ t: 'firmado', vence: Date.now() - 1 }))
    expect(tomarTokenDelPuente()).toBe(false)
    expect(sessionStorage.getItem(CLAVE_PUENTE)).toBeNull()

    sessionStorage.setItem(CLAVE_PUENTE, JSON.stringify({ t: 'x y', vence: Date.now() + 60_000 }))
    expect(tomarTokenDelPuente()).toBe(false)
  })

  it('el puente nunca vive más que el enlace ni más de 15 min', async () => {
    window.history.replaceState(null, '', '/firma#t=firmado')
    tomarTokenDelFragmento()
    const enlace = useEnlaceFirma(fetchPrueba)
    await enlace.cargar()
    await enlace.iniciarPago()

    const { vence } = JSON.parse(sessionStorage.getItem(CLAVE_PUENTE)!) as { vence: number }
    expect(vence).toBeLessThanOrEqual(Date.parse(enlace.estado.enlace!.venceEn!))
    expect(vence - Date.now()).toBeLessThanOrEqual(15 * 60_000)
  })

  it('con el enlace vencido se olvida el token', async () => {
    window.history.replaceState(null, '', '/firma#t=vencido')
    tomarTokenDelFragmento()
    expect(await useEnlaceFirma(fetchPrueba).cargar()).toBe('vencido')
    expect(hayToken()).toBe(false)
  })
})

describe('página del enlace: firmar, pagar y emitir', () => {
  async function abrirYFirmar(token: string) {
    window.history.replaceState(null, '', `/firma#t=${token}`)
    tomarTokenDelFragmento()
    const enlace = useEnlaceFirma(fetchPrueba)
    expect(await enlace.cargar()).toBe('firmar')
    enlace.estado.aceptaTerminos = true
    enlace.estado.firmaCapturada = { modo: 'NOMBRE', contenido: 'Carlos Restrepo Gómez' }
    const firma = await enlace.firmar()
    expect(firma).toMatchObject({ estado: 'FIRMADA' })
    // La firma no se queda en memoria después de enviarla.
    expect(enlace.estado.firmaCapturada).toBeNull()
    return enlace
  }

  it('flujo completo: el asesor emite, el cliente firma, paga con 4242 y queda la póliza; el puente se borra', async () => {
    const token = await enlaceEnviado()
    const enlace = await abrirYFirmar(token)

    const sesion = await enlace.iniciarPago()
    if (!esSesionPago(sesion)) throw new Error('sin sesión')
    expect(pagarSesionSimulada(sesion.sesionId, '4242 4242 4242 4242')).toBe('APROBADA')

    const poliza = await enlace.confirmarPago(sesion.sesionId)
    expect(poliza).toMatchObject({ estado: 'EMITIDA' })
    expect(sessionStorage.getItem(CLAVE_PUENTE)).toBeNull()
    expect(pasoDelEnlace(enlace.estado.enlace)).toBe('emitida')

    // Regresar dos veces de la pasarela no emite (ni cobra) dos veces.
    expect(await enlace.confirmarPago(sesion.sesionId)).toEqual(poliza)
  })

  it('un rechazo pide otra tarjeta sin perder la firma', async () => {
    const enlace = await abrirYFirmar('demo')
    const sesion = await enlace.iniciarPago()
    if (!esSesionPago(sesion)) throw new Error('sin sesión')
    pagarSesionSimulada(sesion.sesionId, '4000000000000002')

    const resultado = await enlace.confirmarPago(sesion.sesionId)
    expect(resultado).toMatchObject({ motivo: 'FONDOS_INSUFICIENTES', puedeReintentar: false })
    expect(enlace.estado.enlace?.propuesta.estado).toBe('FIRMADA')
    expect(esSesionPago(await enlace.iniciarPago())).toBe(true)
  })

  it('la pasarela falla: reintentar dos veces y al 3.er fallo seguido pedir otra tarjeta', async () => {
    const enlace = await abrirYFirmar('demo')
    const sesion = await enlace.iniciarPago()
    if (!esSesionPago(sesion)) throw new Error('sin sesión')
    pagarSesionSimulada(sesion.sesionId, '4000000000000119')

    const r1 = await enlace.confirmarPago(sesion.sesionId)
    const r2 = await enlace.confirmarPago(sesion.sesionId)
    const r3 = await enlace.confirmarPago(sesion.sesionId)
    expect(esErrorPago(r1) && r1.motivo).toBe('PASARELA_NO_DISPONIBLE')
    expect(esErrorPago(r2) && r2.puedeReintentar).toBe(true)
    expect(r3).toMatchObject({ motivo: 'REQUIERE_OTRA_TARJETA', puedeReintentar: false, fallosSeguidos: 3 })
  })

  it('el PDF de la póliza se pide con el token y sin él responde 401', async () => {
    window.history.replaceState(null, '', '/firma#t=emitido')
    tomarTokenDelFragmento()
    const enlace = useEnlaceFirma(fetchPrueba)
    expect(await enlace.cargar()).toBe('emitida')
    const ruta = enlace.estado.enlace!.poliza!.documentoUrl

    const sinToken = await fetch(new URL(ruta, 'http://localhost'))
    expect(sinToken.status).toBe(401)
    const conToken = await fetch(new URL(ruta, 'http://localhost'), { headers: { 'X-Enlace-Firma': 'emitido' } })
    expect(conToken.headers.get('Content-Type')).toBe('application/pdf')
    expect(new TextDecoder().decode(await conToken.arrayBuffer())).toMatch(/^%PDF-1\.4/)
  })
})

describe('firma con imagen por el almacenamiento (W03-24)', () => {
  // Los 8 bytes de una firma PNG y relleno: lo justo para que el tipo real se reconozca.
  const png = () => base64DeBytes(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]))

  async function enFirma() {
    const token = await enlaceEnviado()
    window.history.replaceState(null, '', `/firma#t=${token}`)
    tomarTokenDelFragmento()
    const enlace = useEnlaceFirma(fetchPrueba)
    expect(await enlace.cargar()).toBe('firmar')
    enlace.estado.aceptaTerminos = true
    return enlace
  }

  it.each(['TRAZO', 'IMAGEN'] as const)(
    '%s: pide la URL, sube con TODOS los encabezados y firma con el id del archivo',
    async (modo) => {
      const enlace = await enFirma()
      enlace.estado.firmaCapturada = { modo, contenido: png() }

      expect(await enlace.firmar()).toMatchObject({ estado: 'FIRMADA' })

      const subida = llamadas.find((l) => l.url.startsWith('https://almacen.mock/subir/'))
      expect(subida?.cabeceras).toEqual({ 'Content-Type': 'image/png' })
      const firma = llamadas.find((l) => l.cuerpo.includes('firmarPorEnlace'))
      const entrada = JSON.parse(firma!.cuerpo).variables.entrada
      expect(entrada).toMatchObject({ modo, imagenArchivoId: expect.stringMatching(/^arch-mock-/) })
      expect(entrada).not.toHaveProperty('nombreFirma') // la imagen no viaja por GraphQL
      expect(JSON.stringify(entrada)).not.toContain('iVBOR') // ni en base64
    },
  )

  it('NOMBRE no sube nada: manda el texto', async () => {
    const enlace = await enFirma()
    enlace.estado.firmaCapturada = { modo: 'NOMBRE', contenido: 'Carlos Restrepo' }

    expect(await enlace.firmar()).toMatchObject({ estado: 'FIRMADA' })

    expect(llamadas.some((l) => l.url.includes('almacen.mock'))).toBe(false)
    const firma = llamadas.find((l) => l.cuerpo.includes('firmarPorEnlace'))
    expect(JSON.parse(firma!.cuerpo).variables.entrada).toMatchObject({
      modo: 'NOMBRE',
      nombreFirma: 'Carlos Restrepo',
    })
  })

  it('un archivo que no es PNG ni JPG se rechaza sin tocar la red', async () => {
    const enlace = await enFirma()
    enlace.estado.firmaCapturada = {
      modo: 'IMAGEN',
      contenido: base64DeBytes(new TextEncoder().encode('no soy una imagen')),
    }
    const antes = llamadas.length

    expect(await enlace.firmar()).toMatchObject({ motivo: 'IMAGEN_INVALIDA', puedeReintentar: true })

    expect(llamadas.length).toBe(antes)
  })

  it('si el bucket rechaza el PUT, no se firma y se puede subir otra imagen', async () => {
    const enlace = await enFirma()
    servidor.use(http.put('https://almacen.mock/subir/:id', () => new HttpResponse(null, { status: 403 })))
    enlace.estado.firmaCapturada = { modo: 'IMAGEN', contenido: png() }

    const resultado = await enlace.firmar()

    expect(resultado).toMatchObject({ motivo: 'IMAGEN_INVALIDA', puedeReintentar: true })
    expect(llamadas.some((l) => l.cuerpo.includes('firmarPorEnlace'))).toBe(false)
    expect(enlace.estado.firmaCapturada).not.toBeNull() // conserva lo capturado para reintentar
  })
})
