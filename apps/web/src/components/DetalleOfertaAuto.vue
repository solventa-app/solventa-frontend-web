<!--
  KAN-290 · Detalle de una oferta de la póliza de auto (W01-03a y W01-03b). Sin Figma: usa el mismo lenguaje de la
  oferta de vida (filas etiqueta–valor entre bordes).

  - El vehículo con la placa enmascarada (la placa completa nunca llega al navegador) y su valor comercial.
  - Las seis coberturas todo riesgo con su valor asegurado y su deducible.
  - Los factores de la tarifa en un bloque plegable: explican el precio sin ocupar la pantalla.
  Los montos se convierten a la moneda elegida, porque son de consulta (D-2).
-->
<script setup lang="ts">
import type { Oferta } from '../graphql/tipos'
import { montoVisible } from '../composables/useMoneda'
import { t, type Clave } from '../i18n'
import IconoMaterial from './ui/IconoMaterial.vue'

defineProps<{ oferta: Oferta }>()

// `FactorTarifa.nombre` es un texto libre en el contrato: se traducen los conocidos y el resto se muestra tal cual.
const FACTORES: Record<string, Clave> = {
  USO: 'auto.factor.USO',
  ANTIGUEDAD: 'auto.factor.ANTIGUEDAD',
  KILOMETRAJE: 'auto.factor.KILOMETRAJE',
  INDICE_HURTO: 'auto.factor.INDICE_HURTO',
  SINIESTRALIDAD: 'auto.factor.SINIESTRALIDAD',
  CIUDAD: 'auto.factor.CIUDAD',
  DEDUCIBLE: 'auto.factor.DEDUCIBLE',
}
const nombreFactor = (nombre: string) => (FACTORES[nombre] ? t(FACTORES[nombre]) : nombre)
</script>

<template>
  <div v-if="oferta.vehiculo" class="flex w-full flex-col gap-4" data-prueba="detalle-auto">
    <section class="flex flex-col gap-2 border-y border-borde py-4" :aria-label="t('auto.vehiculo')">
      <h3 class="flex items-center gap-2 px-1 text-[13px] font-semibold text-tinta">
        <IconoMaterial nombre="directions_car" class="h-5 w-5 text-primario" />
        {{ oferta.vehiculo.marca }} {{ oferta.vehiculo.linea }} · {{ oferta.vehiculo.modelo }}
      </h3>
      <div class="flex items-center justify-between px-1">
        <span class="text-[13px] text-tinta-suave">{{ t('auto.placa') }}</span>
        <span class="font-mono text-[13px] font-semibold text-tinta" data-prueba="placa-enmascarada">{{
          oferta.vehiculo.placaEnmascarada
        }}</span>
      </div>
      <div class="flex items-center justify-between px-1">
        <span class="text-[13px] text-tinta-suave">{{ t('auto.valorComercial') }}</span>
        <span class="text-[13px] font-semibold text-tinta">{{ montoVisible(oferta.vehiculo.valorComercial) }}</span>
      </div>
      <div class="flex items-center justify-between px-1">
        <span class="text-[13px] text-tinta-suave">{{ t('auto.uso') }}</span>
        <span class="text-[13px] font-semibold text-tinta">{{ t(`auto.uso.${oferta.vehiculo.uso}`) }}</span>
      </div>
      <div class="flex items-center justify-between px-1">
        <span class="text-[13px] text-tinta-suave">{{ t('auto.ciudad') }}</span>
        <span class="text-[13px] font-semibold text-tinta">{{ oferta.vehiculo.ciudadCirculacion }}</span>
      </div>
    </section>

    <section class="flex flex-col gap-2" :aria-label="t('auto.coberturas')">
      <h3 class="px-1 text-[13px] font-semibold text-tinta">{{ t('auto.coberturas') }}</h3>
      <ul class="flex flex-col divide-y divide-borde rounded-md border border-borde" data-prueba="coberturas">
        <li
          v-for="cobertura in oferta.coberturas"
          :key="cobertura.tipo"
          class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-3 py-2"
        >
          <span class="text-[13px] text-tinta">{{ t(`auto.cobertura.${cobertura.tipo}`) }}</span>
          <span class="text-right text-[12px] text-tinta-suave">
            <span class="font-semibold text-tinta">{{
              cobertura.valorAsegurado ? montoVisible(cobertura.valorAsegurado) : t('auto.incluida')
            }}</span>
            <template v-if="cobertura.deducible">
              · {{ t('auto.deducible', { deducible: cobertura.deducible }) }}</template
            >
          </span>
        </li>
      </ul>
    </section>

    <details v-if="oferta.factoresTarifa.length" class="rounded-md border border-borde px-3 py-2">
      <summary class="cursor-pointer text-[13px] font-semibold text-enlace">{{ t('auto.comoSeCalcula') }}</summary>
      <ul class="mt-2 flex flex-col gap-1" data-prueba="factores">
        <li v-for="factor in oferta.factoresTarifa" :key="factor.nombre" class="flex justify-between text-[12px]">
          <span class="text-tinta-suave">{{ nombreFactor(factor.nombre) }}</span>
          <span class="text-tinta">×{{ factor.factor.toFixed(2) }}</span>
        </li>
      </ul>
    </details>
  </div>
</template>
