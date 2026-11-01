// Moneda de la web (KAN-209): el selector del header convierte lo que se consulta, se recuerda y prevalece la de la
// cuenta. Lo que se firma o cobra no cambia (`monedaFija`).
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HeaderPantalla } from '../src/components/ui'
import {
  adoptarMonedaDeCuenta,
  cambiarMoneda,
  conversionFallida,
  moneda,
  montoVisible,
  usarConversor,
  type Conversor,
} from '../src/composables/useMoneda'
import { usarToken } from '../src/graphql/cliente'
import { formatearMonto } from '../src/utils/formato'

const cop = (valor: string) => ({ valor, moneda: 'COP' })

function conversorDe(tasa: number) {
  return vi.fn<Conversor>(async (montos, destino) =>
    montos.map((m) => ({ valor: (Number(m.valor) / tasa).toFixed(2), moneda: destino })),
  )
}

beforeEach(() => {
  localStorage.clear()
  usarToken(null)
  usarConversor(null)
  moneda.value = 'COP'
})
afterEach(() => {
  usarConversor(null)
  moneda.value = 'COP'
})

describe('montoVisible', () => {
  it('en la misma moneda no convierte nada', async () => {
    const conversor = conversorDe(4100)
    usarConversor(conversor)
    expect(montoVisible(cop('48500.00'))).toBe(formatearMonto(cop('48500.00')))
    await flushPromises()
    expect(conversor).not.toHaveBeenCalled()
  })

  it('muestra el original mientras convierte y luego el convertido, con centavos', async () => {
    usarConversor(conversorDe(4100))
    await cambiarMoneda('USD')
    expect(montoVisible(cop('48500'))).toBe(formatearMonto(cop('48500')))
    await flushPromises()
    expect(montoVisible(cop('48500'))).toBe(formatearMonto({ valor: '11.83', moneda: 'USD' }))
  })

  it('pide cada monto una sola vez y agrupa de a 50', async () => {
    const conversor = conversorDe(2)
    usarConversor(conversor)
    await cambiarMoneda('USD')
    for (let i = 1; i <= 60; i++) montoVisible(cop(String(i)))
    montoVisible(cop('1'))
    await flushPromises()
    expect(conversor.mock.calls.map(([montos]) => montos.length)).toEqual([50, 10])
  })

  it('si falla deja el original, avisa y no reintenta en cada pintada', async () => {
    const conversor = vi.fn<Conversor>().mockRejectedValue(new Error('sin tasas'))
    usarConversor(conversor)
    await cambiarMoneda('USD')
    montoVisible(cop('100'))
    await flushPromises()
    expect(conversionFallida.value).toBe(true)
    expect(montoVisible(cop('100'))).toBe(formatearMonto(cop('100')))
    await flushPromises()
    expect(conversor).toHaveBeenCalledTimes(1)
  })

  it('descarta una respuesta que llega después de cambiar de moneda', async () => {
    let responder: (m: { valor: string; moneda: string }[]) => void = () => {}
    usarConversor(() => new Promise((resolver) => (responder = resolver)))
    await cambiarMoneda('USD')
    montoVisible(cop('100'))
    await flushPromises()
    await cambiarMoneda('COP')
    responder([{ valor: '1.00', moneda: 'USD' }])
    await flushPromises()
    expect(montoVisible(cop('100'))).toBe(formatearMonto(cop('100')))
  })
})

describe('preferencia', () => {
  it('se recuerda en el navegador', async () => {
    await cambiarMoneda('EUR')
    expect(localStorage.getItem('solventa.moneda')).toBe('EUR')
  })

  it('con sesión también se guarda en la cuenta', async () => {
    usarToken('token')
    const fetchFn = vi.fn(
      async () => new Response(JSON.stringify({ data: { actualizarPreferencias: { __typename: 'Usuario' } } })),
    )
    await cambiarMoneda('USD', fetchFn as unknown as typeof fetch)
    const cuerpo = JSON.parse((fetchFn.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)
    expect(cuerpo.variables.entrada).toEqual({ idioma: 'ES', moneda: 'USD' })
  })

  it('si la cuenta no la guarda, sigue valiendo en el navegador', async () => {
    usarToken('token')
    await cambiarMoneda('USD', vi.fn().mockRejectedValue(new Error('red')) as unknown as typeof fetch)
    expect(moneda.value).toBe('USD')
  })

  it('la moneda de la cuenta prevalece', async () => {
    await cambiarMoneda('EUR')
    adoptarMonedaDeCuenta('USD')
    expect(moneda.value).toBe('USD')
    expect(localStorage.getItem('solventa.moneda')).toBe('USD')
  })
})

describe('HeaderPantalla', () => {
  const montar = (props = {}) => mount(HeaderPantalla, { props: { sinPerfil: true, ...props } })

  it('el selector cambia la moneda global y sobrevive a volver a montar el header', async () => {
    const primero = montar()
    await primero.find('select').setValue('USD')
    expect(moneda.value).toBe('USD')
    expect((montar().find('select').element as HTMLSelectElement).value).toBe('USD')
  })

  it('avisa que los valores son de referencia solo con otra moneda', async () => {
    expect(montar().find('[data-prueba="aviso-moneda"]').exists()).toBe(false)
    moneda.value = 'USD'
    expect(montar().find('[data-prueba="aviso-moneda"]').text()).toContain('referencia')
  })

  it('con monedaFija deshabilita el selector, muestra esa moneda y no avisa', () => {
    moneda.value = 'USD'
    const header = montar({ monedaFija: 'COP' })
    const selector = header.find('select').element as HTMLSelectElement
    expect(selector.disabled).toBe(true)
    expect(selector.value).toBe('COP')
    expect(header.find('[data-prueba="aviso-moneda"]').exists()).toBe(false)
  })
})
