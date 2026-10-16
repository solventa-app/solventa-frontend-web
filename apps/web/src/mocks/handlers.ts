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
  QueryCobrosArgs,
  ResultadoOferta,
} from '../graphql/tipos'

// Mocks del BFF (contrato/schema.graphql). Convención de demo (equivale a los "disparadores de demo"
// del prototipo): un documentoIdentidad que termina en 999 devuelve oferta PRELIMINAR (fuente lenta,
// CA-W01-04) y uno que termina en 000 devuelve ERROR con reintento (CA-W01-05). Es una convención de
// los mocks, NO del backend real.

const ahora = () => new Date().toISOString()

const fuentes = (degradada: boolean): FuenteConsultada[] => [
  { id: 'of-1', nombre: 'Cuentas y saldos', origen: 'OPEN_FINANCE', estado: 'OK' },
  { id: 'of-2', nombre: 'Historial crediticio', origen: 'OPEN_FINANCE', estado: degradada ? 'CACHE' : 'OK', capturadoEn: degradada ? ahora() : null },
  { id: 'od-1', nombre: 'Catastro', origen: 'OPEN_DATA', estado: 'OK' },
  { id: 'od-2', nombre: 'Registro de propiedad', origen: 'OPEN_DATA', estado: 'OK' },
  { id: 'od-3', nombre: 'Indicadores de la zona', origen: 'OPEN_DATA', estado: degradada ? 'FALLO' : 'OK' },
]

const oferta = (tipo: Oferta['tipo']): Oferta => ({
  id: `oferta-${tipo.toLowerCase()}`,
  tipo,
  prima: tipo === 'COMPLETA' ? { valor: '48500.00', moneda: 'COP' } : null,
  rangoPrima: tipo === 'PRELIMINAR' ? { minima: { valor: '42000.00', moneda: 'COP' }, maxima: { valor: '56000.00', moneda: 'COP' } } : null,
  cobertura: { valor: '250000000.00', moneda: 'COP' },
  desgloseScore: [
    { nombre: 'Ingresos', peso: 0.4 },
    { nombre: 'Historial crediticio', peso: 0.35 },
    { nombre: 'Zona del inmueble', peso: 0.25 },
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

// 4 cobros (HU-W05), uno por cada EstadoCobro, con los mismos nombres/montos/fechas que el
// prototipo de alta fidelidad (Figma 2vfK0e8t62OvvDk4c7QnK5, frame W05-01, nodo 27:44) para que
// la pantalla se vea exactamente igual a la maqueta. idTransaccion es null para el cobro en
// COBRANDO: la pasarela todavía no asigna id mientras el cobro está en curso (ver Cobro en
// contrato/schema.graphql). cliente e idTransaccion son campos nuevos, adelantados en el
// frontend antes de que el backend los exponga de verdad (ver contrato/CHANGELOG.md).
// cobros es mutable (reintentarCobro lo actualiza en el sitio, ver más abajo) para que el estado
// persista entre pantallas durante una sesión de demo. Por eso es `let` + fábrica en vez de
// const: las pruebas necesitan poder reiniciarlo con restablecerCobrosDePrueba para no arrastrar
// mutaciones de una prueba a la siguiente.
const cobrosIniciales = (): Cobro[] => [
  {
    id: 'cobro-1',
    cliente: 'Andrés Felipe Duarte',
    polizaId: 'SOL-VH-2026-004905',
    estado: 'COBRANDO',
    monto: { valor: '198000.00', moneda: 'COP' },
    idTransaccion: null,
    actualizadoEn: '2026-09-05T15:00:00Z',
  },
  {
    id: 'cobro-2',
    cliente: 'Laura Gómez Rico',
    polizaId: 'SOL-VH-2026-004821',
    estado: 'COBRADO',
    monto: { valor: '185000.00', moneda: 'COP' },
    idTransaccion: 'txn_8a2f19c3',
    actualizadoEn: '2026-09-05T14:14:00Z',
  },
  {
    id: 'cobro-3',
    cliente: 'Julián Torres Mesa',
    polizaId: 'SOL-VH-2026-004798',
    estado: 'RECHAZADO',
    monto: { valor: '142500.00', moneda: 'COP' },
    idTransaccion: 'txn_5b0e77d1',
    actualizadoEn: '2026-09-04T23:02:00Z',
  },
  {
    id: 'cobro-4',
    cliente: 'Carlos Andrés Peña',
    polizaId: 'SOL-VH-2026-004790',
    estado: 'PENDIENTE',
    monto: { valor: '210000.00', moneda: 'COP' },
    idTransaccion: 'txn_c91a4402',
    actualizadoEn: '2026-09-04T16:47:00Z',
  },
]

let cobros: Cobro[] = cobrosIniciales()

/** Solo para pruebas: reinicia el estado mutable de `cobros` entre casos de prueba. */
export function restablecerCobrosDePrueba(): void {
  cobros = cobrosIniciales()
}

export const handlers = [
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
        ? { mensaje: 'No pudimos calcular tu oferta en este momento.', puedeReintentar: true }
        : oferta(documento.endsWith('999') ? 'PRELIMINAR' : 'COMPLETA')
      return HttpResponse.json({ data: { solicitarOferta: resultado } })
    },
  ),

  graphql.mutation<{ contactarAsesor: ConfirmacionContacto }, MutationContactarAsesorArgs>(
    'contactarAsesor',
    ({ variables }) =>
      HttpResponse.json({
        data: { contactarAsesor: { canal: variables.canal, resumen: 'Un asesor te contactará con el resumen de tu trámite.' } },
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
      // Muta el cobro en el arreglo (no una copia): así una consulta `cobros` posterior (p. ej. al
      // volver a entrar a la pantalla) ve el nuevo estado en vez de revertirlo al original.
      const cobro = cobros.find((c) => c.id === variables.cobroId) ?? cobros[1]
      cobro.estado = 'COBRANDO'
      cobro.idTransaccion = null // la pasarela aun no asigna id mientras el cobro esta en curso
      cobro.actualizadoEn = ahora()
      return HttpResponse.json({ data: { reintentarCobro: cobro } })
    },
  ),
]
