import catalogoJson from '../contrato/jurisdicciones.json'

export interface Jurisdiccion {
  codigo: string
  nombre: string
  moneda: string
  tipo_documento: string
  region_datos: string
  monto_min: number
  monto_max: number
  plazo_min: number
  plazo_max: number
  dti_maximo: number
  paso_monto?: number
  regimen_open_finance: string
}

export const LISTA_JURISDICCIONES: Jurisdiccion[] = catalogoJson as Jurisdiccion[]

export const JURISDICCIONES: Record<string, Jurisdiccion> = Object.fromEntries(
  LISTA_JURISDICCIONES.map((j) => [j.codigo.toUpperCase(), j]),
)

export function obtenerJurisdiccion(codigo: string): Jurisdiccion {
  const normalizado = codigo?.toUpperCase()
  const jur = JURISDICCIONES[normalizado]
  if (!jur) {
    const soportados = Object.keys(JURISDICCIONES)
      .sort((a, b) => a.localeCompare(b))
      .join(', ')
    throw new Error(`País '${codigo}' no soportado. Soportados: ${soportados}`)
  }
  return jur
}

export function soloDigitos(valor: string): string {
  return valor.replace(/\D/g, '')
}

/**
 * Algoritmo de Luhn (módulo 10).
 */
export function validarLuhn(valor: string): boolean {
  const digitos = soloDigitos(valor)
  if (!digitos) return false
  let suma = 0
  let par = false
  for (let i = digitos.length - 1; i >= 0; i--) {
    let n = parseInt(digitos[i], 10)
    if (par) {
      n *= 2
      if (n > 9) n -= 9
    }
    suma += n
    par = !par
  }
  return suma % 10 === 0
}

/**
 * Validador de cédula de ciudadanía colombiana (CO).
 */
export function validarCcCo(valor: string): { valido: boolean; normalizado?: string; error?: string } {
  const d = soloDigitos(valor)
  if (d.length < 6 || d.length > 10 || d.startsWith('0')) {
    return { valido: false, error: 'La cédula colombiana debe tener entre 6 y 10 dígitos y no iniciar en 0' }
  }
  return { valido: true, normalizado: d }
}

/**
 * Validador de CURP mexicana (MX).
 */
const CURP_REGEX = /^[A-Z]{4}\d{6}[HMX][A-Z]{5}[A-Z0-9]\d$/
export function validarCurpMx(valor: string): { valido: boolean; normalizado?: string; error?: string } {
  const v = valor.trim().toUpperCase()
  if (!CURP_REGEX.test(v)) {
    return { valido: false, error: 'CURP inválida (18 caracteres, formato AAAA000000HXXXXX00)' }
  }
  return { valido: true, normalizado: v }
}

/**
 * Validador de CPF brasileño (BR).
 */
function calcularDvCpf(base: string): string {
  let actual = base
  for (let step = 0; step < 2; step++) {
    const peso = actual.length + 1
    let suma = 0
    for (let i = 0; i < actual.length; i++) {
      suma += parseInt(actual[i], 10) * (peso - i)
    }
    const r = (suma * 10) % 11
    actual += (r === 10 ? 0 : r).toString()
  }
  return actual.slice(-2)
}

export function validarCpfBr(valor: string): { valido: boolean; normalizado?: string; error?: string } {
  const d = soloDigitos(valor)
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) {
    return { valido: false, error: 'CPF inválido (debe tener 11 dígitos no repetidos)' }
  }
  if (calcularDvCpf(d.slice(0, 9)) !== d.slice(9)) {
    return { valido: false, error: 'Dígitos verificadores de CPF incorrectos' }
  }
  return { valido: true, normalizado: d }
}

/**
 * Validador de RUT chileno (CL).
 */
function calcularDvRut(cuerpo: string): string {
  let suma = 0
  let m = 2
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += parseInt(cuerpo[i], 10) * m
    m = m === 7 ? 2 : m + 1
  }
  const r = 11 - (suma % 11)
  if (r === 11) return '0'
  if (r === 10) return 'K'
  return r.toString()
}

export function validarRutCl(valor: string): { valido: boolean; normalizado?: string; error?: string } {
  const v = valor.replace(/\./g, '').replace(/-/g, '').trim().toUpperCase()
  if (!/^\d{7,8}[0-9K]$/.test(v)) {
    return { valido: false, error: 'RUT inválido (formato esperado 7-8 dígitos más dígito verificador)' }
  }
  const cuerpo = v.slice(0, -1)
  const dv = v.slice(-1)
  if (calcularDvRut(cuerpo) !== dv) {
    return { valido: false, error: 'Dígito verificador de RUT incorrecto' }
  }
  return { valido: true, normalizado: `${cuerpo}-${dv}` }
}

/**
 * Validador de DNI peruano (PE).
 */
export function validarDniPe(valor: string): { valido: boolean; normalizado?: string; error?: string } {
  const d = soloDigitos(valor)
  if (d.length !== 8) {
    return { valido: false, error: 'El DNI peruano debe tener 8 dígitos' }
  }
  return { valido: true, normalizado: d }
}

/**
 * Validador de SSN estadounidense (US).
 */
export function validarSsnUs(valor: string): { valido: boolean; normalizado?: string; error?: string } {
  const d = soloDigitos(valor)
  if (d.length !== 9) {
    return { valido: false, error: 'El SSN debe tener 9 dígitos' }
  }
  const area = d.slice(0, 3)
  const grupo = d.slice(3, 5)
  const serie = d.slice(5)
  if (area === '000' || area === '666' || area.startsWith('9') || grupo === '00' || serie === '0000') {
    return { valido: false, error: 'SSN inválido por rangos reservados' }
  }
  return { valido: true, normalizado: d }
}

/**
 * Validador de DNI / NIE español (ES).
 */
const LETRAS_DNI = 'TRWAGMYFPDXBNJZSQVHLCKE'
export function validarDniEs(valor: string): { valido: boolean; normalizado?: string; error?: string } {
  const v = valor.replace(/[-\s]/g, '').toUpperCase()
  const m = v.match(/^([XYZ]?)(\d{7,8})([A-Z])$/)
  if (!m) {
    return { valido: false, error: 'DNI/NIE español inválido' }
  }
  const [, prefijo, numero, letra] = m
  const prefijoNum = prefijo ? 'XYZ'.indexOf(prefijo).toString() : ''
  const n = parseInt(prefijoNum + numero, 10)
  if (LETRAS_DNI[n % 23] !== letra) {
    return { valido: false, error: 'Letra de control del DNI/NIE incorrecta' }
  }
  return { valido: true, normalizado: v }
}

/**
 * Función general de validación de documento según el código de país.
 */
export function validarDocumento(
  pais: string,
  documento: string,
): { valido: boolean; normalizado?: string; error?: string } {
  const codigo = pais?.toUpperCase()
  switch (codigo) {
    case 'CO':
      return validarCcCo(documento)
    case 'MX':
      return validarCurpMx(documento)
    case 'BR':
      return validarCpfBr(documento)
    case 'CL':
      return validarRutCl(documento)
    case 'PE':
      return validarDniPe(documento)
    case 'US':
      return validarSsnUs(documento)
    case 'ES':
      return validarDniEs(documento)
    default:
      return { valido: false, error: `No hay validador disponible para el país '${pais}'` }
  }
}

/**
 * Enmascara el documento conservando los últimos 4 caracteres.
 */
export function enmascararDocumento(documento: string): string {
  const vis = documento.slice(-4)
  const oculto = '*'.repeat(Math.max(documento.length - 4, 2))
  return `${oculto}${vis}`
}
