import type { ErrorEvent, Breadcrumb } from '@sentry/vue'

/**
 * Campos sensibles que nunca deben viajar a Sentry (docs/plan-sentry.md §0 y §2.3).
 */
const CAMPOS_SENSIBLES = new Set([
  'documento',
  'cedula',
  'nombre',
  'correo',
  'email',
  'telefono',
  'celular',
  'direccion',
  'token',
  'password',
  'contrasena',
  'tarjeta',
  'cvv',
  'iban',
  'authorization',
  'cookie',
  'set-cookie',
])

const REGEX_NUMEROS_LARGOS = /\b\d{6,}\b/g
const REGEX_CORREO = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const REGEX_JWT = /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g

function esClaveSensible(clave: string): boolean {
  const k = clave.toLowerCase()
  if (CAMPOS_SENSIBLES.has(k)) return true
  for (const campo of CAMPOS_SENSIBLES) {
    if (k.includes(campo)) return true
  }
  return false
}

export function limpiarTexto(valor: string): string {
  return valor.replace(REGEX_JWT, '[token]').replace(REGEX_CORREO, '[correo]').replace(REGEX_NUMEROS_LARGOS, '[número]')
}

export function limpiarObjeto<T>(valor: T): T {
  if (typeof valor === 'string') {
    return limpiarTexto(valor) as unknown as T
  }
  if (Array.isArray(valor)) {
    return valor.map((item) => limpiarObjeto(item)) as unknown as T
  }
  if (valor !== null && typeof valor === 'object') {
    const salida: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(valor as Record<string, unknown>)) {
      salida[k] = esClaveSensible(k) ? '[filtrado]' : limpiarObjeto(v)
    }
    return salida as T
  }
  return valor
}

function limpiarQuery(query: string): string {
  return query
    .split('&')
    .map((par) => {
      const idx = par.indexOf('=')
      if (idx < 0) return limpiarTexto(par)
      const k = par.slice(0, idx)
      const v = par.slice(idx + 1)
      return esClaveSensible(k) ? `${k}=[filtrado]` : `${k}=${limpiarTexto(v)}`
    })
    .join('&')
}

function limpiarUrl(url: string): string {
  const idx = url.indexOf('?')
  if (idx < 0) return limpiarTexto(url)
  return `${limpiarTexto(url.slice(0, idx))}?${limpiarQuery(url.slice(idx + 1))}`
}

/**
 * Callback `beforeSend` de Sentry para limpiar URL, query, cuerpo, cabeceras,
 * `extra` y breadcrumbs antes de enviar cualquier evento.
 */
export function limpiar(event: ErrorEvent): ErrorEvent | null {
  if (event.request) {
    const req = { ...event.request }
    if (typeof req.url === 'string') req.url = limpiarUrl(req.url)
    if (typeof req.query_string === 'string') {
      req.query_string = limpiarQuery(req.query_string)
    } else if (req.query_string && typeof req.query_string === 'object') {
      req.query_string = limpiarObjeto(req.query_string)
    }
    if (req.headers) req.headers = limpiarObjeto(req.headers)
    if (req.data !== undefined) req.data = limpiarObjeto(req.data)
    if (req.cookies) req.cookies = { '[filtrado]': '[filtrado]' }
    event.request = req
  }

  if (event.extra) {
    event.extra = limpiarObjeto(event.extra)
  }

  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs.map((b: Breadcrumb) => ({
      ...b,
      message: typeof b.message === 'string' ? limpiarTexto(b.message) : b.message,
      data: b.data ? limpiarObjeto(b.data) : b.data,
    }))
  }

  if (typeof event.message === 'string') {
    event.message = limpiarTexto(event.message)
  }

  return event
}
