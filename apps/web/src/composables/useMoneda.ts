// Moneda en que se muestra la web (KAN-209), elegida con el selector del header. Es un `ref` global, como el idioma.
// Se recuerda en `localStorage` (`solventa.moneda`, no es un dato personal) y, con sesión, en la cuenta con
// `actualizarPreferencias`. Al iniciar sesión prevalece la de la cuenta.
//
// Regla de toda la web (docs/convenciones.md): lo que se consulta se convierte con `montoVisible`; lo que se firma, cobra
// o captura sigue en su moneda original con `formatearMonto` y el selector deshabilitado (`monedaFija` en el header).
// Las tasas son de referencia: la prima se calcula y se cobra en la moneda original.
import { reactive, ref } from 'vue'
import { ejecutar, haySesion } from '../graphql/cliente'
import type { Monto } from '../graphql/tipos'
import { idioma } from '../i18n'
import { log } from '../log'
import { formatearMonto, formatearRangoMonto } from '../utils/formato'

export const MONEDA_BASE = 'COP'
const CLAVE_ALMACEN = 'solventa.moneda'
/** Tope del BFF por llamada (`MAXIMO_MONTOS`). */
const MAXIMO_POR_LLAMADA = 50

const CONSULTA_CONVERTIR = `query convertirMontos($montos: [MontoInput!]!, $moneda: String!) {
  convertirMontos(montos: $montos, moneda: $moneda) { valor moneda }
}`
const MUTACION_PREFERENCIAS = `mutation actualizarPreferencias($entrada: PreferenciasInput!) {
  actualizarPreferencias(entrada: $entrada) { __typename }
}`

type MontoBase = Pick<Monto, 'valor' | 'moneda'>
/** Convierte una lista de montos; responde en el mismo orden. */
export type Conversor = (montos: MontoBase[], moneda: string) => Promise<MontoBase[]>

function monedaGuardada(): string {
  try {
    return localStorage.getItem(CLAVE_ALMACEN) ?? MONEDA_BASE
  } catch {
    return MONEDA_BASE
  }
}

function recordar(valor: string): void {
  try {
    localStorage.setItem(CLAVE_ALMACEN, valor)
  } catch {
    // Sin almacenamiento (modo privado estricto): la moneda dura hasta recargar.
  }
}

const conversorGraphQL: Conversor = async (montos, destino) => {
  const datos = await ejecutar<{ convertirMontos: MontoBase[] }>(CONSULTA_CONVERTIR, {
    montos: montos.map(({ valor, moneda }) => ({ valor, moneda })),
    moneda: destino,
  })
  return datos.convertirMontos
}

export const moneda = ref(monedaGuardada())
/** La última conversión falló: la web muestra los valores originales y lo avisa en el header. */
export const conversionFallida = ref(false)

const conversiones = reactive(new Map<string, MontoBase>())
const porPedir = new Map<string, MontoBase>()
const yaPedidos = new Set<string>()
let conversor = conversorGraphQL
let vaciadoProgramado = false

const claveDe = (monto: MontoBase, destino: string) => `${monto.valor}|${monto.moneda}|${destino}`

/** El portal de socios no tiene sesión de GraphQL: convierte con su propia API. */
export function usarConversor(nuevo: Conversor | null): void {
  conversor = nuevo ?? conversorGraphQL
  olvidarConversiones()
}

function olvidarConversiones(): void {
  conversiones.clear()
  porPedir.clear()
  yaPedidos.clear()
  conversionFallida.value = false
}

async function pedirLote(lote: [string, MontoBase][], destino: string): Promise<void> {
  try {
    const convertidos = await conversor(
      lote.map(([, monto]) => monto),
      destino,
    )
    // Si cambió la moneda mientras tanto, esta respuesta ya no sirve.
    if (destino !== moneda.value) return
    lote.forEach(([clave], indice) => conversiones.set(clave, convertidos[indice]))
  } catch {
    // Nunca un error en pantalla (regla 5): queda el monto original y el aviso del header.
    if (destino === moneda.value) conversionFallida.value = true
    log.warn('No se pudieron convertir los montos', { cantidad: lote.length })
  }
}

function vaciarPedidos(): void {
  vaciadoProgramado = false
  const pedidos = [...porPedir]
  porPedir.clear()
  for (let inicio = 0; inicio < pedidos.length; inicio += MAXIMO_POR_LLAMADA) {
    void pedirLote(pedidos.slice(inicio, inicio + MAXIMO_POR_LLAMADA), moneda.value)
  }
}

function pedir(clave: string, monto: MontoBase): void {
  if (yaPedidos.has(clave)) return
  yaPedidos.add(clave)
  porPedir.set(clave, monto)
  if (vaciadoProgramado) return
  vaciadoProgramado = true
  queueMicrotask(vaciarPedidos)
}

/** El monto en la moneda elegida. Mientras llega la conversión, o si falla, devuelve el original. */
function convertido(monto: MontoBase): MontoBase {
  if (monto.moneda === moneda.value) return monto
  const clave = claveDe(monto, moneda.value)
  const resultado = conversiones.get(clave)
  if (resultado) return resultado
  pedir(clave, monto)
  return monto
}

export function montoVisible(monto: MontoBase): string {
  return formatearMonto(convertido(monto))
}

export function rangoMontoVisible(minima: MontoBase, maxima: MontoBase): string {
  return formatearRangoMonto(convertido(minima), convertido(maxima))
}

function fijarMoneda(valor: string): void {
  if (valor === moneda.value) return
  moneda.value = valor
  olvidarConversiones()
  recordar(valor)
}

/** La elección del selector del header. Si no se puede guardar en la cuenta, sigue valiendo en este navegador. */
export async function cambiarMoneda(valor: string, fetchFn: typeof fetch = fetch): Promise<void> {
  fijarMoneda(valor)
  if (!haySesion()) return
  try {
    await ejecutar(MUTACION_PREFERENCIAS, { entrada: { idioma: idioma.value, moneda: valor } }, fetchFn)
  } catch {
    log.warn('No se pudo guardar la moneda en la cuenta')
  }
}

/** La moneda de la cuenta, al iniciar sesión o recuperarla. */
export function adoptarMonedaDeCuenta(valor: string | null | undefined): void {
  if (valor) fijarMoneda(valor)
}
