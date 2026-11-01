// Cliente REST de la API de socios (HU-W07, `/v1`, contrato v0.22: contrato/socios-v1.json). Sin librería, como
// graphql/cliente.ts: `fetch` con el token del socio, `Accept-Language` y los tipos generados del contrato
// (tipos-socios.ts). Nunca deja salir un error técnico ni un 5xx (regla 5): cada fallo llega como `ErrorSocios` con un
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
export type Estado = Esquemas['EstadoSistema']
export type Ventas = Esquemas['Ventas']

/** Qué salió mal, sin depender del texto del mensaje. */
export type CodigoErrorSocios =
  | 'CREDENCIALES_INVALIDAS'
  | 'NO_AUTORIZADO'
  | 'PROHIBIDO'
  | 'NO_ENCONTRADO'
  | 'PRESUPUESTO_AGOTADO'
  | 'SERVICIO_LENTO'
  | 'ERROR'

export class ErrorSocios extends Error {
  constructor(
    mensaje: string,
    readonly codigo: CodigoErrorSocios,
  ) {
    super(mensaje)
  }
}

/** El `codigo` de `ErrorPublico` decide; el estado HTTP solo cuando el cuerpo no trae uno conocido. */
function codigoDe(status: number, codigo: string | undefined): CodigoErrorSocios {
  if (codigo === 'CREDENCIALES_INVALIDAS') return 'CREDENCIALES_INVALIDAS'
  if (codigo === 'TOKEN_INVALIDO' || status === 401) return 'NO_AUTORIZADO'
  if (codigo === 'PROHIBIDO' || status === 403) return 'PROHIBIDO'
  if (codigo === 'PRESUPUESTO_AGOTADO' || status === 429) return 'PRESUPUESTO_AGOTADO'
  if (codigo === 'NO_ENCONTRADO' || status === 404) return 'NO_ENCONTRADO'
  return 'ERROR'
}

async function errorPublico(respuesta: Response): Promise<Partial<Esquemas['ErrorPublico']>> {
  try {
    return (await respuesta.json()) as Partial<Esquemas['ErrorPublico']>
  } catch {
    return {}
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
    // 502/503/504 del gateway y el 503 controlado del BFF (SERVICIO_NO_DISPONIBLE) son reintentables; ningún 5xx se
    // muestra tal cual.
    const lento = [502, 503, 504].includes(respuesta.status)
    throw new ErrorSocios(
      t(lento ? 'comun.servicioLento' : 'socios.error.generico'),
      lento ? 'SERVICIO_LENTO' : 'ERROR',
    )
  }
  const error = await errorPublico(respuesta)
  const codigo = codigoDe(respuesta.status, error.codigo)
  // El presupuesto agotado tiene su texto fijo en el portal; los demás 4xx traen el mensaje del backend.
  if (codigo === 'PRESUPUESTO_AGOTADO') throw new ErrorSocios(t('socios.error.presupuesto'), codigo)
  throw new ErrorSocios(error.mensaje?.trim() || t('socios.error.generico'), codigo)
}

export const pedirToken = (clientId: string, clave: string, fetchFn?: typeof fetch) =>
  llamarApiSocios<Token>('POST', '/token', { cuerpo: { clientId, clave }, fetchFn })

export const obtenerCredenciales = (token: string, fetchFn?: typeof fetch) =>
  llamarApiSocios<Credenciales>('GET', '/credenciales', { token, fetchFn })

export const rotarCredencial = (token: string, entorno: Entorno, fetchFn?: typeof fetch) =>
  llamarApiSocios<Credencial>('POST', `/credenciales/${entorno}/rotar`, { token, fetchFn })

/** Del entorno del token, los últimos 30 días. */
export const obtenerConsumo = (token: string, fetchFn?: typeof fetch) =>
  llamarApiSocios<Consumo>('GET', '/consumo', { token, fetchFn })

export const obtenerEstado = (token: string, ventana: Ventana, fetchFn?: typeof fetch) =>
  llamarApiSocios<Estado>('GET', `/estado?ventana=${ventana}`, { token, fetchFn })

/** Del entorno del token, los últimos 12 meses (con un token de PRUEBAS, datos simulados). */
export const obtenerVentas = (token: string, fetchFn?: typeof fetch) =>
  llamarApiSocios<Ventas>('GET', '/ventas', { token, fetchFn })
