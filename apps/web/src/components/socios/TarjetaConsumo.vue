<!--
  Tarjeta «Consumo» del panel del socio (W07-02, Figma 2001:3628; plan-hu-w07-front.md 5.3). Solo las cotizaciones
  descuentan del presupuesto (W07-9), así que se muestran «Cotizaciones: 842 / 1.000» en vez de «llamadas este mes».
  El presupuesto no se renueva solo: «Renovación del ciclo» se reemplaza por «Lo recarga Solventa». Agotado, la
  tarjeta pasa a alerta (texto e ícono, nunca solo color).
-->
<script setup lang="ts">
import { computed } from 'vue'
import { Boton } from '../ui'
import IconoMaterial from '../ui/IconoMaterial.vue'
import { usePanelSocio } from '../../composables/usePanelSocio'
import { t } from '../../i18n'
import { formatearNumero } from '../../utils/formato'

const { estado, cargarConsumo } = usePanelSocio()

const presupuesto = computed(() => estado.consumo?.presupuesto ?? null)
const fraccion = computed(() =>
  presupuesto.value && presupuesto.value.asignadas > 0
    ? Math.min(1, presupuesto.value.consumidas / presupuesto.value.asignadas)
    : 0,
)
const agotado = computed(() => !!presupuesto.value && presupuesto.value.restantes <= 0)
</script>

<template>
  <section
    data-prueba="tarjeta-consumo"
    :aria-label="t('socios.consumo.titulo')"
    class="flex flex-col justify-between gap-3 rounded-[8px] border bg-white p-[17px]"
    :class="agotado ? 'border-alerta' : 'border-borde'"
  >
    <div class="flex flex-col gap-2">
      <h2 class="flex items-center justify-between border-b border-borde pb-[9px] text-[16px] font-semibold text-tinta">
        {{ t('socios.consumo.titulo') }}
        <IconoMaterial nombre="speed" class="h-6 w-6 text-primario" />
      </h2>

      <p v-if="estado.cargando.consumo && !presupuesto" class="text-[13px] text-tinta-suave">
        {{ t('socios.panel.cargando') }}
      </p>
      <div v-else-if="estado.error.consumo && !presupuesto" role="alert" class="flex flex-col items-start gap-2">
        <p class="text-[13px] text-error">{{ estado.error.consumo }}</p>
        <Boton variante="secundario" @click="cargarConsumo()">{{ t('socios.panel.reintentar') }}</Boton>
      </div>

      <template v-else-if="presupuesto">
        <p class="py-2 text-[13px] leading-[18px] text-tinta" data-prueba="cotizaciones">
          {{ t('socios.consumo.cotizaciones') }}
          <strong class="font-semibold">{{ formatearNumero(presupuesto.consumidas) }}</strong>
          /
          <strong class="font-semibold">{{ formatearNumero(presupuesto.asignadas) }}</strong>
        </p>
        <div
          role="progressbar"
          :aria-label="t('socios.consumo.barra')"
          aria-valuemin="0"
          :aria-valuemax="presupuesto.asignadas"
          :aria-valuenow="presupuesto.consumidas"
          class="h-[10px] w-full overflow-hidden rounded-[12px] bg-info-fondo"
        >
          <div
            class="h-full rounded-[12px]"
            :class="agotado ? 'bg-alerta' : 'bg-primario'"
            :style="{ width: `${fraccion * 100}%` }"
          />
        </div>
        <div class="flex items-center justify-between gap-2">
          <span class="text-[13px] font-semibold" :class="agotado ? 'text-alerta' : 'text-primario'">
            {{ t('socios.consumo.utilizado', { porcentaje: formatearNumero(fraccion * 100) }) }}
          </span>
          <span class="text-[11px] leading-[14px] text-tinta-suave">
            {{ t('socios.consumo.disponibles', { n: formatearNumero(Math.max(0, presupuesto.restantes)) }) }}
          </span>
        </div>
        <p
          v-if="agotado"
          role="status"
          class="flex items-start gap-1 rounded-[4px] border border-alerta bg-alerta-fondo p-[9px] text-[11px] leading-[14px] text-alerta"
        >
          <IconoMaterial nombre="warning" class="h-5 w-5 shrink-0" />
          {{ t('socios.error.presupuesto') }}
        </p>
      </template>
    </div>

    <p
      class="flex items-center justify-between border-t border-borde pt-[9px] text-[11px] leading-[14px] text-tinta-suave"
    >
      {{ t('socios.consumo.recarga') }}
      <span class="text-[13px] font-medium text-tinta">{{ t('socios.consumo.recargaQuien') }}</span>
    </p>
  </section>
</template>
