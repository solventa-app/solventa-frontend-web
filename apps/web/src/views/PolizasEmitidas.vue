<!--
  G-06 · «Mis pólizas» (cliente) y «Pólizas emitidas» (asesor). Mismo componente: el rol de la sesión decide el título,
  la columna del titular y las acciones. Sin Figma propio (destino de las tarjetas de G-02 y G-02a): usa la misma
  tabla, pestañas y paginador de W05-01.
  - Pagina en el servidor y se actualiza por SSE (aviso `propuesta`); la conexión solo vive con la pestaña visible.
  - Sin filtro y con exactamente UNA póliza, cualquiera de los dos roles pasa directo al detalle G-06b (también si la
    primera llega por aviso estando en el estado vacío). `?lista=1` (el «Volver» del detalle) conserva la tabla.
  - Toda la fila abre el detalle (clic, y con teclado por el número de póliza, que es un enlace).
  - Desde 640 px es una tabla; debajo, una tarjeta por póliza (misma información y mismas acciones).
  - Estado vacío con camino a una cotización nueva. «Retomar» solo para el asesor: el cliente continúa con su enlace.
  - El monto convertido es el de consulta (D-2): la póliza firmada y cobrada conserva su moneda en el PDF.
-->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AccionPoliza from '../components/AccionPoliza.vue'
import InsigniaEstadoPoliza from '../components/InsigniaEstadoPoliza.vue'
import { Boton, FooterPantalla, HeaderPantalla, Paginador, TituloPantalla } from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
import { useAvisos } from '../composables/useAvisos'
import { montoVisible } from '../composables/useMoneda'
import { TAMANO_PAGINA_POLIZAS, usePolizas } from '../composables/usePolizas'
import { useSesion } from '../composables/useSesion'
import type { EstadoVisible, Propuesta } from '../graphql/tipos'
import { t } from '../i18n'
import { estadoVisibleDe as visible } from '../utils/estadoPoliza'
import { formatearFecha } from '../utils/formato'

const router = useRouter()
const route = useRoute()
const { estado: sesion } = useSesion()
const { estado, cargar, filtrar, irAPagina, aplicarAviso, detener, pdf } = usePolizas()
const avisos = useAvisos(null, fetch, undefined, aplicarAviso)

const esAsesor = computed(() => sesion.rol === 'ASESOR')
const titulo = computed(() => (esAsesor.value ? t('polizas.tituloAsesor') : t('polizas.tituloCliente')))
const rutaInicio = computed(() => (esAsesor.value ? '/asesor' : '/inicio'))

// Una sola póliza emitida (sin filtro): se abre su detalle, para el cliente y para el asesor. `replace` para que
// «Atrás» no vuelva a rebotar; `?lista=1` (el «Volver» del detalle) pide ver la tabla.
watch(
  () => [estado.cargando, estado.total, estado.filtro, estado.propuestas] as const,
  () => {
    if (route.query.lista !== undefined || estado.cargando || estado.filtro !== undefined || estado.total !== 1) return
    const unica = estado.propuestas[0]
    if (unica && visible(unica) === 'EMITIDA' && unica.poliza) {
      void router.replace(`/polizas/${unica.id}`)
    }
  },
)

function abrirDetalle(p: Propuesta) {
  void router.push(`/polizas/${p.id}`)
}

const PESTANAS: (EstadoVisible | undefined)[] = [undefined, 'EMITIDA', 'EMITIENDO', 'NO_EMITIDA']
const totalPaginas = computed(() => Math.max(1, Math.ceil(estado.total / TAMANO_PAGINA_POLIZAS)))
const pagina = computed({
  get: () => estado.pagina,
  set: (valor: number) => void irAPagina(valor),
})

const errorPdf = ref(false)
const abriendo = ref<string | null>(null)
const urls: string[] = []

async function verPdf(p: Propuesta) {
  if (!p.poliza) return
  abriendo.value = p.id
  errorPdf.value = false
  const url = await pdf(p.poliza.documentoUrl)
  abriendo.value = null
  if (!url) {
    errorPdf.value = true
    return
  }
  urls.push(url)
  if (!window.open(url, '_blank')) {
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = `poliza-${p.poliza.numero}.pdf`
    enlace.click()
  }
}

// La conexión solo vive con la pestaña visible; al volver se consulta una vez lo que pasó mientras tanto.
function alCambiarVisibilidad() {
  if (document.visibilityState === 'hidden') {
    avisos.cerrar()
    return
  }
  void avisos.abrir()
  void cargar({ silencioso: true })
}

