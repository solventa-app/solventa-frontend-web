<!--
  W01-04 · Fuentes consultadas: el historial del asesor (QA 2026-11-10, Q-08). Una fila por cotización que hizo, de la
  más reciente a la más antigua, con el documento enmascarado, el tipo de oferta y cuántas fuentes respondieron en línea.
  Tocar una fila abre su detalle (W01-04b).
  - Una sola consulta (sin `?lista`): pasa directo al detalle, con `replace` para que «Atrás» no rebote. El «Volver» del
    detalle trae `?lista=1`.
  - Sin consultas: estado vacío con «Nueva cotización». Desde 640 px es una tabla; debajo, una tarjeta por consulta.
  - Solo ASESOR (el router lo exige): el cliente no ve las fuentes (Q-07).
-->
<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Boton, FooterPantalla, HeaderPantalla, MigasDePan, Paginador, TituloPantalla } from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
import { TAMANO_PAGINA_CONSULTAS, useConsultasFuentes } from '../composables/useConsultasFuentes'
import { useSesion } from '../composables/useSesion'
import type { ConsultaFuentes } from '../graphql/tipos'
import { t } from '../i18n'
import { formatearFecha } from '../utils/formato'

const router = useRouter()
const route = useRoute()
const { rutaInicio } = useSesion()
const { estado, cargar, irAPagina } = useConsultasFuentes()

const totalPaginas = computed(() => Math.max(1, Math.ceil(estado.total / TAMANO_PAGINA_CONSULTAS)))
const pagina = computed({
  get: () => estado.pagina,
  set: (valor: number) => void irAPagina(valor),
})

onMounted(() => void cargar())

// Una sola consulta: se abre su detalle. `?lista` (el «Volver» del detalle) pide ver la tabla.
watch(
  () => [estado.cargando, estado.total, estado.consultas] as const,
  () => {
    if (route.query.lista !== undefined || estado.cargando || estado.total !== 1) return
    const unica = estado.consultas[0]
    if (unica) void router.replace(`/cotizacion/fuentes/${unica.id}`)
  },
)

