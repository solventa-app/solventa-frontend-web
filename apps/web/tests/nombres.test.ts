import { describe, expect, it } from 'vitest'
import { nombreFuente } from '../src/utils/nombres'

describe('nombreFuente', () => {
  it('traduce los 5 identificadores que devuelve el BFF', () => {
    expect(nombreFuente('cuentas-bancarias')).toBe('Cuentas bancarias')
    expect(nombreFuente('historial-crediticio')).toBe('Historial crediticio')
    expect(nombreFuente('afiliacion-pila')).toBe('Afiliación a seguridad social (PILA)')
    expect(nombreFuente('camara-comercio')).toBe('Cámara de Comercio')
    expect(nombreFuente('antecedentes-judiciales')).toBe('Antecedentes judiciales')
  })

  it('muestra tal cual un nombre que no conoce', () => {
    expect(nombreFuente('fuente-nueva')).toBe('fuente-nueva')
  })
})
