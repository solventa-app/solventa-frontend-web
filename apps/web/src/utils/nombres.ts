// Nombres legibles de las fuentes y de los factores del score (HU-W01, CA-W01-03/06). El BFF devuelve en
// `FuenteConsultada.nombre` y `FactorScore.nombre` el identificador técnico de cada fuente (p. ej.
// `cuentas-bancarias`, ver solventa-backend: services/rating). Aquí se traduce solo lo que se conoce (claves
// `fuente.*` de src/i18n, en el idioma activo): un nombre nuevo se muestra tal cual llega, para no esconder una
// fuente que el backend agregue.
import { t, type Clave } from '../i18n'

const FUENTES_CONOCIDAS = [
  'cuentas-bancarias',
  'historial-crediticio',
  'afiliacion-pila',
  'camara-comercio',
  'antecedentes-judiciales',
]

export function nombreFuente(nombre: string): string {
  return FUENTES_CONOCIDAS.includes(nombre) ? t(`fuente.${nombre}` as Clave) : nombre
}
