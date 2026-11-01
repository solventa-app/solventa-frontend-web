// Estado del lado del ASESOR en HU-W03 (W03-01 y su modal): aceptar la oferta con el contacto del cliente, enviar y
// verificar el código, emitir (UNDER decide y se envía el enlace) y reenviar el enlace. Singleton de módulo, como
// useConciliacion.ts. Usa el contrato v0.18 (tipos.ts).
//
// Nunca guarda el correo completo: el modal lo muestra enmascarado (`correoEnmascarado`) y el contacto vive en
// useCotizacion hasta aceptar. Todo se borra al cerrar sesión (regla 7).
import { reactive } from 'vue'
import { ErrorGraphQL, ejecutar } from '../graphql/cliente'
import type {
  CodigoEnviado,
  EnlaceEnviado,
  ErrorAceptacion,
  ErrorCodigo,
  ErrorEmision,
  Oferta,
  Propuesta,
  ResultadoAceptacion,
  ResultadoEmision,
  ResultadoEnvioCodigo,
  ResultadoVerificacion,
} from '../graphql/tipos'
import { t } from '../i18n'
import { contactoCapturado } from './useCotizacion'
import { alCerrarSesion } from './useSesion'

const CAMPOS_PROPUESTA = `id ofertaId estado prima { valor moneda } cobertura { valor moneda } plazoMeses polizaId
  actualizadoEn motivoEstado mensajeEstado accionSugerida`

const CONSULTA_OFERTA = `query oferta($id: ID!) {
  oferta(id: $id) {
    id tipo prima { valor moneda } rangoPrima { minima { valor moneda } maxima { valor moneda } }
    cobertura { valor moneda } desgloseScore { nombre peso } fuentes { id nombre origen estado capturadoEn }
    perfilRiesgo { score nivelRiesgo fechaVigencia }
  }
}`
const CONSULTA_PROPUESTA = `query propuesta($id: ID!) { propuesta(id: $id) { ${CAMPOS_PROPUESTA} } }`
// Las propuestas del rol (más reciente primero): sirve para retomar el proceso de una oferta al recargar la página.
const CONSULTA_PROPUESTAS = `query propuestas($pagina: Int, $tamano: Int) {
  propuestas(pagina: $pagina, tamano: $tamano) { propuestas { ${CAMPOS_PROPUESTA} } total }
}`
const TAMANO_BUSQUEDA = 50
// `contacto` es el argumento nuevo de la v0.17 (borrador): el BFF lo exige a un ASESOR.
const MUTACION_ACEPTAR = `mutation aceptarOferta($ofertaId: ID!, $contacto: ContactoTitularInput) {
  aceptarOferta(ofertaId: $ofertaId, contacto: $contacto) {
    __typename
    ... on Propuesta { ${CAMPOS_PROPUESTA} }
    ... on ErrorAceptacion { mensaje puedeReintentar motivo }
  }
}`
const MUTACION_ENVIAR_CODIGO = `mutation enviarCodigoVerificacion($propuestaId: ID!, $correo: String) {
  enviarCodigoVerificacion(propuestaId: $propuestaId, correo: $correo) {
    __typename
    ... on CodigoEnviado { propuestaId correoEnmascarado venceEn }
    ... on ErrorCodigo { mensaje puedeReintentar motivo intentosRestantes }
  }
}`
const MUTACION_VERIFICAR = `mutation verificarCodigo($propuestaId: ID!, $codigo: String!) {
  verificarCodigo(propuestaId: $propuestaId, codigo: $codigo) {
    __typename
    ... on Propuesta { ${CAMPOS_PROPUESTA} }
    ... on ErrorCodigo { mensaje puedeReintentar motivo intentosRestantes }
  }
}`
const RESULTADO_EMISION = `
  __typename
  ... on EnlaceEnviado { correoEnmascarado venceEn propuesta { ${CAMPOS_PROPUESTA} } }
  ... on Propuesta { ${CAMPOS_PROPUESTA} }
  ... on ErrorEmision { mensaje puedeReintentar }`
