<!--
  W04-01 · Bandeja de siniestros (Figma "Solventa-web-Final", frame 2001:2316). CA-W04-01 a CA-W04-07.

  Diferencias con el frame, acordadas con diseño (docs/plan-ejecucion-hu-w04-siniestros.md, bloque 2):
  - Sin chip "Derivado": derivado y en revisión son el mismo estado (EN_REVISION). Hay un chip por cada estado
    de la tabla (Pendiente, En revisión, Aprobado, Rechazado) después de "Todos".
  - "Total en cola" cuenta solo los abiertos (PENDIENTE + EN_REVISION); el contador de "Todos", lo que muestra.
  - El estado va con Badge (glifo + texto), no con el punto de color; sin sombras (SG-01).
  - "Abrir" lleva al detalle por el `id` del siniestro (W04-02), no por el radicado.
-->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  Badge,
  Boton,
  Chip,
  EstadoOperador,
  FooterPantalla,
  HeaderPantalla,
  MigasDePan,
  Paginador,
} from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
import { useSiniestros } from '../composables/useSiniestros'
import type { EstadoSiniestro } from '../graphql/tipos'
import { t } from '../i18n'
import { formatearFecha, formatearFechaCorta } from '../utils/formato'

const { estado, cargarSiniestros } = useSiniestros()

// `undefined` es "Todos".
const FILTROS: (EstadoSiniestro | undefined)[] = [undefined, 'PENDIENTE', 'EN_REVISION', 'APROBADO', 'RECHAZADO']
const filtro = ref<EstadoSiniestro | undefined>(undefined)

const BADGE: Record<EstadoSiniestro, 'alerta' | 'enCurso' | 'exito' | 'error'> = {
  PENDIENTE: 'alerta',
  EN_REVISION: 'enCurso',
  APROBADO: 'exito',
  RECHAZADO: 'error',
}

// Más reciente primero (por instante, no por texto: el dummy manda offsets); a igual fecha, el radicado mayor.
const ordenados = computed(() =>
  [...estado.siniestros].sort(
    (a, b) => Date.parse(b.notificadoEn) - Date.parse(a.notificadoEn) || b.radicado.localeCompare(a.radicado),
  ),
)
const visibles = computed(() =>
  filtro.value ? ordenados.value.filter((s) => s.estado === filtro.value) : ordenados.value,
)
// Como W05-01: la lista llega completa y se pagina en el navegador.
const TAMANO_PAGINA = 10
const pagina = ref(1)
const totalPaginas = computed(() => Math.max(1, Math.ceil(visibles.value.length / TAMANO_PAGINA)))
const paginados = computed(() => {
  const inicio = (pagina.value - 1) * TAMANO_PAGINA
  return visibles.value.slice(inicio, inicio + TAMANO_PAGINA)
})

function cambiarFiltro(valor?: EstadoSiniestro) {
  filtro.value = valor
  pagina.value = 1
}

const enCola = computed(
  () => estado.siniestros.filter((s) => s.estado === 'PENDIENTE' || s.estado === 'EN_REVISION').length,
)
const textoCola = computed(() =>
  enCola.value === 1 ? t('siniestros.bandeja.caso') : t('siniestros.bandeja.casos', { n: enCola.value }),
)
const listo = computed(() => !estado.cargando && !estado.error)

function etiquetaFiltro(valor?: EstadoSiniestro): string {
  return valor ? t(`siniestros.estado.${valor}`) : t('siniestros.bandeja.todos')
}

onMounted(() => void cargarSiniestros())
</script>

