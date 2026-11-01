import { describe, expect, it } from 'vitest'
import {
  JURISDICCIONES,
  LISTA_JURISDICCIONES,
  enmascararDocumento,
  obtenerJurisdiccion,
  validarCcCo,
  validarCpfBr,
  validarCurpMx,
  validarDniEs,
  validarDniPe,
  validarDocumento,
  validarLuhn,
  validarRutCl,
  validarSsnUs,
} from '../src/utils/jurisdicciones'

describe('Catálogo de Jurisdicciones', () => {
  it('contiene los 7 países requeridos con sus monedas y especificaciones', () => {
    const requeridos = ['CO', 'MX', 'BR', 'CL', 'PE', 'US', 'ES']
    expect(requeridos.every((p) => p in JURISDICCIONES)).toBe(true)
    expect(LISTA_JURISDICCIONES.length).toBeGreaterThanOrEqual(7)
  })

  it('obtenerJurisdiccion retorna la configuración correcta para CO y otros', () => {
    const co = obtenerJurisdiccion('CO')
    expect(co.codigo).toBe('CO')
    expect(co.nombre).toBe('Colombia')
    expect(co.moneda).toBe('COP')
    expect(co.tipo_documento).toBe('CC')
    expect(co.region_datos).toBe('latam')
    expect(co.monto_min).toBe(500000)
    expect(co.monto_max).toBe(80000000)
    expect(co.plazo_min).toBe(6)
    expect(co.plazo_max).toBe(200)
    expect(co.dti_maximo).toBe(0.4)

    // Acepta minúsculas
    expect(obtenerJurisdiccion('mx').codigo).toBe('MX')
    expect(obtenerJurisdiccion('es').moneda).toBe('EUR')
  })

  it('obtenerJurisdiccion lanza error para país no soportado', () => {
    expect(() => obtenerJurisdiccion('ZZ')).toThrow(/no soportado/)
  })
})

describe('Validación de Documentos por País', () => {
  describe('Colombia (CO - CC)', () => {
    it('valida cédulas correctas y descarta inválidas', () => {
      const ok1 = validarCcCo('1020304050')
      expect(ok1.valido).toBe(true)
      expect(ok1.normalizado).toBe('1020304050')

      const ok2 = validarCcCo('1.020.304.050')
      expect(ok2.valido).toBe(true)
      expect(ok2.normalizado).toBe('1020304050')

      expect(validarCcCo('012345').valido).toBe(false)
      expect(validarCcCo('12345').valido).toBe(false)
      expect(validarCcCo('12345678901').valido).toBe(false)
    })
  })

  describe('México (MX - CURP)', () => {
    it('valida CURP correcta y descarta formatos inválidos', () => {
      expect(validarCurpMx('ABCD900101HMCLRN01').valido).toBe(true)
      expect(validarCurpMx('MAVR800101HDFRRN09').valido).toBe(true)
      expect(validarCurpMx('ABCD123').valido).toBe(false)
      expect(validarCurpMx('ABCD900101ZDFRRN09').valido).toBe(false)
    })
  })

  describe('Brasil (BR - CPF)', () => {
    it('valida CPF con dígitos verificadores correctos y descarta secuencias o erróneos', () => {
      expect(validarCpfBr('52998224725').valido).toBe(true)
      expect(validarCpfBr('111.444.777-35').valido).toBe(true)
      expect(validarCpfBr('11111111111').valido).toBe(false)
      expect(validarCpfBr('12345678900').valido).toBe(false)
      expect(validarCpfBr('12345').valido).toBe(false)
    })
  })

  describe('Chile (CL - RUT)', () => {
    it('valida RUT con módulo 11', () => {
      const ok1 = validarRutCl('11.111.111-1')
      expect(ok1.valido).toBe(true)
      expect(ok1.normalizado).toBe('11111111-1')

      const ok2 = validarRutCl('21040332-9')
      expect(ok2.valido).toBe(true)

      expect(validarRutCl('11111111-0').valido).toBe(false)
      expect(validarRutCl('123-4').valido).toBe(false)
    })
  })

  describe('Perú (PE - DNI)', () => {
    it('valida DNI de 8 dígitos', () => {
      expect(validarDniPe('12345678').valido).toBe(true)
      expect(validarDniPe('70809010').valido).toBe(true)
      expect(validarDniPe('1234567').valido).toBe(false)
      expect(validarDniPe('123456789').valido).toBe(false)
    })
  })

  describe('Estados Unidos (US - SSN)', () => {
    it('valida SSN respetando áreas y grupos reservados', () => {
      expect(validarSsnUs('123-45-6789').valido).toBe(true)
      expect(validarSsnUs('000-12-3456').valido).toBe(false)
      expect(validarSsnUs('666-12-3456').valido).toBe(false)
      expect(validarSsnUs('900-12-3456').valido).toBe(false)
      expect(validarSsnUs('123-00-4567').valido).toBe(false)
      expect(validarSsnUs('123-45-0000').valido).toBe(false)
      expect(validarSsnUs('12345').valido).toBe(false)
    })
  })

  describe('España (ES - DNI/NIE)', () => {
    it('valida DNI/NIE según letra de control módulo 23', () => {
      expect(validarDniEs('12345678Z').valido).toBe(true)
      expect(validarDniEs('X1234567L').valido).toBe(true)
      expect(validarDniEs('12345678A').valido).toBe(false)
      expect(validarDniEs('12345').valido).toBe(false)
    })
  })

  describe('validarDocumento general', () => {
    it('despacha según el código de país en mayúsculas o minúsculas', () => {
      expect(validarDocumento('co', '1020304050').valido).toBe(true)
      expect(validarDocumento('MX', 'ABCD900101HMCLRN01').valido).toBe(true)
      expect(validarDocumento('br', '52998224725').valido).toBe(true)
      expect(validarDocumento('cl', '11111111-1').valido).toBe(true)
      expect(validarDocumento('pe', '12345678').valido).toBe(true)
      expect(validarDocumento('us', '123456789').valido).toBe(true)
      expect(validarDocumento('es', '12345678Z').valido).toBe(true)
      expect(validarDocumento('XX', '12345678').valido).toBe(false)
    })
  })
})

describe('Algoritmo de Luhn y Enmascaramiento', () => {
  it('valida cadenas según Luhn (módulo 10)', () => {
    expect(validarLuhn('79927398713')).toBe(true)
    expect(validarLuhn('49927398716')).toBe(true)
    expect(validarLuhn('79927398710')).toBe(false)
    expect(validarLuhn('79927398717')).toBe(false)
    expect(validarLuhn('')).toBe(false)
  })

  it('enmascara documentos dejando los últimos 4 visibles', () => {
    expect(enmascararDocumento('1020304050')).toBe('******4050')
    expect(enmascararDocumento('1234')).toBe('**1234')
    expect(enmascararDocumento('123456789')).toBe('*****6789')
  })
})
