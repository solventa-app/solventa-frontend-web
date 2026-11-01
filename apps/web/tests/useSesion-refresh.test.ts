// T22: renovación de la sesión con el refresh (cookie httpOnly) desde useSesion.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  alSesionVencida,
  CLAVE_REFRESH_HASTA,
  CLAVE_TOKEN,
  esperarRestauracion,
  restaurarSesion,
  useSesion,
} from '../src/composables/useSesion'

/** JWT sin firma: la firma la verifica el BFF, no el frontend. */
function token(vidaSeg: number): string {
  const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/=+$/, '')
  const exp = Math.floor(Date.now() / 1000) + vidaSeg
  return `${b64({ alg: 'none' })}.${b64({ usuario: 'cliente.demo', rol: 'CLIENTE', exp })}.x`
}

interface Llamada {
  operacion: string
  cabeceras: Headers
}

/** BFF falso: `iniciarSesion` da 60 s de acceso; `renovarSesion` responde lo que diga `renovacion`. */
function bffFalso(renovacion: () => Response | Promise<Response>) {
  const llamadas: Llamada[] = []
  const fetchFalso: typeof fetch = async (_url, init) => {
    const cuerpo = JSON.parse(String(init?.body)) as { query: string }
    const operacion = /(iniciarSesion|renovarSesion|cerrarSesion|yo)\b/.exec(cuerpo.query)?.[1] ?? ''
    llamadas.push({ operacion, cabeceras: new Headers(init?.headers) })
    const usuario = { nombre: 'Cliente Demo', moneda: 'COP' }
    if (operacion === 'iniciarSesion') {
      return Response.json({
        data: {
          iniciarSesion: {
            token: token(60),
            refreshExpiraEn: new Date(Date.now() + 8 * 86_400_000).toISOString(),
            usuario,
          },
        },
      })
    }
    if (operacion === 'renovarSesion') return renovacion()
    if (operacion === 'cerrarSesion') return Response.json({ data: { cerrarSesion: true } })
    return Response.json({ data: { yo: usuario } })
  }
  return { fetchFalso, llamadas }
}

const renovacionOk = () =>
  Response.json({
    data: {
      renovarSesion: {
        token: token(60),
        refreshExpiraEn: new Date(Date.now() + 8 * 86_400_000).toISOString(),
      },
    },
  })

const renovacionVencida = () =>
  Response.json({
    data: { renovarSesion: { mensaje: 'Tu sesión ya no es válida.', codigo: 'SESION_VENCIDA' } },
  })

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  useSesion().cerrarSesion()
  alSesionVencida(null)
  sessionStorage.clear()
  localStorage.clear()
  vi.useRealTimers()
})

describe('renovación programada', () => {
  it('renueva antes de vencer, sin Authorization, con la cabecera anti-CSRF y sin tocar el refresh', async () => {
    const { fetchFalso, llamadas } = bffFalso(renovacionOk)
    const { estado, iniciarSesion } = useSesion(fetchFalso)
    await iniciarSesion('cliente.demo', 'x')
    const primero = estado.token

    // Con 60 s de vida el margen es el 20 %: renueva a los 48 s.
    await vi.advanceTimersByTimeAsync(47_000)
    expect(llamadas.some((l) => l.operacion === 'renovarSesion')).toBe(false)
    await vi.advanceTimersByTimeAsync(2_000)

    const renovar = llamadas.find((l) => l.operacion === 'renovarSesion')
    expect(renovar).toBeDefined()
    expect(renovar?.cabeceras.get('X-Solventa-Csrf')).toBe('1')
    expect(renovar?.cabeceras.has('Authorization')).toBe(false)
    expect(estado.token).not.toBe(primero)
    expect(estado.aviso).toBeNull()
  })

  it('con el uso continuo la persona sigue dentro pasado el vencimiento del primer acceso', async () => {
    const { fetchFalso } = bffFalso(renovacionOk)
    const { estado, iniciarSesion, sesionActiva } = useSesion(fetchFalso)
    await iniciarSesion('cliente.demo', 'x')

    await vi.advanceTimersByTimeAsync(5 * 60_000)

    expect(estado.token).toBeTruthy()
    expect(sesionActiva()).toBe(true)
  })

  it('si el refresh venció o es inválido cierra la sesión, avisa y lleva al ingreso', async () => {
    const { fetchFalso } = bffFalso(renovacionVencida)
    const alVencer = vi.fn()
    alSesionVencida(alVencer)
    const { estado, iniciarSesion } = useSesion(fetchFalso)
    await iniciarSesion('cliente.demo', 'x')

    await vi.advanceTimersByTimeAsync(50_000)

    expect(estado.token).toBeNull()
    expect(estado.aviso).toBe('vencida')
    expect(alVencer).toHaveBeenCalledOnce()
    expect(localStorage.getItem(CLAVE_REFRESH_HASTA)).toBeNull()
  })

  it('una falla de red o un 5xx no cierra la sesión: reintenta y se recupera', async () => {
    let intento = 0
    const { fetchFalso, llamadas } = bffFalso(() =>
      ++intento === 1 ? new Response(null, { status: 503 }) : renovacionOk(),
    )
    const { estado, iniciarSesion } = useSesion(fetchFalso)
    await iniciarSesion('cliente.demo', 'x')
    const primero = estado.token

    await vi.advanceTimersByTimeAsync(49_000)
    expect(estado.token).toBe(primero) // falló, pero el acceso aún vale
    await vi.advanceTimersByTimeAsync(16_000) // reintento a los 15 s
    // el primer token (60 s) ya vencía: la renovación del reintento tuvo que llegar antes

    expect(llamadas.filter((l) => l.operacion === 'renovarSesion')).toHaveLength(2)
    expect(estado.token).not.toBe(primero)
    expect(estado.aviso).toBeNull()
  })

  it('dos disparos a la vez comparten una sola petición de renovación', async () => {
    const { fetchFalso, llamadas } = bffFalso(renovacionOk)
    const sesion = useSesion(fetchFalso)
    await sesion.iniciarSesion('cliente.demo', 'x')

    await Promise.all([sesion.renovarSesion(), sesion.renovarSesion()])

    expect(llamadas.filter((l) => l.operacion === 'renovarSesion')).toHaveLength(1)
  })
})

