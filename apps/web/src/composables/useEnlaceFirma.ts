// Página del enlace de firma (HU-W03, W03-02 a W03-04 y el retorno de la pasarela). El cliente entra SIN sesión: lo
// autoriza el token de un solo uso que llega en el fragmento de la URL (`/firma#t=…`, W03-23) y viaja al BFF en la
// cabecera `X-Enlace-Firma`, nunca en la consulta ni en el cuerpo.
//
// Cuidado con el token (decisión D-3, aprobada con la condición de minimizar su almacenamiento):
// 1. Vive en MEMORIA. Al leerlo se quita del fragmento con `history.replaceState`, para que no quede en la barra de
//    direcciones, en el historial ni en una captura de pantalla. Si el cliente recarga, vuelve a abrir el enlace.
// 2. `sessionStorage` (`solventa.enlaceFirma`) se usa SOLO como puente del viaje a la pasarela, que sale de la web
//    y vuelve con `?sesion=`: se escribe justo antes de salir, con su vencimiento, y se lee UNA vez al volver
//    (`/pago/retorno`) y se borra en el acto. Si venció (30 min del enlace o 15 min desde que se escribió), se descarta.
// 3. Se borra también al emitir la póliza, si el enlace venció y con `olvidarEnlace()`; el navegador lo borra al
//    cerrar la pestaña.
// 4. Nunca va a `localStorage`, a un log, a la consola ni a la URL de una petición.
import { reactive } from 'vue'
import type { Router } from 'vue-router'
import { ErrorGraphQL, ejecutar, pdfDeSesion, type OpcionesEjecucion } from '../graphql/cliente'
import type {
  EnlaceFirma,
  ErrorFirma,
  ErrorPago,
  FirmaRegistrada,
  ModoFirma,
  Poliza,
  ResultadoFirma,
  ResultadoInicioPago,
  ResultadoPago,
  ResultadoSubidaArchivo,
  SesionPago,
} from '../graphql/tipos'
import { t } from '../i18n'
import { alCerrarSesion } from './useSesion'
import { bytesDeBase64, tipoRealImagen } from '../utils/firma'

export const CLAVE_PUENTE = 'solventa.enlaceFirma'
const VIDA_MAXIMA_PUENTE_MS = 15 * 60_000
const FORMATO_TOKEN = /^[A-Za-z0-9_-]{4,256}$/

const CAMPOS_PROPUESTA = `id ofertaId estado prima { valor moneda } cobertura { valor moneda } plazoMeses polizaId
  actualizadoEn motivoEstado mensajeEstado accionSugerida`
const CAMPOS_POLIZA = `id numero estado vigenciaDesde vigenciaHasta prima { valor moneda } cobertura { valor moneda } documentoUrl`
const CAMPOS_FIRMA = `propuestaId firmadaEn referencia estado`

const CONSULTA_ENLACE = `query firmaPorEnlace($propuestaId: ID) {
  firmaPorEnlace(propuestaId: $propuestaId) {
    vigente venceEn documentoUrl
    propuesta { ${CAMPOS_PROPUESTA} }
    documento { propuestaId version resumen montoMensual { valor moneda } meses formaCobro }
    firma { ${CAMPOS_FIRMA} }
    poliza { ${CAMPOS_POLIZA} }
  }
}`
const MUTACION_FIRMAR = `mutation firmarPorEnlace($entrada: FirmarPorEnlaceInput!) {
  firmarPorEnlace(entrada: $entrada) {
    __typename
    ... on FirmaRegistrada { ${CAMPOS_FIRMA} }
    ... on ErrorFirma { mensaje puedeReintentar motivo }
  }
}`
const MUTACION_SUBIDA_FIRMA = `mutation solicitarSubidaFirma($tipoContenido: String!, $tamanoBytes: Int!, $propuestaId: ID) {
  solicitarSubidaFirma(tipoContenido: $tipoContenido, tamanoBytes: $tamanoBytes, propuestaId: $propuestaId) {
    __typename
    ... on SubidaArchivo { url metodo archivo { id } encabezados { nombre valor } }
    ... on ErrorArchivo { codigo mensaje }
  }
}`
const MUTACION_INICIAR_PAGO = `mutation iniciarPago($propuestaId: ID) {
  iniciarPago(propuestaId: $propuestaId) {
    __typename
    ... on SesionPago { sesionId urlPago venceEn }
    ... on ErrorPago { mensaje puedeReintentar motivo fallosSeguidos }
  }
}`
const MUTACION_CONFIRMAR_PAGO = `mutation confirmarPago($sesionId: ID!, $propuestaId: ID) {
  confirmarPago(sesionId: $sesionId, propuestaId: $propuestaId) {
    __typename
    ... on Poliza { ${CAMPOS_POLIZA} }
    ... on ErrorPago { mensaje puedeReintentar motivo fallosSeguidos }
  }
}`

