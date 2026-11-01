// Estado compartido del asistente de cotización (HU-W01): singleton a nivel de módulo para que las 7
// pantallas de `/cotizacion/*` compartan captura, consentimiento y resultado. Vive solo en memoria
// (regla 7) y se pierde al recargar.
import { reactive } from 'vue'
import { ErrorGraphQL, ejecutar } from '../graphql/cliente'
import { t } from '../i18n'
import { alCerrarSesion } from './useSesion'
import type {
  CanalContacto,
  ConfirmacionContacto,
  Consentimiento,
  ErrorOferta,
  Oferta,
  ResultadoOferta,
} from '../graphql/tipos'

export interface CapturaCotizacion {
  documentoIdentidad: string
  valorCredito: string
  plazoMeses: string
  direccionInmueble: string
  consentimiento: boolean
  // Solo los pide un ASESOR (W01-A1). Cotizar no los envía: viajan en `aceptarOferta` (W03-01).
  nombreCliente: string
  correoCliente: string
}

interface EstadoCotizacion {
  captura: CapturaCotizacion
  consentimientoId: string | null
  consentimiento: Consentimiento | null
  resultado: ResultadoOferta | null
  contacto: ConfirmacionContacto | null
  cargando: boolean
}

function capturaVacia(): CapturaCotizacion {
  return {
    documentoIdentidad: '',
    valorCredito: '',
    plazoMeses: '',
    direccionInmueble: '',
    consentimiento: false,
    nombreCliente: '',
    correoCliente: '',
  }
}

const estado = reactive<EstadoCotizacion>({
  captura: capturaVacia(),
  consentimientoId: null,
  consentimiento: null,
  resultado: null,
  contacto: null,
  cargando: false,
})

/** Son los dos tipos del contrato (ver contrato/schema.graphql): ErrorOferta tiene `mensaje`, Oferta tiene `tipo`. */
export function esErrorOferta(resultado: ResultadoOferta | null | undefined): resultado is ErrorOferta {
  return !!resultado && 'mensaje' in resultado
}
export function esOferta(resultado: ResultadoOferta | null | undefined): resultado is Oferta {
  return !!resultado && 'tipo' in resultado
}

// Se piden todos los campos que usa alguna pantalla: el BFF real solo devuelve lo que se pide y los
// mocks devuelven el objeto completo, así que una omisión solo se nota contra el BFF.
const MUTACION_REGISTRAR_CONSENTIMIENTO = `
  mutation registrarConsentimiento($entrada: ConsentimientoInput!) {
    registrarConsentimiento(entrada: $entrada) {
      id
      finalidad
      versionTexto
      otorgadoEn
      revocadoEn
      venceEn
      vigente
      estado
    }
  }
`

const MUTACION_SOLICITAR_OFERTA = `
  mutation solicitarOferta($entrada: SolicitudOfertaInput!) {
    solicitarOferta(entrada: $entrada) {
      ... on Oferta {
        id
        tipo
        prima { valor moneda }
        rangoPrima { minima { valor moneda } maxima { valor moneda } }
        cobertura { valor moneda }
        desgloseScore { nombre peso }
        fuentes { id nombre origen estado capturadoEn }
        perfilRiesgo { score nivelRiesgo fechaVigencia }
      }
      ... on ErrorOferta {
        mensaje
        puedeReintentar
        motivo
      }
    }
  }
`

const MUTACION_CONTACTAR_ASESOR = `
  mutation contactarAsesor($ofertaId: ID!, $canal: CanalContacto!) {
    contactarAsesor(ofertaId: $ofertaId, canal: $canal) {
      canal
      resumen
    }
  }
`

/**
 * `fetchFn` es la misma vía de inyección que ya usa `ejecutar` en `graphql/cliente.ts`: por
 * defecto pega contra `fetch` global (la app real), y las pruebas pueden pasar un fetch que
 * resuelva la URL relativa del BFF contra un origen de prueba, sin tener que mockear globals.
 */
