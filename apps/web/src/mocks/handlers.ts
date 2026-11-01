import { HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'
import { leerClaims } from '../composables/useSesion'
import { LISTA_JURISDICCIONES } from '../utils/jurisdicciones'
import type { Cobro } from '../graphql/tipos'
import type {
  ConfirmacionContacto,
  Consentimiento,
  FuenteConsultada,
  MutationContactarAsesorArgs,
  MutationIniciarSesionArgs,
  MutationRegistrarConsentimientoArgs,
  MutationReintentarCobroArgs,
  MutationRevocarConsentimientoArgs,
  MutationSolicitarOfertaArgs,
  Jurisdiccion as JurisdiccionBff,
  Monto,
  Oferta,
  QueryCobrosArgs,
  QueryConvertirMontosArgs,
  ResultadoOferta,
  ResultadoSesion,
  RolUsuario,
  Usuario,
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

const enTreintaDias = () => new Date(Date.now() + 30 * 86_400_000).toISOString()

/** También lo usa el mock de suscripción (HU-W03) para `oferta(id)` y la prima de la propuesta. */
export const ofertaDeDemo = (tipo: Oferta['tipo']): Oferta => ({
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
  perfilRiesgo: {
    score: tipo === 'PRELIMINAR' ? 680 : 780,
    nivelRiesgo: tipo === 'PRELIMINAR' ? 'MEDIO' : 'BAJO',
    fechaVigencia: enTreintaDias(),
  },
})

const consentimiento = (revocado: boolean): Consentimiento => ({
  id: 'consentimiento-1',
  finalidad: 'perfilamiento',
  versionTexto: 'v1',
  otorgadoEn: ahora(),
  revocadoEn: revocado ? ahora() : null,
  venceEn: enTreintaDias(),
  vigente: !revocado,
  estado: revocado ? 'REVOCADO' : 'VIGENTE',
})

// 4 cobros (HU-W05), uno por cada EstadoCobro, con los nombres, montos y fechas del frame W05-01 de
// Figma, con la forma del BFF (contrato v0.6): `idTransaccion` (null mientras no hay cobro hecho) y
// `reintentosRestantes` (un RECHAZADO se reintenta a mano hasta 3 veces). `cobros` es mutable (reintentarCobro lo actualiza en el sitio) para que el estado persista
// durante una demo; las pruebas lo reinician con restablecerCobrosDePrueba.
// W05-A5 (borrador de la v0.17): cada cobro trae su `origen` y la marca y el tipo del `medio` (nunca dígitos). El
// pendiente es «En línea»: se concilia, no se reintenta.
const cobrosIniciales = (): Cobro[] => [
  {
    id: 'cobro-1',
    cliente: { id: 'cliente-1', nombre: 'Andrés Felipe Duarte' },
    polizaId: 'SOL-VH-2026-004905',
    origen: 'RECURRENTE',
    medio: null,
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
    origen: 'INTERACTIVO',
    medio: { marca: 'Visa', tipo: 'CREDITO' },
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
    origen: 'RECURRENTE',
    medio: { marca: 'Mastercard', tipo: 'DEBITO' },
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
    origen: 'INTERACTIVO',
    medio: { marca: 'Visa', tipo: 'CREDITO' },
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

// El nombre no va en el token (contrato v0.7): lo devuelven `iniciarSesion` y `yo`. Se deriva del alias.
export function nombreDeDemo(usuario: string): string {
  return usuario
    .split(/[._-]/)
    .filter(Boolean)
    .map((parte) => parte[0].toUpperCase() + parte.slice(1))
    .join(' ')
}

export function tokenDeDemo(usuario: string, rol: RolUsuario = rolDeDemo(usuario)): string {
  const ahoraSeg = Math.floor(Date.now() / 1000)
  const claims = { sub: `usuario-${usuario}`, usuario, rol, iat: ahoraSeg, exp: ahoraSeg + 3600 }
  return `${base64url(JSON.stringify({ alg: 'none', typ: 'JWT' }))}.${base64url(JSON.stringify(claims))}.demo`
}

// Forma de `Usuario` que devuelven `iniciarSesion` y `yo` (contrato v0.16: idioma, moneda y tieneContacto).
function usuarioDeDemo(usuario: string, rol: RolUsuario): Usuario {
  return {
    id: `usuario-${usuario}`,
    usuario,
    rol,
    estado: 'ACTIVO',
    creadoEn: ahora(),
    nombre: nombreDeDemo(usuario),
    idioma: 'ES',
    moneda: 'COP',
    tieneContacto: rol === 'CLIENTE',
  }
}

const RESUMEN_CANAL: Record<MutationContactarAsesorArgs['canal'], string> = {
  LLAMAR: 'llamada',
  CHAT: 'chat',
  AGENDAR: 'llamada agendada',
}

// MSW 3 quitó graphql.query y graphql.mutation: se cuelgan de un enlace. '*' conserva lo de antes (cualquier endpoint).
const bff = graphql.link('*')

// Tasas de demostración: pesos colombianos por unidad, como la tabla del ACL Worker.
const COP_POR_UNIDAD: Record<string, number> = { COP: 1, USD: 4100, EUR: 4450, MXN: 225, BRL: 750, CLP: 4.4, PEN: 1100 }

// Quién tiene «la cookie» en los mocks (T22).
let ultimoUsuarioDemo: string | null = null

export const handlers = [
  bff.mutation<{ iniciarSesion: ResultadoSesion }, MutationIniciarSesionArgs>('iniciarSesion', ({ variables }) => {
    const { usuario, clave } = variables.entrada
    // Mismo mensaje genérico que el BFF: no revela si el alias existe.
    if (clave === 'clave-erronea') {
      return HttpResponse.json({ data: { iniciarSesion: { mensaje: 'Usuario o clave incorrectos.' } } })
    }
    const rol = rolDeDemo(usuario)
    ultimoUsuarioDemo = usuario
    return HttpResponse.json({
      data: {
        iniciarSesion: {
          token: tokenDeDemo(usuario, rol),
          expiraEn: new Date(Date.now() + 3600_000).toISOString(),
          // T22: la web no recibe el refresh (viaja en una cookie httpOnly); solo cuándo vence.
          refreshExpiraEn: new Date(Date.now() + 8 * 24 * 3600_000).toISOString(),
          usuario: usuarioDeDemo(usuario, rol),
        },
      },
    })
  }),

  // T22: con los mocks no hay cookie que leer; renueva el último usuario que inició sesión.
  bff.mutation<{ renovarSesion: ResultadoSesion }>('renovarSesion', () => {
    const usuario = ultimoUsuarioDemo
    if (!usuario) {
      return HttpResponse.json({
        data: {
          renovarSesion: { mensaje: 'Tu sesión ya no es válida. Inicia sesión de nuevo.', codigo: 'SESION_VENCIDA' },
        },
      })
    }
    const rol = rolDeDemo(usuario)
    return HttpResponse.json({
      data: {
        renovarSesion: {
          token: tokenDeDemo(usuario, rol),
          expiraEn: new Date(Date.now() + 3600_000).toISOString(),
          refreshExpiraEn: new Date(Date.now() + 8 * 24 * 3600_000).toISOString(),
          usuario: usuarioDeDemo(usuario, rol),
        },
      },
    })
  }),

  bff.mutation<{ cerrarSesion: boolean }>('cerrarSesion', () => {
    ultimoUsuarioDemo = null
    return HttpResponse.json({ data: { cerrarSesion: true } })
  }),

  bff.query<{ convertirMontos: Monto[] }, QueryConvertirMontosArgs>('convertirMontos', ({ variables }) => {
    const montos = [variables.montos].flat().map(({ valor, moneda }) => ({
      valor: ((Number(valor) * COP_POR_UNIDAD[moneda]) / COP_POR_UNIDAD[variables.moneda]).toFixed(2),
      moneda: variables.moneda,
    }))
    return HttpResponse.json({ data: { convertirMontos: montos } })
  }),

  // T18: límites por país (mismo catálogo que el contrato).
  bff.query<{ jurisdicciones: JurisdiccionBff[] }>('jurisdicciones', () =>
    HttpResponse.json({
      data: {
        jurisdicciones: LISTA_JURISDICCIONES.map((j) => ({
          codigo: j.codigo,
          nombre: j.nombre,
          moneda: j.moneda,
          tipoDocumento: j.tipo_documento,
          plazoMin: j.plazo_min,
          plazoMax: j.plazo_max,
        })),
      },
    }),
  ),

  bff.mutation('actualizarPreferencias', () =>
    HttpResponse.json({ data: { actualizarPreferencias: { __typename: 'Usuario' } } }),
  ),

  bff.query<{ yo: Usuario | null }>('yo', ({ request }) => {
    const token = request.headers.get('Authorization')?.replace(/^Bearer /, '')
    const claims = token ? leerClaims(token) : null
    if (!claims) return HttpResponse.json({ errors: [{ message: 'Debes iniciar sesión.' }] })
    return HttpResponse.json({
      data: { yo: usuarioDeDemo(claims.usuario, claims.rol) },
    })
  }),

  bff.mutation<{ registrarConsentimiento: Consentimiento }, MutationRegistrarConsentimientoArgs>(
    'registrarConsentimiento',
    () => HttpResponse.json({ data: { registrarConsentimiento: consentimiento(false) } }),
  ),

  bff.mutation<{ revocarConsentimiento: Consentimiento }, MutationRevocarConsentimientoArgs>(
    'revocarConsentimiento',
    () => HttpResponse.json({ data: { revocarConsentimiento: consentimiento(true) } }),
  ),

  bff.mutation<{ solicitarOferta: ResultadoOferta }, MutationSolicitarOfertaArgs>(
    'solicitarOferta',
    ({ variables }) => {
      const { consentimientoId, documentoIdentidad } = variables.entrada
      const documento = documentoIdentidad ?? ''
      const resultado: ResultadoOferta =
        consentimientoId === 'con-vencido' || documento.endsWith('998')
          ? {
              mensaje: 'Tu autorización venció o fue revocada. Autoriza de nuevo para continuar.',
              puedeReintentar: false,
              motivo: 'CONSENTIMIENTO_NO_VIGENTE',
            }
          : documento.endsWith('000')
            ? // Mismo mensaje que el BFF cuando no llega el historial crediticio (CA-W01-05).
              {
                mensaje:
                  'No pudimos consultar tu historial crediticio en este momento. Intenta de nuevo o habla con un asesor.',
                puedeReintentar: true,
                motivo: 'DATOS_INSUFICIENTES',
              }
            : ofertaDeDemo(documento.endsWith('999') ? 'PRELIMINAR' : 'COMPLETA')
      return HttpResponse.json({ data: { solicitarOferta: resultado } })
    },
  ),

  bff.mutation<{ contactarAsesor: ConfirmacionContacto }, MutationContactarAsesorArgs>(
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

  // Sin stream en los mocks: W05-01 sigue con lo que cargó.
  bff.mutation('ticketAvisos', () => HttpResponse.json({ errors: [{ message: 'Sin avisos en los mocks.' }] })),

  bff.query<{ cobros: Cobro[] }, QueryCobrosArgs>('cobros', ({ variables }) => {
    let filtrados = variables.estado ? cobros.filter((c) => c.estado === variables.estado) : cobros
    if (variables.pagina && variables.tamano && variables.pagina > 0 && variables.tamano > 0) {
      const inicio = (variables.pagina - 1) * variables.tamano
      filtrados = filtrados.slice(inicio, inicio + variables.tamano)
    }
    return HttpResponse.json({
      data: { cobros: filtrados },
    })
  }),

  bff.mutation<{ reintentarCobro: Cobro }, MutationReintentarCobroArgs>('reintentarCobro', ({ variables }) => {
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
