<!--
  W01-03c · Oferta, fallo (Figma "Solventa-web-Final", nodo 2001:1335). CA-W01-05.

  El texto es siempre `ErrorOferta.mensaje`, también para fallas técnicas (useCotizacion las convierte
  en un ErrorOferta seguro): nunca un 5xx. "Reintentar" solo aparece si `puedeReintentar`. Se omite el
  "Código de evento" del prototipo: `ErrorOferta` no lo trae. Sin un error en memoria (entrada por URL
  o recarga) se muestra el estado vacío con enlace a la solicitud.
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Boton, FooterPantalla, HeaderPantalla, MigasDePan, TituloPantalla } from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
import { esErrorOferta, useCotizacion } from '../composables/useCotizacion'
import { useSesion } from '../composables/useSesion'

const router = useRouter()
const { estado } = useCotizacion()
const { rutaInicio } = useSesion()
const error = computed(() => (esErrorOferta(estado.resultado) ? estado.resultado : null))

function reintentar() {
  router.push('/cotizacion/consulta')
}
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden" data-pantalla="W01-03c">
    <HeaderPantalla titulo="Nueva cotización" />
    <MigasDePan seccion="Nueva cotización" :a-inicio="rutaInicio()" />
    <main
      v-if="error"
      class="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto bg-fondo px-10 py-16"
    >
      <div class="flex w-full max-w-[560px] flex-col items-center gap-4 rounded-lg border border-borde bg-white p-6">
        <div
          class="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-error bg-error-fondo text-error"
        >
          <svg viewBox="0 -960 960 960" fill="currentColor" class="h-8 w-8" aria-hidden="true">
            <path
              d="M503.5-289.48q9.5-9.48 9.5-23.5t-9.48-23.52q-9.48-9.5-23.5-9.5t-23.52 9.48q-9.5 9.48-9.5 23.5t9.48 23.52q9.48 9.5 23.5 9.5t23.52-9.48ZM453-433h60v-253h-60v253Zm27.27 353q-82.74 0-155.5-31.5Q252-143 197.5-197.5t-86-127.34Q80-397.68 80-480.5t31.5-155.66Q143-709 197.5-763t127.34-85.5Q397.68-880 480.5-880t155.66 31.5Q709-817 763-763t85.5 127Q880-563 880-480.27q0 82.74-31.5 155.5Q817-252 763-197.68q-54 54.31-127 86Q563-80 480.27-80Zm.23-60Q622-140 721-239.5t99-241Q820-622 721.19-721T480-820q-141 0-240.5 98.81T140-480q0 141 99.5 240.5t241 99.5Zm-.5-340Z"
            />
          </svg>
        </div>
        <TituloPantalla class="text-center">No pudimos completar tu consulta</TituloPantalla>
        <p class="max-w-[448px] text-center text-[13px] leading-[18px] text-tinta-suave">
          {{ error.mensaje }}
        </p>
        <div class="flex flex-col items-center gap-4">
          <Boton v-if="error.puedeReintentar" class="w-full" @click="reintentar">
            <template #icono><IconoMaterial nombre="refresh" class="h-4 w-4" /></template>
            Reintentar
          </Boton>
          <RouterLink
            to="/cotizacion/asesor"
            class="flex items-center gap-1.5 text-[13px] font-semibold leading-[18px] text-primario"
          >
            <IconoMaterial nombre="headset_mic" class="h-[18px] w-[18px]" />
            Hablar con un asesor
          </RouterLink>
        </div>
        <div class="flex w-full items-center justify-center border-t border-borde pt-4">
          <div class="flex items-center gap-1">
            <IconoMaterial nombre="shield" class="h-[18px] w-[18px] text-tinta-suave" />
            <span class="text-[11px] leading-[14px] text-tinta-suave">Validación segura B2B2C</span>
          </div>
        </div>
      </div>
    </main>
    <main
      v-else
      class="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-y-auto bg-fondo px-10 py-12 text-center"
    >
      <p class="text-[13px] text-tinta-suave">No hay un error activo en memoria todavía.</p>
      <RouterLink to="/cotizacion" class="text-[13px] font-semibold text-enlace hover:underline"
        >Ir a la solicitud</RouterLink
      >
    </main>
    <FooterPantalla />
  </div>
</template>
