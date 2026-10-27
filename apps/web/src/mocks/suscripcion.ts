// Mocks de HU-W03 (suscripción, firma y pago interactivos con el asesor, bloque 9 del backend) sobre el BORRADOR de
// la v0.17 (contrato/borrador-v0.17.graphql). A diferencia de siniestros, aquí no hay dummy del backend: los usan
// Vitest y también `dev:mock`. Simulan a POLICY, PAYMENTS y la pasarela en memoria del navegador.
//
// Convenciones de demo (NO son del backend real; ver docs/convenciones.md):
// - Código de verificación: `000000` es válido, `999999` está vencido y cualquier otro es inválido (5 intentos).
// - Correo del cliente que termina en `@revision.test` → UNDER manda a revisión; en `@rechazo.test` → no emite.
// - Tokens fijos del enlace: `demo` (por firmar), `vencido`, `firmado` (falta pagar) y `emitido`.
// - Tarjetas de la pasarela simulada: las del stub del backend (TARJETAS_DE_PRUEBA).
// - El mock nunca guarda el número de la tarjeta: solo la marca y el tipo, como PAYMENTS.
import { HttpResponse, http } from 'msw'
import { graphql } from 'msw/graphql'
import { leerClaims } from '../composables/useSesion'
import type {
  CodigoEnviado,
  DocumentoFirma,
  EnlaceEnviado,
  EnlaceFirma,
  ErrorCodigo,
  ErrorPago,
  FirmaRegistrada,
  MutationConfirmarPagoArgs,
  MutationEmitirPropuestaArgs,
  MutationEnviarCodigoVerificacionArgs,
  MutationFirmarPorEnlaceArgs,
  MutationReenviarEnlaceFirmaArgs,
  MutationVerificarCodigoArgs,
  Oferta,
  Poliza,
  Propuesta,
  QueryOfertaArgs,
  QueryPropuestaArgs,
  ResultadoAceptacion,
  ResultadoEmision,
  ResultadoEnvioCodigo,
  ResultadoFirma,
  ResultadoInicioPago,
  ResultadoPago,
  ResultadoVerificacion,
  TipoMedioPago,
} from '../graphql/tipos-borrador'
import { ofertaDeDemo } from './handlers'

export const CODIGO_DEMO = '000000'
const CODIGO_VENCIDO = '999999'
const INTENTOS_CODIGO = 5
const MIN_ENLACE = 30
const MIN_SESION_PAGO = 10
const PLAZO_DEMO = 60 // el plazo de los disparadores de demo de W01-01

export const TARJETAS_DE_PRUEBA = [
  { numero: '4242424242424242', marca: 'Visa', tipo: 'CREDITO', resultado: 'APROBADA' },
  { numero: '5555555555554444', marca: 'Mastercard', tipo: 'DEBITO', resultado: 'APROBADA' },
  { numero: '4000000000000002', marca: 'Visa', tipo: 'CREDITO', resultado: 'FONDOS_INSUFICIENTES' },
  { numero: '4000000000000069', marca: 'Visa', tipo: 'CREDITO', resultado: 'TARJETA_VENCIDA' },
  { numero: '4000000000000119', marca: 'Visa', tipo: 'CREDITO', resultado: 'FALLA' },
] as const

type EstadoSesionPago = 'ABIERTA' | 'COBRADA' | 'RECHAZADA' | 'FALLIDA'
type ResultadoTarjeta = (typeof TARJETAS_DE_PRUEBA)[number]['resultado']

interface SesionPagoMock {
  id: string
  propuestaId: string
  estado: EstadoSesionPago
  venceEn: number
  motivo: ResultadoTarjeta | null
  medio: { marca: string; tipo: TipoMedioPago } | null
}

interface PropuestaMock {
  propuesta: Propuesta
  correo: string
  codigo: { venceEn: number; intentos: number } | null
  token: string | null
  enlaceVence: number
  firma: FirmaRegistrada | null
  poliza: Poliza | null
  fallosSeguidos: number
}

