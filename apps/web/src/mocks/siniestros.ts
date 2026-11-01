// Mocks de la mesa de siniestros (HU-W04) en '/v1/graphql/web' del BFF, para Vitest y para `dev:mock` (regla 2).
// Datos reducidos (4 siniestros: los 4 estados y uno ya derivado a perito) con las mismas reglas de negocio y
// los mismos mensajes que el servicio CLAIMS del backend. Las evidencias son imágenes SVG generadas aquí: el
// backend real devuelve URL firmadas del almacenamiento.
import { http, HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'
import type {
  MutationAprobarSiniestroArgs,
  MutationDerivarSiniestroArgs,
  MutationRechazarSiniestroArgs,
  Perito,
  QueryPeritosArgs,
  QuerySiniestroArgs,
  QuerySiniestrosArgs,
  Siniestro,
} from '../graphql/tipos'

const MAX_TEXTO = 500
export const MENSAJES_SINIESTROS = {
  noExiste: 'No encontramos el siniestro.',
  yaResuelto: 'El siniestro ya fue resuelto y no admite cambios.',
  yaDerivado: 'El siniestro ya tiene un perito asignado.',
  perito: 'El perito seleccionado no está disponible.',
  textoLargo: `El texto supera los ${MAX_TEXTO} caracteres.`,
} as const

const MEDIOS = '/mock/siniestros/medios/'
const enHoras = (horas: number) => new Date(Date.now() + horas * 3_600_000).toISOString()
const enDias = (dias: number) => enHoras(dias * 24)

const peritosBase: Perito[] = [
  {
    id: 'per-01',
    nombre: 'Peritajes Andes Ltda.',
    ciudad: 'Bogotá',
    red: 'Red Preferente Centro',
    registro: 'RNPL-SFC 2024-0117',
    tiempoRespuestaDias: 4,
    vencimientoInforme: null,
  },
  {
    id: 'per-02',
    nombre: 'Avalúos del Caribe S.A.S.',
    ciudad: 'Barranquilla',
    red: 'Red Preferente Caribe',
    registro: 'RNPL-SFC 2023-0342',
    tiempoRespuestaDias: 5,
    vencimientoInforme: null,
  },
]

function siniestroBase(n: number, estado: Siniestro['estado']): Siniestro {
  return {
    id: `sin-0${n}`,
    radicado: `SIN-2026-014${n}`,
    estado,
    asegurado: { nombre: `Asegurado de prueba ${n}`, documento: `C.C. 79.845.21${n}` },
    poliza: {
      id: `pol-0${n}`,
      numero: `SOL-2026-04821${n}`,
      estado: 'EMITIDA',
      vigenciaDesde: '2026-02-10T05:00:00Z',
      vigenciaHasta: '2027-02-10T05:00:00Z',
      prima: { valor: '1560000', moneda: 'COP' },
      cobertura: { valor: '52000000', moneda: 'COP' },
      documentoUrl: `/mock/polizas/pol-0${n}/documento.pdf`,
      ramo: 'Vida grupo deudor con amparo de daños al bien financiado',
    },
    coberturaAplicada: 'Vida grupo deudor · Amparo de daños materiales al bien financiado',
    entidadAcreedora: 'Banco Aliado S.A.',
    ocurridoEn: `2026-10-1${n}T13:40:00Z`,
    notificadoEn: `2026-10-1${n}T16:15:00Z`,
    ubicacion: { descripcion: 'Calle 80, puente de Guadua', ciudad: 'Bogotá', latitud: 4.7236, longitud: -74.1215 },
    descripcion: 'Choque frontal contra el separador; daño en parachoques, capó y radiador; sin heridos.',
    sumaReclamada: { valor: '8650000', moneda: 'COP' },
    venceDictamenEn: enHoras(10),
    evidencias: [
      {
        id: `ev-0${n}-1`,
        tipo: 'FOTO',
        titulo: 'Foto: daño frontal del vehículo',
        archivo: `sin-0${n}-foto-1.jpg`,
        url: `${MEDIOS}sin-0${n}-foto-1.jpg`,
        registradaEn: `2026-10-1${n}T14:05:00Z`,
        geoetiquetada: true,
        nota: '4.7236, -74.1215 · tomada en sitio',
      },
      {
        id: `ev-0${n}-2`,
        tipo: 'DOCUMENTO',
        titulo: 'Factura de reparación del taller',
        archivo: `sin-0${n}-factura.png`,
        url: `${MEDIOS}sin-0${n}-factura.png`,
        registradaEn: `2026-10-1${n}T20:30:00Z`,
        geoetiquetada: false,
        nota: null,
      },
    ],
    verificaciones: [
      { descripcion: 'Póliza vigente en la fecha del siniestro', cumple: true },
      { descripcion: 'Evidencia geoetiquetada en el lugar reportado', cumple: true },
    ],
    resolucion: null,
  }
}

function siniestrosIniciales(): Siniestro[] {
  const pendiente = siniestroBase(1, 'PENDIENTE')
  // EN_REVISION y ya derivado a perito: la regla "ya tiene un perito asignado" se puede probar con él.
  const derivado = siniestroBase(2, 'EN_REVISION')
  derivado.resolucion = {
    tipo: 'DERIVACION',
    resueltaEn: '2026-10-12T18:00:00Z',
    notificacion: 'Correo certificado y expediente digital de siniestros',
    perito: { ...peritosBase[0] },
    instrucciones: 'Verificar chasis y cotización del taller.',
    vencimientoInforme: enDias(4),
  }
  const aprobado = siniestroBase(3, 'APROBADO')
  aprobado.resolucion = {
    tipo: 'APROBACION',
    resueltaEn: '2026-10-14T15:00:00Z',
    notificacion: 'Enviada al asegurado y a la entidad acreedora',
    indemnizacion: { valor: '8650000', moneda: 'COP' },
    metodoTransferencia: 'ACH Colombia Interbancario',
    plazoDispersion: '1 a 3 días hábiles',
  }
  const rechazado = siniestroBase(4, 'RECHAZADO')
  // Como sin-09 del dummy: una verificación SFC que no cumple.
  rechazado.verificaciones = [
    ...rechazado.verificaciones,
    { descripcion: 'Relato consistente con la evidencia aportada', cumple: false },
  ]
  rechazado.resolucion = {
    tipo: 'RECHAZO',
    resueltaEn: '2026-10-15T15:00:00Z',
    notificacion: 'Enviada vía correo certificado y Open Finance',
    motivo: 'FUERA_DE_COBERTURA',
    comentario: null,
    viaRecurso: 'Disponible en los próximos 10 días hábiles.',
  }
  return [pendiente, derivado, aprobado, rechazado]
}

let siniestros: Siniestro[] = siniestrosIniciales()

/** Solo para pruebas: devuelve los siniestros a su estado inicial entre casos de prueba. */
export function restablecerSiniestrosDePrueba(): void {
  siniestros = siniestrosIniciales()
}

class ErrorNegocio extends Error {}

const conTipo = (s: Siniestro) => ({ __typename: 'Siniestro', ...structuredClone(s) })

function abierto(id: string): Siniestro {
  const s = siniestros.find((x) => x.id === id)
  if (!s) throw new ErrorNegocio(MENSAJES_SINIESTROS.noExiste)
  if (s.estado !== 'PENDIENTE' && s.estado !== 'EN_REVISION') throw new ErrorNegocio(MENSAJES_SINIESTROS.yaResuelto)
  return s
}

function validarTexto(texto: string | null | undefined): string | null {
  const limpio = (texto ?? '').trim() || null
  if (limpio && limpio.length > MAX_TEXTO) throw new ErrorNegocio(MENSAJES_SINIESTROS.textoLargo)
  return limpio
}

/** Ejecuta una acción y la devuelve como el union ResultadoResolucion (Siniestro | ErrorSiniestro). */
function resultado(campo: string, accion: () => Siniestro) {
  const responder = (valor: object) => {
    const data: Record<string, object> = { [campo]: valor }
    return HttpResponse.json<{ data: Record<string, object> }>({ data })
  }
  try {
    return responder(conTipo(accion()))
  } catch (error) {
    if (!(error instanceof ErrorNegocio)) throw error
    return responder({ __typename: 'ErrorSiniestro', mensaje: error.message })
  }
}

const bff = graphql.link('*/v1/graphql/web')

/** Imagen de relleno para una evidencia, con su nombre de archivo (solo existe con los mocks). */
function imagenDeRelleno(archivo: string): string {
  const texto = archivo.replace(/[^\w.-]/g, '')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
  <rect width="640" height="480" fill="#e2e8f0"/>
  <text x="320" y="240" font-family="sans-serif" font-size="24" fill="#475569" text-anchor="middle">${texto}</text>
</svg>`
}

export const handlersSiniestros = [
  http.get(`*${MEDIOS}:archivo`, ({ params }) =>
    HttpResponse.text(imagenDeRelleno(String(params.archivo)), { headers: { 'Content-Type': 'image/svg+xml' } }),
  ),

  bff.query<{ siniestros: Siniestro[] }, QuerySiniestrosArgs>('siniestros', ({ variables }) => {
    const lista = siniestros
      .filter((s) => !variables.estado || s.estado === variables.estado)
      .sort((a, b) => b.notificadoEn.localeCompare(a.notificadoEn))
    return HttpResponse.json({ data: { siniestros: lista.map((s) => structuredClone(s)) } })
  }),

  bff.query<{ siniestro: Siniestro | null }, QuerySiniestroArgs>('siniestro', ({ variables }) => {
    const s = siniestros.find((x) => x.id === variables.id)
    return HttpResponse.json({ data: { siniestro: s ? structuredClone(s) : null } })
  }),

  bff.query<{ peritos: Perito[] }, QueryPeritosArgs>('peritos', ({ variables }) => {
    if (!siniestros.some((s) => s.id === variables.siniestroId)) return HttpResponse.json({ data: { peritos: [] } })
    const peritos = peritosBase.map((p) => ({ ...p, vencimientoInforme: enDias(p.tiempoRespuestaDias) }))
    return HttpResponse.json({ data: { peritos } })
  }),

  bff.mutation<Record<string, object>, MutationAprobarSiniestroArgs>('aprobarSiniestro', ({ variables }) =>
    resultado('aprobarSiniestro', () => {
      const s = abierto(variables.id)
      s.estado = 'APROBADO'
      s.resolucion = {
        tipo: 'APROBACION',
        resueltaEn: new Date().toISOString(),
        notificacion: 'Enviada al asegurado y a la entidad acreedora',
        indemnizacion: { ...s.sumaReclamada },
        metodoTransferencia: 'ACH Colombia Interbancario',
        plazoDispersion: '1 a 3 días hábiles',
        perito: s.resolucion?.perito ?? null,
      }
      return s
    }),
  ),

  bff.mutation<Record<string, object>, MutationRechazarSiniestroArgs>('rechazarSiniestro', ({ variables }) =>
    resultado('rechazarSiniestro', () => {
      const s = abierto(variables.id)
      const comentario = validarTexto(variables.comentario)
      s.estado = 'RECHAZADO'
      s.resolucion = {
        tipo: 'RECHAZO',
        resueltaEn: new Date().toISOString(),
        notificacion: 'Enviada vía correo certificado y Open Finance',
        motivo: variables.motivo,
        comentario,
        viaRecurso: 'Disponible en los próximos 10 días hábiles.',
        perito: s.resolucion?.perito ?? null,
      }
      return s
    }),
  ),

  bff.mutation<Record<string, object>, MutationDerivarSiniestroArgs>('derivarSiniestro', ({ variables }) =>
    resultado('derivarSiniestro', () => {
      const s = abierto(variables.id)
      if (s.resolucion?.perito) throw new ErrorNegocio(MENSAJES_SINIESTROS.yaDerivado)
      const perito = peritosBase.find((p) => p.id === variables.peritoId)
      if (!perito) throw new ErrorNegocio(MENSAJES_SINIESTROS.perito)
      const instrucciones = validarTexto(variables.instrucciones)
      const vencimiento = enDias(perito.tiempoRespuestaDias)
      s.estado = 'EN_REVISION'
      s.resolucion = {
        tipo: 'DERIVACION',
        resueltaEn: new Date().toISOString(),
        notificacion: 'Correo certificado y expediente digital de siniestros',
        perito: { ...perito, vencimientoInforme: vencimiento },
        instrucciones,
        vencimientoInforme: vencimiento,
      }
      return s
    }),
  ),
]
