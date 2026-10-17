import { graphql, HttpResponse } from 'msw'
import type {
  Cobro,
  ConfirmacionContacto,
  Consentimiento,
  FuenteConsultada,
  MutationContactarAsesorArgs,
  MutationIniciarSesionArgs,
  MutationRegistrarConsentimientoArgs,
  MutationReintentarCobroArgs,
  MutationRevocarConsentimientoArgs,
  MutationSolicitarOfertaArgs,
  Oferta,
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
    tipo === 'PRELIMINAR'
      ? { minima: { valor: '81792.00', moneda: 'COP' }, maxima: { valor: '122688.00', moneda: 'COP' } }
      : null,
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

// 4 cobros (HU-W05), uno por cada EstadoCobro, con los nombres, montos y fechas del frame W05-01 de
// Figma, con la forma del BFF (contrato v0.6): `idTransaccion` (null mientras no hay cobro hecho) y
// `reintentosRestantes` (un RECHAZADO se reintenta a mano hasta 3 veces). `cobros` es mutable (reintentarCobro lo actualiza en el sitio) para que el estado persista
// durante una demo; las pruebas lo reinician con restablecerCobrosDePrueba.
const cobrosIniciales = (): Cobro[] => [
  {
    id: 'cobro-1',
    cliente: { id: 'cliente-1', nombre: 'Andrés Felipe Duarte' },
    polizaId: 'SOL-VH-2026-004905',
    estado: 'COBRANDO',
    monto: { valor: '198000.00', moneda: 'COP' },
    actualizadoEn: '2026-09-05T15:00:00Z',
    idTransaccion: null,
    motivo: null,
    reintentosRestantes: 3,
  },
  {
    id: 'cobro-2',
    cliente: { id: 'cliente-2', nombre: 'Laura Gómez Rico' },
    polizaId: 'SOL-VH-2026-004821',
    estado: 'COBRADO',
    monto: { valor: '185000.00', moneda: 'COP' },
    actualizadoEn: '2026-09-05T14:14:00Z',
    idTransaccion: 'pg-8a2f19c3',
    motivo: null,
    reintentosRestantes: 3,
  },
  {
    id: 'cobro-3',
    cliente: { id: 'cliente-3', nombre: 'Julián Torres Mesa' },
    polizaId: 'SOL-VH-2026-004798',
    estado: 'RECHAZADO',
    monto: { valor: '142500.00', moneda: 'COP' },
    actualizadoEn: '2026-09-04T23:02:00Z',
    idTransaccion: null,
    motivo: 'fondos_insuficientes',
    reintentosRestantes: 3,
  },
  {
    id: 'cobro-4',
    cliente: { id: 'cliente-4', nombre: 'Carlos Andrés Peña' },
    polizaId: 'SOL-VH-2026-004790',
    estado: 'PENDIENTE',
    monto: { valor: '210000.00', moneda: 'COP' },
    actualizadoEn: '2026-09-04T16:47:00Z',
    idTransaccion: null,
    motivo: 'pasarela_no_disponible',
    reintentosRestantes: 3,
  },
]

let cobros: Cobro[] = cobrosIniciales()

/** Solo para pruebas: reinicia el estado mutable de `cobros` entre casos de prueba. */
export function restablecerCobrosDePrueba(): void {
  cobros = cobrosIniciales()
}

// Sesión de demo (convención de los mocks, NO del backend real): cualquier clave sirve salvo
// `clave-erronea`; el rol sale del alias (`asesor…` → ASESOR, `admin…`/`operador…` → BACKOFFICE, otro →
// CLIENTE). El token es un JWT sin firma con los mismos claims que emite AUTH, más `nombre`, que el
// backend todavía no emite (ver contrato/CHANGELOG.md): aquí se deriva del alias.
function rolDeDemo(usuario: string): RolUsuario {
  if (usuario.startsWith('asesor')) return 'ASESOR'
  if (usuario.startsWith('admin') || usuario.startsWith('operador')) return 'BACKOFFICE'
  return 'CLIENTE'
}

const base64url = (texto: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(texto)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

export function tokenDeDemo(usuario: string, rol: RolUsuario = rolDeDemo(usuario)): string {
  const nombre = usuario
    .split(/[._-]/)
    .filter(Boolean)
    .map((parte) => parte[0].toUpperCase() + parte.slice(1))
    .join(' ')
  const ahoraSeg = Math.floor(Date.now() / 1000)
  const claims = { sub: `usuario-${usuario}`, usuario, rol, nombre, iat: ahoraSeg, exp: ahoraSeg + 3600 }
  return `${base64url(JSON.stringify({ alg: 'none', typ: 'JWT' }))}.${base64url(JSON.stringify(claims))}.demo`
}

const RESUMEN_CANAL: Record<MutationContactarAsesorArgs['canal'], string> = {
  LLAMAR: 'llamada',
  CHAT: 'chat',
  AGENDAR: 'llamada agendada',
}

export const handlers = [
  graphql.mutation<{ iniciarSesion: ResultadoSesion }, MutationIniciarSesionArgs>('iniciarSesion', ({ variables }) => {
    const { usuario, clave } = variables.entrada
    // Mismo mensaje genérico que el BFF: no revela si el alias existe.
    if (clave === 'clave-erronea') {
      return HttpResponse.json({ data: { iniciarSesion: { mensaje: 'Usuario o clave incorrectos.' } } })
    }
    const rol = rolDeDemo(usuario)
    return HttpResponse.json({
      data: {
        iniciarSesion: {
          token: tokenDeDemo(usuario, rol),
          expiraEn: new Date(Date.now() + 3600_000).toISOString(),
          usuario: { id: `usuario-${usuario}`, usuario, rol, estado: 'ACTIVO', creadoEn: ahora() },
        },
      },
    })
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
            mensaje:
              'No pudimos consultar tu historial crediticio en este momento. Intenta de nuevo o habla con un asesor.',
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
          contactarAsesor: {
            canal: variables.canal,
            resumen: `Recibimos tu solicitud de ${RESUMEN_CANAL[variables.canal]}. Un asesor te contactará para continuar tu cotización.`,
          },
        },
      }),
  ),

  graphql.query<{ cobros: Cobro[] }, QueryCobrosArgs>('cobros', ({ variables }) =>
    HttpResponse.json({
      data: { cobros: variables.estado ? cobros.filter((c) => c.estado === variables.estado) : cobros },
    }),
  ),

  graphql.mutation<{ reintentarCobro: Cobro }, MutationReintentarCobroArgs>('reintentarCobro', ({ variables }) => {
    // Igual que el BFF (contrato v0.6): un RECHAZADO con reintentos se vuelve a cobrar (aquí siempre queda
    // COBRADO) y descuenta uno; sin reintentos, error para el usuario. Muta el cobro en el arreglo para que
    // una consulta `cobros` posterior vea el nuevo estado.
    const cobro = cobros.find((c) => c.id === variables.cobroId)
    if (!cobro) {
      return HttpResponse.json({ data: null, errors: [{ message: 'Cobro no encontrado.', path: ['reintentarCobro'] }] })
    }
    if (cobro.estado === 'RECHAZADO') {
      if (!cobro.reintentosRestantes) {
        return HttpResponse.json({
          data: null,
          errors: [
            {
              message: 'Se agotaron los 3 reintentos: el cobro requiere otro medio de pago.',
              path: ['reintentarCobro'],
            },
          ],
        })
      }
      cobro.reintentosRestantes -= 1
      cobro.estado = 'COBRADO'
      cobro.motivo = null
      cobro.idTransaccion = `pg-reintento-${cobro.id}`
      cobro.actualizadoEn = ahora()
    }
    return HttpResponse.json({ data: { reintentarCobro: cobro } })
  }),
]