export interface CorreoSimulado {
  tipo: 'codigo' | 'enlace'
  para: string
  valor: string
  enviadoEn: string
}

let secuencia = 0
let propuestas = new Map<string, PropuestaMock>()
let tokens = new Map<string, string>()
let sesiones = new Map<string, SesionPagoMock>()
let buzon: CorreoSimulado[] = []

/** Solo para pruebas: deja el mock como recién cargado. */
export function restablecerSuscripcionDePrueba(): void {
  secuencia = 0
  propuestas = new Map()
  tokens = new Map()
  sesiones = new Map()
  buzon = []
}

/** Lo que el mock «envió» al correo del cliente: lo lee la ruta de desarrollo /dev/correo. */
export function buzonSimulado(): readonly CorreoSimulado[] {
  return buzon
}

const iso = (ms: number) => new Date(ms).toISOString()
const siguiente = (prefijo: string) => `${prefijo}-${++secuencia}`

export function enmascararCorreo(correo: string): string {
  const [usuario, dominio] = correo.split('@')
  return `${usuario.slice(0, 1)}•••@${dominio}`
}

function crearPropuesta(oferta: Oferta, correo: string, ofertaId = oferta.id): PropuestaMock {
  const registro: PropuestaMock = {
    propuesta: {
      id: siguiente('prop'),
      ofertaId,
      estado: 'ACEPTADA',
      prima: oferta.prima ?? { valor: '0', moneda: 'COP' },
      cobertura: oferta.cobertura,
      plazoMeses: PLAZO_DEMO,
      polizaId: null,
      actualizadoEn: iso(Date.now()),
      motivoEstado: null,
      mensajeEstado: null,
      accionSugerida: null,
    },
    correo,
    codigo: null,
    token: null,
    enlaceVence: 0,
    firma: null,
    poliza: null,
    fallosSeguidos: 0,
  }
  propuestas.set(registro.propuesta.id, registro)
  return registro
}

function cambiarEstado(registro: PropuestaMock, estado: Propuesta['estado'], extra: Partial<Propuesta> = {}): void {
  Object.assign(registro.propuesta, {
    estado,
    actualizadoEn: iso(Date.now()),
    motivoEstado: null,
    mensajeEstado: null,
    accionSugerida: null,
    ...extra,
  })
}

function enviarEnlace(registro: PropuestaMock): EnlaceEnviado {
  if (registro.token) tokens.delete(registro.token) // un enlace nuevo anula el anterior (W03-22)
  const token = `enl${Math.random().toString(36).slice(2, 12)}`
  registro.token = token
  registro.enlaceVence = Date.now() + MIN_ENLACE * 60_000
  tokens.set(token, registro.propuesta.id)
  if (registro.propuesta.estado === 'IDENTIDAD_VERIFICADA') cambiarEstado(registro, 'EN_FIRMA')
  buzon.unshift({ tipo: 'enlace', para: enmascararCorreo(registro.correo), valor: token, enviadoEn: iso(Date.now()) })
  return {
    propuesta: registro.propuesta,
    correoEnmascarado: enmascararCorreo(registro.correo),
    venceEn: iso(registro.enlaceVence),
  }
}

function firmaRegistrada(registro: PropuestaMock): FirmaRegistrada {
  return {
    propuestaId: registro.propuesta.id,
    firmadaEn: iso(Date.now()),
    referencia: `COL-${String(1000 + secuencia).padStart(4, '0')}-${registro.propuesta.id.toUpperCase()}`,
    estado: 'FIRMADA',
  }
}

function emitirPoliza(registro: PropuestaMock): Poliza {
  if (registro.poliza) return registro.poliza
  const desde = new Date()
  const hasta = new Date(desde)
  hasta.setMonth(hasta.getMonth() + registro.propuesta.plazoMeses)
  const id = siguiente('pol')
  registro.poliza = {
    id,
    numero: `SOL-${desde.getFullYear()}-${String(4800 + secuencia).padStart(6, '0')}`,
    estado: 'EMITIDA',
    vigenciaDesde: desde.toISOString(),
    vigenciaHasta: hasta.toISOString(),
    prima: registro.propuesta.prima,
    cobertura: registro.propuesta.cobertura,
    documentoUrl: `/mock/polizas/${id}/documento.pdf`,
  }
  // El enlace sigue sirviendo con la póliza emitida: cubre también la descarga del PDF (W03-22).
  cambiarEstado(registro, 'EMITIDA', { polizaId: id })
  return registro.poliza
}