onMounted(() => {
  void cargar()
  void avisos.abrir()
  document.addEventListener('visibilitychange', alCambiarVisibilidad)
})
onUnmounted(() => {
  avisos.cerrar()
  detener()
  urls.forEach((url) => URL.revokeObjectURL(url))
  document.removeEventListener('visibilitychange', alCambiarVisibilidad)
})
</script>

<template>
  <div data-pantalla="G-06" class="sentry-block flex h-screen flex-col overflow-hidden bg-fondo">
    <HeaderPantalla :titulo="titulo" />
    <TituloPantalla class="sr-only">{{ titulo }}</TituloPantalla>

    <main class="mx-auto flex w-full max-w-[1100px] min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-6 sm:px-10">
      <RouterLink :to="rutaInicio" class="text-[13px] font-normal text-primario hover:underline">
        {{ t('polizas.volver') }}
      </RouterLink>

      <p v-if="estado.cargando" class="text-[13px] text-tinta-suave">{{ t('polizas.cargando') }}</p>
      <p v-else-if="estado.error" role="alert" class="text-[13px] text-error">{{ estado.error }}</p>

      <template v-else>
        <div role="tablist" :aria-label="t('polizas.filtros')" class="flex w-full flex-wrap items-center gap-2">
          <button
            v-for="pestana in PESTANAS"
            :key="pestana ?? 'TODAS'"
            type="button"
            role="tab"
            :aria-selected="estado.filtro === pestana"
            class="flex h-11 items-center rounded-xl px-[16px] text-[12px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
            :class="
              estado.filtro === pestana
                ? 'bg-primario text-white'
                : 'border border-borde bg-white text-tinta-suave hover:bg-fondo'
            "
            @click="filtrar(pestana)"
          >
            {{ pestana ? t(`polizas.pestana.${pestana}`) : t('polizas.todas') }}
          </button>
        </div>

        <p v-if="errorPdf" role="alert" class="text-[13px] text-error">{{ t('polizas.errorPdf') }}</p>

        <div
          v-if="estado.total === 0"
          data-prueba="polizas-vacio"
          class="flex w-full flex-col items-center gap-3 rounded-lg border border-borde bg-white px-6 py-12 text-center"
        >
          <IconoMaterial nombre="description" class="h-8 w-8 text-tinta-suave" />
          <p class="text-[16px] font-semibold text-tinta">
            {{ estado.filtro ? t('polizas.vacioFiltro') : t('polizas.vacio') }}
          </p>
          <p class="text-[13px] text-tinta-suave">
            {{ esAsesor ? t('polizas.vacioTextoAsesor') : t('polizas.vacioTextoCliente') }}
          </p>
          <RouterLink to="/cotizacion">
            <Boton>{{ esAsesor ? t('polizas.nuevaCotizacion') : t('polizas.cotizar') }}</Boton>
          </RouterLink>
        </div>

        <div v-else class="w-full overflow-hidden rounded-lg border border-borde bg-white">
          <ul class="flex flex-col sm:hidden" data-prueba="tarjetas-polizas">
            <li
              v-for="p in estado.propuestas"
              :key="p.id"
              data-prueba="tarjeta-poliza"
              class="flex cursor-pointer flex-col gap-3 border-b border-borde p-4"
              @click="abrirDetalle(p)"
            >
              <div class="flex flex-wrap items-center justify-between gap-2">
                <RouterLink
                  :to="`/polizas/${p.id}`"
                  class="font-mono text-[13px] text-enlace hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
                  :aria-label="t('polizas.verDetalle', { numero: p.poliza?.numero ?? '—' })"
                  @click.stop
                >
                  {{ p.poliza?.numero ?? '—' }}
                </RouterLink>
                <InsigniaEstadoPoliza :estado="visible(p)" />
              </div>
              <p class="text-[12px] text-tinta-suave" data-prueba="producto-tarjeta">
                {{ t(`auto.producto.${p.producto ?? 'VIDA_DEUDOR'}`)
                }}<template v-if="p.vehiculo"> · {{ p.vehiculo.marca }} {{ p.vehiculo.placaEnmascarada }}</template>
              </p>
              <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
                <div v-if="esAsesor" class="col-span-2">
                  <dt class="text-[11px] text-tinta-suave">{{ t('polizas.titular') }}</dt>
                  <dd class="text-tinta">{{ p.nombreTitular ?? '—' }}</dd>
                </div>
                <div>
                  <dt class="text-[11px] text-tinta-suave">{{ t('polizas.prima') }}</dt>
                  <dd class="text-tinta">{{ montoVisible(p.prima) }}</dd>
                </div>
                <div>
                  <dt class="text-[11px] text-tinta-suave">{{ t('polizas.cobertura') }}</dt>
                  <dd class="text-tinta">{{ montoVisible(p.cobertura) }}</dd>
                </div>
                <div class="col-span-2">
                  <dt class="text-[11px] text-tinta-suave">{{ t('polizas.actualizada') }}</dt>
                  <dd class="text-tinta-suave">{{ formatearFecha(p.actualizadoEn) }}</dd>
                </div>
              </dl>
              <div>
                <AccionPoliza :propuesta="p" :es-asesor="esAsesor" :abriendo="abriendo === p.id" @ver-pdf="verPdf(p)" />
              </div>
            </li>
          </ul>
          <div class="hidden max-h-[520px] overflow-auto sm:block">
            <table class="w-full min-w-[800px] border-collapse text-left">
              <thead>
                <tr class="border-b border-borde bg-[#f6f3f2] text-[13px] font-semibold text-tinta">
                  <th v-if="esAsesor" scope="col" class="py-[25px] pl-4 pr-[14px]">{{ t('polizas.titular') }}</th>
                  <th scope="col" class="py-[25px] pr-[14px]" :class="{ 'pl-4': !esAsesor }">
                    {{ t('polizas.poliza') }}
                  </th>
                  <th scope="col" class="py-[25px] pr-[14px] text-right">{{ t('polizas.prima') }}</th>
                  <th scope="col" class="py-[25px] pr-[14px] text-right">{{ t('polizas.cobertura') }}</th>
                  <th scope="col" class="py-[25px] pr-[14px]">{{ t('polizas.estado') }}</th>
                  <th scope="col" class="py-[25px] pr-[14px]">{{ t('polizas.actualizada') }}</th>
                  <th scope="col" class="py-[25px] pr-4 text-center">{{ t('polizas.acciones') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="p in estado.propuestas"
                  :key="p.id"
                  data-prueba="fila-poliza"
                  class="cursor-pointer border-b border-borde last:border-b-0 hover:bg-fondo"
                  @click="abrirDetalle(p)"
                >
                  <td v-if="esAsesor" class="py-[20px] pl-4 pr-[14px] text-[13px] text-tinta">
                    {{ p.nombreTitular ?? '—' }}
                  </td>
                  <td class="py-[20px] pr-[14px] font-mono text-[13px] text-tinta-suave" :class="{ 'pl-4': !esAsesor }">
                    <RouterLink
                      :to="`/polizas/${p.id}`"
                      class="text-enlace hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
                      :aria-label="t('polizas.verDetalle', { numero: p.poliza?.numero ?? '—' })"
                      @click.stop
                    >
                      {{ p.poliza?.numero ?? '—' }}
                    </RouterLink>
                    <span class="block font-sans text-[11px]" data-prueba="producto">
                      {{ t(`auto.producto.${p.producto ?? 'VIDA_DEUDOR'}`)
                      }}<template v-if="p.vehiculo">
                        · {{ p.vehiculo.marca }} {{ p.vehiculo.placaEnmascarada }}</template
                      >
                    </span>
                  </td>
                  <td class="py-[20px] pr-[14px] text-right text-[13px] text-tinta">{{ montoVisible(p.prima) }}</td>
                  <td class="py-[20px] pr-[14px] text-right text-[13px] text-tinta">
                    {{ montoVisible(p.cobertura) }}
                  </td>
                  <td class="py-[18px] pr-[14px]">
                    <InsigniaEstadoPoliza :estado="visible(p)" />
                  </td>
                  <td class="py-[20px] pr-[14px] text-[13px] text-tinta-suave">
                    {{ formatearFecha(p.actualizadoEn) }}
                  </td>
                  <td class="py-[16px] pr-4 text-center">
                    <AccionPoliza
                      :propuesta="p"
                      :es-asesor="esAsesor"
                      :abriendo="abriendo === p.id"
                      @ver-pdf="verPdf(p)"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-4 border-t border-borde bg-[#f6f3f2] px-4 py-3">
            <Paginador v-model:pagina="pagina" :total-paginas="totalPaginas" />
            <span class="text-[11px] text-tinta-suave">
              {{ t('polizas.mostrando', { visibles: estado.propuestas.length, total: estado.total }) }}
            </span>
          </div>
        </div>
      </template>
    </main>
    <FooterPantalla />
  </div>
</template>
