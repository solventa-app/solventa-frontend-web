<!--
  Tarjeta «Estado» (W07-02, Figma 2001:3649; plan-hu-w07-front.md 5.3). La reusa «Estado del sistema» del operador
  (W07-04), por eso recibe los datos por props en vez de leer el panel.
  - Caja de estado del prototipo con «Operativo», «Degradado» o «Con fallas» (verde ≥ 90, amarillo ≥ 70, rojo < 70),
    siempre con ícono y texto, más el % de salud general en una barra.
  - «Métricas de red»: disponibilidad y latencia media consolidadas; sin tráfico, «Sin tráfico en la ventana».
  - Cotización y Emisión con su insignia. Sin nombres de micros internos (W07-14).
  - Selector de ventana (15 min, 1 h, 24 h, 7 d) y «Última verificación».
-->
<script setup lang="ts">
import { computed } from 'vue'
import { Badge, Boton } from '../ui'
import IconoMaterial from '../ui/IconoMaterial.vue'
import type { Estado, Ventana } from '../../api/socios'
import { t } from '../../i18n'
import { formatearHora, formatearNumero } from '../../utils/formato'

const props = defineProps<{ salud: Estado | null; ventana: Ventana; cargando: boolean; error: string | null }>()
defineEmits<{ 'update:ventana': [ventana: Ventana]; reintentar: [] }>()

const VENTANAS: Ventana[] = ['15m', '1h', '24h', '7d']

type Color = Estado['general']['color']
const TONO: Record<
  Color,
  { caja: string; texto: string; barra: string; icono: 'check_circle' | 'warning' | 'cancel' }
> = {
  VERDE: { caja: 'border-exito bg-exito-fondo', texto: 'text-exito', barra: 'bg-exito', icono: 'check_circle' },
  AMARILLO: { caja: 'border-alerta bg-alerta-fondo', texto: 'text-alerta', barra: 'bg-alerta', icono: 'warning' },
  ROJO: { caja: 'border-error bg-error-fondo', texto: 'text-error', barra: 'bg-error', icono: 'cancel' },
}
const BADGE: Record<Color, 'exito' | 'alerta' | 'error'> = { VERDE: 'exito', AMARILLO: 'alerta', ROJO: 'error' }

const general = computed(() => props.salud?.general ?? null)
const tono = computed(() => (general.value ? TONO[general.value.color] : TONO.VERDE))
const sinTrafico = computed(
  () => !!general.value && general.value.disponibilidad == null && general.value.latenciaMediaMs == null,
)
</script>

<template>
  <section
    data-prueba="tarjeta-estado"
    :aria-label="t('socios.estado.titulo')"
    class="flex flex-col justify-between gap-3 rounded-[8px] border border-borde bg-white p-[17px]"
  >
    <div class="flex flex-col gap-3">
      <h2 class="flex items-center justify-between border-b border-borde pb-[9px] text-[16px] font-semibold text-tinta">
        {{ t('socios.estado.titulo') }}
        <IconoMaterial nombre="monitor_heart" class="h-6 w-6 text-primario" />
      </h2>

      <div role="radiogroup" :aria-label="t('socios.estado.ventana')" class="flex flex-wrap gap-1">
        <button
          v-for="opcion in VENTANAS"
          :key="opcion"
          type="button"
          role="radio"
          :aria-checked="ventana === opcion"
          class="h-[28px] rounded-full px-[10px] text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace"
          :class="
            ventana === opcion
              ? 'bg-primario text-white'
              : 'border border-borde bg-white text-tinta-suave hover:bg-fondo'
          "
          @click="$emit('update:ventana', opcion)"
        >
          {{ t(`socios.ventana.${opcion}`) }}
        </button>
      </div>

      <p v-if="cargando && !general" class="text-[13px] text-tinta-suave">{{ t('socios.panel.cargando') }}</p>
      <div v-else-if="error && !general" role="alert" class="flex flex-col items-start gap-2">
        <p class="text-[13px] text-error">{{ error }}</p>
        <Boton variante="secundario" @click="$emit('reintentar')">{{ t('socios.panel.reintentar') }}</Boton>
      </div>

      <template v-else-if="general && salud">
        <div
          data-prueba="caja-estado"
          class="flex flex-col gap-2 rounded-[12px] border px-[13px] py-[9px]"
          :class="tono.caja"
        >
          <p class="flex items-center gap-2 text-[13px] font-semibold leading-[18px]" :class="tono.texto">
            <IconoMaterial :nombre="tono.icono" class="h-5 w-5 shrink-0" />
            {{ t('socios.estado.servicio', { estado: t(`socios.estado.color.${general.color}`) }) }}
          </p>
          <div
            role="progressbar"
            :aria-label="t('socios.estado.salud')"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-valuenow="Math.round(general.porcentaje)"
            class="h-[8px] w-full overflow-hidden rounded-[12px] bg-white"
          >
            <div class="h-full rounded-[12px]" :class="tono.barra" :style="{ width: `${general.porcentaje}%` }" />
          </div>
          <span class="text-[11px] leading-[14px]" :class="tono.texto">
            {{ t('socios.estado.saludGeneral', { porcentaje: formatearNumero(general.porcentaje, 1) }) }}
          </span>
        </div>

        <div class="flex flex-col gap-1 rounded-[2px] border border-borde p-[9px]" data-prueba="metricas">
          <span class="text-[11px] uppercase leading-[14px] tracking-[0.55px] text-tinta-suave">
            {{ t('socios.estado.metricas') }}
          </span>
          <p v-if="sinTrafico" class="text-[13px] text-tinta">{{ t('socios.estado.sinTrafico') }}</p>
          <p v-else class="text-[13px] leading-[18px] text-tinta">
            {{ t('socios.estado.latencia') }}
            <strong class="font-semibold">{{
              general.latenciaMediaMs == null ? '—' : `${formatearNumero(general.latenciaMediaMs)} ms`
            }}</strong>
            •
            {{ t('socios.estado.disponibilidad') }}
            <strong class="font-semibold">{{
              general.disponibilidad == null ? '—' : `${formatearNumero(general.disponibilidad, 2)} %`
            }}</strong>
          </p>
        </div>

        <ul class="flex flex-col gap-2" :aria-label="t('socios.estado.apis')">
          <li
            v-for="api in salud.apis"
            :key="api.api"
            class="flex items-center justify-between gap-2 text-[13px] text-tinta"
          >
            {{ t(`socios.estado.api.${api.api}`) }}
            <Badge :tipo="BADGE[api.color]">{{ formatearNumero(api.porcentaje, 1) }} %</Badge>
          </li>
        </ul>
      </template>
    </div>

    <p
      v-if="salud"
      class="flex items-center justify-between border-t border-borde pt-[9px] text-[11px] leading-[14px] text-tinta-suave"
    >
      {{ t('socios.estado.verificacion') }}
      <span class="text-[13px] font-medium text-tinta">{{ formatearHora(salud.verificadoEn) }}</span>
    </p>
  </section>
</template>
