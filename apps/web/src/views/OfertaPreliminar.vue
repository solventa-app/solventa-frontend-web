<!--
  W01-03b · Oferta preliminar / degradada (Figma 2vfK0e8t62OvvDk4c7QnK5 "Solventa-web", nodo 10:23,
  CA-W01-04). Reestructurada para ser fiel a ese nodo: el archivo anterior tenía una insignia de
  icono circular, un encabezado "Oferta preliminar", una línea de "Cobertura:" separada, una fila de
  "Plazo:", el desglose real del score y una nota de caché en párrafo aparte — ninguno de esos
  elementos existe en el Figma actual (confirmado con captura de pantalla vía get_design_context,
  no solo con la metadata). La estructura real del nodo es solo: banner de alerta → una sola línea
  en negrita "Prima estimada (rango): ..." → botón → enlace. Se simplifica a eso; el detalle
  completo (cobertura, fuentes, score) sigue disponible un clic más allá en "Ver detalle de fuentes
  consultadas" (W01-04), que sí lo muestra.

  "Continuar con oferta preliminar" se deja deshabilitado y anotado "(HU-W03, fuera de este sprint)",
  igual que "Continuar a suscripción" en OfertaCompleta.vue — el Figma literal lo muestra como un
  botón oscuro sin anotación, pero HU-W03 no existe todavía en este sprint, así que un botón "activo"
  que no lleva a ningún lado sería peor que uno deshabilitado y explicado; mismo criterio ya aplicado
  en la pantalla hermana.
-->
<script setup lang="ts">
import { computed } from 'vue'
import { Boton, FooterPantalla, HeaderPantalla, MigasDePan, TituloPantalla } from '../components/ui'
import { esOferta, useCotizacion } from '../composables/useCotizacion'
import { RUTA_INICIO, useSesion } from '../composables/useSesion'
import { formatearRangoMonto } from '../utils/formato'

const { estado } = useCotizacion()
const { estado: sesion } = useSesion()
const oferta = computed(() => (esOferta(estado.resultado) ? estado.resultado : null))
</script>

<template>
  <div class="pantalla flex min-h-screen flex-col" data-pantalla="W01-03b">
    <HeaderPantalla titulo="Oferta — degradada" />
    <TituloPantalla class="sr-only">Oferta — degradada</TituloPantalla>
    <MigasDePan seccion="Nueva cotización" :a-inicio="RUTA_INICIO[sesion.rol]" />
    <main v-if="oferta && oferta.rangoPrima" class="flex flex-1 flex-col items-start bg-fondo px-10 py-12">
      <div class="flex w-full max-w-[560px] flex-col items-start gap-5">
        <div class="w-full rounded-md border border-dashed border-[#bfad73] bg-alerta-fondo px-4 py-3">
          <p class="text-[13px] font-bold leading-normal text-tinta">
            No pudimos verificar todo a tiempo, esta es una oferta preliminar
          </p>
        </div>
        <p class="text-[18px] font-bold leading-normal text-tinta">
          Prima estimada (rango): {{ formatearRangoMonto(oferta.rangoPrima.minima, oferta.rangoPrima.maxima) }} / mes
        </p>
        <Boton disabled>Continuar con oferta preliminar</Boton>
        <p class="-mt-3 text-[11px] text-tinta-suave">(HU-W03, fuera de este sprint)</p>
        <RouterLink to="/cotizacion/fuentes" class="text-[13px] font-bold leading-[18px] text-enlace hover:underline">
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
