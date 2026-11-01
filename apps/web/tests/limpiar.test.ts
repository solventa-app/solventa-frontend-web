import type { ErrorEvent } from '@sentry/vue'
import { describe, expect, it } from 'vitest'
import { obtenerCodigoSoporte } from '../src/log'
import { limpiar } from '../src/observabilidad/limpiar'

describe('limpiar (beforeSend de Sentry en web)', () => {
  it('elimina documento, correo, token y reemplaza números de 6 o más dígitos', () => {
    const evento: ErrorEvent = {
      type: undefined,
      message:
        'Error procesando correo maria@solventa.co con documento 1020304050 y token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.firma',
      request: {
        url: 'https://solventa.co/graphql?correo=maria@solventa.co&id=99887766',
        query_string: 'correo=maria@solventa.co&documento=1020304050',
        cookies: { session: 'secreto123' },
        headers: {
          Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.firma',
          'X-Request-Id': 'req-12345678',
        },
        data: {
          documento: '1020304050',
          correo: 'maria@solventa.co',
          token: 'secreto',
          operacion: 'cotizarOferta',
        },
      },
      extra: {
        cedula: '1020304050',
        email: 'maria@solventa.co',
        detalle: 'Cliente 1020304050',
      },
      breadcrumbs: [
        {
          message: 'Consulta de maria@solventa.co con cédula 1020304050',
          category: 'http',
          data: {
            password: 'Clave123!',
            monto: '1500000',
          },
        },
      ],
    }

    const resultado = limpiar(evento)
    const texto = JSON.stringify(resultado)

    expect(texto).not.toContain('maria@solventa.co')
    expect(texto).not.toContain('1020304050')
    expect(texto).not.toContain('eyJhbGciOiJIUzI1NiJ9')
    expect(texto).not.toContain('Clave123!')
    expect(texto).not.toContain('secreto123')
    expect(resultado?.request?.headers?.Authorization).toBe('[filtrado]')
    expect((resultado?.request?.data as Record<string, unknown>).documento).toBe('[filtrado]')
    expect((resultado?.request?.data as Record<string, unknown>).operacion).toBe('cotizarOferta')
  })

  it('obtenerCodigoSoporte devuelve un código de 8 caracteres', () => {
    const codigo = obtenerCodigoSoporte()
    expect(codigo).toHaveLength(8)
  })
})
