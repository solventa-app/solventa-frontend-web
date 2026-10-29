// Mock de `estadoSistema(ventana)` (contrato v0.22, HU-W07), para Vitest y `dev:mock`. Los pesos son los de
// contracts/salud.json del backend. Convenciones de demo, que NO son del backend real: PAYMENTS está degradado y el
// circuito de KYC medio abierto, para ver los tres colores; la ventana de 15 minutos viene sin tráfico.
import { HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'
import type { ColorSalud, EstadoSistema, QueryEstadoSistemaArgs, SaludMicro } from '../graphql/tipos'

const color = (porcentaje: number): ColorSalud => (porcentaje >= 90 ? 'VERDE' : porcentaje >= 70 ? 'AMARILLO' : 'ROJO')

function micro(nombre: string, peso: number, porcentaje: number, latencia: number, sinTrafico: boolean): SaludMicro {
  return {
    nombre,
    peso,
    porcentaje,
    color: color(porcentaje),
    responde: true,
    sinTrafico,
    disponibilidad: sinTrafico ? null : porcentaje >= 90 ? 99.9 : 97.4,
    latenciaMediaMs: sinTrafico ? null : latencia,
    latenciaP95Ms: sinTrafico ? null : Math.round(latencia * 2.1),
  }
}

export function estadoSistemaDeDemo(ventana = '1h'): EstadoSistema {
  const sinTrafico = ventana === '15m'
  const micros = [
    micro('bff', 20, 98, 120, sinTrafico),
    micro('auth', 15, 97, 64, sinTrafico),
    micro('acl-worker', 15, 95, 210, sinTrafico),
    micro('rating', 12, 99, 58, sinTrafico),
    micro('policy', 12, 96, 180, sinTrafico),
    micro('risk', 10, 98, 72, sinTrafico),
    micro('under', 6, 94, 240, sinTrafico),
    micro('payments', 6, 78, 520, sinTrafico),
    micro('consolidador-fuentes', 4, 100, 640, true),
  ]
  return {
    porcentaje: 96,
    color: 'VERDE',
    disponibilidad: sinTrafico ? null : 99.98,
    latenciaMediaMs: sinTrafico ? null : 48,
    ventana,
    calculadoEn: new Date().toISOString(),
    apis: [
      {
        nombre: 'COTIZACION',
        porcentaje: 97,
        color: 'VERDE',
        micros: ['bff', 'auth', 'acl-worker', 'risk', 'rating'],
        externas: [
          { nombre: 'open-finance', estado: 'CERRADO' },
          { nombre: 'open-data', estado: 'CERRADO' },
        ],
      },
      {
        nombre: 'EMISION',
        porcentaje: 84,
        color: 'AMARILLO',
        micros: ['bff', 'auth', 'policy', 'under', 'payments'],
        externas: [
          { nombre: 'firma', estado: 'CERRADO' },
          { nombre: 'kyc', estado: 'SEMIABIERTO' },
          { nombre: 'pasarela', estado: 'CERRADO' },
          { nombre: 'notificaciones', estado: 'CERRADO' },
        ],
      },
    ],
    micros,
  }
}

export const handlersEstadoSistema = [
  graphql
    .link('*')
    .query<{ estadoSistema: EstadoSistema }, QueryEstadoSistemaArgs>('estadoSistema', ({ variables }) =>
      HttpResponse.json({ data: { estadoSistema: estadoSistemaDeDemo(variables.ventana ?? '1h') } }),
    ),
]