<template>
  <div data-pantalla="W04-01" class="flex h-screen flex-col overflow-hidden bg-fondo">
    <HeaderPantalla :titulo="t('siniestros.bandeja.titulo')" />
    <MigasDePan :seccion="t('siniestros.migas.siniestros')" a-inicio="/operador">
      <template #derecha><EstadoOperador /></template>
    </MigasDePan>

    <main class="min-h-0 flex-1 overflow-y-auto">
      <div class="mx-auto flex w-full max-w-[880px] flex-col gap-5 px-4 py-8 sm:px-10">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-info-fondo">
              <IconoMaterial nombre="inbox" class="h-[18px] w-[18px] text-primario" />
            </span>
            <div>
              <h1 class="text-[22px] font-bold leading-[27.5px] text-tinta">
                {{ t('siniestros.bandeja.encabezado') }}
              </h1>
              <p class="text-[16px] font-semibold leading-6 text-tinta-suave">
                {{ t('siniestros.bandeja.subtitulo') }}
              </p>
            </div>
          </div>
          <p
            v-if="listo"
            data-prueba="total-cola"
            class="rounded border border-borde bg-white px-[13px] py-[7px] text-[11px] leading-[16.5px] text-tinta-suave"
          >
            {{ t('siniestros.bandeja.totalCola') }}
            <strong class="font-semibold text-tinta">{{ textoCola }}</strong>
          </p>
        </div>

        <div role="group" :aria-label="t('siniestros.bandeja.filtros')" class="flex flex-wrap items-center gap-2 py-1">
          <span class="flex items-center gap-1.5 pr-2 text-[13px] font-medium text-tinta-suave">
            <IconoMaterial nombre="filter_list" class="h-[18px] w-[18px]" />
            {{ t('siniestros.bandeja.filtrarPor') }}
          </span>
          <Chip
            v-for="valor in FILTROS"
            :key="valor ?? 'TODOS'"
            tamano="filtro"
            :activo="filtro === valor"
            @click="cambiarFiltro(valor)"
          >
            {{ etiquetaFiltro(valor) }}
            <template v-if="!valor && listo">
              <span
                aria-hidden="true"
                class="ml-1.5 rounded-full px-1.5 text-[11px] font-semibold leading-[16.5px]"
                :class="filtro === undefined ? 'bg-enlace text-white' : 'bg-fondo text-tinta-suave'"
                >{{ estado.siniestros.length }}</span
              >
              <span class="sr-only">{{ t('siniestros.bandeja.contadorSr', { n: estado.siniestros.length }) }}</span>
            </template>
          </Chip>
        </div>

        <p v-if="estado.cargando" role="status" class="text-[13px] text-tinta-suave">
          {{ t('siniestros.bandeja.cargando') }}
        </p>

        <div
          v-else-if="estado.error"
          role="alert"
          class="flex flex-wrap items-center gap-3 rounded border border-error bg-error-fondo px-4 py-3 text-[13px] text-error"
        >
          <IconoMaterial nombre="cancel" class="h-[18px] w-[18px] shrink-0" />
          <span class="flex-1">{{ estado.error }}</span>
          <Boton variante="secundario" @click="cargarSiniestros()">{{ t('siniestros.bandeja.reintentar') }}</Boton>
        </div>

        <div
          v-else-if="estado.siniestros.length === 0"
          class="flex flex-col items-center gap-3 rounded-lg border border-borde bg-white px-6 py-10 text-center"
        >
          <IconoMaterial nombre="inbox" class="h-8 w-8 text-tinta-suave" />
          <p class="text-[13px] text-tinta-suave">{{ t('siniestros.bandeja.vacio') }}</p>
        </div>

        <div v-else class="w-full overflow-hidden rounded-lg border border-borde bg-white">
          <div class="overflow-x-auto">
            <table class="w-full min-w-[720px] border-collapse text-left">
              <caption class="sr-only">
                {{
                  t('siniestros.bandeja.caption')
                }}
              </caption>
              <thead>
                <tr class="border-b border-borde bg-fondo">
                  <th scope="col" class="w-[31%] px-5 py-3 text-[13px] font-semibold leading-[19.5px] text-tinta">
                    {{ t('siniestros.bandeja.cliente') }}
                  </th>
                  <th scope="col" class="w-[20%] px-5 py-3 text-[13px] font-semibold leading-[19.5px] text-tinta">
                    {{ t('siniestros.bandeja.fecha') }}
                  </th>
                  <th scope="col" class="w-[25%] px-5 py-3 text-[13px] font-semibold leading-[19.5px] text-tinta">
                    {{ t('siniestros.bandeja.estado') }}
                  </th>
                  <th scope="col" class="px-5 py-3 text-right text-[13px] font-semibold leading-[19.5px] text-tinta">
                    {{ t('siniestros.bandeja.acciones') }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in paginados" :key="s.id" class="border-t border-borde">
                  <td class="px-5 py-[18px]">
                    <p class="text-[13px] leading-[19.5px] text-tinta">{{ s.asegurado.nombre }}</p>
                    <p class="text-[11px] leading-[16.5px] text-tinta-suave">
                      {{ t('siniestros.bandeja.radicado', { radicado: s.radicado }) }}
                    </p>
                  </td>
                  <td class="px-5 text-[13px] text-tinta">
                    <time :datetime="s.notificadoEn" :title="formatearFecha(s.notificadoEn)">
                      {{ formatearFechaCorta(s.notificadoEn) }}
                    </time>
                  </td>
                  <td class="px-5">
                    <Badge :tipo="BADGE[s.estado]">{{ t(`siniestros.estado.${s.estado}`) }}</Badge>
                  </td>
                  <td class="px-5 py-[14px] text-right">
                    <RouterLink
                      :to="`/operador/siniestros/${s.id}`"
                      :aria-label="
                        t('siniestros.bandeja.abrirCaso', { nombre: s.asegurado.nombre, radicado: s.radicado })
                      "
                      class="inline-flex h-11 items-center gap-1.5 rounded border border-borde bg-white px-5 text-[13px] font-semibold text-primario hover:bg-fondo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-1"
                    >
                      {{ t('siniestros.bandeja.abrir') }}
                      <IconoMaterial nombre="arrow_forward" class="h-4 w-4" />
                    </RouterLink>
                  </td>
                </tr>
                <tr v-if="visibles.length === 0" class="border-t border-borde">
                  <td colspan="4" class="py-6 text-center text-[13px] text-tinta-suave">
                    {{ t('siniestros.bandeja.vacioFiltro') }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div
            class="flex flex-wrap items-center justify-between gap-2 border-t border-borde bg-fondo p-4 text-[11px] leading-[16.5px] text-tinta-suave"
          >
            <Paginador v-model:pagina="pagina" :total-paginas="totalPaginas" />
            <p aria-live="polite" data-prueba="mostrando">
              {{ t('siniestros.bandeja.mostrando', { visibles: paginados.length, total: estado.siniestros.length }) }}
            </p>
            <p>
              {{ t('siniestros.bandeja.tiempoRespuesta') }}
              <span class="text-tinta">{{ t('siniestros.bandeja.tiempoValor') }}</span>
            </p>
          </div>
        </div>
      </div>
    </main>

    <FooterPantalla />
  </div>
</template>