const enLinea = (c: ConsultaFuentes) => c.fuentes.filter((f) => f.estado === 'OK').length
const detalle = (c: ConsultaFuentes) => `/cotizacion/fuentes/${c.id}`
const abrir = (c: ConsultaFuentes) => void router.push(detalle(c))
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden" data-pantalla="W01-04">
    <HeaderPantalla :titulo="t('fuentes.historial.titulo')" />
    <MigasDePan :seccion="t('fuentes.historial.titulo')" :a-inicio="rutaInicio()" />
    <TituloPantalla class="sr-only">{{ t('fuentes.historial.titulo') }}</TituloPantalla>
    <main class="flex min-h-0 flex-1 flex-col items-center overflow-y-auto bg-fondo px-4 py-6 sm:px-10">
      <div class="flex w-full max-w-[960px] flex-col gap-5">
        <p v-if="estado.cargando" class="text-[13px] text-tinta-suave">{{ t('fuentes.historial.cargando') }}</p>
        <p v-else-if="estado.error" role="alert" class="text-[13px] text-error">{{ estado.error }}</p>

        <div
          v-else-if="estado.total === 0"
          data-prueba="fuentes-vacio"
          class="flex w-full flex-col items-center gap-3 rounded-lg border border-borde bg-white px-6 py-12 text-center"
        >
          <IconoMaterial nombre="shield" class="h-8 w-8 text-tinta-suave" />
          <p class="text-[16px] font-semibold text-tinta">{{ t('fuentes.historial.vacio') }}</p>
          <p class="text-[13px] text-tinta-suave">{{ t('fuentes.historial.vacioTexto') }}</p>
          <RouterLink to="/cotizacion" data-prueba="fuentes-nueva">
            <Boton>{{ t('fuentes.nuevaCotizacion') }}</Boton>
          </RouterLink>
        </div>

        <div v-else class="w-full overflow-hidden rounded-lg border border-borde bg-white">
          <ul class="flex flex-col sm:hidden" data-prueba="tarjetas-consultas">
            <li
              v-for="c in estado.consultas"
              :key="c.id"
              data-prueba="tarjeta-consulta"
              class="flex cursor-pointer flex-col gap-2 border-b border-borde p-4"
              @click="abrir(c)"
            >
              <RouterLink
                :to="detalle(c)"
                class="text-[13px] font-semibold text-enlace hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
                :aria-label="t('fuentes.historial.verDetalle', { fecha: formatearFecha(c.creadaEn) })"
                @click.stop
              >
                {{ formatearFecha(c.creadaEn) }}
              </RouterLink>
              <dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
                <div>
                  <dt class="text-[11px] text-tinta-suave">{{ t('fuentes.historial.documento') }}</dt>
                  <dd class="font-mono text-tinta">{{ c.documentoEnmascarado }}</dd>
                </div>
                <div>
                  <dt class="text-[11px] text-tinta-suave">{{ t('fuentes.historial.oferta') }}</dt>
                  <dd class="text-tinta">{{ t(`fuentes.historial.tipo.${c.tipoOferta}`) }}</dd>
                </div>
                <div class="col-span-2">
                  <dt class="text-[11px] text-tinta-suave">{{ t('fuentes.historial.fuentes') }}</dt>
                  <dd class="text-tinta">
                    {{ t('fuentes.historial.resumen', { ok: enLinea(c), total: c.fuentes.length }) }}
                  </dd>
                </div>
              </dl>
            </li>
          </ul>

          <div class="hidden overflow-auto sm:block">
            <table class="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr class="border-b border-borde bg-[#f6f3f2] text-[13px] font-semibold text-tinta">
                  <th scope="col" class="py-[20px] pl-4 pr-[14px]">{{ t('fuentes.historial.fecha') }}</th>
                  <th scope="col" class="py-[20px] pr-[14px]">{{ t('fuentes.historial.documento') }}</th>
                  <th scope="col" class="py-[20px] pr-[14px]">{{ t('fuentes.historial.oferta') }}</th>
                  <th scope="col" class="py-[20px] pr-4">{{ t('fuentes.historial.fuentes') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="c in estado.consultas"
                  :key="c.id"
                  data-prueba="fila-consulta"
                  class="cursor-pointer border-b border-borde last:border-b-0 hover:bg-fondo"
                  @click="abrir(c)"
                >
                  <td class="py-[18px] pl-4 pr-[14px] text-[13px]">
                    <RouterLink
                      :to="detalle(c)"
                      class="font-semibold text-enlace hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
                      :aria-label="t('fuentes.historial.verDetalle', { fecha: formatearFecha(c.creadaEn) })"
                      @click.stop
                    >
                      {{ formatearFecha(c.creadaEn) }}
                    </RouterLink>
                  </td>
                  <td class="py-[18px] pr-[14px] font-mono text-[13px] text-tinta">{{ c.documentoEnmascarado }}</td>
                  <td class="py-[18px] pr-[14px] text-[13px] text-tinta">
                    {{ t(`fuentes.historial.tipo.${c.tipoOferta}`) }}
                  </td>
                  <td class="py-[18px] pr-4 text-[13px] text-tinta-suave">
                    {{ t('fuentes.historial.resumen', { ok: enLinea(c), total: c.fuentes.length }) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-4 border-t border-borde bg-[#f6f3f2] px-4 py-3">
            <Paginador v-model:pagina="pagina" :total-paginas="totalPaginas" />
            <span class="text-[11px] text-tinta-suave">
              {{ t('fuentes.historial.mostrando', { visibles: estado.consultas.length, total: estado.total }) }}
            </span>
          </div>
        </div>
      </div>
    </main>
    <FooterPantalla />
  </div>
</template>
