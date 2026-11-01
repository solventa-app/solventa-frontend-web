// T18: plazo mínimo y máximo del crédito, sin números escritos en la pantalla. Parte del catálogo
// versionado (copia de contrato/jurisdicciones.json: el rango que cubre a los siete países) y se
// actualiza con la consulta `jurisdicciones` del BFF; si esa consulta falla, queda el catálogo.
import { reactive } from 'vue'
import { ejecutar } from '../graphql/cliente'
import type { Jurisdiccion as JurisdiccionBff } from '../graphql/tipos'
import { LISTA_JURISDICCIONES } from '../utils/jurisdicciones'

export interface LimitesPlazo {
  min: number
  max: number
}

/** Rango que cubre a todos los países (la solicitud W01-01 no lleva país). */
export function limitesDe(lista: { plazo_min: number; plazo_max: number }[]): LimitesPlazo {
  return {
    min: Math.min(...lista.map((j) => j.plazo_min)),
    max: Math.max(...lista.map((j) => j.plazo_max)),
  }
}

const limites = reactive<LimitesPlazo>(limitesDe(LISTA_JURISDICCIONES))

const CONSULTA = 'query jurisdicciones { jurisdicciones { codigo plazoMin plazoMax } }'

export async function cargarLimitesPlazo(fetchFn: typeof fetch = fetch): Promise<void> {
  try {
    const datos = await ejecutar<{ jurisdicciones: Pick<JurisdiccionBff, 'codigo' | 'plazoMin' | 'plazoMax'>[] }>(
      CONSULTA,
      {},
      fetchFn,
    )
    if (!datos.jurisdicciones.length) return
    const nuevos = limitesDe(datos.jurisdicciones.map((j) => ({ plazo_min: j.plazoMin, plazo_max: j.plazoMax })))
    limites.min = nuevos.min
    limites.max = nuevos.max
  } catch {
    // Sin respuesta del BFF se conserva el catálogo del contrato: la validación sigue funcionando.
  }
}

export function useLimitesPlazo() {
  return { limites, cargarLimitesPlazo }
}
