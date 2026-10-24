<!--
  Patrón común de las confirmaciones de HU-W04 (W04-03a/b/c, especificación del diseñador, secciones B a E):
  header, migas "Inicio › Siniestros › {miga}", tarjeta centrada con mosaico, insignia, h1 y el contenido de
  cada confirmación (slot), y "Volver a la bandeja". Sin resultado en memoria muestra el estado vacío.
  Foco al h1 al montar. Sin botón primario.
-->
<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { Badge, EstadoOperador, FooterPantalla, HeaderPantalla, MigasDePan } from './ui'
import IconoMaterial from './ui/IconoMaterial.vue'
import { t } from '../i18n'

const props = defineProps<{
  /** Hay un resultado válido en memoria (useResultadoReciente). */
  conResultado: boolean
  tituloHeader: string
  miga: string
  icono: 'arrow_circle_right' | 'check_circle' | 'cancel'
  /** Fondo y color del mosaico (p. ej. `bg-info-fondo text-info`). */
  claseMosaico: string
  insignia: { tipo: 'exito' | 'error' | 'enCurso'; texto: string }
  titulo: string
}>()

const niveles = computed(() => [
  { texto: t('siniestros.migas.siniestros'), to: '/operador/siniestros' },
  { texto: props.miga },
])

const h1 = ref<HTMLElement | null>(null)
onMounted(async () => {
  await nextTick()
  h1.value?.focus()
})

const claseVolver =
  'mt-4 inline-flex h-11 items-center gap-2 rounded border border-borde bg-white px-5 text-[13px] font-semibold text-tinta hover:bg-fondo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2'
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden bg-fondo">
    <HeaderPantalla :titulo="tituloHeader" />
    <MigasDePan :niveles="niveles" a-inicio="/operador">
      <template #derecha><EstadoOperador /></template>
    </MigasDePan>

    <main class="min-h-0 flex-1 overflow-y-auto">
      <div class="mx-auto flex w-full max-w-[880px] flex-col gap-5 px-4 py-8 sm:px-10">
        <section
          v-if="conResultado"
          data-prueba="confirmacion"
          class="flex flex-col items-center gap-2 rounded-lg border border-borde bg-white px-4 py-6 text-center sm:px-[111px]"
        >
          <span class="mb-2 flex h-14 w-14 items-center justify-center rounded-lg" :class="claseMosaico">
            <IconoMaterial :nombre="icono" class="h-6 w-6" />
          </span>
          <Badge :tipo="insignia.tipo">{{ insignia.texto }}</Badge>
          <h1
            ref="h1"
            tabindex="-1"
            class="text-[22px] font-bold leading-7 tracking-[-0.55px] text-tinta focus:outline-none"
          >
            {{ titulo }}
          </h1>
          <slot />
          <RouterLink to="/operador/siniestros" :class="claseVolver">
            <IconoMaterial nombre="arrow_back" class="h-4 w-4" />
            {{ t('siniestros.detalle.volverBandeja') }}
          </RouterLink>
        </section>

        <section v-else data-prueba="sin-resultado" class="rounded-lg border border-borde bg-white px-4 py-6">
          <div class="flex flex-col items-center gap-2 py-12 text-center">
            <IconoMaterial nombre="inbox" class="h-8 w-8 text-tinta-suave" />
            <h1
              ref="h1"
              tabindex="-1"
              class="text-[22px] font-bold leading-7 tracking-[-0.55px] text-tinta focus:outline-none"
            >
              {{ t('siniestros.confirmacion.vacioTitulo') }}
            </h1>
            <p class="text-[13px] text-tinta-suave">{{ t('siniestros.confirmacion.vacioTexto') }}</p>
            <RouterLink to="/operador/siniestros" :class="claseVolver">
              <IconoMaterial nombre="arrow_back" class="h-4 w-4" />
              {{ t('siniestros.detalle.volverBandeja') }}
            </RouterLink>
          </div>
        </section>
      </div>
    </main>

    <FooterPantalla />
  </div>
</template>
