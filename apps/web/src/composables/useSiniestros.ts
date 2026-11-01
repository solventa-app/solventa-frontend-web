// Estado compartido de la mesa de siniestros (HU-W04): singleton a nivel de módulo, como useConciliacion.ts,
// para que bandeja, detalle, derivación y confirmaciones (W04-01 … W04-03c) compartan datos al navegar.
// Habla con el BFF por '/v1/graphql/web' con el JWT de la sesión: el servicio CLAIMS exige BACKOFFICE en todas las
// operaciones (contrato v0.21).
import { reactive } from 'vue'
import { ejecutar, type OpcionesEjecucion } from '../graphql/cliente'
import type {
  Asegurado,
  ErrorSiniestro,
  EstadoSiniestro,
  MotivoRechazo,
  Perito,
  ResultadoResolucion,
  Siniestro,
} from '../graphql/tipos'
import { t } from '../i18n'

const SINIESTROS: OpcionesEjecucion = { endpoint: '/v1/graphql/web' }

/** Lo que muestra la bandeja (W04-01). Un Siniestro completo también lo cumple (tras una acción). */
export type SiniestroBandeja = Pick<Siniestro, 'id' | 'radicado' | 'estado' | 'notificadoEn' | 'venceDictamenEn'> & {
  asegurado: Pick<Asegurado, 'nombre'>
}

// El detalle y las acciones piden todos los campos que usan sus pantallas.
const CAMPOS_PERITO = `id nombre ciudad red registro tiempoRespuestaDias vencimientoInforme`
const CAMPOS_SINIESTRO = `
  id
  radicado
  estado
  asegurado { nombre documento }
  poliza {
    id numero estado vigenciaDesde vigenciaHasta ramo
    prima { valor moneda }
    cobertura { valor moneda }
  }
  coberturaAplicada
  entidadAcreedora
  ocurridoEn
  notificadoEn
  ubicacion { descripcion ciudad latitud longitud }
  descripcion
  sumaReclamada { valor moneda }
  venceDictamenEn
  evidencias { id tipo titulo archivo url registradaEn geoetiquetada nota }
  verificaciones { descripcion cumple }
  resolucion {
    tipo resueltaEn notificacion motivo comentario viaRecurso
    indemnizacion { valor moneda }
    metodoTransferencia plazoDispersion
    perito { ${CAMPOS_PERITO} }
    instrucciones vencimientoInforme automatica
  }`

// La bandeja pide solo lo que muestra: con el backend real, pedir la póliza y las evidencias resolvería POLICY y
// firmaría las URL de todas las evidencias en cada carga.
const CONSULTA_SINIESTROS = `query siniestros($estado: EstadoSiniestro) {
  siniestros(estado: $estado) { id radicado estado asegurado { nombre } notificadoEn venceDictamenEn }
}`
const CONSULTA_SINIESTRO = `query siniestro($id: ID!) {
  siniestro(id: $id) { ${CAMPOS_SINIESTRO} }
}`
const CONSULTA_PERITOS = `query peritos($siniestroId: ID!) {
  peritos(siniestroId: $siniestroId) { ${CAMPOS_PERITO} }
}`
const RESULTADO = `__typename ... on Siniestro { ${CAMPOS_SINIESTRO} } ... on ErrorSiniestro { mensaje }`
const MUTACION_APROBAR = `mutation aprobarSiniestro($id: ID!) {
  aprobarSiniestro(id: $id) { ${RESULTADO} }
}`
const MUTACION_RECHAZAR = `mutation rechazarSiniestro($id: ID!, $motivo: MotivoRechazo!, $comentario: String) {
  rechazarSiniestro(id: $id, motivo: $motivo, comentario: $comentario) { ${RESULTADO} }
}`
const MUTACION_DERIVAR = `mutation derivarSiniestro($id: ID!, $peritoId: ID!, $instrucciones: String) {
  derivarSiniestro(id: $id, peritoId: $peritoId, instrucciones: $instrucciones) { ${RESULTADO} }
}`

/** El union del contrato: ErrorSiniestro trae `mensaje` (regla de negocio), Siniestro trae `estado`. */
export function esErrorSiniestro(r: ResultadoResolucion | null | undefined): r is ErrorSiniestro {
  return !!r && 'mensaje' in r
}
export function esSiniestro(r: ResultadoResolucion | null | undefined): r is Siniestro {
  return !!r && 'estado' in r
}