// Tokens fijos para abrir la página del enlace sin pasar por el asesor (demo y Cypress).
function sembrarToken(token: string): PropuestaMock | null {
  const estados: Record<string, (r: PropuestaMock) => void> = {
    demo: () => {},
    vencido: () => {},
    firmado: (r) => {
      r.firma = firmaRegistrada(r)
      cambiarEstado(r, 'FIRMADA')
    },
    emitido: (r) => {
      r.firma = firmaRegistrada(r)
      emitirPoliza(r)
    },
  }
  if (!(token in estados)) return null
  const registro = crearPropuesta(ofertaDeDemo('COMPLETA'), 'cliente@correo.com')
  cambiarEstado(registro, 'EN_FIRMA')
  registro.token = token
  registro.enlaceVence = token === 'vencido' ? Date.now() - 60_000 : Date.now() + MIN_ENLACE * 60_000
  estados[token](registro)
  tokens.set(token, registro.propuesta.id)
  return registro
}

function porToken(request: Request): PropuestaMock | null {
  const token = request.headers.get('X-Enlace-Firma')
  if (!token) return null
  const id = tokens.get(token)
  if (id) return propuestas.get(id) ?? null
  return sembrarToken(token)
}

const enlaceVigente = (r: PropuestaMock) => r.enlaceVence > Date.now()

function documentoFirma(registro: PropuestaMock): DocumentoFirma {
  return {
    propuestaId: registro.propuesta.id,
    version: 'v1',
    resumen:
      'Seguro de Vida Grupo Deudores: ampara el saldo insoluto de tu crédito hipotecario en caso de fallecimiento o incapacidad total y permanente.',
    montoMensual: registro.propuesta.prima,
    meses: registro.propuesta.plazoMeses,
    formaCobro: 'con la tarjeta de crédito o débito que elijas al pagar',
  }
}

const errorCodigo = (
  mensaje: string,
  motivo: ErrorCodigo['motivo'],
  puedeReintentar: boolean,
  intentosRestantes: number | null = null,
): ErrorCodigo => ({ mensaje, motivo, puedeReintentar, intentosRestantes })

const errorPago = (
  mensaje: string,
  motivo: ErrorPago['motivo'],
  puedeReintentar: boolean,
  fallosSeguidos: number | null = null,
): ErrorPago => ({ mensaje, motivo, puedeReintentar, fallosSeguidos })

/** La página de la pasarela simulada (/dev/pasarela) «cobra» aquí. Solo guarda la marca y el tipo. */
export function pagarSesionSimulada(sesionId: string, numeroTarjeta: string): 'APROBADA' | 'RECHAZADA' | 'FALLA' {
  const sesion = sesiones.get(sesionId)
  if (!sesion || sesion.venceEn < Date.now()) return 'FALLA'
  const tarjeta = TARJETAS_DE_PRUEBA.find((t) => t.numero === numeroTarjeta.replace(/\D/g, ''))
  const resultado = tarjeta?.resultado ?? 'APROBADA'
  sesion.medio = tarjeta ? { marca: tarjeta.marca, tipo: tarjeta.tipo } : { marca: 'Visa', tipo: 'CREDITO' }
  if (resultado === 'APROBADA') {
    sesion.estado = 'COBRADA'
    return 'APROBADA'
  }
  if (resultado === 'FALLA') {
    sesion.estado = 'FALLIDA'
    return 'FALLA'
  }
  sesion.estado = 'RECHAZADA'
  sesion.motivo = resultado
  return 'RECHAZADA'
}

