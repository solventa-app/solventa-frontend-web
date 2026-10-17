<!--
  W01-03a · Oferta, éxito completo (Figma yKWD8jrwERtJkuSj0mk0Gz "Solventa-web-Final", nodo
  2001:1189). El prototipo muestra "Score de riesgo: 782/850", pero el contrato
  (contrato/schema.graphql) no expone un score numérico único, solo `desgloseScore:
  [FactorScore!]!` (nombre + peso por factor): se muestra ese desglose real en vez de inventar un
  número (mismo criterio ya aplicado en otras pantallas: el contrato manda sobre el mockup
  literal). El plazo tampoco está en `Oferta`, así que se toma de la captura del usuario
  (`SolicitudOfertaInput.plazoMeses`), que sí viaja en el flujo. "Continuar a suscripción" lleva a
  HU-W03, fuera de este sprint (ver docs/plan-frontend.md): se deja como acción deshabilitada y
  anotada, no como un enlace roto.

  Re-verificada contra el archivo correcto: título del header "Oferta lista" (nodo 2001:1245), no
  "Oferta — éxito completo" (texto que no existe en ningún nodo). La prima destacada (nodo
  2001:1207) se muestra sola, sin el prefijo "Prima: " que había agregado una ronda anterior — en
  Figma es solo el monto grande en azul ("$ 185.000 / mes").
  `Oferta.prima` es nullable en el contrato (solo viene en la oferta COMPLETA, ver schema.graphql);
  el guard de abajo exige `oferta.prima` además de `oferta` para que, si el estado compartido de
  `useCotizacion` llega a tener una oferta PRELIMINAR (prima null) cuando se renderiza esta pantalla
  (por ejemplo navegación atrás/adelante hacia /cotizacion/oferta), no se intente formatear un monto
  nulo y se caiga a la vista "no hay oferta" en vez de romper (CLAUDE.md regla 5: nunca un error
  técnico crudo).
-->
<script setup lang="ts">
import { computed } from 'vue'
import { Boton, FooterPantalla, HeaderPantalla, MigasDePan, TituloPantalla } from '../components/ui'
import { esOferta, useCotizacion } from '../composables/useCotizacion'
import { RUTA_INICIO, useSesion } from '../composables/useSesion'
import { formatearMonto, formatearPorcentaje } from '../utils/formato'

const { estado, captura } = useCotizacion()
const { estado: sesion } = useSesion()
const oferta = computed(() => (esOferta(estado.resultado) ? estado.resultado : null))
</script>

<template>
  <div class="flex min-h-screen flex-col" data-pantalla="W01-03a">
    <HeaderPantalla titulo="Oferta lista" />
    <TituloPantalla class="sr-only">Oferta lista</TituloPantalla>
    <MigasDePan seccion="Nueva cotización" :a-inicio="RUTA_INICIO[sesion.rol]" />
    <main v-if="oferta && oferta.prima" class="flex flex-1 flex-col items-center bg-fondo px-10 py-12">
      <div class="flex w-full max-w-[560px] flex-col items-center gap-5 rounded-lg border border-borde bg-white p-6">
        <div class="flex h-14 w-14 items-center justify-center rounded-full border-2 border-exito text-exito">
          <svg viewBox="0 -960 960 960" fill="currentColor" class="h-7 w-7" aria-hidden="true">
            <path d="m421-298 283-283-46-45-237 237-120-120-45 45 165 166Zm59 218q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 31.5-156t86-127Q252-817 325-848.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 82-31.5 155T763-197.5q-54 54.5-127 86T480-80Zm0-60q142 0 241-99.5T820-480q0-142-99-241t-241-99q-141 0-240.5 99T140-480q0 141 99.5 240.5T480-140Zm0-340Z" />
          </svg>
        </div>
        <h2 class="text-center text-[16px] font-semibold leading-[22px] text-tinta">Tu oferta está lista</h2>
        <div class="flex w-full flex-col items-center gap-1.5 rounded-md border border-borde p-4">
          <p class="text-[22px] font-bold leading-normal text-primario">{{ formatearMonto(oferta.prima!) }} / mes</p>
          <p class="text-[13px] leading-[18px] text-tinta">Cobertura: {{ formatearMonto(oferta.cobertura) }}</p>
        </div>
        <div class="flex w-full flex-col gap-2 border-y border-borde py-4">
          <div class="flex items-center justify-between px-1">
            <span class="text-[13px] text-tinta-suave">Plazo:</span>
            <span class="text-[13px] font-semibold text-tinta">{{ captura.plazoMeses }} meses</span>
          </div>
          <div v-for="factor in oferta.desgloseScore" :key="factor.nombre" class="flex items-center justify-between px-1">
            <span class="text-[13px] text-tinta-suave">{{ factor.nombre }}:</span>
            <span class="text-[13px] font-semibold text-tinta">{{ formatearPorcentaje(factor.peso) }} del score</span>
          </div>
        </div>
        <Boton disabled class="w-full">Continuar a suscripción</Boton>
        <p class="-mt-3 text-center text-[11px] text-tinta-suave">(HU-W03, fuera de este sprint)</p>
        <RouterLink to="/cotizacion/fuentes" class="text-[13px] font-semibold leading-[18px] text-enlace hover:underline">
          Ver detalle de fuentes consultadas
        </RouterLink>
        <p class="text-center text-[12px] font-semibold leading-normal text-tinta-suave">
          Continuar no genera ningún cobro: podrás revisar todas las condiciones antes de firmar.
        </p>
      </div>
    </main>
    <main v-else class="flex flex-1 flex-col items-center justify-center gap-3 bg-fondo px-10 py-12 text-center">
      <p class="text-[13px] text-tinta-suave">No hay una oferta activa en memoria todavía.</p>
      <RouterLink to="/cotizacion" class="text-[13px] font-semibold text-enlace hover:underline">Ir a la solicitud</RouterLink>
    </main>
    <FooterPantalla />
  </div>
</template>
