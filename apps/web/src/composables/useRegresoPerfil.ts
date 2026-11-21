// A dónde vuelve el usuario al salir de «Mi perfil» (G-05): la pantalla desde la que abrió el avatar del header.
// Solo vive en memoria (es una ruta interna, sin datos personales); al recargar en el perfil se vuelve al inicio.
import { ref } from 'vue'

const rutaPrevia = ref<string | null>(null)

/** Lo llama el header al abrir el perfil desde otra pantalla. */
export function recordarRutaAntesDePerfil(ruta: string): void {
  if (/^\/(?!\/)/.test(ruta) && !ruta.startsWith('/perfil')) rutaPrevia.value = ruta
}

/** La ruta a la que debe volver el botón «Volver» del perfil, o `null` si no se conoce. */
export function rutaAntesDePerfil(): string | null {
  return rutaPrevia.value
}

/** Solo para pruebas. */
export function olvidarRutaAntesDePerfil(): void {
  rutaPrevia.value = null
}