interface EstadoSiniestros {
  /** Bandeja (W04-01). */
  siniestros: SiniestroBandeja[]
  cargando: boolean
  error: string | null
  /** Detalle abierto (W04-02 y derivadas). */
  detalle: Siniestro | null
  cargandoDetalle: boolean
  errorDetalle: string | null
  /** El BFF respondió `null`: el id no existe (estado "no encontrado", distinto de un error). */
  noEncontrado: boolean
  /** Peritos para derivar (W04-02b). */
  peritos: Perito[]
  cargandoPeritos: boolean
  errorPeritos: string | null
  /** Última acción (aprobar/rechazar/derivar): la leen las confirmaciones W04-03a/b/c, como useCotizacion.resultado. */
  resultado: ResultadoResolucion | null
  enviando: boolean
  /** Mensaje de una acción fallida: el de la regla de negocio (ErrorSiniestro) o uno genérico seguro. */
  errorAccion: string | null
}

const estado = reactive<EstadoSiniestros>({
  siniestros: [],
  cargando: false,
  error: null,
  detalle: null,
  cargandoDetalle: false,
  errorDetalle: null,
  noEncontrado: false,
  peritos: [],
  cargandoPeritos: false,
  errorPeritos: null,
  resultado: null,
  enviando: false,
  errorAccion: null,
})

/** Solo para pruebas: deja el estado como al cargar el módulo. */
export function reiniciarEstadoSiniestros(): void {
  Object.assign(estado, {
    siniestros: [],
    cargando: false,
    error: null,
    detalle: null,
    cargandoDetalle: false,
    errorDetalle: null,
    noEncontrado: false,
    peritos: [],
    cargandoPeritos: false,
    errorPeritos: null,
    resultado: null,
    enviando: false,
    errorAccion: null,
  })
}

export function useSiniestros(fetchFn: typeof fetch = fetch) {
  async function cargarSiniestros(filtro?: EstadoSiniestro) {
    estado.cargando = true
    estado.error = null
    try {
      const variables = filtro ? { estado: filtro } : {}
      const r = await ejecutar<{ siniestros: SiniestroBandeja[] }>(CONSULTA_SINIESTROS, variables, fetchFn, SINIESTROS)
      estado.siniestros = r.siniestros
    } catch {
      // Nunca el error técnico ni un 5xx crudo (regla 5).
      estado.error = t('siniestros.errorCarga')
    } finally {
      estado.cargando = false
    }
  }

  async function cargarSiniestro(id: string) {
    estado.cargandoDetalle = true
    estado.errorDetalle = null
    estado.noEncontrado = false
    estado.detalle = null
    try {
      const r = await ejecutar<{ siniestro: Siniestro | null }>(CONSULTA_SINIESTRO, { id }, fetchFn, SINIESTROS)
      estado.detalle = r.siniestro
      estado.noEncontrado = r.siniestro === null
    } catch {
      estado.errorDetalle = t('siniestros.errorDetalle')
    } finally {
      estado.cargandoDetalle = false
    }
  }

  async function cargarPeritos(siniestroId: string) {
    estado.cargandoPeritos = true
    estado.errorPeritos = null
    try {
      const r = await ejecutar<{ peritos: Perito[] }>(CONSULTA_PERITOS, { siniestroId }, fetchFn, SINIESTROS)
      estado.peritos = r.peritos
    } catch {
      estado.peritos = []
      estado.errorPeritos = t('siniestros.errorPeritos')
    } finally {
      estado.cargandoPeritos = false
    }
  }

  /** Ejecuta una mutación de resolución; devuelve el siniestro actualizado o `null` si falló. */
  async function resolver(campo: string, consulta: string, variables: Record<string, unknown>) {
    estado.enviando = true
    estado.errorAccion = null
    estado.resultado = null
    try {
      const r = await ejecutar<Record<string, ResultadoResolucion>>(consulta, variables, fetchFn, SINIESTROS)
      const resultado = r[campo]
      estado.resultado = resultado
      if (esErrorSiniestro(resultado)) {
        // Los mensajes de ErrorSiniestro son reglas de negocio escritas para el usuario (contrato).
        estado.errorAccion = resultado.mensaje
        return null
      }
      if (estado.detalle?.id === resultado.id) estado.detalle = resultado
      const indice = estado.siniestros.findIndex((s) => s.id === resultado.id)
      if (indice !== -1) estado.siniestros.splice(indice, 1, resultado)
      return resultado
    } catch {
      // Red, 5xx o error de esquema: mensaje genérico seguro, nunca el técnico (regla 5).
      estado.errorAccion = t('siniestros.errorAccion')
      return null
    } finally {
      estado.enviando = false
    }
  }

  const aprobar = (id: string) => resolver('aprobarSiniestro', MUTACION_APROBAR, { id })
  const rechazar = (id: string, motivo: MotivoRechazo, comentario?: string) =>
    resolver('rechazarSiniestro', MUTACION_RECHAZAR, { id, motivo, comentario: comentario || null })
  const derivar = (id: string, peritoId: string, instrucciones?: string) =>
    resolver('derivarSiniestro', MUTACION_DERIVAR, { id, peritoId, instrucciones: instrucciones || null })

  return { estado, cargarSiniestros, cargarSiniestro, cargarPeritos, aprobar, rechazar, derivar }
}
