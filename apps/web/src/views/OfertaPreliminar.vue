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
import { formatearMonto, formatearPorcentaje, formatearRangoMonto } from '../utils/formato'
import { nombreFuente } from '../utils/nombres'

const { estado, captura } = useCotizacion()
const { rutaInicio } = useSesion()
const oferta = computed(() => (esOferta(estado.resultado) ? estado.resultado : null))
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden" data-pantalla="W01-03b">
    <HeaderPantalla titulo="Oferta preliminar" />
    <TituloPantalla class="sr-only">Oferta preliminar</TituloPantalla>
    <MigasDePan seccion="Nueva cotización" :a-inicio="rutaInicio()" />
    <main
      v-if="oferta && oferta.rangoPrima"
      class="flex min-h-0 flex-1 flex-col items-center overflow-y-auto bg-fondo px-10 py-12"
    >
      <div class="flex w-full max-w-[560px] flex-col items-center gap-5 rounded-lg border border-borde bg-white p-6">
        <div class="w-full rounded-md border border-borde bg-alerta-fondo p-4">
          <p class="text-[13px] font-medium leading-[18px] text-alerta">
            No pudimos verificar todo a tiempo, esta es una oferta preliminar.
          </p>
        </div>
        <div class="flex h-14 w-14 items-center justify-center rounded-full border-2 border-alerta text-alerta">
          <IconoMaterial nombre="arrow_circle_right" class="h-7 w-7" />
        </div>
        <h2 class="text-center text-[22px] font-bold leading-[28px] text-tinta">Oferta preliminar</h2>
        <div class="flex w-full flex-col items-center gap-1.5 rounded-md border border-borde bg-fondo p-4">
          <p class="text-center text-[22px] font-bold leading-[28px] text-primario">
            {{ formatearRangoMonto(oferta.rangoPrima.minima, oferta.rangoPrima.maxima) }} / mes
          </p>
          <p class="text-center text-[16px] font-semibold leading-[22px] text-tinta">
            Cobertura: {{ formatearMonto(oferta.cobertura) }}
          </p>
          <p class="text-center text-[11px] leading-[14px] text-tinta-suave">
            Calculada con el último valor disponible en caché.
          </p>
        </div>
        <div class="flex w-full flex-col gap-2 border-y border-borde py-4">
          <div
            v-for="factor in oferta.desgloseScore"
            :key="factor.nombre"
            class="flex items-center justify-between px-1"
          >
            <span class="text-[13px] text-tinta-suave">{{ nombreFuente(factor.nombre) }}:</span>
            <span class="text-[13px] font-semibold text-tinta">{{ formatearPorcentaje(factor.peso) }} del score</span>
          </div>
          <div class="flex items-center justify-between px-1">
            <span class="text-[13px] text-tinta-suave">Plazo:</span>
            <span class="text-[13px] font-semibold text-tinta">{{ captura.plazoMeses }} meses</span>
          </div>
        </div>
        <Boton disabled class="w-full">Continuar con oferta preliminar</Boton>
        <p class="-mt-3 text-center text-[11px] text-tinta-suave">(HU-W03, fuera de este sprint)</p>
        <RouterLink
          to="/cotizacion/fuentes"
          class="text-[13px] font-semibold leading-[18px] text-enlace hover:underline"
        >
          Ver detalle de fuentes consultadas
        </RouterLink>
      </div>
    </main>
    <main
      v-else
      class="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-y-auto bg-fondo px-10 py-12 text-center"
    >
      <p class="text-[13px] text-tinta-suave">No hay una oferta preliminar activa en memoria todavía.</p>
      <RouterLink to="/cotizacion" class="text-[13px] font-semibold text-enlace hover:underline"
        >Ir a la solicitud</RouterLink
      >
    </main>
    <FooterPantalla />
  </div>
</template>
