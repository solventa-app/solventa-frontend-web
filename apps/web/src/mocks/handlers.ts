import { graphql, HttpResponse } from 'msw'
import type {
  Cobro,
  ConfirmacionContacto,
  Consentimiento,
  FuenteConsultada,
  MutationContactarAsesorArgs,
  MutationRegistrarConsentimientoArgs,
  MutationReintentarCobroArgs,
  MutationRevocarConsentimientoArgs,
  MutationSolicitarOfertaArgs,
  Oferta,
  MutationIniciarSesionArgs,
  QueryCobrosArgs,
  ResultadoOferta,
  ResultadoSesion,
  RolUsuario,
} from '../graphql/tipos'

// Mocks del BFF (contrato/schema.graphql). Convención de demo (equivale a los "disparadores de demo"
// del prototipo): un documentoIdentidad que termina en 999 devuelve oferta PRELIMINAR (fuente lenta,
// CA-W01-04) y uno que termina en 000 devuelve ERROR con reintento (CA-W01-05). Es una convención de
// los mocks, NO del backend real.

const ahora = () => new Date().toISOString()

// Misma forma que devuelve el BFF real (solventa-backend: services/rating): los 5 identificadores de fuente
// (2 Open Finance + 3 Open Data) y, en el desglose, el peso fijo de cada una. Las pantallas los muestran con
// nombres legibles (src/utils/nombres.ts). En la PRELIMINAR, como en el backend con Open Finance lento, el
// historial llega de caché y una fuente de Open Data falla.
const fuentes = (degradada: boolean): FuenteConsultada[] => [
  { id: 'cuentas-bancarias', nombre: 'cuentas-bancarias', origen: 'OPEN_FINANCE', estado: 'OK', capturadoEn: null },
  {
    id: 'historial-crediticio',
    nombre: 'historial-crediticio',
    origen: 'OPEN_FINANCE',
    estado: degradada ? 'CACHE' : 'OK',
    capturadoEn: degradada ? ahora() : null,
  },
  { id: 'afiliacion-pila', nombre: 'afiliacion-pila', origen: 'OPEN_DATA', estado: 'OK', capturadoEn: null },
  { id: 'camara-comercio', nombre: 'camara-comercio', origen: 'OPEN_DATA', estado: 'OK', capturadoEn: null },
  {
    id: 'antecedentes-judiciales',
    nombre: 'antecedentes-judiciales',
    origen: 'OPEN_DATA',
    estado: degradada ? 'FALLO' : 'OK',
    capturadoEn: null,
  },
]

const oferta = (tipo: Oferta['tipo']): Oferta => ({
  id: `oferta-${tipo.toLowerCase()}`,
  tipo,
  prima: tipo === 'COMPLETA' ? { valor: '94680.00', moneda: 'COP' } : null,
  rangoPrima:
    tipo === 'PRELIMINAR' ? { minima: { valor: '81792.00', moneda: 'COP' }, maxima: { valor: '122688.00', moneda: 'COP' } } : null,
  cobertura: { valor: '200000000', moneda: 'COP' },
  desgloseScore: [
    { nombre: 'historial-crediticio', peso: 0.3 },
    { nombre: 'cuentas-bancarias', peso: 0.2 },
    { nombre: 'afiliacion-pila', peso: 0.2 },
    { nombre: 'camara-comercio', peso: 0.15 },
    { nombre: 'antecedentes-judiciales', peso: 0.15 },
  ],
  fuentes: fuentes(tipo === 'PRELIMINAR'),
})

const consentimiento = (revocado: boolean): Consentimiento => ({
  id: 'consentimiento-1',
  finalidad: 'perfilamiento',
  versionTexto: 'v1',
  otorgadoEn: ahora(),
  revocadoEn: revocado ? ahora() : null,
  vigente: !revocado,
})

// Los 5 cobros del prototipo (Figma yKWD8jrwERtJkuSj0mk0Gz "Solventa-web-Final", W05-01, nodo 2001:3156),
// con la forma del BFF real: `cliente { id nombre }`, `idTransaccion` y `reintentosRestantes` (contrato v0.6). Son los mismos
// que deja `scripts/sembrar_cobros.py` en el backend local. Un RECHAZADO se reintenta a mano hasta 3 veces;
// un PENDIENTE lo reintenta el sistema solo. `cobros` es mutable (reintentarCobro lo actualiza en el sitio)
// para que el estado persista entre pantallas; las pruebas lo reinician con restablecerCobrosDePrueba.
const cobro = (
  id: string,
  nombre: string,
  polizaId: string,
  estado: Cobro['estado'],
  valor: string,
  actualizadoEn: string,
  motivo: string | null = null,
  idTransaccion: string | null = null,
): Cobro => ({
  id,
  cliente: { id: `cliente-${id}`, nombre },
  polizaId,
  estado,
  monto: { valor, moneda: 'COP' },
  actualizadoEn,
  idTransaccion,
  motivo,
  intentos: 1,
  reintentosRestantes: 3,
})

const cobrosIniciales = (): Cobro[] => [
  cobro('cobro-1', 'María Gutiérrez', 'VH-2026-0048217', 'COBRADO', '185000.00', '2026-09-12T15:45:00Z', null, 'pg-8a2f19c3'),
  cobro('cobro-2', 'Carlos Rincón', 'VH-2026-0048190', 'COBRANDO', '212400.00', '2026-09-12T15:50:00Z'),
  cobro('cobro-3', 'Luisa Fernanda Parra', 'VH-2026-0048155', 'RECHAZADO', '164800.00', '2026-09-11T21:12:00Z', 'fondos_insuficientes'),
  cobro('cobro-4', 'Jorge Mendoza', 'VH-2026-0048101', 'PENDIENTE', '240000.00', '2026-09-10T14:03:00Z', 'pasarela_no_disponible'),
  cobro('cobro-5', 'Sandra Ospina', 'VH-2026-0048077', 'COBRADO', '198500.00', '2026-09-09T19:27:00Z', null, 'pg-c91a4402'),
]

