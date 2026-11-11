import { describe, expect, it } from 'vitest'
import { pantallas } from '../src/router/pantallas'

// Toda pantalla con `roles` exige sesión. Una pantalla sin `roles` queda abierta a cualquiera, así que solo puede ser
// una de estas, a propósito: el ingreso, las páginas del enlace de firma (no tienen cuenta), el retorno de la pasarela
// y el portal de socios (lo protege `socio: true`, no `roles`). Una pantalla nueva sin `roles` hace fallar esta prueba:
// si de verdad es pública, se agrega aquí con su razón. G-07 y G-08 son «olvidé mi contraseña»: se usan sin sesión.
const PUBLICAS_A_PROPOSITO = new Set(['G-01', 'G-07', 'G-08', 'W03-02', 'W03-02b', 'W03-03', 'W03-R', 'W03-04', 'W07-01'])

describe('rutas sin roles', () => {
  it('solo las públicas a propósito quedan sin roles y sin sesión técnica de socio', () => {
    const abiertas = pantallas.filter((p) => !p.roles && !p.socio).map((p) => p.id)
    const inesperadas = abiertas.filter((id) => !PUBLICAS_A_PROPOSITO.has(id))
    expect(inesperadas).toEqual([])
  })
})
