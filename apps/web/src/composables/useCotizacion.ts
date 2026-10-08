// Estado compartido del asistente de cotización (HU-W01). Es un singleton a nivel de módulo (no una
// librería de estado global: no hace falta para un único flujo lineal, ver CLAUDE.md regla 8 "no
// sobre-construir") para que las 7 pantallas de `/cotizacion/*` compartan la captura, el consentimiento
// y el resultado aunque el router destruya y vuelva a montar cada vista al navegar entre ellas.
//
// No se guarda nada de esto en localStorage ni se registra en consola (CLAUDE.md regla 7): vive solo en
// memoria y se pierde al recargar la página, que es la postura más simple y seguro-por-defecto para
// datos de una solicitud de seguro todavía sin confirmar.
import { reactive } from 'vue'
import { ejecutar } from '../graphql/cliente'
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
}

interface EstadoCotizacion {
  captura: CapturaCotizacion
  consentimientoId: string | null
  consentimiento: Consentimiento | null
  resultado: ResultadoOferta | null
  contacto: ConfirmacionContacto | null
  cargando: boolean
  error: string | null
}

function capturaVacia(): CapturaCotizacion {
  return { documentoIdentidad: '', valorCredito: '', plazoMeses: '', direccionInmueble: '', consentimiento: false }
}

const estado = reactive<EstadoCotizacion>({
  captura: capturaVacia(),
  consentimientoId: null,
  consentimiento: null,
  resultado: null,
  contacto: null,
  cargando: false,
  error: null,
})

/** Son los dos tipos del contrato (ver contrato/schema.graphql): ErrorOferta tiene `mensaje`, Oferta tiene `tipo`. */
export function esErrorOferta(resultado: ResultadoOferta | null | undefined): resultado is ErrorOferta {
  return !!resultado && 'mensaje' in resultado
}
export function esOferta(resultado: ResultadoOferta | null | undefined): resultado is Oferta {
  return !!resultado && 'tipo' in resultado
}

const MUTACION_REGISTRAR_CONSENTIMIENTO = `
  mutation registrarConsentimiento($entrada: ConsentimientoInput!) {
    registrarConsentimiento(entrada: $entrada) {
      id
      vigente
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
      }
      ... on ErrorOferta {
        mensaje
        puedeReintentar
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
      { entrada: { finalidad: 'perfilamiento', versionTexto: 'v1' } },
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
    estado.error = null
    try {
      if (!estado.consentimientoId) await registrarConsentimiento()
      const datos = await ejecutar<{ solicitarOferta: ResultadoOferta }>(
        MUTACION_SOLICITAR_OFERTA,
        {
          entrada: {
            consentimientoId: estado.consentimientoId,
            documentoIdentidad: estado.captura.documentoIdentidad,
            valorCredito: estado.captura.valorCredito,
            plazoMeses: Number(estado.captura.plazoMeses),
            direccionInmueble: estado.captura.direccionInmueble,
          },
        },
        fetchFn,
      )
      estado.resultado = datos.solicitarOferta
    } catch (e) {
      // Nunca se muestra el error técnico crudo (CLAUDE.md regla 5): queda en `estado.error` solo
      // para que W01-03c pueda mostrar un texto de reintento; el mensaje de ErrorOferta (del
      // contrato) es el que se le muestra al usuario cuando el fallo viene del BFF.
      estado.error = e instanceof Error ? e.message : 'No pudimos completar la solicitud.'
    } finally {
      estado.cargando = false
    }
  }

  /**
   * Contacto con asesor (W01-05). El contrato exige un `ofertaId` (ver contrato/schema.graphql),
   * pero el único punto de entrada de esta pantalla en el plano v21 es W01-03c (fallo), donde nunca
   * hubo una oferta exitosa. Se documenta aquí el mismo tipo de hueco que AvatarPerfil.vue deja para
   * G-05: se envía cadena vacía (los mocks no la validan) hasta que el contrato tenga un caso para
   * "contactar sin oferta previa".
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

  /** Vuelve a W01-01 con la captura en blanco: se usa desde "reintentar" cuando no se puede reintentar la misma oferta. */
  function reiniciar(): void {
    Object.assign(estado.captura, capturaVacia())
    estado.consentimientoId = null
    estado.consentimiento = null
    estado.resultado = null
    estado.contacto = null
    estado.error = null
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
