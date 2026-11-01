<!--
  W01-03b · Oferta preliminar / degradada (Figma "Solventa-web-Final", nodo 2001:1262). CA-W01-04.

  - El prototipo muestra un score único ("782/850"); el contrato solo trae `desgloseScore`, y eso es lo
    que se muestra. El plazo sale de la captura (`plazoMeses`), porque `Oferta` no lo trae.
  - "Continuar con oferta preliminar" va deshabilitado: lleva a HU-W03, fuera de este sprint.
-->
<script setup lang="ts">
import { computed } from 'vue'
import { Boton, FooterPantalla, HeaderPantalla, MigasDePan, TituloPantalla } from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
import { esOferta, useCotizacion } from '../composables/useCotizacion'
import { useSesion } from '../composables/useSesion'
import { t } from '../i18n'
import { montoVisible, rangoMontoVisible } from '../composables/useMoneda'
import { formatearPorcentaje } from '../utils/formato'
import { nombreFuente } from '../utils/nombres'

const { estado, captura } = useCotizacion()
const { rutaInicio } = useSesion()
const oferta = computed(() => (esOferta(estado.resultado) ? estado.resultado : null))
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden" data-pantalla="W01-03b">
    <HeaderPantalla :titulo="t('preliminar.titulo')" />
    <TituloPantalla class="sr-only">{{ t('preliminar.titulo') }}</TituloPantalla>
    <MigasDePan :seccion="t('comun.nuevaCotizacion')" :a-inicio="rutaInicio()" />
    <main
      v-if="oferta && oferta.rangoPrima"
      class="flex min-h-0 flex-1 flex-col items-center overflow-y-auto bg-fondo px-10 py-12"
    >
      <div class="flex w-full max-w-[560px] flex-col items-center gap-5 rounded-lg border border-borde bg-white p-6">
        <div class="w-full rounded-md border border-borde bg-alerta-fondo p-4">
          <p class="text-[13px] font-medium leading-[18px] text-alerta">
            {{ t('preliminar.aviso') }}
          </p>
        </div>
        <div class="flex h-14 w-14 items-center justify-center rounded-full border-2 border-alerta text-alerta">
          <IconoMaterial nombre="arrow_circle_right" class="h-7 w-7" />
        </div>
        <h2 class="text-center text-[22px] font-bold leading-[28px] text-tinta">{{ t('preliminar.titulo') }}</h2>
        <div class="flex w-full flex-col items-center gap-1.5 rounded-md border border-borde bg-fondo p-4">
          <p class="text-center text-[22px] font-bold leading-[28px] text-primario">
            {{ t('comun.porMes', { monto: rangoMontoVisible(oferta.rangoPrima.minima, oferta.rangoPrima.maxima) }) }}
          </p>
          <p class="text-center text-[16px] font-semibold leading-[22px] text-tinta">
            {{ t('comun.cobertura', { monto: montoVisible(oferta.cobertura) }) }}
          </p>
          <p class="text-center text-[11px] leading-[14px] text-tinta-suave">
            {{ t('preliminar.cache') }}
          </p>
        </div>
        <div class="flex w-full flex-col gap-2 border-y border-borde py-4">
          <div
            v-for="factor in oferta.desgloseScore"
            :key="factor.nombre"
            class="flex items-center justify-between px-1"
          >
            <span class="text-[13px] text-tinta-suave">{{ nombreFuente(factor.nombre) }}:</span>
            <span class="text-[13px] font-semibold text-tinta">{{
              t('comun.delScore', { porcentaje: formatearPorcentaje(factor.peso) })
            }}</span>
          </div>
          <div class="flex items-center justify-between px-1">
            <span class="text-[13px] text-tinta-suave">{{ t('comun.plazo') }}</span>
            <span class="text-[13px] font-semibold text-tinta">{{
              t('comun.meses', { meses: captura.plazoMeses })
            }}</span>
          </div>
        </div>
        <Boton disabled class="w-full">{{ t('preliminar.continuar') }}</Boton>
        <p class="-mt-3 text-center text-[11px] text-tinta-suave">{{ t('comun.fueraSprint') }}</p>
        <RouterLink
          to="/cotizacion/fuentes"
          class="text-[13px] font-semibold leading-[18px] text-enlace hover:underline"
        >
          {{ t('comun.verFuentes') }}
        </RouterLink>
      </div>
    </main>
    <main
      v-else
      class="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-y-auto bg-fondo px-10 py-12 text-center"
    >
      <p class="text-[13px] text-tinta-suave">{{ t('preliminar.vacia') }}</p>
      <RouterLink to="/cotizacion" class="text-[13px] font-semibold text-enlace hover:underline">{{
        t('comun.irSolicitud')
      }}</RouterLink>
    </main>
    <FooterPantalla />
  </div>
</template>
