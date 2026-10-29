// Mocks REST de la API de socios (HU-W07, `/v1`), según el borrador contrato/borrador-socios-v1.yaml. Corren en
// Vitest y en `dev:mock` (regla 2). Convenciones de demo, que NO son del backend real:
//   - clave `clave-erronea` → 401 con el mensaje genérico;
//   - un ID de socio que empieza por `bloqueado` → 423, bloqueo por intentos;
//   - un ID de socio que empieza por `agotado` → presupuesto de cotizaciones agotado (429 al cotizar);
//   - una clave que empieza por `sk_test` → token de PRUEBAS; cualquier otra → PRODUCCIÓN;
//   - la ventana de 15 minutos → «sin tráfico» (disponibilidad y latencia en null);
//   - cotizar con un documento terminado en `999` → oferta PRELIMINAR (como los mocks de W01); otro → COMPLETA.
import { http, HttpResponse } from 'msw'
import type { components } from '../api/tipos-socios'

type Esquemas = components['schemas']
type Entorno = Esquemas['Entorno']
type Ventana = Esquemas['Ventana']

export const NOMBRE_SOCIO_DEMO = 'Retail Fintech S.A.S.'
export const MENSAJES_SOCIOS = {
  credenciales: 'ID de socio o clave incorrectos.',
  bloqueado: 'Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.',
  sinSesion: 'Tu sesión técnica venció.',
  presupuesto: 'Presupuesto de cotizaciones agotado.',
} as const

const base64url = (texto: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(texto)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

/** JWT de demostración (sin firma real) con los claims del token de socio: sub, rol, entorno y exp de 15 min. */
export function tokenSocioDeDemo(socioId: string, entorno: Entorno, segundos = 900): string {
  const ahora = Math.floor(Date.now() / 1000)
  const claims = { sub: socioId, rol: 'SOCIO', entorno, iat: ahora, exp: ahora + segundos }
  return `${base64url(JSON.stringify({ alg: 'none', typ: 'JWT' }))}.${base64url(JSON.stringify(claims))}.demo`
}

function claimsDe(request: Request): { sub: string; entorno: Entorno } | null {
  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '')
  try {
    const payload = token?.split('.')[1]
    if (!payload) return null
    const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')))
    return claims.exp * 1000 > Date.now() ? claims : null
  } catch {
    return null
  }
}

const error = (status: number, codigo: string, mensaje: string, cabeceras: Record<string, string> = {}) =>
  HttpResponse.json({ codigo, mensaje }, { status, headers: cabeceras })

const sinSesion = () => error(401, 'NO_AUTORIZADO', MENSAJES_SOCIOS.sinSesion)

// Estado mutable (rotar claves y cotizar lo cambian); `restablecerSociosDePrueba` lo deja como al cargar.
interface EstadoMock {
  claves: Record<Entorno, string>
  creadas: Record<Entorno, string>
  consumidas: Record<Entorno, number>
}
const ASIGNADAS: Record<Entorno, number> = { PRODUCCION: 1000, PRUEBAS: 500 }
let rotaciones = 0

function estadoInicial(): EstadoMock {
  return {
    claves: { PRODUCCION: 'sk_live_9f2c41d7e8a05b36c1f4', PRUEBAS: 'sk_test_3b8e0a62d19c74f5e2a7' },
    creadas: { PRODUCCION: '2026-10-01T15:00:00Z', PRUEBAS: '2026-10-01T15:00:00Z' },
    consumidas: { PRODUCCION: 842, PRUEBAS: 37 },
  }
}
let estado = estadoInicial()

/** Solo para pruebas: devuelve el estado de los mocks a su valor inicial. */
export function restablecerSociosDePrueba(): void {
  estado = estadoInicial()
  rotaciones = 0
}

const entornoDe = (url: URL, porDefecto: Entorno): Entorno =>
  url.searchParams.get('entorno') === 'PRUEBAS'
    ? 'PRUEBAS'
    : url.searchParams.get('entorno')
      ? 'PRODUCCION'
      : porDefecto

const ventanaDe = (url: URL): Ventana => {
  const v = url.searchParams.get('ventana')
  return v === '15m' || v === '24h' || v === '7d' ? v : '1h'
}

