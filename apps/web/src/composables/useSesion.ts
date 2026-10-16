// Sesión activa (HU-W01/Global). Singleton a nivel de módulo, igual patrón que useCotizacion.ts:
// no hace falta una librería de estado global para un dato tan chico (CLAUDE.md regla 8, "no
// sobre-construir"). El contrato (contrato/schema.graphql) no modela login ni roles — no hay
// mutación de autenticación — así que esto es pura navegación del lado del cliente: decide a qué
// home vuelve "Inicio" en las pantallas compartidas entre Cliente y Asesor comercial (W01-01 a
// W01-05) y qué tarjeta de bienvenida mostrar en G-02/G-02a. No se guarda en localStorage (CLAUDE.md
// regla 7): si se recarga la página, se vuelve al rol por defecto.
import { reactive } from 'vue'

export type Rol = 'CLIENTE' | 'ASESOR' | 'OPERADOR'

interface EstadoSesion {
  rol: Rol
  nombre: string
}

/** Ruta del "home" de cada rol (ver src/router/pantallas.ts: G-02, G-02a, G-02b). */
export const RUTA_INICIO: Record<Rol, string> = {
  CLIENTE: '/inicio',
  ASESOR: '/asesor',
  OPERADOR: '/operador',
}

const NOMBRE_POR_DEFECTO: Record<Rol, string> = {
  CLIENTE: 'María Fernanda Restrepo',
  ASESOR: 'Ricardo Peña',
  OPERADOR: 'Equipo de Operaciones',
}

// Por defecto CLIENTE: así una pantalla de /cotizacion/* sigue siendo navegable escribiendo la URL
// directamente (sin pasar por /login primero), como ya permitía el prototipo de desarrollo con mocks.
const estado = reactive<EstadoSesion>({
  rol: 'CLIENTE',
  nombre: NOMBRE_POR_DEFECTO.CLIENTE,
})

export function useSesion() {
  function iniciarSesion(rol: Rol) {
    estado.rol = rol
    estado.nombre = NOMBRE_POR_DEFECTO[rol]
  }

  function cerrarSesion() {
    estado.rol = 'CLIENTE'
    estado.nombre = NOMBRE_POR_DEFECTO.CLIENTE
  }

  return { estado, iniciarSesion, cerrarSesion }
}
