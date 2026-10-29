<!--
  Gráfico de cotizaciones por día del panel del socio (W07-02, plan-hu-w07-front.md 5.3; sin Figma, aprobado).
  SVG propio, sin librería (regla 8), con las reglas de la skill de dataviz: una sola serie en `primario` (el título
  la nombra, sin leyenda), barras de 24 px como máximo con 4 px redondeados en la punta y rectas en la base, grilla
  tenue, el texto en tinta (nunca del color de la serie) y un tooltip al pasar o enfocar cada barra, con un área de
  toque más grande que la barra. Una tabla equivalente queda para lectores de pantalla.
-->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { Consumo } from '../../api/socios'
import { t } from '../../i18n'
import { formatearFechaCorta, formatearNumero } from '../../utils/formato'

const props = defineProps<{ datos: Consumo['cotizacionesPorDia'] }>()

// El ancho del SVG es el del contenedor (no se escala con viewBox): así el texto queda en 11 px en cualquier pantalla.
const ALTO = 200
const MARGEN = { arriba: 12, derecha: 8, abajo: 28, izquierda: 40 }
const altoUtil = ALTO - MARGEN.arriba - MARGEN.abajo
const contenedor = ref<HTMLElement | null>(null)
const ancho = ref(640)
const anchoUtil = computed(() => ancho.value - MARGEN.izquierda - MARGEN.derecha)
let observador: ResizeObserver | undefined

onMounted(() => {
  if (!contenedor.value || typeof ResizeObserver === 'undefined') return
  observador = new ResizeObserver(([entrada]) => {
    if (entrada.contentRect.width > 0) ancho.value = Math.round(entrada.contentRect.width)
  })
  observador.observe(contenedor.value)
})
onUnmounted(() => observador?.disconnect())

const activo = ref<number | null>(null)

/** Tope del eje redondeado hacia arriba a un número «limpio» (1, 2 o 5 × 10ⁿ). */
const tope = computed(() => {
  const maximo = Math.max(1, ...props.datos.map((d) => d.cantidad))
  const potencia = 10 ** Math.floor(Math.log10(maximo))
  return [1, 2, 5, 10].map((m) => m * potencia).find((v) => v >= maximo) ?? maximo
})
const lineas = computed(() => [0, tope.value / 2, tope.value])

const y = (valor: number) => MARGEN.arriba + altoUtil - (valor / tope.value) * altoUtil
const franja = computed(() => anchoUtil.value / Math.max(1, props.datos.length))
const anchoBarra = computed(() => Math.min(24, franja.value * 0.6))

const barras = computed(() =>
  props.datos.map((d, i) => {
    const centro = MARGEN.izquierda + franja.value * (i + 0.5)
    const x = centro - anchoBarra.value / 2
    const arriba = y(d.cantidad)
    const base = y(0)
    const r = Math.min(4, anchoBarra.value / 2, base - arriba)
    // Punta redondeada (4 px) y base recta, anclada a la línea de cero.
    const camino =
      d.cantidad > 0
        ? `M${x},${base} V${arriba + r} Q${x},${arriba} ${x + r},${arriba} H${x + anchoBarra.value - r} Q${x + anchoBarra.value},${arriba} ${x + anchoBarra.value},${arriba + r} V${base} Z`
        : ''
    return { ...d, centro, camino, etiqueta: diaCorto(d.fecha) }
  }),
)

function diaCorto(fecha: string): string {
  const completa = formatearFechaCorta(`${fecha}T17:00:00Z`)
  return completa.replace(/,?\s\d{4}$/, '')
}

// Cada etiqueta de día necesita unos 48 px: en pantallas angostas se muestran menos.
const salto = computed(() => Math.max(1, Math.ceil(48 / franja.value)))

const tooltip = computed(() => (activo.value === null ? null : barras.value[activo.value]))
</script>

<template>
  <figure ref="contenedor" class="relative m-0 flex flex-col gap-2" data-prueba="grafico-cotizaciones">
    <figcaption class="text-[13px] font-semibold text-tinta">{{ t('socios.consumo.grafico') }}</figcaption>
    <svg
      :width="ancho"
      :height="ALTO"
      :viewBox="`0 0 ${ancho} ${ALTO}`"
      class="block max-w-full"
      role="img"
      :aria-label="t('socios.consumo.grafico')"
    >
      <g v-for="valor in lineas" :key="valor">
        <line
          :x1="MARGEN.izquierda"
          :x2="ancho - MARGEN.derecha"
          :y1="y(valor)"
          :y2="y(valor)"
          stroke-width="1"
          class="stroke-borde"
        />
        <text :x="MARGEN.izquierda - 6" :y="y(valor) + 4" text-anchor="end" font-size="11" class="fill-tinta-suave">
          {{ formatearNumero(valor) }}
        </text>
      </g>
      <g v-for="(barra, i) in barras" :key="barra.fecha">
        <path
          v-if="barra.camino"
          :d="barra.camino"
          class="fill-primario"
          :opacity="activo === null || activo === i ? 1 : 0.55"
        />
        <text
          v-if="i % salto === 0"
          :x="barra.centro"
          :y="ALTO - 8"
          text-anchor="middle"
          font-size="11"
          class="fill-tinta-suave"
        >
          {{ barra.etiqueta }}
        </text>
        <rect
          :x="barra.centro - franja / 2"
          :y="MARGEN.arriba"
          :width="franja"
          :height="altoUtil"
          fill="transparent"
          tabindex="0"
          :aria-label="t('socios.consumo.barra.dia', { dia: barra.etiqueta, n: formatearNumero(barra.cantidad) })"
          class="cursor-default focus:outline-none"
          @mouseenter="activo = i"
          @mouseleave="activo = null"
          @focus="activo = i"
          @blur="activo = null"
        />
      </g>
    </svg>
    <div
      v-if="tooltip"
      role="tooltip"
      class="pointer-events-none absolute top-6 -translate-x-1/2 whitespace-nowrap rounded-[4px] border border-borde bg-white px-2 py-1 text-[12px] text-tinta"
      :style="{ left: `${(tooltip.centro / ancho) * 100}%` }"
    >
      {{ tooltip.etiqueta }} · <strong class="font-semibold">{{ formatearNumero(tooltip.cantidad) }}</strong>
    </div>

    <table class="sr-only">
      <caption>
        {{
          t('socios.consumo.grafico')
        }}
      </caption>
      <thead>
        <tr>
          <th scope="col">{{ t('socios.consumo.dia') }}</th>
          <th scope="col">{{ t('socios.consumo.columnaCotizaciones') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="barra in barras" :key="barra.fecha">
          <td>{{ barra.etiqueta }}</td>
          <td>{{ formatearNumero(barra.cantidad) }}</td>
        </tr>
      </tbody>
    </table>
  </figure>
</template>
