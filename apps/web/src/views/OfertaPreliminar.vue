<!--
  W01-03b · Oferta preliminar / degradada (Figma 2001:1262, CA-W01-04). Igual que W01-03a: el
  "score de riesgo" fijo del mockup se reemplaza por el desglose real (`desgloseScore`) y el plazo
  viene de la captura, no de `Oferta`. La nota de "calculada con el último valor disponible en caché"
  es fiel al prototipo y además es cierta: los mocks marcan `FuenteConsultada.estado = CACHE` para
  esta variante (ver `src/mocks/handlers.ts`).
-->
<script setup lang="ts">
import { computed } from 'vue'
import { Boton, FooterPantalla, HeaderPantalla, MigasDePan } from '../components/ui'
import { esOferta, useCotizacion } from '../composables/useCotizacion'
import { formatearMonto, formatearPorcentaje, formatearRangoMonto } from '../utils/formato'

const { estado, captura } = useCotizacion()
const oferta = computed(() => (esOferta(estado.resultado) ? estado.resultado : null))
</script>

<template>
  <div class="pantalla flex min-h-screen flex-col" data-pantalla="W01-03b">
    <HeaderPantalla titulo="Oferta preliminar" />
    <MigasDePan :items="[{ etiqueta: 'Inicio', to: '/inicio' }, { etiqueta: 'Nueva cotización' }]" />
    <main v-if="oferta && oferta.rangoPrima" class="flex flex-1 flex-col items-center bg-fondo px-10 py-12">
      <div class="flex w-full max-w-[560px] flex-col items-center gap-5 rounded-lg border border-borde bg-white p-6">
        <div class="flex items-center gap-2.5 rounded-md border border-borde bg-alerta-fondo p-4">
          <svg viewBox="0 -960 960 960" fill="currentColor" class="h-6 w-6 shrink-0 text-alerta" aria-hidden="true">
            <path d="m40-120 440-760 440 760H40Zm104-60h672L480-760 144-180Zm361.5-65.68q8.5-8.67 8.5-21.5 0-12.82-8.68-21.32-8.67-8.5-21.5-8.5-12.82 0-21.32 8.68-8.5 8.67-8.5 21.5 0 12.82 8.68 21.32 8.67 8.5 21.5 8.5 12.82 0 21.32-8.68ZM454-348h60v-224h-60v224Zm26-122Z" />
          </svg>
          <p class="text-[13px] font-medium leading-[18px] text-alerta">
            No pudimos verificar todo a tiempo, esta es una oferta preliminar.
          </p>
        </div>
        <div class="flex h-14 w-14 items-center justify-center rounded-full border-2 border-alerta text-alerta">
          <svg viewBox="0 -960 960 960" fill="currentColor" class="h-7 w-7" aria-hidden="true">
            <path d="m480-334 146-146-146-146-42 42 74 74H330v60h182l-74 74 42 42Zm0 254q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 31.5-156t86-127Q252-817 325-848.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 82-31.5 155T763-197.5q-54 54.5-127 86T480-80Zm0-60q142 0 241-99.5T820-480q0-142-99-241t-241-99q-141 0-240.5 99T140-480q0 141 99.5 240.5T480-140Zm0-340Z" />
          </svg>
        </div>
        <h2 class="text-center text-[22px] font-bold leading-[28px] text-tinta">Oferta preliminar</h2>
        <div class="flex w-full flex-col items-center gap-1.5 rounded-md border border-borde bg-[#f8fafc] p-4">
          <p class="text-center text-[22px] font-bold leading-[28px] text-primario">
            {{ formatearRangoMonto(oferta.rangoPrima.minima, oferta.rangoPrima.maxima) }} / mes
          </p>
          <p class="text-center text-[16px] font-semibold leading-[22px] text-tinta">Cobertura: {{ formatearMonto(oferta.cobertura) }}</p>
          <p class="text-center text-[11px] leading-[14px] text-tinta-suave">Calculada con el último valor disponible en caché.</p>
        </div>
        <div class="flex w-full flex-col gap-2 border-y border-borde py-4">
          <div class="flex items-center justify-between px-1">
            <span class="text-[13px] text-tinta-suave">Plazo:</span>
            <span class="text-[13px] font-semibold text-tinta">{{ captura.plazoMeses }} meses</span>
          </div>
          <div v-for="factor in oferta.desgloseScore" :key="factor.nombre" class="flex items-center justify-between px-1">
            <span class="text-[13px] text-tinta-suave">{{ factor.nombre }} (preliminar):</span>
            <span class="text-[13px] font-semibold text-tinta">{{ formatearPorcentaje(factor.peso) }} del score</span>
          </div>
        </div>
        <Boton disabled class="w-full">Continuar con oferta preliminar</Boton>
        <p class="-mt-3 text-center text-[11px] text-tinta-suave">(HU-W03, fuera de este sprint)</p>
        <RouterLink to="/cotizacion/fuentes" class="text-[13px] font-semibold leading-[18px] text-enlace hover:underline">
          Ver detalle de fuentes consultadas
        </RouterLink>
      </div>
    </main>
    <main v-else class="flex flex-1 flex-col items-center justify-center gap-3 bg-fondo px-10 py-12 text-center">
      <p class="text-[13px] text-tinta-suave">No hay una oferta preliminar activa en memoria todavía.</p>
      <RouterLink to="/cotizacion" class="text-[13px] font-semibold text-enlace hover:underline">Ir a la solicitud</RouterLink>
    </main>
    <FooterPantalla />
  </div>
</template>