const MUTACION_EMITIR = `mutation emitirPropuesta($propuestaId: ID!) {
  emitirPropuesta(propuestaId: $propuestaId) { ${RESULTADO_EMISION} }
}`
const MUTACION_REENVIAR = `mutation reenviarEnlaceFirma($propuestaId: ID!) {
  reenviarEnlaceFirma(propuestaId: $propuestaId) { ${RESULTADO_EMISION} }
}`

type ConTipo<T> = T & { __typename?: string }

export function esErrorAceptacion(r: ResultadoAceptacion | null | undefined): r is ErrorAceptacion {
  return !!r && 'mensaje' in r
}
export function esErrorCodigo(r: ResultadoEnvioCodigo | ResultadoVerificacion | null | undefined): r is ErrorCodigo {
  return !!r && 'mensaje' in r
}
export function esEnlaceEnviado(r: ResultadoEmision | null | undefined): r is EnlaceEnviado {
  return !!r && 'correoEnmascarado' in r
}
export function esErrorEmision(r: ResultadoEmision | null | undefined): r is ErrorEmision {
  return !!r && 'mensaje' in r && !('estado' in r)
}

interface EstadoSuscripcion {
  oferta: Oferta | null
  propuesta: Propuesta | null
  errorAceptacion: ErrorAceptacion | null
  codigo: CodigoEnviado | null
  enlace: EnlaceEnviado | null
  cargando: boolean
  /** Mensaje seguro de una falla técnica (regla 5): nunca el texto crudo del servidor. */
  error: string | null
}

const estado = reactive<EstadoSuscripcion>({
  oferta: null,
  propuesta: null,
  errorAceptacion: null,
  codigo: null,
  enlace: null,
  cargando: false,
  error: null,
})

function reiniciar(): void {
  Object.assign(estado, {
    oferta: null,
    propuesta: null,
    errorAceptacion: null,
    codigo: null,
    enlace: null,
    cargando: false,
    error: null,
  })
}

alCerrarSesion(reiniciar)

function mensajeSeguro(error: unknown): string {
  return error instanceof ErrorGraphQL && error.message === t('comun.servicioLento')
    ? error.message
    : t('suscripcion.errorTecnico')
}

