// KAN-203: useSesion nunca tenía una prueba propia, solo se ejercitaba de rebote dentro de las
// pruebas de las vistas (pantallas-w01.test.ts/pantallas-w05.test.ts). Cubre lo que de verdad
// decide: a qué home vuelve "Inicio" por rol (RUTA_INICIO), el nombre por defecto que muestra cada
// home al iniciar sesión, y que cerrarSesion siempre vuelve a CLIENTE (nunca deja al usuario
// "atrapado" en un rol sin salida, ver nota del propio composable sobre el rol por defecto).
import { afterEach, describe, expect, it } from 'vitest'
import { RUTA_INICIO, useSesion } from '../src/composables/useSesion'

// `estado` es un singleton a nivel de módulo (mismo patrón que useCotizacion/useConciliacion): se
// resetea después de cada prueba para que una prueba no herede el rol que dejó la anterior.
afterEach(() => {
  useSesion().cerrarSesion()
})

describe('useSesion', () => {
  it('arranca en CLIENTE por defecto (una pantalla de /cotizacion/* es navegable sin pasar por /login)', () => {
    const { estado } = useSesion()
    expect(estado.rol).toBe('CLIENTE')
    expect(estado.nombre).toBeTruthy()
  })

  it('RUTA_INICIO mapea los 3 roles a su propio home (G-02/G-02a/G-02b)', () => {
    expect(RUTA_INICIO).toEqual({
      CLIENTE: '/inicio',
      ASESOR: '/asesor',
      OPERADOR: '/operador',
    })
  })

  it('iniciarSesion cambia el rol y el nombre a los del rol entrante', () => {
    const { estado, iniciarSesion } = useSesion()
    iniciarSesion('ASESOR')
    expect(estado.rol).toBe('ASESOR')
    const nombreAsesor = estado.nombre
    expect(nombreAsesor).toBeTruthy()

    iniciarSesion('OPERADOR')
    expect(estado.rol).toBe('OPERADOR')
    // El nombre cambia junto con el rol: cada rol tiene su propio nombre por defecto, no se arrastra
    // el del rol anterior.
    expect(estado.nombre).not.toBe(nombreAsesor)
  })

  it('cerrarSesion siempre vuelve a CLIENTE, sin importar desde qué rol se llame', () => {
    const { estado, iniciarSesion, cerrarSesion } = useSesion()
    iniciarSesion('OPERADOR')
    expect(estado.rol).toBe('OPERADOR')

    cerrarSesion()
    expect(estado.rol).toBe('CLIENTE')
  })

  it('el estado es compartido (singleton): dos llamadas a useSesion() ven el mismo cambio', () => {
    const primera = useSesion()
    const segunda = useSesion()
    primera.iniciarSesion('ASESOR')
    expect(segunda.estado.rol).toBe('ASESOR')
  })
})
