// T20 / T10 · País de la operación y tipo de documento elegido. Preferencia local (no es dato personal):
// hasta que AUTH guarde `pais` en la cuenta (`actualizarPreferencias`), vive en el navegador.
import { ref } from 'vue'
import { PAISES, tiposDocumento } from '../utils/documentos'

const CLAVE = 'solventa.pais'

function paisInicial(): string {
  try {
    const guardado = localStorage.getItem(CLAVE)
    if (guardado && PAISES.includes(guardado)) return guardado
  } catch {
    // Sin almacenamiento: se sigue con la región del navegador.
  }
  const region = (typeof navigator !== 'undefined' ? navigator.language : '').split('-')[1]?.toUpperCase()
  return region && PAISES.includes(region) ? region : 'CO'
}

export const pais = ref(paisInicial())
export const tipoDocumento = ref(tiposDocumento(pais.value, 'ES')[0]!.codigo)

export function cambiarPais(valor: string): void {
  if (!PAISES.includes(valor)) return
  pais.value = valor
  tipoDocumento.value = tiposDocumento(valor, 'ES')[0]!.codigo
  try {
    localStorage.setItem(CLAVE, valor)
  } catch {
    // Se ignora: la preferencia solo dura la pestaña.
  }
}
