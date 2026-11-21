<!--
  Esqueleto de una tarjeta o de un bloque de datos mientras llegan (regla 5), hermano de `TablaEsqueleto`: mismas
  barras grises con brillo (`.esqueleto` en `styles/base.css`) y un solo `role="status"` con el texto de carga para
  lectores de pantalla. `tarjetas` repite el bloque (p. ej. el perfil: cabecera + datos), `lineas` son las filas de cada
  una y `conAvatar` dibuja el cuadro de la izquierda (iniciales del perfil, ícono de la póliza).
-->
<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Texto de carga para lectores de pantalla. */
    etiqueta: string
    tarjetas?: number
    lineas?: number
    conAvatar?: boolean
    /** Sin borde ni fondo: para usarlo dentro de una tarjeta que ya existe. */
    plano?: boolean
  }>(),
  { tarjetas: 1, lineas: 3, conAvatar: false, plano: false },
)

const ANCHOS = ['w-2/3', 'w-1/2', 'w-5/6', 'w-2/5', 'w-3/4']
</script>

<template>
  <div aria-busy="true" class="flex w-full flex-col gap-5" data-prueba="tarjeta-esqueleto">
    <span role="status" class="sr-only">{{ etiqueta }}</span>
    <div
      v-for="tarjeta in tarjetas"
      :key="tarjeta"
      aria-hidden="true"
      class="flex w-full items-start gap-4"
      :class="plano ? '' : 'rounded-lg border border-borde bg-white p-5'"
    >
      <span v-if="conAvatar && tarjeta === 1" class="esqueleto h-14 w-14 shrink-0 rounded-lg" style="height: 3.5rem" />
      <div class="flex min-w-0 flex-1 flex-col gap-3">
        <span class="esqueleto w-1/3" style="height: 1.1rem" />
        <span
          v-for="linea in lineas"
          :key="linea"
          class="esqueleto"
          :class="ANCHOS[(linea + tarjeta) % ANCHOS.length]"
        />
      </div>
    </div>
  </div>
</template>