/** A qué pantalla del enlace corresponde el estado de la propuesta («retoma donde iba», W03-22). */
export type PasoEnlace = 'firmar' | 'pagar' | 'emitida' | 'vencido' | 'otro'

export interface FirmaCapturada {
  modo: ModoFirma
  /** PNG o JPG en base64 sin el prefijo `data:` (TRAZO e IMAGEN) o el nombre escrito (NOMBRE). */
  contenido: string
}

interface EstadoEnlace {
  enlace: EnlaceFirma | null
  /** Firma capturada en W03-02, en memoria hasta confirmar en W03-02b. */
  firmaCapturada: FirmaCapturada | null
  aceptaTerminos: boolean
  cargando: boolean
  error: string | null
}

let token: string | null = null
// Modo sesión (T7, W03-33): el CLIENTE registrado firma y paga en su sesión, sin enlace. Las operaciones llevan su JWT y
// el `propuestaId`; no hay token del enlace ni puente. Se fija al entrar a una página `/propuestas/:propuestaId/firma…`.
let propuestaSesion: string | null = null

const estado = reactive<EstadoEnlace>({
  enlace: null,
  firmaCapturada: null,
  aceptaTerminos: false,
  cargando: false,
  error: null,
})

export function esErrorFirma(r: ResultadoFirma | null | undefined): r is ErrorFirma {
  return !!r && 'mensaje' in r
}
export function esErrorPago(r: ResultadoInicioPago | ResultadoPago | null | undefined): r is ErrorPago {
  return !!r && 'mensaje' in r
}
export function esSesionPago(r: ResultadoInicioPago | null | undefined): r is SesionPago {
  return !!r && 'urlPago' in r
}

// ---------- El token ----------

/**
 * Lee el token del fragmento (`#t=…`) y lo quita de la barra de direcciones. Devuelve si hay un token en memoria.
 * Un fragmento con otro formato se ignora (no se manda nada raro al BFF).
 */
