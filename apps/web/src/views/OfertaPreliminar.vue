<!--
  W01-03b · Oferta preliminar / degradada (Figma yKWD8jrwERtJkuSj0mk0Gz "Solventa-web-Final", nodo
  2001:1262, CA-W01-04).

  Re-verificada contra el archivo correcto (confirmado con captura de pantalla vía
  get_design_context, no solo con la metadata): una ronda anterior había reconstruido esta pantalla
  citando 2vfK0e8t62OvvDk4c7QnK5 "Solventa-web" (nodo 10:23, el archivo equivocado) y, basada en esa
  captura, había ELIMINADO contenido que sí existe en el archivo correcto: el ícono arrow_circle_right
  en círculo ámbar, el encabezado "Oferta preliminar", la línea "Cobertura: $ 185.000.000", la nota
  "Calculada con el último valor disponible en caché." y el desglose de score/plazo. Se restaura todo
  eso ahora, respaldado por campos no-nulos del contrato (`cobertura: Monto!`, `desgloseScore:
  [FactorScore!]!`, ver contrato/schema.graphql) — ningún dato mostrado es inventado.

  Mismo criterio ya aplicado en OfertaCompleta.vue (pantalla hermana): el prototipo muestra "Score de
  riesgo: 782/850 (preliminar)", pero el contrato no expone un score numérico único, solo el desglose
  por factor — se muestra ese desglose real en vez de inventar un número. El plazo tampoco está en
  `Oferta`, así que se toma de la captura del usuario (`SolicitudOfertaInput.plazoMeses`).

  Título del header: el nodo real (2001:1314) usa un tratamiento más liviano y propio solo de esta
  pantalla ("Solventa" + "Oferta preliminar" en 14px, sin divisor "|" ni los 22px bold del resto de
  pantallas) — se mantiene el componente `HeaderPantalla` compartido (igual que las otras ~20
  pantallas de este flujo, consistente con SG-01) en vez de construir un header de un solo uso,
  simplemente corrigiendo el texto a "Oferta preliminar" (antes decía "Oferta — degradada", que no
  está en ningún nodo).

  "Continuar con oferta preliminar" se deja deshabilitado y anotado "(HU-W03, fuera de este sprint)",
  igual que "Continuar a suscripción" en OfertaCompleta.vue — el Figma literal lo muestra como un
  botón activo sin anotación, pero HU-W03 no existe todavía en este sprint, así que un botón "activo"
  que no lleva a ningún lado sería peor que uno deshabilitado y explicado; mismo criterio ya aplicado
  en la pantalla hermana.
-->
<script setup lang="ts">
import { computed } from 'vue'
import { Boton, FooterPantalla, HeaderPantalla, MigasDePan, TituloPantalla } from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
import { esOferta, useCotizacion } from '../composables/useCotizacion'
import { RUTA_INICIO, useSesion } from '../composables/useSesion'
import { formatearMonto, formatearPorcentaje, formatearRangoMonto } from '../utils/formato'

const { estado, captura } = useCotizacion()
const { estado: sesion } = useSesion()
const oferta = computed(() => (esOferta(estado.resultado) ? estado.resultado : null))
</script>

<template>
  <div class="pantalla flex min-h-screen flex-col" data-pantalla="W01-03b">
    <HeaderPantalla titulo="Oferta preliminar" />
    <TituloPantalla class="sr-only">Oferta preliminar</TituloPantalla>
    <MigasDePan seccion="Nueva cotización" :a-inicio="RUTA_INICIO[sesion.rol]" />
    <main v-if="oferta && oferta.rangoPrima" class="flex flex-1 flex-col items-center bg-fondo px-10 py-12">
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
          <div v-for="factor in oferta.desgloseScore" :key="factor.nombre" class="flex items-center justify-between px-1">
            <span class="text-[13px] text-tinta-suave">{{ factor.nombre }}:</span>
            <span class="text-[13px] font-semibold text-tinta">{{ formatearPorcentaje(factor.peso) }} del score</span>
          </div>
          <div class="flex items-center justify-between px-1">
            <span class="text-[13px] text-tinta-suave">Plazo:</span>
            <span class="text-[13px] font-semibold text-tinta">{{ captura.plazoMeses }} meses</span>
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
