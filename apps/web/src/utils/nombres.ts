// Nombres legibles de las fuentes y de los factores del score (HU-W01, CA-W01-03/06). El BFF devuelve en
// `FuenteConsultada.nombre` y `FactorScore.nombre` el identificador técnico de cada fuente (p. ej.
// `cuentas-bancarias`, ver solventa-backend: services/rating). Aquí se traduce solo lo que se conoce: un nombre
// nuevo se muestra tal cual llega, para no esconder una fuente que el backend agregue.
const NOMBRES_FUENTE: Record<string, string> = {
  'cuentas-bancarias': 'Cuentas bancarias',
  'historial-crediticio': 'Historial crediticio',
  'afiliacion-pila': 'Afiliación a seguridad social (PILA)',
  'camara-comercio': 'Cámara de Comercio',
  'antecedentes-judiciales': 'Antecedentes judiciales',
}

export function nombreFuente(nombre: string): string {
  return NOMBRES_FUENTE[nombre] ?? nombre
}
