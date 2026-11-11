// Historial de fuentes consultadas del ASESOR (W01-04, QA 2026-11-10 Q-08, contrato v0.45). El BFF filtra por el asesor
// del token: nunca llega lo de otro. Cada renglón es una cotización: el documento va enmascarado y cada fuente trae su
// estado, nunca sus datos.
import { reactive } from 'vue'
import { ejecutar } from '../graphql/cliente'
import type { ConsultaFuentes } from '../graphql/tipos'
import { t } from '../i18n'

export const TAMANO_PAGINA_CONSULTAS = 10

const CAMPOS = `id creadaEn documentoEnmascarado tipoOferta producto ofertaId
  fuentes { id nombre origen estado capturadoEn }`
const LISTA = `query consultasFuentes($pagina: Int, $tamano: Int) {
  consultasFuentes(pagina: $pagina, tamano: $tamano) { consultas { ${CAMPOS} } total pagina tamano }
}`
const DETALLE = `query consultaFuentes($id: ID!) { consultaFuentes(id: $id) { ${CAMPOS} } }`

export function useConsultasFuentes(fetchFn: typeof fetch = fetch) {
  const estado = reactive({
    consultas: [] as ConsultaFuentes[],
    total: 0,
    pagina: 1,
    cargando: false,
    error: null as string | null,
  })
  let peticion = 0

  async function cargar(): Promise<void> {
    const esta = ++peticion
    estado.cargando = true
    estado.error = null
    try {
      const datos = await ejecutar<{ consultasFuentes: { consultas: ConsultaFuentes[]; total: number } }>(
        LISTA,
        { pagina: estado.pagina, tamano: TAMANO_PAGINA_CONSULTAS },
        fetchFn,
      )
      if (esta !== peticion) return // llegó otra consulta después: esta quedó vieja
      estado.consultas = datos.consultasFuentes.consultas
      estado.total = datos.consultasFuentes.total
    } catch {
      if (esta !== peticion) return
      estado.error = t('fuentes.historial.error')
    } finally {
      if (esta === peticion) estado.cargando = false
    }
  }

  function irAPagina(pagina: number): Promise<void> {
    estado.pagina = pagina
    return cargar()
  }

  return { estado, cargar, irAPagina }
}

/** Una consulta del historial. `problema`: `no-encontrada` si el BFF respondió null (inexistente o de otro asesor). */
export function useConsultaFuentes(fetchFn: typeof fetch = fetch) {
  const estado = reactive({
    consulta: null as ConsultaFuentes | null,
    cargando: false,
    problema: null as 'no-encontrada' | 'error' | null,
  })
  let peticion = 0

  async function cargar(id: string): Promise<void> {
    const esta = ++peticion
    estado.cargando = true
    estado.problema = null
    estado.consulta = null
    try {
      const datos = await ejecutar<{ consultaFuentes: ConsultaFuentes | null }>(DETALLE, { id }, fetchFn)
      if (esta !== peticion) return
      estado.consulta = datos.consultaFuentes
      estado.problema = datos.consultaFuentes ? null : 'no-encontrada'
    } catch {
      if (esta !== peticion) return
      estado.problema = 'error'
    } finally {
      if (esta === peticion) estado.cargando = false
    }
  }

  return { estado, cargar }
}