function consumidasDe(socioId: string, entorno: Entorno): number {
  return socioId.startsWith('agotado') ? ASIGNADAS[entorno] : estado.consumidas[entorno]
}

function cotizacionesPorDia(entorno: Entorno): Esquemas['ConteoDia'][] {
  const base = entorno === 'PRODUCCION' ? 52 : 3
  return Array.from({ length: 14 }, (_, i) => {
    const fecha = new Date(Date.UTC(2026, 9, 16 + i))
    return {
      fecha: fecha.toISOString().slice(0, 10),
      cantidad: base + ((i * 7) % 11) - 5 + (i % 6 === 5 ? -base / 2 : 0),
    }
  })
}

const monto = (valor: string): Esquemas['Monto'] => ({ valor, moneda: 'COP' })

export const handlersSocios = [
  http.post('*/v1/token', async ({ request }) => {
    const { socioId = '', clave = '' } = ((await request.json()) ?? {}) as Partial<Esquemas['SolicitudToken']>
    if (socioId.startsWith('bloqueado'))
      return error(423, 'BLOQUEADO', MENSAJES_SOCIOS.bloqueado, { 'Retry-After': '900' })
    if (!socioId || !clave || clave === 'clave-erronea')
      return error(401, 'NO_AUTORIZADO', MENSAJES_SOCIOS.credenciales)
    const entorno: Entorno = clave.startsWith('sk_test') ? 'PRUEBAS' : 'PRODUCCION'
    const respuesta: Esquemas['Token'] = {
      token: tokenSocioDeDemo(socioId, entorno),
      tipo: 'Bearer',
      expiraEn: new Date(Date.now() + 900_000).toISOString(),
      entorno,
      socio: { id: socioId, nombre: NOMBRE_SOCIO_DEMO },
    }
    return HttpResponse.json(respuesta)
  }),

  http.get('*/v1/credenciales', ({ request }) => {
    const claims = claimsDe(request)
    if (!claims) return sinSesion()
    const credencial = (entorno: Entorno): Esquemas['Credencial'] => ({
      entorno,
      socioId: entorno === 'PRODUCCION' ? claims.sub : `${claims.sub}-pruebas`,
      clave: estado.claves[entorno],
      creadaEn: estado.creadas[entorno],
    })
    const respuesta: Esquemas['Credenciales'] = {
      socio: { id: claims.sub, nombre: NOMBRE_SOCIO_DEMO },
      entornos: [credencial('PRODUCCION'), credencial('PRUEBAS')],
    }
    return HttpResponse.json(respuesta)
  }),

  http.post('*/v1/credenciales/:entorno/rotar', ({ request, params }) => {
    const claims = claimsDe(request)
    if (!claims) return sinSesion()
    const entorno: Entorno = params.entorno === 'PRUEBAS' ? 'PRUEBAS' : 'PRODUCCION'
    rotaciones += 1
    const prefijo = entorno === 'PRODUCCION' ? 'sk_live_' : 'sk_test_'
    estado.claves[entorno] = `${prefijo}${(0x5a17c0de + rotaciones * 7919).toString(16)}e4d2b9a1c7f3`
    estado.creadas[entorno] = new Date().toISOString()
    const respuesta: Esquemas['Credencial'] = {
      entorno,
      socioId: entorno === 'PRODUCCION' ? claims.sub : `${claims.sub}-pruebas`,
      clave: estado.claves[entorno],
      creadaEn: estado.creadas[entorno],
    }
    return HttpResponse.json(respuesta)
  }),

  http.get('*/v1/consumo', ({ request }) => {
    const claims = claimsDe(request)
    if (!claims) return sinSesion()
    const url = new URL(request.url)
    const entorno = entornoDe(url, claims.entorno)
    const consumidas = consumidasDe(claims.sub, entorno)
    const escala = entorno === 'PRODUCCION' ? 1 : 0.05
    const fila = (api: Esquemas['ConsumoApi']['api'], llamadas: number, errores: number, latencia: number) => ({
      api,
      llamadas: Math.round(llamadas * escala),
      exitosas: Math.round((llamadas - errores) * escala),
      conError: Math.round(errores * escala),
      latenciaMediaMs: latencia,
    })
    const respuesta: Esquemas['Consumo'] = {
      entorno,
      ventana: ventanaDe(url),
      presupuesto: { asignadas: ASIGNADAS[entorno], consumidas, restantes: ASIGNADAS[entorno] - consumidas },
      porApi: [
        fila('cotizaciones', 842, 9, 412),
        fila('consentimientos', 861, 4, 96),
        fila('propuestas', 214, 3, 188),
        fila('firma', 176, 2, 264),
        fila('polizas', 389, 0, 71),
      ],
      cotizacionesPorDia: cotizacionesPorDia(entorno),
    }
    return HttpResponse.json(respuesta)
  }),

  http.get('*/v1/estado', ({ request }) => {
    if (!claimsDe(request)) return sinSesion()
    const ventana = ventanaDe(new URL(request.url))
    const sinTrafico = ventana === '15m'
    const respuesta: Esquemas['Estado'] = {
      general: {
        porcentaje: 96.4,
        color: 'VERDE',
        disponibilidad: sinTrafico ? null : 99.98,
        latenciaMediaMs: sinTrafico ? null : 48,
        ventana,
      },
      apis: [
        { api: 'COTIZACION', porcentaje: 97.1, color: 'VERDE' },
        { api: 'EMISION', porcentaje: 84.5, color: 'AMARILLO' },
      ],
      verificadoEn: new Date().toISOString(),
    }
    return HttpResponse.json(respuesta)
  }),

  http.get('*/v1/ventas', ({ request }) => {
    const claims = claimsDe(request)
    if (!claims) return sinSesion()
    const entorno = entornoDe(new URL(request.url), claims.entorno)
    const respuesta: Esquemas['Ventas'] = {
      entorno,
      simulado: entorno === 'PRUEBAS',
      propuestasPorEstado: [
        { estado: 'ACEPTADA', cantidad: 18 },
        { estado: 'EN_FIRMA', cantidad: 9 },
        { estado: 'PENDIENTE_PAGO', cantidad: 4 },
        { estado: 'EMITIDA', cantidad: 126 },
        { estado: 'NO_EMITIDA', cantidad: 7 },
      ],
      polizasEmitidas: 126,
      conversion: 0.1497,
      primasCobradas: monto('48650000'),
      comisionCausada: monto('4865000'),
      porMes: [
        { mes: '2026-08', polizasEmitidas: 31, primasCobradas: monto('11240000'), comisionCausada: monto('1124000') },
        { mes: '2026-09', polizasEmitidas: 44, primasCobradas: monto('17030000'), comisionCausada: monto('1703000') },
        { mes: '2026-10', polizasEmitidas: 51, primasCobradas: monto('20380000'), comisionCausada: monto('2038000') },
      ],
    }
    return HttpResponse.json(respuesta)
  }),

  // Cotizar descuenta del presupuesto del entorno del token (W07-9); el resto del flujo llega con W07-03.
  http.post('*/v1/cotizaciones', async ({ request }) => {
    const claims = claimsDe(request)
    if (!claims) return sinSesion()
    const restantes = ASIGNADAS[claims.entorno] - consumidasDe(claims.sub, claims.entorno)
    if (restantes <= 0) {
      return error(429, 'PRESUPUESTO_AGOTADO', MENSAJES_SOCIOS.presupuesto, { 'Retry-After': '3600' })
    }
    const cuerpo = ((await request.json().catch(() => null)) ?? {}) as Partial<Esquemas['SolicitudCotizacion']>
    estado.consumidas[claims.entorno] += 1
    const respuesta: Esquemas['Cotizacion'] = {
      oferta: {
        id: `oferta-socio-${estado.consumidas[claims.entorno]}`,
        tipo: cuerpo.documentoIdentidad?.endsWith('999') ? 'PRELIMINAR' : 'COMPLETA',
        prima: monto('185000'),
        cobertura: monto('250000000'),
        venceEn: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      },
      restantes: restantes - 1,
    }
    return HttpResponse.json(respuesta)
  }),
]
