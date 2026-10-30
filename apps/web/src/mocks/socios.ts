// Mocks REST de la API de socios (HU-W07, `/v1`, contrato v0.22: contrato/socios-v1.json). Corren en Vitest y en
// `dev:mock` (regla 2). Convenciones de demo, que NO son del backend real:
//   - clave `clave-erronea` → 401 CREDENCIALES_INVALIDAS con el mensaje genérico;
//   - un ID de socio que empieza por `bloqueado` → 401 con el mensaje de bloqueo por intentos (intentosRestantes 0);
//   - un ID de socio que empieza por `agotado` → presupuesto de cotizaciones agotado (429 al cotizar);
//   - una clave que empieza por `sk_test` → token de PRUEBAS; cualquier otra → PRODUCCIÓN;
//   - la ventana de 15 minutos → «sin tráfico» (disponibilidad y latencia en null);
//   - cotizar con un documento terminado en `999` → oferta PRELIMINAR; otro → COMPLETA.
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

function error(
  status: number,
  codigo: Esquemas['ErrorPublico']['codigo'],
  mensaje: string,
  extra: Partial<Esquemas['ErrorPublico']> = {},
  cabeceras: Record<string, string> = {},
) {
  const cuerpo: Esquemas['ErrorPublico'] = { codigo, mensaje, puedeReintentar: false, ...extra }
  return HttpResponse.json(cuerpo, { status, headers: cabeceras })
}

const sinSesion = () => error(401, 'TOKEN_INVALIDO', MENSAJES_SOCIOS.sinSesion)

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

const clientIdDe = (socioId: string, entorno: Entorno) => (entorno === 'PRODUCCION' ? socioId : `${socioId}-pruebas`)
const socioDe = (clientId: string) => clientId.replace(/-pruebas$/, '')

function credencial(socioId: string, entorno: Entorno): Esquemas['Credencial'] {
  return {
    entorno,
    clientId: clientIdDe(socioId, entorno),
    clave: estado.claves[entorno],
    creadaEn: estado.creadas[entorno],
  }
}

function consumidasDe(socioId: string, entorno: Entorno): number {
  return socioId.startsWith('agotado') ? ASIGNADAS[entorno] : estado.consumidas[entorno]
}

const monto = (valor: string): Esquemas['Monto'] => ({ valor, moneda: 'COP' })
const ventanaDe = (url: URL): Ventana => {
  const v = url.searchParams.get('ventana')
  return v === '15m' || v === '24h' || v === '7d' ? v : '1h'
}

function diario(entorno: Entorno): Esquemas['Consumo']['diario'] {
  const base = entorno === 'PRODUCCION' ? 180 : 9
  return Array.from({ length: 14 }, (_, i) => ({
    fecha: new Date(Date.UTC(2026, 9, 16 + i)).toISOString().slice(0, 10),
    llamadas: Math.max(0, base + ((i * 37) % 41) - 20 - (i % 6 === 5 ? Math.round(base / 2) : 0)),
  }))
}

