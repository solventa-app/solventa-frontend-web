// T20 · Países (los siete de jurisdicciones) y tipos de documento por país, del catálogo del contrato
// (`contrato/jurisdicciones.json`, `tipos_documento` desde la v0.33): código, etiqueta en español e inglés y el formato
// con que el backend valida el número (`documentoValido`). Así la web y el BFF validan igual.
import { LISTA_JURISDICCIONES } from './jurisdicciones'

export const PAISES: string[] = LISTA_JURISDICCIONES.map((j) => j.codigo.toUpperCase())

export interface TipoDocumento {
  codigo: string
  etiqueta: string
}

function tiposDelPais(pais: string) {
  const j = LISTA_JURISDICCIONES.find((x) => x.codigo.toUpperCase() === pais.toUpperCase())
  return j?.tipos_documento ?? []
}

/** Tipos válidos del país, en el orden del catálogo: el nacional primero (más CE en Colombia) y el pasaporte. */
export function tiposDocumento(pais: string, idioma: 'ES' | 'EN'): TipoDocumento[] {
  return tiposDelPais(pais).map((x) => ({
    codigo: x.codigo,
    etiqueta: idioma === 'EN' ? x.etiqueta_en : x.etiqueta_es,
  }))
}

/** Sin espacios, puntos ni guiones y en mayúsculas, como el BFF antes de validar y guardar. */
export function limpiarDocumento(numero: string): string {
  return numero.replace(/[\s.-]/g, '').toUpperCase()
}

/** True si el tipo existe en el país y el número cumple su formato (la misma regla de `documentoValido`). */
export function documentoCumpleFormato(pais: string, tipo: string, numero: string): boolean {
  const definicion = tiposDelPais(pais).find((x) => x.codigo === tipo.toUpperCase())
  if (!definicion) return false
  return new RegExp(definicion.formato).test(limpiarDocumento(numero))
}

/** Nombre del país en el idioma elegido (Intl.DisplayNames), con el código por delante. */
export function nombrePais(codigo: string, idioma: 'ES' | 'EN'): string {
  let nombre = codigo
  try {
    nombre = new Intl.DisplayNames([idioma === 'EN' ? 'en' : 'es'], { type: 'region' }).of(codigo) ?? codigo
  } catch {
    // Entorno sin Intl.DisplayNames: se deja el código.
  }
  return `${codigo} · ${nombre}`
}
