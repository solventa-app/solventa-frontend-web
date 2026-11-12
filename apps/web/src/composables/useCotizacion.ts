// Estado compartido del asistente de cotización (HU-W01): singleton a nivel de módulo para que las 7
// pantallas de `/cotizacion/*` compartan captura, consentimiento y resultado. Vive solo en memoria
// (regla 7) y se pierde al recargar.
import { reactive } from 'vue'
import { ErrorGraphQL, ejecutar } from '../graphql/cliente'
import { t } from '../i18n'
import { alCerrarSesion } from './useSesion'
import { pais, tipoDocumento } from './usePais'
import type {
  CanalContacto,
  ConfirmacionContacto,
  Consentimiento,
  ErrorOferta,
  Oferta,
  ResultadoOferta,
} from '../graphql/tipos'

/** KAN-290 (v0.42): qué se cotiza. Vida deudor es el producto de siempre. */
export type ProductoCotizacion = 'VIDA_DEUDOR' | 'AUTO'

export interface CapturaCotizacion {
  producto: ProductoCotizacion
  documentoIdentidad: string
  /** T6 (W03-34): el CLIENTE cotiza con el documento de su cuenta (lo pone el BFF). Solo la marca, nunca el número. */
  documentoDeCuenta: boolean
  valorCredito: string
  plazoMeses: string
  direccionInmueble: string
  /** T19: lugar elegido en el autocompletado; null si la dirección se escribió («sin verificar»). */
  placeId: string | null
  consentimiento: boolean
  // Solo los pide un ASESOR (W01-A1). Cotizar no los envía: viajan en `aceptarOferta` (W03-01).
  nombreCliente: string
  correoCliente: string
  // KAN-290: los datos de la póliza de auto. La placa solo viaja al BFF y nunca se guarda en el navegador.
  placa: string
  kilometrajeAnual: string
  ciudadCirculacion: string
  uso: 'PARTICULAR' | 'COMERCIAL'
  deducible: 'DIEZ_POR_CIENTO' | 'SIN_DEDUCIBLE'
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
    producto: 'VIDA_DEUDOR',
    documentoIdentidad: '',
    documentoDeCuenta: false,
    valorCredito: '',
    plazoMeses: '',
    direccionInmueble: '',
    placeId: null,
    consentimiento: false,
    nombreCliente: '',
    correoCliente: '',
    placa: '',
    kilometrajeAnual: '',
    ciudadCirculacion: '',
    uso: 'PARTICULAR',
    deducible: 'DIEZ_POR_CIENTO',
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

// Los campos de la oferta de los dos productos (v0.42): la de vida trae el score; la de auto, el vehículo, las
// coberturas y los factores de la tarifa.
const CAMPOS_OFERTA = `
      ... on Oferta {
        id
        tipo
        producto
        prima { valor moneda }
        rangoPrima { minima { valor moneda } maxima { valor moneda } }
        cobertura { valor moneda }
        desgloseScore { nombre peso }
        fuentes { id nombre origen estado capturadoEn }
        perfilRiesgo { score nivelRiesgo fechaVigencia }
        vehiculo {
          placaEnmascarada marca linea modelo clase uso
          valorComercial { valor moneda }
          ciudadCirculacion kilometrajeAnual deducible
        }
        coberturas { tipo valorAsegurado { valor moneda } deducible }
        factoresTarifa { nombre factor detalle }
      }
      ... on ErrorOferta {
        mensaje
        puedeReintentar
        motivo
      }
`

const MUTACION_SOLICITAR_OFERTA = `
  mutation solicitarOferta($entrada: SolicitudOfertaInput!) {
    solicitarOferta(entrada: $entrada) {${CAMPOS_OFERTA}}
  }
`

const MUTACION_SOLICITAR_OFERTA_AUTO = `
  mutation solicitarOfertaAuto($entrada: SolicitudOfertaAutoInput!) {
    solicitarOfertaAuto(entrada: $entrada) {${CAMPOS_OFERTA}}
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
 * Versión del texto del consentimiento (W01-01). v2 (T19): declara que la dirección del inmueble se consulta en Google
 * para validarla. Cambiar el texto exige subir la versión: el consentimiento guarda cuál aceptó la persona.
 */
export const VERSION_TEXTO_CONSENTIMIENTO = 'v2'

/**
 * T20 (v0.38): el documento con su tipo y país. Sin documento (CLIENTE con el de su cuenta) no se manda nada: el BFF
 * toma los tres de AUTH.
 */
function documentoTipado() {
  const documento = estado.captura.documentoIdentidad.trim()
  if (!documento) return { documentoIdentidad: null, tipoDocumento: null, pais: null }
  return { documentoIdentidad: documento, tipoDocumento: tipoDocumento.value, pais: pais.value }
}

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
        entrada:
          estado.captura.producto === 'AUTO'
            ? {
                // KAN-290: se consultan los datos del vehículo (RUNT, Fasecolda y siniestralidad), no los financieros.
                finalidad: 'cotizacion-auto',
                versionTexto: VERSION_TEXTO_CONSENTIMIENTO,
                ...documentoTipado(),
                tipoDato: 'VEHICULO',
                fuenteDatos: 'RUNT_FASECOLDA_SINIESTRALIDAD',
                canal: 'WEB',
              }
            : {
                finalidad: 'perfilamiento',
                versionTexto: VERSION_TEXTO_CONSENTIMIENTO,
                ...documentoTipado(),
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
      const c = estado.captura
      const resultado =
        c.producto === 'AUTO'
          ? (
              await ejecutar<{ solicitarOfertaAuto: ResultadoOferta }>(
                MUTACION_SOLICITAR_OFERTA_AUTO,
                {
                  entrada: {
                    consentimientoId: estado.consentimientoId,
                    ...documentoTipado(),
                    placa: c.placa.trim(),
                    kilometrajeAnual: Number(c.kilometrajeAnual),
                    ciudadCirculacion: c.ciudadCirculacion.trim(),
                    uso: c.uso,
                    deducible: c.deducible,
                  },
                },
                fetchFn,
              )
            ).solicitarOfertaAuto
          : (
              await ejecutar<{ solicitarOferta: ResultadoOferta }>(
                MUTACION_SOLICITAR_OFERTA,
                {
                  entrada: {
                    consentimientoId: estado.consentimientoId,
                    ...documentoTipado(),
                    valorCredito: c.valorCredito,
                    plazoMeses: Number(c.plazoMeses),
                    direccionInmueble: c.direccionInmueble,
                    placeId: c.placeId,
                  },
                },
                fetchFn,
              )
            ).solicitarOferta
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