export function useCotizacion(fetchFn: typeof fetch = fetch) {
  async function registrarConsentimiento(): Promise<Consentimiento> {
    const datos = await ejecutar<{ registrarConsentimiento: Consentimiento }>(
      MUTACION_REGISTRAR_CONSENTIMIENTO,
      {
        entrada: {
          finalidad: 'perfilamiento',
          versionTexto: 'v1',
          documentoIdentidad: estado.captura.documentoIdentidad.trim() || null,
          tipoDato: 'FINANCIEROS_Y_ABIERTOS',
          fuenteDatos: 'OPEN_FINANCE_OPEN_DATA',
          canal: 'WEB',
        },
      },
      fetchFn,
    )
    estado.consentimientoId = datos.registrarConsentimiento.id
    estado.consentimiento = datos.registrarConsentimiento
    return datos.registrarConsentimiento
  }

  /**
   * Dispara el flujo completo de W01-01 → W01-02 → W01-03a/b/c: registra el consentimiento (si no
   * existe aún) y solicita la oferta. El resultado queda en `estado.resultado`; quien llama decide
   * a qué pantalla navegar según `esOferta`/`esErrorOferta` y `resultado.tipo`.
   */
  async function solicitarOferta(): Promise<void> {
    estado.cargando = true
    try {
      if (!estado.consentimientoId) await registrarConsentimiento()
      const datos = await ejecutar<{ solicitarOferta: ResultadoOferta }>(
        MUTACION_SOLICITAR_OFERTA,
        {
          entrada: {
            consentimientoId: estado.consentimientoId,
            documentoIdentidad: estado.captura.documentoIdentidad.trim() || null,
            valorCredito: estado.captura.valorCredito,
            plazoMeses: Number(estado.captura.plazoMeses),
            direccionInmueble: estado.captura.direccionInmueble,
          },
        },
        fetchFn,
      )
      const resultado = datos.solicitarOferta
      if (esErrorOferta(resultado) && resultado.motivo === 'CONSENTIMIENTO_NO_VIGENTE') {
        exigirNuevoConsentimiento()
      } else {
        estado.resultado = resultado
      }
    } catch (error) {
      // Falla técnica o de red (incluyendo 502/503/504 del gateway): se convierte en un ErrorOferta
      // con mensaje seguro (regla 5), así W01-02 y W01-03c la muestran por el mismo camino que un
      // error de negocio.
      const mensajeGateway =
        error instanceof ErrorGraphQL && error.message === t('comun.servicioLento')
          ? error.message
          : t('solicitud.fallaConsulta')
      estado.resultado = {
        mensaje: mensajeGateway,
        puedeReintentar: true,
      }
    } finally {
      estado.cargando = false
    }
  }

  /**
   * Contacto con asesor (W01-05). El contrato exige `ofertaId`, pero se llega desde W01-03c, donde no
   * hubo oferta: se envía cadena vacía hasta que el contrato cubra "contactar sin oferta previa".
   */
  async function contactarAsesor(canal: CanalContacto): Promise<ConfirmacionContacto> {
    const ofertaId = esOferta(estado.resultado) ? estado.resultado.id : ''
    const datos = await ejecutar<{ contactarAsesor: ConfirmacionContacto }>(
      MUTACION_CONTACTAR_ASESOR,
      { ofertaId, canal },
      fetchFn,
    )
    estado.contacto = datos.contactarAsesor
    return datos.contactarAsesor
  }

  return {
    estado,
    captura: estado.captura,
    registrarConsentimiento,
    solicitarOferta,
    contactarAsesor,
    reiniciar,
  }
}

/** Vuelve a W01-01 con la captura en blanco: se usa desde "reintentar" cuando no se puede reintentar la misma oferta. */
function reiniciar(): void {
  Object.assign(estado.captura, capturaVacia())
  estado.consentimientoId = null
  estado.consentimiento = null
  estado.resultado = null
  estado.contacto = null
}

/**
 * El consentimiento venció o fue revocado (al cotizar o al aceptar la oferta en W03-01): se descarta, se desmarca el
 * checkbox y W01-01 muestra el aviso de re-autorización (bloque 4 de W01).
 */
export function exigirNuevoConsentimiento(): void {
  estado.consentimientoId = null
  estado.consentimiento = null
  estado.captura.consentimiento = false
  // El contacto del cliente sigue al consentimiento (W03-26): vencido, se vuelve a pedir.
  estado.captura.nombreCliente = ''
  estado.captura.correoCliente = ''
  estado.resultado = {
    mensaje: t('solicitud.consentimientoVencido'),
    puedeReintentar: false,
    motivo: 'CONSENTIMIENTO_NO_VIGENTE',
  }
}

// Al cerrar sesión se borra todo lo capturado, incluido el contacto del cliente (regla 7).
alCerrarSesion(reiniciar)

/** Reglas de W01-A1 (las mismas de `crearUsuario` en el backend): nombre de 2 a 100 caracteres, correo con forma. */
export function nombreClienteValido(nombre: string): boolean {
  const limpio = nombre.trim()
  return limpio.length >= 2 && limpio.length <= 100
}
export function correoClienteValido(correo: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())
}

/** El contacto que capturó el ASESOR, listo para `aceptarOferta`; null si no hay (un CLIENTE no lo da). */
export function contactoCapturado(): { nombre: string; correo: string } | null {
  const { nombreCliente, correoCliente } = estado.captura
  if (!nombreClienteValido(nombreCliente) || !correoClienteValido(correoCliente)) return null
  return { nombre: nombreCliente.trim(), correo: correoCliente.trim().toLowerCase() }
}
