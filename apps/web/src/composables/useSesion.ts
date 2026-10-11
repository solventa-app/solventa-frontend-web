// Sesión activa (Global). Singleton a nivel de módulo, igual patrón que useConciliacion.ts: no hace
// falta una librería de estado global para un dato tan chico (CLAUDE.md regla 8, "no sobre-construir").
// El contrato (contrato/schema.graphql) no modela login ni roles — no hay mutación de autenticación —
// así que esto es pura navegación del lado del cliente: decide qué home vuelve a mostrar "Cerrar
// sesión" (G-02/G-02a/G-02b) y permite a HomeOperador.vue cerrar sesión con el mismo patrón que las
// otras dos pantallas "home" del proyecto. No se guarda en localStorage (CLAUDE.md regla 7): si se
// recarga la página, se vuelve al rol por defecto.
//
// Nota: este mismo archivo existe también en feature/HU-W01-pantallas (con el mismo contenido);
// ambas ramas lo necesitan de forma independiente porque todavía no se han integrado a main. Al
// fusionar no debería haber conflicto real más allá de "añadido en ambos lados" con el mismo texto.
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

// Por defecto CLIENTE: así una pantalla sigue siendo navegable escribiendo la URL directamente (sin
// pasar por /login primero), como ya permitía el prototipo de desarrollo con mocks.
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