/** Datos de la sesión para pintar la pasarela simulada: monto y vencimiento, nunca datos del cliente. */
export function sesionSimulada(sesionId: string): { monto: Propuesta['prima']; venceEn: number } | null {
  const sesion = sesiones.get(sesionId)
  const registro = sesion && propuestas.get(sesion.propuestaId)
  return sesion && registro ? { monto: registro.propuesta.prima, venceEn: sesion.venceEn } : null
}

// PDF mínimo y válido (una página con texto) para el contrato y la póliza: el visor del navegador lo abre igual que
// el PDF de POLICY. Solo lleva textos de demo, nunca datos capturados.
export function pdfDeEjemplo(lineas: string[]): Uint8Array {
  const escapar = (s: string) => s.replace(/[\\()]/g, (c) => `\\${c}`)
  const texto = lineas.map((l, i) => `BT /F1 ${i === 0 ? 16 : 11} Tf 56 ${780 - i * 22} Td (${escapar(l)}) Tj ET`)
  const contenido = texto.join('\n')
  const objetos = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    `<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`,
  ]
  let pdf = '%PDF-1.4\n'
  const posiciones: number[] = []
  objetos.forEach((objeto, i) => {
    posiciones.push(pdf.length)
    pdf += `${i + 1} 0 obj\n${objeto}\nendobj\n`
  })
  const inicioXref = pdf.length
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`
  pdf += posiciones.map((p) => `${String(p).padStart(10, '0')} 00000 n \n`).join('')
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF`
  return Uint8Array.from(pdf, (c) => c.charCodeAt(0) & 0xff)
}

const pdf = (lineas: string[]) =>
  new HttpResponse(pdfDeEjemplo(lineas), { headers: { 'Content-Type': 'application/pdf' } })

const bff = graphql.link('*')