export function tomarTokenDelFragmento(): boolean {
  if (typeof window === 'undefined') return token !== null
  const coincidencia = /(?:^#|&)t=([^&]+)/.exec(window.location.hash)
  if (coincidencia) {
    const candidato = decodeURIComponent(coincidencia[1])
    if (FORMATO_TOKEN.test(candidato)) {
      if (candidato !== token) olvidarEnlace()
      token = candidato
    }
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
  }
  return token !== null
}

function guardarPuente(venceEnlace: string | null): void {
  if (!token) return
  const vence = Math.min(
    Date.now() + VIDA_MAXIMA_PUENTE_MS,
    venceEnlace ? Date.parse(venceEnlace) : Number.POSITIVE_INFINITY,
  )
  try {
    sessionStorage.setItem(CLAVE_PUENTE, JSON.stringify({ t: token, vence }))
  } catch {
    // Sin almacenamiento: al volver de la pasarela el cliente tendrá que abrir de nuevo el enlace.
  }
}

/** Al volver de la pasarela: toma el token del puente UNA vez y lo borra. Descarta uno vencido o mal formado. */
export function tomarTokenDelPuente(): boolean {
  try {
    const crudo = sessionStorage.getItem(CLAVE_PUENTE)
    sessionStorage.removeItem(CLAVE_PUENTE)
    if (crudo) {
      const { t: guardado, vence } = JSON.parse(crudo) as { t?: unknown; vence?: unknown }
      if (
        typeof guardado === 'string' &&
        FORMATO_TOKEN.test(guardado) &&
        typeof vence === 'number' &&
        vence > Date.now()
      ) {
        token = guardado
      }
    }
  } catch {
    /* sin almacenamiento o contenido inválido: se ignora */
  }
  return token !== null
}

function borrarPuente(): void {
  try {
    sessionStorage.removeItem(CLAVE_PUENTE)
  } catch {
    /* sin almacenamiento */
  }
}

/** Borra el token y todo lo del enlace (memoria y puente). */
export function olvidarEnlace(): void {
  token = null
  propuestaSesion = null
  borrarPuente()
  Object.assign(estado, { enlace: null, firmaCapturada: null, aceptaTerminos: false, cargando: false, error: null })
}

// Al cerrar la sesión no queda nada del recorrido del cliente en memoria.
alCerrarSesion(olvidarEnlace)

export function hayToken(): boolean {
  return token !== null
}

/** Hay con qué autorizar las operaciones: el token del enlace o la sesión del cliente con su propuesta. */
export function hayAcceso(): boolean {
  return token !== null || propuestaSesion !== null
}

/** Fija (o quita) el modo sesión. Sin enlace de por medio: si había un token de otra propuesta, se descarta. */
export function usarPropuestaDeSesion(propuestaId: string | null): void {
  if (propuestaId && token) olvidarEnlace()
  if (propuestaId !== propuestaSesion) {
    propuestaSesion = propuestaId
    if (!propuestaId || estado.enlace?.propuesta.id !== propuestaId) {
      Object.assign(estado, { enlace: null, firmaCapturada: null, aceptaTerminos: false, error: null })
    }
  }
}

/** El recorrido es el del cliente en su sesión (no el del enlace). */
export function enModoSesion(): boolean {
  return propuestaSesion !== null
}

export type SubRuta = '' | '/confirmar' | '/confirmada' | '/poliza'

/** Ruta de una página del recorrido: la pública del enlace, o la de la sesión del cliente. */
export function rutaDe(sub: SubRuta): string {
  return propuestaSesion ? `/propuestas/${propuestaSesion}/firma${sub}` : `/firma${sub}`
}

// ---------- Operaciones ----------

export function pasoDelEnlace(enlace: EnlaceFirma | null): PasoEnlace {
  if (!enlace) return 'vencido'
  const { estado: e } = enlace.propuesta
  if (e === 'EMITIDA') return 'emitida'
  if (!enlace.vigente) return 'vencido'
  if (e === 'EN_FIRMA') return 'firmar'
  if (e === 'FIRMADA' || e === 'PAGO_RECHAZADO' || e === 'PENDIENTE_PAGO') return 'pagar'
  return 'otro'
}

const SUBRUTA_DEL_PASO: Record<PasoEnlace, SubRuta> = {
  firmar: '',
  pagar: '/confirmada',
  emitida: '/poliza',
  vencido: '',
  otro: '',
}

/** A dónde lleva cada paso, según el recorrido sea el del enlace o el de la sesión. */
export const rutaDelPaso = (paso: PasoEnlace): string => rutaDe(SUBRUTA_DEL_PASO[paso])

/**
 * Va a la página de la pasarela. La real está fuera de Solventa (W03-28) y se abre con una navegación completa; la
 * simulada de `dev:mock` (/dev/pasarela) es una ruta de la propia web y se abre con el router para no recargar los
 * mocks, que viven en memoria.
 */
export function irAPasarela(router: Router, url: string): void {
  if (url.startsWith('/')) void router.push(url)
  else window.location.assign(url)
}

function mensajeSeguro(error: unknown): string {
  return error instanceof ErrorGraphQL && error.message === t('comun.servicioLento')
    ? error.message
    : t('firma.errorTecnico')
}

export function useEnlaceFirma(fetchFn: typeof fetch = fetch) {
  const opciones = (): OpcionesEjecucion =>
    propuestaSesion
      ? { conToken: true }
      : { conToken: false, cabeceras: token ? { 'X-Enlace-Firma': token } : undefined }

  /** En modo sesión toda operación nombra la propuesta; con el enlace el BFF la saca del token. */
  const conPropuesta = (variables: Record<string, unknown> = {}) =>
    propuestaSesion ? { ...variables, propuestaId: propuestaSesion } : variables

  async function operar<T>(consulta: string, variables: Record<string, unknown> = {}): Promise<T | null> {
    if (!hayAcceso()) return null
    estado.cargando = true
    estado.error = null
    try {
      return await ejecutar<T>(consulta, conPropuesta(variables), fetchFn, opciones())
    } catch (error) {
      estado.error = mensajeSeguro(error)
      return null
    } finally {
      estado.cargando = false
    }
  }

  /** Lee el estado del enlace. Con el enlace vencido o inexistente, borra el token (no sirve para nada más). */
  async function cargar(): Promise<PasoEnlace | null> {
    if (!hayAcceso()) return 'vencido'
    const datos = await operar<{ firmaPorEnlace: EnlaceFirma | null }>(CONSULTA_ENLACE)
    if (!datos) return null // falla técnica: la pantalla muestra el error con reintento
    estado.enlace = datos.firmaPorEnlace
    const paso = pasoDelEnlace(estado.enlace)
    if (paso === 'vencido' && !propuestaSesion) {
      token = null
      borrarPuente()
    }
    return paso
  }

  /**
   * Sube la imagen de la firma directo al bucket (W03-24): pide la URL firmada y hace el PUT con TODOS los
   * encabezados que devuelve (si falta uno, el bucket responde 403). Devuelve el id del archivo, o un `ErrorFirma`
   * reintentable para que la pantalla deje subir otra imagen.
   */
  async function subirImagen(base64: string): Promise<string | ErrorFirma | null> {
    const bytes = bytesDeBase64(base64)
    const tipo = tipoRealImagen(bytes)
    const rechazo = (mensaje: string): ErrorFirma => ({ mensaje, puedeReintentar: true, motivo: 'IMAGEN_INVALIDA' })
    if (!tipo) return rechazo(t('firma.imagen.errorTipo'))
    const datos = await operar<{ solicitarSubidaFirma: ResultadoSubidaArchivo }>(MUTACION_SUBIDA_FIRMA, {
      tipoContenido: tipo,
      tamanoBytes: bytes.length,
    })
    if (!datos) return null
    const subida = datos.solicitarSubidaFirma
    if (!('url' in subida)) return rechazo(subida.mensaje)
    try {
      const respuesta = await fetchFn(subida.url, {
        method: subida.metodo,
        headers: Object.fromEntries(subida.encabezados.map((e) => [e.nombre, e.valor])),
        body: bytes as BodyInit,
      })
      if (!respuesta.ok) return rechazo(t('firma.imagen.errorSubida'))
    } catch {
      return rechazo(t('firma.imagen.errorSubida'))
    }
    return subida.archivo.id
  }

  async function firmar(): Promise<FirmaRegistrada | ErrorFirma | null> {
    const documento = estado.enlace?.documento
    const capturada = estado.firmaCapturada
    if (!documento || !capturada) return null
    // NOMBRE guarda el texto; TRAZO e IMAGEN suben primero la imagen y firman con el id del archivo.
    let imagenArchivoId: string | undefined
    if (capturada.modo !== 'NOMBRE') {
      const subida = await subirImagen(capturada.contenido)
      if (subida === null || typeof subida !== 'string') return subida
      imagenArchivoId = subida
    }
    const datos = await operar<{ firmarPorEnlace: ResultadoFirma }>(MUTACION_FIRMAR, {
      entrada: {
        versionDocumento: documento.version,
        aceptaTerminos: estado.aceptaTerminos,
        autorizaCobro: true,
        ...(propuestaSesion ? { propuestaId: propuestaSesion } : {}),
        modo: capturada.modo,
        ...(imagenArchivoId ? { imagenArchivoId } : { nombreFirma: capturada.contenido }),
      },
    })
    if (!datos) return null
    const resultado = datos.firmarPorEnlace
    if (!esErrorFirma(resultado)) {
      estado.firmaCapturada = null // la imagen de la firma no se queda en memoria más de lo necesario
      if (estado.enlace) {
        estado.enlace.firma = resultado
        estado.enlace.propuesta.estado = 'FIRMADA'
      }
    }
    return resultado
  }

  /** «Pagar» (W03-03): abre una sesión en la pasarela y deja el puente del token justo antes de salir. */
  async function iniciarPago(): Promise<ResultadoInicioPago | null> {
    const datos = await operar<{ iniciarPago: ResultadoInicioPago }>(MUTACION_INICIAR_PAGO)
    if (!datos) return null
    if (esSesionPago(datos.iniciarPago) && !propuestaSesion)
      guardarPuente(estado.enlace?.venceEn ?? datos.iniciarPago.venceEn)
    return datos.iniciarPago
  }

  /** Al volver de la pasarela: confirma con el proveedor (servidor a servidor). Con la póliza, borra el puente. */
  async function confirmarPago(sesionId: string): Promise<Poliza | ErrorPago | null> {
    const datos = await operar<{ confirmarPago: ResultadoPago }>(MUTACION_CONFIRMAR_PAGO, { sesionId })
    if (!datos) return null
    const resultado = datos.confirmarPago
    if (!esErrorPago(resultado)) {
      borrarPuente()
      if (estado.enlace) {
        estado.enlace.poliza = resultado
        estado.enlace.propuesta.estado = 'EMITIDA'
      }
    }
    return resultado
  }

  /** Descarga un PDF protegido por el token (contrato o póliza) como `blob:` para un iframe o una pestaña nueva. */
  async function urlDelPdf(ruta: string): Promise<string | null> {
    if (propuestaSesion) return pdfDeSesion(ruta, fetchFn)
    if (!token) return null
    try {
      const respuesta = await fetchFn(ruta, { headers: { 'X-Enlace-Firma': token } })
      if (!respuesta.ok) return null
      // Si la ruta no llega al BFF, el hosting responde 200 con el index.html de la SPA: sin este control el
      // visor mostraría la propia aplicación en vez del contrato.
      if (!(respuesta.headers.get('Content-Type') ?? '').includes('application/pdf')) return null
      return URL.createObjectURL(await respuesta.blob())
    } catch {
      return null
    }
  }

  /**
   * Al montar una página del enlace: toma el token del fragmento, lee el estado y, si la propuesta va en otro paso,
   * lleva a esa pantalla («retoma donde iba»). Devuelve el paso, o null si hubo una falla técnica.
   */
  async function entrar(router: Router, pasosPropios: PasoEnlace[]): Promise<PasoEnlace | null> {
    // Una página `/propuestas/:propuestaId/firma…` es el recorrido del cliente en su sesión; la de `/firma` usa el enlace.
    const propuestaId = router.currentRoute.value.params.propuestaId
    usarPropuestaDeSesion(typeof propuestaId === 'string' ? propuestaId : null)
    if (!propuestaSesion) tomarTokenDelFragmento()
    const paso = await cargar()
    // Vencido: cada página muestra el estado vacío ahí mismo, sin navegar.
    if (paso && paso !== 'vencido' && !pasosPropios.includes(paso)) await router.replace(rutaDelPaso(paso))
    return paso
  }

  return { estado, entrar, cargar, firmar, iniciarPago, confirmarPago, urlDelPdf }
}
