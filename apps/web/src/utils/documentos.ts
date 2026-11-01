// T20 · Países (los siete de jurisdicciones) y tipos de documento por país.
// El catálogo de tipos vive aquí hasta que el backend publique `tipos_documento` en contracts/jurisdicciones.json;
// el documento nacional de cada país sale de `jurisdicciones` (`tipo_documento`), así no hay dos fuentes del país.
import { LISTA_JURISDICCIONES } from './jurisdicciones'

export const PAISES: string[] = LISTA_JURISDICCIONES.map((j) => j.codigo.toUpperCase())

/** Etiquetas de los tipos que no son el documento nacional (códigos sin traducir). */
const ETIQUETAS: Record<string, { es: string; en: string }> = {
  CC: { es: 'Cédula de ciudadanía', en: 'Citizenship ID (CC)' },
  CE: { es: 'Cédula de extranjería', en: 'Foreigner ID (CE)' },
  CURP: { es: 'CURP', en: 'CURP' },
  CPF: { es: 'CPF', en: 'CPF' },
  RUT: { es: 'RUT', en: 'RUT' },
  DNI: { es: 'DNI', en: 'DNI' },
  SSN: { es: 'SSN', en: 'SSN' },
  PAS: { es: 'Pasaporte', en: 'Passport' },
}

export interface TipoDocumento {
  codigo: string
  etiqueta: string
}

/** Código nacional de jurisdicciones → clave de etiqueta. */
function claveNacional(pais: string): string {
  const j = LISTA_JURISDICCIONES.find((x) => x.codigo.toUpperCase() === pais.toUpperCase())
  return (j?.tipo_documento ?? 'DNI').toUpperCase()
}

/** Tipos válidos del país: el documento nacional (más CE en Colombia) y el pasaporte. */
export function tiposDocumento(pais: string, idioma: 'ES' | 'EN'): TipoDocumento[] {
  const codigos = [claveNacional(pais)]
  if (pais.toUpperCase() === 'CO') codigos.push('CE')
  codigos.push('PAS')
  const l = idioma === 'EN' ? 'en' : 'es'
  return codigos.map((codigo) => ({ codigo, etiqueta: ETIQUETAS[codigo]?.[l] ?? codigo }))
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
