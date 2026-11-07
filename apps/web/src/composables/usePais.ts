// T20 / T10 · País de la operación y tipo de documento elegido. No es dato personal: se recuerda en el navegador
// (`solventa.pais`) y, con sesión, en la cuenta (`actualizarPreferencias` con `pais`, contrato v0.38). Al iniciar sesión
// prevalece el de la cuenta, como con la moneda.
import { ref } from 'vue'
import { ejecutar, haySesion } from '../graphql/cliente'
import { idioma } from '../i18n'
import { log } from '../log'
import { PAISES, tiposDocumento } from '../utils/documentos'
import { moneda } from './useMoneda'

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

const MUTACION_PREFERENCIAS = `mutation actualizarPreferenciasPais($entrada: PreferenciasInput!) {
  actualizarPreferencias(entrada: $entrada) { __typename }
}`

function fijarPais(valor: string): boolean {
  if (!PAISES.includes(valor)) return false
  if (pais.value !== valor) tipoDocumento.value = tiposDocumento(valor, 'ES')[0]!.codigo
  pais.value = valor
  try {
    localStorage.setItem(CLAVE, valor)
  } catch {
    // Se ignora: la preferencia solo dura la pestaña.
  }
  return true
}

/** Lo elige el usuario (perfil o W01-01): se recuerda y, con sesión, se guarda en la cuenta. */
export async function cambiarPais(valor: string, fetchFn: typeof fetch = fetch): Promise<void> {
  if (!fijarPais(valor) || !haySesion()) return
  // La moneda va en la misma mutación porque es obligatoria: la actual, sin cambiarla.
  try {
    await ejecutar(
      MUTACION_PREFERENCIAS,
      { entrada: { idioma: idioma.value, moneda: moneda.value, pais: valor } },
      fetchFn,
    )
  } catch {
    log.warn('No se pudo guardar el país en la cuenta')
  }
}

/** El país de la cuenta, al iniciar sesión o recuperarla (null: la cuenta aún no tiene uno). */
export function adoptarPaisDeCuenta(valor: string | null | undefined): void {
  if (valor) fijarPais(valor)
}
