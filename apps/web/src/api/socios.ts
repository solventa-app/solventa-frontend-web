// Cliente REST de la API de socios (HU-W07, `/v1`). Sin librería, como graphql/cliente.ts: `fetch` con el token del
// socio, `Accept-Language` y los tipos generados del contrato (hoy el borrador contrato/borrador-socios-v1.yaml →
// tipos-socios.ts). Nunca deja salir un error técnico ni un 5xx (regla 5): cada fallo llega como `ErrorSocios` con un
// código estable y un mensaje para el usuario.
import { cabeceraIdioma, t } from '../i18n'
import type { components } from './tipos-socios'

type Esquemas = components['schemas']
export type Entorno = Esquemas['Entorno']
export type Ventana = Esquemas['Ventana']
export type Token = Esquemas['Token']
export type Credenciales = Esquemas['Credenciales']
export type Credencial = Esquemas['Credencial']
export type Consumo = Esquemas['Consumo']
export type Estado = Esquemas['Estado']
export type Ventas = Esquemas['Ventas']

/** Qué salió mal, sin depender del texto del mensaje. */
export type CodigoErrorSocios =
  'NO_AUTORIZADO' | 'BLOQUEADO' | 'NO_ENCONTRADO' | 'PRESUPUESTO_AGOTADO' | 'SERVICIO_LENTO' | 'ERROR'

export class ErrorSocios extends Error {
  constructor(
    mensaje: string,
    readonly codigo: CodigoErrorSocios,
  ) {
    super(mensaje)
  }
}

const CODIGOS: Record<number, CodigoErrorSocios> = {
  401: 'NO_AUTORIZADO',
  404: 'NO_ENCONTRADO',
  423: 'BLOQUEADO',
  429: 'PRESUPUESTO_AGOTADO',
}

async function mensajeDelBackend(respuesta: Response): Promise<string | null> {
  try {
    const cuerpo = (await respuesta.json()) as Partial<Esquemas['ErrorPublico']>
    return cuerpo.mensaje?.trim() || null
  } catch {
    return null
  }
}

interface OpcionesLlamada {
  cuerpo?: unknown
  token?: string | null
  fetchFn?: typeof fetch
}

export async function llamarApiSocios<T>(metodo: 'GET' | 'POST', ruta: string, opciones: OpcionesLlamada = {}) {
  const { cuerpo, token, fetchFn = fetch } = opciones
  const cabeceras: Record<string, string> = { 'Accept-Language': cabeceraIdioma() }
  if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json'
  if (token) cabeceras.Authorization = `Bearer ${token}`

  let respuesta: Response
  try {
    respuesta = await fetchFn(`/v1${ruta}`, {
      method: metodo,
      headers: cabeceras,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    })
  } catch {
    throw new ErrorSocios(t('socios.error.generico'), 'ERROR')
  }

  if (respuesta.ok) return (await respuesta.json()) as T
  if (respuesta.status >= 500) {
    // 502/503/504 son del gateway (reintentable); cualquier otro 5xx tampoco se muestra tal cual.
    const lento = [502, 503, 504].includes(respuesta.status)
    throw new ErrorSocios(
      t(lento ? 'comun.servicioLento' : 'socios.error.generico'),
      lento ? 'SERVICIO_LENTO' : 'ERROR',
    )
  }
  const codigo = CODIGOS[respuesta.status] ?? 'ERROR'
  // El presupuesto agotado tiene su texto fijo en el portal; los demás 4xx traen el mensaje del backend.
  if (codigo === 'PRESUPUESTO_AGOTADO') throw new ErrorSocios(t('socios.error.presupuesto'), codigo)
  throw new ErrorSocios((await mensajeDelBackend(respuesta)) ?? t('socios.error.generico'), codigo)
}

export const pedirToken = (socioId: string, clave: string, fetchFn?: typeof fetch) =>
  llamarApiSocios<Token>('POST', '/token', { cuerpo: { socioId, clave }, fetchFn })

export const obtenerCredenciales = (token: string, fetchFn?: typeof fetch) =>
  llamarApiSocios<Credenciales>('GET', '/credenciales', { token, fetchFn })

export const rotarCredencial = (token: string, entorno: Entorno, fetchFn?: typeof fetch) =>
  llamarApiSocios<Credencial>('POST', `/credenciales/${entorno}/rotar`, { token, fetchFn })

export const obtenerConsumo = (token: string, entorno: Entorno, ventana: Ventana, fetchFn?: typeof fetch) =>
  llamarApiSocios<Consumo>('GET', `/consumo?entorno=${entorno}&ventana=${ventana}`, { token, fetchFn })

export const obtenerEstado = (token: string, ventana: Ventana, fetchFn?: typeof fetch) =>
  llamarApiSocios<Estado>('GET', `/estado?ventana=${ventana}`, { token, fetchFn })

export const obtenerVentas = (token: string, entorno: Entorno, fetchFn?: typeof fetch) =>
  llamarApiSocios<Ventas>('GET', `/ventas?entorno=${entorno}`, { token, fetchFn })
