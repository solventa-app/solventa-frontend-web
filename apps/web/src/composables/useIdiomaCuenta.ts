// KAN-32: el idioma también es una preferencia de la cuenta (AUTH `usuarios.idioma`, contrato `PreferenciasInput`),
// como la moneda (useMoneda.ts) y el país (usePais.ts). Antes solo vivía en `localStorage`: el perfil lo cambiaba en
// este navegador, pero la cuenta seguía con el anterior y al entrar desde otro equipo volvía a español.
//
// Aparte de i18n/index.ts a propósito: el catálogo no habla con el BFF (useMoneda y usePais ya lo importan).
import { ejecutar, haySesion } from '../graphql/cliente'
import { cambiarIdioma, type Idioma } from '../i18n'
import { log } from '../log'
import { moneda } from './useMoneda'
import { pais } from './usePais'

const MUTACION_PREFERENCIAS = `mutation actualizarPreferenciasIdioma($entrada: PreferenciasInput!) {
  actualizarPreferencias(entrada: $entrada) { __typename }
}`

/** La elección del selector (header o perfil). Si no se puede guardar en la cuenta, sigue valiendo en este navegador. */
export async function elegirIdioma(valor: Idioma, fetchFn: typeof fetch = fetch): Promise<void> {
  cambiarIdioma(valor)
  if (!haySesion()) return
  // La moneda es obligatoria en la mutación y el país se manda para no perderlo: los actuales, sin cambiarlos.
  try {
    await ejecutar(
      MUTACION_PREFERENCIAS,
      { entrada: { idioma: valor, moneda: moneda.value, pais: pais.value } },
      fetchFn,
    )
  } catch {
    log.warn('No se pudo guardar el idioma en la cuenta')
  }
}

/** El idioma de la cuenta, al iniciar sesión o recuperarla. AUTH lo guarda como `ES` o `EN`. */
export function adoptarIdiomaDeCuenta(valor: string | null | undefined): void {
  const normalizado = valor?.toUpperCase()
  if (normalizado === 'ES' || normalizado === 'EN') cambiarIdioma(normalizado)
}