let cobros: Cobro[] = cobrosIniciales()

/** Solo para pruebas: reinicia el estado mutable de `cobros` entre casos de prueba. */
export function restablecerCobrosDePrueba(): void {
  cobros = cobrosIniciales()
}

const RESUMEN_CANAL: Record<MutationContactarAsesorArgs['canal'], string> = {
  LLAMAR: 'llamada',
  CHAT: 'chat',
  AGENDAR: 'llamada agendada',
}

// Login de demo (solo mocks): el rol sale del alias, como si cada alias fuera un usuario distinto.
// "clave-incorrecta" simula credenciales inválidas. En el backend real el rol lo da AUTH.
function rolDeDemo(alias: string): RolUsuario {
  if (/^(admin|operador|backoffice)/.test(alias)) return 'BACKOFFICE'
  if (alias.startsWith('asesor')) return 'ASESOR'
  return 'CLIENTE'
}

export const handlers = [
  graphql.mutation<{ iniciarSesion: ResultadoSesion }, MutationIniciarSesionArgs>('iniciarSesion', ({ variables }) => {
    const { usuario, clave } = variables.entrada
    const resultado: ResultadoSesion =
      clave === 'clave-incorrecta'
        ? { mensaje: 'Usuario o clave incorrectos.' }
        : {
            token: `token-demo-${usuario}`,
            expiraEn: new Date(Date.now() + 3600_000).toISOString(),
            usuario: { id: `u-${usuario}`, usuario, rol: rolDeDemo(usuario), estado: 'ACTIVO', creadoEn: ahora() },
          }
    return HttpResponse.json({ data: { iniciarSesion: resultado } })
  }),

  graphql.mutation<{ registrarConsentimiento: Consentimiento }, MutationRegistrarConsentimientoArgs>(
    'registrarConsentimiento',
    () => HttpResponse.json({ data: { registrarConsentimiento: consentimiento(false) } }),
  ),

  graphql.mutation<{ revocarConsentimiento: Consentimiento }, MutationRevocarConsentimientoArgs>(
    'revocarConsentimiento',
    () => HttpResponse.json({ data: { revocarConsentimiento: consentimiento(true) } }),
  ),

  graphql.mutation<{ solicitarOferta: ResultadoOferta }, MutationSolicitarOfertaArgs>(
    'solicitarOferta',
    ({ variables }) => {
      const documento = variables.entrada.documentoIdentidad
      const resultado: ResultadoOferta = documento.endsWith('000')
        ? // Mismo mensaje que el BFF cuando no llega el historial crediticio (CA-W01-05).
          {
            mensaje: 'No pudimos consultar tu historial crediticio en este momento. Intenta de nuevo o habla con un asesor.',
            puedeReintentar: true,
          }
        : oferta(documento.endsWith('999') ? 'PRELIMINAR' : 'COMPLETA')
      return HttpResponse.json({ data: { solicitarOferta: resultado } })
    },
  ),

  graphql.mutation<{ contactarAsesor: ConfirmacionContacto }, MutationContactarAsesorArgs>(
    'contactarAsesor',
    ({ variables }) =>
      HttpResponse.json({
        data: {
          // Mismo texto que el BFF (sin el id de la oferta, que no le dice nada al cliente).
          contactarAsesor: { canal: variables.canal, resumen: `Recibimos tu solicitud de ${RESUMEN_CANAL[variables.canal]}. Un asesor te contactará para continuar tu cotización.` },
        },
      }),
  ),

  graphql.query<{ cobros: Cobro[] }, QueryCobrosArgs>('cobros', ({ variables }) =>
    HttpResponse.json({
      data: { cobros: variables.estado ? cobros.filter((c) => c.estado === variables.estado) : cobros },
    }),
  ),

  graphql.mutation<{ reintentarCobro: Cobro }, MutationReintentarCobroArgs>(
    'reintentarCobro',
    ({ variables }) => {
      // Igual que el BFF: un RECHAZADO con reintentos se vuelve a cobrar (aquí siempre queda COBRADO) y
      // descuenta uno; sin reintentos, error. Muta el cobro en el arreglo para que persista entre pantallas.
      const encontrado = cobros.find((c) => c.id === variables.cobroId)
      if (!encontrado) {
        return HttpResponse.json({ data: null, errors: [{ message: 'Cobro no encontrado.', path: ['reintentarCobro'] }] })
      }
      if (encontrado.estado === 'RECHAZADO') {
        if (!encontrado.reintentosRestantes) {
          return HttpResponse.json({
            data: null,
            errors: [{ message: 'Se agotaron los 3 reintentos: el cobro requiere otro medio de pago.', path: ['reintentarCobro'] }],
          })
        }
        encontrado.reintentosRestantes -= 1
        encontrado.estado = 'COBRADO'
        encontrado.motivo = null
        encontrado.idTransaccion = `pg-reintento-${encontrado.id}`
        encontrado.actualizadoEn = ahora()
      }
      return HttpResponse.json({ data: { reintentarCobro: encontrado } })
    },
  ),
]
