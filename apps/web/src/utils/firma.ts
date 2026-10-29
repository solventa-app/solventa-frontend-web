// Validación previa de la imagen de firma (W03-24, límites propuestos por el backend): PNG o JPG por su contenido real
// (no por la extensión), hasta 500 KB y 1200×600, con bordes blancos o transparentes. POLICY la vuelve a validar:
// esto solo evita enviar algo que va a ser rechazado y le dice al cliente qué corregir.
import type { Clave } from '../i18n'

export const MAX_BYTES_FIRMA = 500 * 1024
export const MAX_ANCHO_FIRMA = 1200
export const MAX_ALTO_FIRMA = 600

export type TipoImagen = 'image/png' | 'image/jpeg'

/** Tipo real por los primeros bytes: PNG (89 50 4E 47) o JPG (FF D8 FF). */
export function tipoRealImagen(bytes: Uint8Array): TipoImagen | null {
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png'
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  return null
}

/**
 * Revisa el marco de 2 px de la imagen (RGBA): cada píxel debe ser casi blanco o casi transparente. Así se descarta
 * una foto con fondo (una mesa, una hoja con sombra) que se vería mal estampada en el PDF.
 */
export function bordeLimpio(pixeles: Uint8ClampedArray, ancho: number, alto: number, grosor = 2): boolean {
  const limpio = (x: number, y: number) => {
    const i = (y * ancho + x) * 4
    const [r, g, b, a] = [pixeles[i], pixeles[i + 1], pixeles[i + 2], pixeles[i + 3]]
    return a < 20 || (r > 230 && g > 230 && b > 230)
  }
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) {
      const enBorde = x < grosor || y < grosor || x >= ancho - grosor || y >= alto - grosor
      if (enBorde && !limpio(x, y)) return false
    }
  }
  return true
}

/** Lo que se puede revisar sin decodificar la imagen: tipo real y peso. */
export function revisarArchivoFirma(bytes: Uint8Array): Clave | null {
  if (!tipoRealImagen(bytes)) return 'firma.imagen.errorTipo'
  if (bytes.length > MAX_BYTES_FIRMA) return 'firma.imagen.errorPeso'
  return null
}

/** Lo que se revisa con la imagen decodificada: dimensiones y bordes. */
export function revisarImagenFirma(ancho: number, alto: number, pixeles: Uint8ClampedArray | null): Clave | null {
  if (ancho > MAX_ANCHO_FIRMA || alto > MAX_ALTO_FIRMA) return 'firma.imagen.errorTamano'
  if (pixeles && !bordeLimpio(pixeles, ancho, alto)) return 'firma.imagen.errorFondo'
  return null
}

/** El inverso de `base64DeBytes`: los bytes de la imagen para el PUT directo al bucket. */
export function bytesDeBase64(base64: string): Uint8Array {
  const binario = atob(base64)
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)
  return bytes
}

/** Base64 sin el prefijo `data:…;base64,`: lo que captura el lienzo o el selector. */
export function base64DeBytes(bytes: Uint8Array): string {
  let binario = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  return btoa(binario)
}

export function quitarPrefijoDataUrl(dataUrl: string): string {
  return dataUrl.slice(dataUrl.indexOf(',') + 1)
}
