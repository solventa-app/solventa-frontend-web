// Reglas de composición de la clave. Son las mismas que exige el backend (AUTH y BFF, `reglas_clave.py`): 8 a 128
// caracteres, una mayúscula, una minúscula y un carácter especial (cualquiera que no sea letra ni número). Aquí solo
// sirven para mostrar los indicadores mientras se escribe; quien decide es el BFF.
export const CLAVE_MINIMA = 8
export const CLAVE_MAXIMA = 128

export interface ReglasClave {
  longitud: boolean
  mayuscula: boolean
  minuscula: boolean
  especial: boolean
  /** Todas las reglas se cumplen. */
  cumple: boolean
}

export function evaluarClave(clave: string): ReglasClave {
  const largo = [...clave].length
  const longitud = largo >= CLAVE_MINIMA && largo <= CLAVE_MAXIMA
  const mayuscula = /\p{Lu}/u.test(clave)
  const minuscula = /\p{Ll}/u.test(clave)
  const especial = /[^\p{L}\p{N}]/u.test(clave)
  return { longitud, mayuscula, minuscula, especial, cumple: longitud && mayuscula && minuscula && especial }
}
