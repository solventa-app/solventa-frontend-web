// Idioma de la interfaz (ES/EN), elegido con el selector del header (SelectorIdioma, Figma 2006:74).
// Sin librería a propósito (regla 8): un `ref` global, dos catálogos planos y una función `t` bastan
// para las pantallas del sprint. `t` lee `idioma.value`, así que toda plantilla o `computed` que la use
// se vuelve a pintar sola al cambiar de idioma.
//
// El idioma elegido se guarda en `localStorage` (`solventa.idioma`): es una preferencia, no un dato
// personal (regla 7). Viaja al BFF como `Accept-Language` (graphql/cliente.ts) para que los mensajes del
// backend lleguen en el mismo idioma. Por defecto, español.
import { ref, watch } from 'vue'
import { en } from './en'
import { es, type Clave } from './es'

export type Idioma = 'ES' | 'EN'
export type { Clave }

const CATALOGOS: Record<Idioma, Record<Clave, string>> = { ES: es, EN: en }
const CLAVE_ALMACEN = 'solventa.idioma'

function idiomaGuardado(): Idioma {
  try {
    return localStorage.getItem(CLAVE_ALMACEN) === 'EN' ? 'EN' : 'ES'
  } catch {
    return 'ES'
  }
}

export const idioma = ref<Idioma>(idiomaGuardado())

watch(
  idioma,
  (valor) => {
    try {
      localStorage.setItem(CLAVE_ALMACEN, valor)
    } catch {
      // Sin almacenamiento (modo privado estricto): el idioma dura hasta recargar.
    }
    if (typeof document !== 'undefined') document.documentElement.lang = valor.toLowerCase()
  },
  { immediate: true },
)

export function cambiarIdioma(valor: Idioma): void {
  idioma.value = valor
}

/** Texto de `clave` en el idioma activo; `{nombre}` se reemplaza con `parametros.nombre`. */
export function t(clave: Clave, parametros: Record<string, string | number> = {}): string {
  const texto = CATALOGOS[idioma.value][clave] ?? es[clave]
  return texto.replace(/\{(\w+)\}/g, (marca, nombre: string) =>
    nombre in parametros ? String(parametros[nombre]) : marca,
  )
}

/** Locale para `Intl` (dinero, fechas, porcentajes) según el idioma activo. */
export function localeIntl(): string {
  return idioma.value === 'EN' ? 'en-US' : 'es-CO'
}

/** Valor de `Accept-Language` que se manda al BFF. */
export function cabeceraIdioma(): string {
  return idioma.value === 'EN' ? 'en' : 'es'
}

export function useIdioma() {
  return { idioma, cambiarIdioma, t }
}
