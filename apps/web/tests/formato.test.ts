import { describe, expect, it } from 'vitest'
import { formatearFecha, formatearMonto } from '../src/utils/formato'

// Hallazgo de QA (MEDIA-ALTA): `formatearFecha`/`formatearMonto` no tenían ninguna prueba unitaria
// dedicada, solo se verificaban indirectamente a través de las pantallas que las usan. Esta
// suite cubre el padding del día, la tabla de abreviaturas de mes, la detección de a. m./p. m. vía
// `dayPeriod`, el año, y la zona horaria fija America/Bogota (independiente de en qué huso corra
// quien ejecuta las pruebas).
describe('formatearFecha', () => {
  it('rellena el día con cero a la izquierda cuando es de un solo dígito', () => {
    expect(formatearFecha('2026-01-05T05:00:00Z')).toBe('05 ene 2026, 12:00 a. m.')
  })

  it('no agrega cero de más cuando el día ya tiene dos dígitos', () => {
    expect(formatearFecha('2026-09-12T15:45:00Z')).toBe('12 sep 2026, 10:45 a. m.')
  })

  it('usa la abreviatura de mes de 3 letras en español para cada mes del año', () => {
    const meses: [string, string][] = [
      ['2026-01-15T17:00:00Z', 'ene'],
      ['2026-02-15T17:00:00Z', 'feb'],
      ['2026-03-15T17:00:00Z', 'mar'],
      ['2026-04-15T17:00:00Z', 'abr'],
      ['2026-05-15T17:00:00Z', 'may'],
      ['2026-06-15T17:00:00Z', 'jun'],
      ['2026-07-15T17:00:00Z', 'jul'],
      ['2026-08-15T17:00:00Z', 'ago'],
      ['2026-09-15T17:00:00Z', 'sep'],
      ['2026-10-15T17:00:00Z', 'oct'],
      ['2026-11-15T17:00:00Z', 'nov'],
      ['2026-12-15T17:00:00Z', 'dic'],
    ]
    for (const [iso, abreviatura] of meses) {
      expect(formatearFecha(iso)).toContain(` ${abreviatura} `)
    }
  })

  it('incluye el año', () => {
    expect(formatearFecha('2026-09-12T15:45:00Z')).toContain('2026')
  })

  it('medianoche en hora de Bogotá se muestra como "12:00 a. m.", no "00:00"', () => {
    // 2026-01-05T05:00:00Z es exactamente medianoche en America/Bogota (UTC-5).
    expect(formatearFecha('2026-01-05T05:00:00Z')).toBe('05 ene 2026, 12:00 a. m.')
  })

  it('mediodía en hora de Bogotá se muestra como "12:00 p. m.", no "12:00 a. m."', () => {
    // 2026-06-15T17:00:00Z es exactamente mediodía en America/Bogota (UTC-5).
    expect(formatearFecha('2026-06-15T17:00:00Z')).toBe('15 jun 2026, 12:00 p. m.')
  })

  it('un minuto antes de medianoche sigue siendo el día anterior en hora de Bogotá ("p. m.")', () => {
    // 2026-12-31T04:59:00Z UTC es 2026-12-30T23:59 en Bogota: un minuto antes de la medianoche del 31.
    expect(formatearFecha('2026-12-31T04:59:00Z')).toBe('30 dic 2026, 11:59 p. m.')
  })

  it('usa siempre America/Bogota sin importar la fecha/hora UTC de entrada', () => {
    // Misma hora de reloj en Bogota (10:45 a. m.) para dos fechas UTC distintas por el huso fijo.
    expect(formatearFecha('2026-09-12T15:45:00Z')).toBe('12 sep 2026, 10:45 a. m.')
    expect(formatearFecha('2026-03-12T15:45:00Z')).toBe('12 mar 2026, 10:45 a. m.')
  })
})

describe('formatearMonto', () => {
  it('formatea COP con separador de miles y sin decimales', () => {
    // Intl.NumberFormat separa el símbolo "$" del número con un espacio NBSP (U+00A0), no un
    // espacio normal (U+0020) — visualmente idénticos, por eso se escribe explícito aquí.
    expect(formatearMonto({ valor: '1000700', moneda: 'COP' })).toBe('$\u00A01.000.700')
  })

  it('no agrega un sufijo de código de moneda (lo deben agregar las vistas que sí lo necesiten)', () => {
    expect(formatearMonto({ valor: '1000700', moneda: 'COP' })).not.toContain('COP')
  })

  it('redondea a 0 decimales', () => {
    expect(formatearMonto({ valor: '198000.00', moneda: 'COP' })).toBe('$\u00A0198.000')
  })
})