describe('el refresh nunca queda en el navegador', () => {
  it('solo se guardan el token y marcas de tiempo; ningún refresh', async () => {
    const { fetchFalso } = bffFalso(renovacionOk)
    await useSesion(fetchFalso).iniciarSesion('cliente.demo', 'x')

    const guardado = JSON.stringify({ ...sessionStorage }) + JSON.stringify({ ...localStorage })
    expect(guardado).not.toMatch(/refresh-|refreshToken/i)
    expect(Number(localStorage.getItem(CLAVE_REFRESH_HASTA))).toBeGreaterThan(Date.now())
  })
})

describe('restaurar al abrir la web', () => {
  it('con el acceso vencido y un refresh vigente renueva en silencio', async () => {
    const { fetchFalso, llamadas } = bffFalso(renovacionOk)
    const sesion = useSesion(fetchFalso)
    sessionStorage.setItem(CLAVE_TOKEN, token(-10))
    localStorage.setItem(CLAVE_REFRESH_HASTA, String(Date.now() + 86_400_000))

    restaurarSesion()
    await esperarRestauracion()

    expect(llamadas.map((l) => l.operacion)).toContain('renovarSesion')
    expect(sesion.estado.token).toBeTruthy()
    expect(sesion.sesionActiva()).toBe(true)
  })

  it('sin marca de refresh no pregunta al BFF', async () => {
    const { llamadas } = bffFalso(renovacionOk)
    restaurarSesion()
    await esperarRestauracion()
    expect(llamadas).toHaveLength(0)
  })

  it('si la renovación falla se queda sin sesión, sin aviso y borra la marca', async () => {
    const { fetchFalso } = bffFalso(renovacionVencida)
    const sesion = useSesion(fetchFalso)
    localStorage.setItem(CLAVE_REFRESH_HASTA, String(Date.now() + 86_400_000))

    restaurarSesion()
    await esperarRestauracion()

    expect(sesion.estado.token).toBeNull()
    expect(sesion.estado.aviso).toBeNull()
    expect(localStorage.getItem(CLAVE_REFRESH_HASTA)).toBeNull()
  })
})

describe('cierre de sesión', () => {
  it('terminarSesion revoca el refresh en el BFF (con la cabecera anti-CSRF) y limpia lo local', async () => {
    const { fetchFalso, llamadas } = bffFalso(renovacionOk)
    const sesion = useSesion(fetchFalso)
    await sesion.iniciarSesion('cliente.demo', 'x')

    await sesion.terminarSesion()

    const cierre = llamadas.find((l) => l.operacion === 'cerrarSesion')
    expect(cierre?.cabeceras.get('X-Solventa-Csrf')).toBe('1')
    expect(sesion.estado.token).toBeNull()
    expect(localStorage.getItem(CLAVE_REFRESH_HASTA)).toBeNull()
  })
})

describe('petición con acceso vencido (sin sesión del BFF)', () => {
  it('renueva una vez y reintenta la misma operación', async () => {
    const llamadas: string[] = []
    let yoIntento = 0
    const fetchFalso: typeof fetch = async (_url, init) => {
      const { query } = JSON.parse(String(init?.body)) as { query: string }
      const operacion = /(iniciarSesion|renovarSesion|yo)\b/.exec(query)?.[1] ?? ''
      llamadas.push(operacion)
      if (operacion === 'iniciarSesion') {
        return Response.json({ data: { iniciarSesion: { token: token(3600), usuario: { nombre: 'A' } } } })
      }
      if (operacion === 'renovarSesion') return renovacionOk()
      return ++yoIntento === 1
        ? Response.json({ errors: [{ message: 'Tu sesión no es válida o venció. Inicia sesión de nuevo.' }] })
        : Response.json({ data: { yo: { nombre: 'Ana', moneda: 'COP' } } })
    }
    const sesion = useSesion(fetchFalso)
    await sesion.iniciarSesion('cliente.demo', 'x')
    llamadas.length = 0

    await sesion.cargarNombre()

    expect(llamadas).toEqual(['yo', 'renovarSesion', 'yo'])
    expect(sesion.estado.nombre).toBe('Ana')
  })
})