export const handlersSocios = [
  http.post('*/v1/token', async ({ request }) => {
    const { clientId = '', clave = '' } = ((await request.json()) ?? {}) as Partial<Esquemas['SolicitudToken']>
    if (clientId.startsWith('bloqueado')) {
      return error(401, 'CREDENCIALES_INVALIDAS', MENSAJES_SOCIOS.bloqueado, { intentosRestantes: 0 })
    }
    if (!clientId || !clave || clave === 'clave-erronea') {
      return error(401, 'CREDENCIALES_INVALIDAS', MENSAJES_SOCIOS.credenciales)
    }
    const entorno: Entorno = clave.startsWith('sk_test') ? 'PRUEBAS' : 'PRODUCCION'
    const respuesta: Esquemas['Token'] = {
      accessToken: tokenSocioDeDemo(socioDe(clientId), entorno),
      tokenType: 'Bearer',
      expiraEn: new Date(Date.now() + 900_000).toISOString(),
      entorno,
    }
    return HttpResponse.json(respuesta)
  }),

  http.get('*/v1/credenciales', ({ request }) => {
    const claims = claimsDe(request)
    if (!claims) return sinSesion()
    const respuesta: Esquemas['Credenciales'] = {
      socio: { id: claims.sub, nombre: NOMBRE_SOCIO_DEMO },
      credenciales: [credencial(claims.sub, 'PRODUCCION'), credencial(claims.sub, 'PRUEBAS')],
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
    return HttpResponse.json(credencial(claims.sub, entorno))
  }),

  // Del entorno del token, como en el contrato.
  http.get('*/v1/consumo', ({ request }) => {
    const claims = claimsDe(request)
    if (!claims) return sinSesion()
    const { entorno } = claims
    const consumidas = consumidasDe(claims.sub, entorno)
    const escala = entorno === 'PRODUCCION' ? 1 : 0.05
    const fila = (api: string, llamadas: number, errores: number, latencia: number) => ({
      api,
      llamadas: Math.round(llamadas * escala),
      errores: Math.round(errores * escala),
      latenciaMediaMs: latencia,
    })
    const respuesta: Esquemas['Consumo'] = {
      entorno,
      desde: '2026-09-30',
      hasta: '2026-10-29',
      presupuesto: { asignadas: ASIGNADAS[entorno], consumidas, restantes: ASIGNADAS[entorno] - consumidas },
      porApi: [
        fila('cotizaciones', 842, 9, 412),
        fila('consentimientos', 861, 4, 96),
        fila('propuestas', 214, 3, 188),
        fila('polizas', 389, 0, 71),
      ],
      diario: diario(entorno),
    }
    return HttpResponse.json(respuesta)
  }),

  http.get('*/v1/estado', ({ request }) => {
    if (!claimsDe(request)) return sinSesion()
    const ventana = ventanaDe(new URL(request.url))
    const sinTrafico = ventana === '15m'
    const respuesta: Esquemas['EstadoSistema'] = {
      porcentaje: 96,
      color: 'VERDE',
      disponibilidad: sinTrafico ? null : 99.98,
      latenciaMediaMs: sinTrafico ? null : 48,
      ventana,
      calculadoEn: new Date().toISOString(),
      apis: [
        { nombre: 'COTIZACION', porcentaje: 97, color: 'VERDE' },
        { nombre: 'EMISION', porcentaje: 84, color: 'AMARILLO' },
      ],
    }
    return HttpResponse.json(respuesta)
  }),

  // Del entorno del token; con uno de PRUEBAS el contrato responde datos simulados (aquí, los mismos).
  http.get('*/v1/ventas', ({ request }) => {
    if (!claimsDe(request)) return sinSesion()
    const mes = (m: string, propuestas: number, emitidas: number, primas: string, comision: string) => ({
      mes: m,
      propuestas,
      emitidas,
      primas: monto(primas),
      comision: monto(comision),
    })
    const respuesta: Esquemas['Ventas'] = {
      desde: '2025-11-01',
      hasta: '2026-10-29',
      tasaComision: '0.1000',
      meses: [
        mes('2026-08', 52, 31, '11240000', '1124000'),
        mes('2026-09', 61, 44, '17030000', '1703000'),
        mes('2026-10', 51, 51, '20380000', '2038000'),
      ],
      totales: { propuestas: 164, emitidas: 126, primas: monto('48650000'), comision: monto('4865000') },
    }
    return HttpResponse.json(respuesta)
  }),

  http.post('*/v1/consentimientos', async ({ request }) => {
    if (!claimsDe(request)) return sinSesion()
    const cuerpo = ((await request.json().catch(() => null)) ?? {}) as Partial<Esquemas['SolicitudConsentimiento']>
    const ahora = new Date()
    const respuesta: Esquemas['Consentimiento'] = {
      id: `consentimiento-${ahora.getTime()}`,
      finalidad: cuerpo.finalidad ?? 'cotizacion-seguro-vida-hipotecario',
      versionTexto: cuerpo.versionTexto ?? 'v1',
      otorgadoEn: ahora.toISOString(),
      venceEn: new Date(ahora.getTime() + 30 * 86_400_000).toISOString(),
      revocadoEn: null,
      vigente: true,
      estado: 'VIGENTE',
    }
    return HttpResponse.json(respuesta, { status: 201 })
  }),

  // Cotizar descuenta del presupuesto del entorno del token (W07-9).
  http.post('*/v1/cotizaciones', async ({ request }) => {
    const claims = claimsDe(request)
    if (!claims) return sinSesion()
    const restantes = ASIGNADAS[claims.entorno] - consumidasDe(claims.sub, claims.entorno)
    if (restantes <= 0) {
      return error(429, 'PRESUPUESTO_AGOTADO', MENSAJES_SOCIOS.presupuesto, {}, { 'Retry-After': '3600' })
    }
    const cuerpo = ((await request.json().catch(() => null)) ?? {}) as Partial<Esquemas['SolicitudCotizacion']>
    estado.consumidas[claims.entorno] += 1
    const preliminar = cuerpo.documentoIdentidad?.endsWith('999') ?? false
    const respuesta: Esquemas['Cotizacion'] = {
      oferta: {
        id: `oferta-socio-${estado.consumidas[claims.entorno]}`,
        tipo: preliminar ? 'PRELIMINAR' : 'COMPLETA',
        prima: preliminar ? null : monto('185000'),
        rangoPrima: preliminar ? { minima: monto('160000'), maxima: monto('230000') } : null,
        cobertura: monto('250000000'),
        nivelRiesgo: preliminar ? null : 'BAJO',
        fuentes: [
          { nombre: 'open-finance', estado: preliminar ? 'FALLO' : 'OK' },
          { nombre: 'open-data', estado: 'OK' },
        ],
      },
      presupuestoRestante: restantes - 1,
    }
    return HttpResponse.json(respuesta)
  }),
]