export const handlersSuscripcion = [
  bff.query<{ oferta: Oferta | null }, QueryOfertaArgs>('oferta', ({ variables }) => {
    const tipo =
      variables.id === 'oferta-preliminar' ? 'PRELIMINAR' : variables.id === 'oferta-completa' ? 'COMPLETA' : null
    return HttpResponse.json({ data: { oferta: tipo ? ofertaDeDemo(tipo) : null } })
  }),

  bff.mutation<
    { aceptarOferta: ResultadoAceptacion },
    { ofertaId: string; contacto?: { nombre: string; correo: string } | null }
  >('aceptarOferta', ({ variables, request }) => {
    const { ofertaId, contacto } = variables
    if (ofertaId === 'oferta-preliminar') {
      return HttpResponse.json({
        data: {
          aceptarOferta: {
            mensaje: 'Esta oferta es preliminar y no se puede aceptar. Vuelve a calcularla.',
            puedeReintentar: true,
            motivo: 'OFERTA_PRELIMINAR',
          },
        },
      })
    }
    if (ofertaId !== 'oferta-completa') {
      return HttpResponse.json({
        data: {
          aceptarOferta: {
            mensaje: 'La oferta ya no está vigente. Cotiza de nuevo.',
            puedeReintentar: true,
            motivo: 'OFERTA_VENCIDA',
          },
        },
      })
    }
    const token = request.headers.get('Authorization')?.replace(/^Bearer /, '')
    const rol = token ? leerClaims(token)?.rol : null
    if (rol === 'ASESOR' && !contacto) {
      return HttpResponse.json({ errors: [{ message: 'Indica el nombre y el correo del cliente.' }] })
    }
    // Aceptar dos veces la misma oferta devuelve la misma propuesta.
    const existente = [...propuestas.values()].find((r) => r.propuesta.ofertaId === ofertaId && !r.poliza)
    const registro = existente ?? crearPropuesta(ofertaDeDemo('COMPLETA'), contacto?.correo ?? 'cliente@correo.com')
    return HttpResponse.json({ data: { aceptarOferta: registro.propuesta } })
  }),

  bff.query<{ propuesta: Propuesta | null }, QueryPropuestaArgs>('propuesta', ({ variables }) =>
    HttpResponse.json({ data: { propuesta: propuestas.get(variables.id)?.propuesta ?? null } }),
  ),

  bff.mutation<{ enviarCodigoVerificacion: ResultadoEnvioCodigo }, MutationEnviarCodigoVerificacionArgs>(
    'enviarCodigoVerificacion',
    ({ variables }) => {
      const registro = propuestas.get(variables.propuestaId)
      if (!registro || !['ACEPTADA', 'IDENTIDAD_VERIFICADA'].includes(registro.propuesta.estado)) {
        return HttpResponse.json({
          data: {
            enviarCodigoVerificacion: errorCodigo(
              'La propuesta ya no admite verificación.',
              'PROPUESTA_NO_VALIDA',
              false,
            ),
          },
        })
      }
      if (variables.correo) registro.correo = variables.correo.trim().toLowerCase()
      registro.codigo = { venceEn: Date.now() + 10 * 60_000, intentos: INTENTOS_CODIGO } // otro anula el anterior
      buzon.unshift({
        tipo: 'codigo',
        para: enmascararCorreo(registro.correo),
        valor: CODIGO_DEMO,
        enviadoEn: iso(Date.now()),
      })
      const enviado: CodigoEnviado = {
        propuestaId: registro.propuesta.id,
        correoEnmascarado: enmascararCorreo(registro.correo),
        venceEn: iso(registro.codigo.venceEn),
      }
      return HttpResponse.json({ data: { enviarCodigoVerificacion: enviado } })
    },
  ),

  bff.mutation<{ verificarCodigo: ResultadoVerificacion }, MutationVerificarCodigoArgs>(
    'verificarCodigo',
    ({ variables }) => {
      const registro = propuestas.get(variables.propuestaId)
      const responder = (verificarCodigo: ResultadoVerificacion) =>
        HttpResponse.json<{ data: { verificarCodigo: ResultadoVerificacion } }>({ data: { verificarCodigo } })
      if (!registro?.codigo) {
        return responder(errorCodigo('Primero envía el código al cliente.', 'PROPUESTA_NO_VALIDA', true))
      }
      if (variables.codigo === CODIGO_VENCIDO || registro.codigo.venceEn < Date.now()) {
        return responder(errorCodigo('El código venció. Envía uno nuevo.', 'CODIGO_VENCIDO', true))
      }
      if (variables.codigo !== CODIGO_DEMO) {
        registro.codigo.intentos -= 1
        if (registro.codigo.intentos <= 0) {
          registro.codigo = null
          return responder(
            errorCodigo('Se agotaron los intentos. Envía un código nuevo.', 'INTENTOS_AGOTADOS', true, 0),
          )
        }
        return responder(errorCodigo('El código no es correcto.', 'CODIGO_INVALIDO', true, registro.codigo.intentos))
      }
      registro.codigo = null
      cambiarEstado(registro, 'IDENTIDAD_VERIFICADA')
      return responder(registro.propuesta)
    },
  ),

  bff.mutation<{ emitirPropuesta: ResultadoEmision }, MutationEmitirPropuestaArgs>(
    'emitirPropuesta',
    ({ variables }) => {
      const registro = propuestas.get(variables.propuestaId)
      const responder = (emitirPropuesta: ResultadoEmision) =>
        HttpResponse.json<{ data: { emitirPropuesta: ResultadoEmision } }>({ data: { emitirPropuesta } })
      if (!registro || registro.propuesta.estado !== 'IDENTIDAD_VERIFICADA') {
        return responder({ mensaje: 'Verifica la identidad del cliente antes de emitir.', puedeReintentar: false })
      }
      if (registro.correo.endsWith('@revision.test')) {
        cambiarEstado(registro, 'EN_REVISION', {
          motivoEstado: 'REVISION_MANUAL',
          mensajeEstado: 'Un asesor está revisando la solicitud. Te avisaremos cuando termine.',
          accionSugerida: 'ESPERAR',
        })
        return responder(registro.propuesta)
      }
      if (registro.correo.endsWith('@rechazo.test')) {
        cambiarEstado(registro, 'NO_EMITIDA', {
          motivoEstado: 'NO_APROBADA',
          mensajeEstado: 'No pudimos aprobar la solicitud. Un asesor te contará las opciones.',
          accionSugerida: 'CONTACTAR_ASESOR',
        })
        return responder(registro.propuesta)
      }
      return responder(enviarEnlace(registro))
    },
  ),

  bff.mutation<{ reenviarEnlaceFirma: ResultadoEmision }, MutationReenviarEnlaceFirmaArgs>(
    'reenviarEnlaceFirma',
    ({ variables }) => {
      const registro = propuestas.get(variables.propuestaId)
      const resultado: ResultadoEmision =
        registro && ['EN_FIRMA', 'FIRMADA'].includes(registro.propuesta.estado)
          ? enviarEnlace(registro)
          : { mensaje: 'Esta propuesta ya no tiene un enlace por reenviar.', puedeReintentar: false }
      return HttpResponse.json({ data: { reenviarEnlaceFirma: resultado } })
    },
  ),

  // ---------- Página del enlace: sin sesión, el token llega en X-Enlace-Firma ----------

  bff.query<{ firmaPorEnlace: EnlaceFirma | null }>('firmaPorEnlace', ({ request }) => {
    const registro = porToken(request)
    if (!registro) return HttpResponse.json({ data: { firmaPorEnlace: null } })
    const porFirmar = registro.propuesta.estado === 'EN_FIRMA'
    return HttpResponse.json({
      data: {
        firmaPorEnlace: {
          vigente: enlaceVigente(registro) || registro.propuesta.estado === 'EMITIDA',
          venceEn: iso(registro.enlaceVence),
          propuesta: registro.propuesta,
          documento: porFirmar ? documentoFirma(registro) : null,
          documentoUrl: porFirmar ? `/mock/propuestas/${registro.propuesta.id}/contrato.pdf` : null,
          firma: registro.firma,
          poliza: registro.poliza,
        },
      },
    })
  }),

  bff.mutation<{ firmarPorEnlace: ResultadoFirma }, MutationFirmarPorEnlaceArgs>(
    'firmarPorEnlace',
    ({ variables, request }) => {
      const registro = porToken(request)
      const { entrada } = variables
      const responder = (firmarPorEnlace: ResultadoFirma) =>
        HttpResponse.json<{ data: { firmarPorEnlace: ResultadoFirma } }>({ data: { firmarPorEnlace } })
      const error = (
        mensaje: string,
        motivo: Extract<ResultadoFirma, { motivo?: unknown }>['motivo'],
        reintentar = false,
      ) => responder({ mensaje, motivo, puedeReintentar: reintentar })
      if (!registro || !enlaceVigente(registro))
        return error('El enlace venció. Pide uno nuevo a tu asesor.', 'ENLACE_VENCIDO')
      if (registro.firma) return responder(registro.firma) // firmar dos veces devuelve la misma evidencia
      if (registro.propuesta.estado !== 'EN_FIRMA')
        return error('Esta propuesta ya no se puede firmar.', 'PROPUESTA_NO_FIRMABLE')
      if (!entrada.aceptaTerminos || !entrada.autorizaCobro) {
        return error('Debes aceptar los términos y autorizar el cobro.', 'COBRO_NO_AUTORIZADO')
      }
      if (entrada.versionDocumento !== 'v1') {
        return error('El contrato se actualizó. Revísalo de nuevo antes de firmar.', 'VERSION_DOCUMENTO_DESACTUALIZADA')
      }
      if (!entrada.firma.trim()) return error('La firma está vacía.', 'IMAGEN_INVALIDA')
      registro.firma = firmaRegistrada(registro)
      cambiarEstado(registro, 'FIRMADA')
      return responder(registro.firma)
    },
  ),

  bff.mutation<{ iniciarPago: ResultadoInicioPago }>('iniciarPago', ({ request }) => {
    const registro = porToken(request)
    const responder = (iniciarPago: ResultadoInicioPago) =>
      HttpResponse.json<{ data: { iniciarPago: ResultadoInicioPago } }>({ data: { iniciarPago } })
    if (!registro || !enlaceVigente(registro)) {
      return responder(errorPago('El enlace venció. Pide uno nuevo a tu asesor.', 'ENLACE_VENCIDO', false))
    }
    if (registro.propuesta.estado !== 'FIRMADA') {
      return responder(errorPago('Primero firma el contrato.', null, false))
    }
    registro.fallosSeguidos = 0 // pagar con otra tarjeta reinicia la cuenta de fallos
    const sesion: SesionPagoMock = {
      id: siguiente('ses'),
      propuestaId: registro.propuesta.id,
      estado: 'ABIERTA',
      venceEn: Date.now() + MIN_SESION_PAGO * 60_000,
      motivo: null,
      medio: null,
    }
    sesiones.set(sesion.id, sesion)
    return responder({ sesionId: sesion.id, urlPago: `/dev/pasarela/${sesion.id}`, venceEn: iso(sesion.venceEn) })
  }),

  bff.mutation<{ confirmarPago: ResultadoPago }, MutationConfirmarPagoArgs>('confirmarPago', ({ variables }) => {
    // Una sesión abierta antes de vencer el enlace se acepta al regresar (W03-22): no se exige el enlace vigente.
    const sesion = sesiones.get(variables.sesionId)
    const registro = sesion && propuestas.get(sesion.propuestaId)
    const responder = (confirmarPago: ResultadoPago) =>
      HttpResponse.json<{ data: { confirmarPago: ResultadoPago } }>({ data: { confirmarPago } })
    if (!sesion || !registro) {
      return responder(errorPago('La sesión de pago venció. Vuelve a abrir el pago.', 'SESION_VENCIDA', false))
    }
    if (registro.poliza) return responder(registro.poliza) // regresar dos veces no cobra dos veces
    if (sesion.estado === 'COBRADA') return responder(emitirPoliza(registro))
    if (sesion.estado === 'RECHAZADA') {
      const motivo = sesion.motivo === 'FONDOS_INSUFICIENTES' ? 'FONDOS_INSUFICIENTES' : 'TARJETA_VENCIDA'
      const mensaje =
        motivo === 'FONDOS_INSUFICIENTES'
          ? 'Tu banco rechazó el pago por fondos insuficientes. Intenta con otra tarjeta.'
          : 'Tu banco rechazó el pago porque la tarjeta está vencida. Intenta con otra tarjeta.'
      return responder(errorPago(mensaje, motivo, false))
    }
    if (sesion.estado === 'FALLIDA') {
      registro.fallosSeguidos += 1
      return responder(
        registro.fallosSeguidos >= 3
          ? errorPago(
              'No pudimos confirmar el pago después de varios intentos. Intenta con otra tarjeta.',
              'REQUIERE_OTRA_TARJETA',
              false,
              registro.fallosSeguidos,
            )
          : errorPago(
              'La pasarela no respondió. Reintenta: antes de cobrar revisamos si el pago ya se hizo.',
              'PASARELA_NO_DISPONIBLE',
              true,
              registro.fallosSeguidos,
            ),
      )
    }
    if (sesion.venceEn < Date.now()) {
      return responder(errorPago('La sesión de pago venció. Vuelve a abrir el pago.', 'SESION_VENCIDA', false))
    }
    return responder(errorPago('No completaste el pago. Vuelve a la pasarela para terminarlo.', null, false))
  }),

  // PDFs: el contrato a firmar y la póliza emitida. Sin el token del enlace, 401 (como la ruta del BFF).
  http.get('*/mock/propuestas/:id/contrato.pdf', ({ request }) =>
    porToken(request)
      ? pdf(['Contrato de Seguro de Vida Grupo Deudores', 'Documento de ejemplo del mock (no es un contrato real).'])
      : new HttpResponse(null, { status: 401 }),
  ),
  http.get('*/mock/polizas/:id/documento.pdf', ({ request }) => {
    const registro = porToken(request)
    if (!registro?.poliza) return new HttpResponse(null, { status: 401 })
    return pdf([
      `Poliza ${registro.poliza.numero}`,
      'Seguro de Vida Grupo Deudores',
      'Documento de ejemplo del mock (no es una poliza real).',
    ])
  }),
]
