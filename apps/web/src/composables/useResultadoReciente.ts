// Patrón común de las confirmaciones de HU-W04 (W04-03a/b/c): el resultado solo es válido si la última
// acción en memoria es un Siniestro con el id de la URL y la resolución esperada. Si no (URL directa,
// recarga, id o tipo distinto) la pantalla muestra el estado vacío; no se llama al backend.
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import type { Siniestro, TipoResolucion } from '../graphql/tipos-siniestros'
import { esSiniestro, useSiniestros } from './useSiniestros'

export function useResultadoReciente(tipo: TipoResolucion) {
  const route = useRoute()
  const { estado } = useSiniestros()
  return computed<Siniestro | null>(() => {
    const r = estado.resultado
    return esSiniestro(r) && r.id === String(route.params.id) && r.resolucion?.tipo === tipo ? r : null
  })
}
