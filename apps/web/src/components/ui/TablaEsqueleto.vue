<!--
  Esqueleto de una tabla mientras llegan sus datos (regla 5: el estado de carga también se diseña), como el Skeleton
  de PrimeVue: el encabezado ya muestra las columnas reales y cada celda es un bloque gris con un brillo que lo recorre
  (`.esqueleto` en `styles/base.css`). Ocupa el mismo contenedor y alto de fila que las tablas de las pantallas, así
  que al llegar los datos la página no salta. Para un lector de pantalla es un solo `role="status"` con el texto de
  carga (oculto a la vista) y la tabla es decorativa (`aria-hidden`). Con «reducir movimiento» no hay brillo: el bloque
  parpadea suave, como el resto de indicadores de carga.
-->
<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** Texto de carga para lectores de pantalla (p. ej. `t('polizas.cargando')`). */
    etiqueta: string
    /** Títulos de las columnas de la tabla real, en su orden. */
    encabezados: string[]
    /** Filas de relleno: las que se esperan en la primera página, sin pasar de una pantalla. */
    filas?: number
  }>(),
  { filas: 5 },
)

// Anchos que se repiten por columna y fila: parecen datos reales sin cambiar en cada render.
const ANCHOS = ['w-3/4', 'w-1/2', 'w-2/3', 'w-2/5', 'w-5/6', 'w-1/3']
const filas = computed(() => Array.from({ length: Math.max(1, props.filas) }, (_, i) => i))
const ancho = (fila: number, columna: number) => ANCHOS[(fila * 2 + columna) % ANCHOS.length]
</script>

<template>
  <div
    aria-busy="true"
    class="w-full overflow-hidden rounded-lg border border-borde bg-white"
    data-prueba="tabla-esqueleto"
  >
    <span role="status" class="sr-only">{{ etiqueta }}</span>
    <div class="overflow-x-auto" aria-hidden="true">
      <table class="w-full border-collapse text-left">
        <thead>
          <tr class="border-b border-borde bg-fondo">
            <th
              v-for="(titulo, c) in encabezados"
              :key="c"
              class="whitespace-nowrap px-5 py-3 text-[13px] font-semibold leading-[19.5px] text-tinta"
            >
              {{ titulo }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in filas" :key="f" class="border-t border-borde first:border-t-0" data-prueba="fila-esqueleto">
            <td v-for="(_, c) in encabezados" :key="c" class="px-5 py-[18px] align-top">
              <span class="esqueleto" :class="ancho(f, c)" />
              <!-- La primera columna de las tablas reales tiene dos líneas (nombre y detalle): así la fila mide
                   casi lo mismo y la página no salta al llegar los datos. -->
              <span v-if="c === 0" class="esqueleto mt-2 !h-2.5 w-2/5" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