export function useSuscripcion(fetchFn: typeof fetch = fetch) {
  /** Corre una operación con «cargando» y convierte cualquier falla técnica en un mensaje seguro. */
  async function conCarga<T>(operacion: () => Promise<T>): Promise<T | null> {
    estado.cargando = true
    estado.error = null
    try {
      return await operacion()
    } catch (error) {
      estado.error = mensajeSeguro(error)
      return null
    } finally {
      estado.cargando = false
    }
  }

  async function cargarOferta(id: string): Promise<void> {
    await conCarga(async () => {
      const datos = await ejecutar<{ oferta: Oferta | null }>(CONSULTA_OFERTA, { id }, fetchFn)
      estado.oferta = datos.oferta
    })
  }

  /** CA-W03-01: acepta la oferta COMPLETA con el contacto que capturó el ASESOR en W01-01. */
  async function aceptar(ofertaId: string): Promise<boolean> {
    estado.errorAceptacion = null
    const resultado = await conCarga(() =>
      ejecutar<{ aceptarOferta: ConTipo<ResultadoAceptacion> }>(
        MUTACION_ACEPTAR,
        { ofertaId, contacto: contactoCapturado() },
        fetchFn,
      ),
    )
    if (!resultado) return false
    const respuesta = resultado.aceptarOferta
    if (esErrorAceptacion(respuesta)) {
      estado.errorAceptacion = respuesta
      return false
    }
    estado.propuesta = respuesta
    return true
  }

  async function enviarCodigo(correo: string | null = null): Promise<ErrorCodigo | null> {
    if (!estado.propuesta) return null
    const propuestaId = estado.propuesta.id
    const resultado = await conCarga(() =>
      ejecutar<{ enviarCodigoVerificacion: ResultadoEnvioCodigo }>(
        MUTACION_ENVIAR_CODIGO,
        { propuestaId, correo },
        fetchFn,
      ),
    )
    if (!resultado) return null
    const respuesta = resultado.enviarCodigoVerificacion
    if (esErrorCodigo(respuesta)) return respuesta
    estado.codigo = respuesta
    return null
  }

  async function verificarCodigo(codigo: string): Promise<ErrorCodigo | null> {
    if (!estado.propuesta) return null
    const propuestaId = estado.propuesta.id
    const resultado = await conCarga(() =>
      ejecutar<{ verificarCodigo: ResultadoVerificacion }>(MUTACION_VERIFICAR, { propuestaId, codigo }, fetchFn),
    )
    if (!resultado) return null
    const respuesta = resultado.verificarCodigo
    if (esErrorCodigo(respuesta)) return respuesta
    estado.propuesta = respuesta
    return null
  }

  async function aplicarEmision(operacion: string, campo: 'emitirPropuesta' | 'reenviarEnlaceFirma') {
    if (!estado.propuesta) return null
    const propuestaId = estado.propuesta.id
    const resultado = await conCarga(() =>
      ejecutar<Record<typeof campo, ResultadoEmision>>(operacion, { propuestaId }, fetchFn),
    )
    if (!resultado) return null
    const respuesta = resultado[campo]
    if (esEnlaceEnviado(respuesta)) {
      estado.enlace = respuesta
      estado.propuesta = respuesta.propuesta
    } else if (!esErrorEmision(respuesta)) {
      estado.propuesta = respuesta
    }
    return respuesta
  }

  /** «Emitir» (W03-21): UNDER decide; si aprueba, se envía el enlace de un solo uso al correo del cliente. */
  const emitir = () => aplicarEmision(MUTACION_EMITIR, 'emitirPropuesta')
  /** Un enlace nuevo anula el anterior (W03-22). */
  const reenviarEnlace = () => aplicarEmision(MUTACION_REENVIAR, 'reenviarEnlaceFirma')

  /**
   * Si se recargó la página, recupera la propuesta de esta oferta (la más reciente) para retomar donde iba. Es una
   * ayuda en segundo plano: no enciende «cargando» (no bloquea «Aceptar») y si falla no muestra nada, la persona
   * sigue como si no hubiera propuesta y aceptar devuelve la misma.
   */
  async function recuperarPropuesta(ofertaId: string): Promise<void> {
    if (estado.propuesta?.ofertaId === ofertaId) return
    try {
      const datos = await ejecutar<{ propuestas: { propuestas: Propuesta[] } }>(
        CONSULTA_PROPUESTAS,
        { pagina: 1, tamano: TAMANO_BUSQUEDA },
        fetchFn,
      )
      const encontrada = datos.propuestas.propuestas.find((p) => p.ofertaId === ofertaId)
      if (encontrada && !estado.propuesta) estado.propuesta = encontrada
    } catch {
      // Sin la propuesta recuperada, la pantalla funciona como antes.
    }
  }

  /** El asesor actualiza el estado mientras el cliente firma y paga (sin recarga automática: no hay webhooks). */
  async function consultarPropuesta(): Promise<void> {
    if (!estado.propuesta) return
    const id = estado.propuesta.id
    await conCarga(async () => {
      const datos = await ejecutar<{ propuesta: Propuesta | null }>(CONSULTA_PROPUESTA, { id }, fetchFn)
      if (datos.propuesta) estado.propuesta = datos.propuesta
    })
  }

  return {
    estado,
    cargarOferta,
    aceptar,
    enviarCodigo,
    verificarCodigo,
    emitir,
    reenviarEnlace,
    consultarPropuesta,
    recuperarPropuesta,
    reiniciar,
  }
}
