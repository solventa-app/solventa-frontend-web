<!--
  Barra de navegación (migas de pan) · librería de componentes (Figma 2006:22). Franja "Inicio ›
  Sección" para las pantallas que no son login ni home: resuelve "dónde estoy" y "cómo regreso" sin
  depender del botón atrás del navegador (nota del componente en Figma). "Inicio" siempre es enlace
  de vuelta; el último elemento es la pantalla actual (sin enlace, en negrita).
  SG-01 es explícita: una u otra barra de navegación, nunca las dos en la misma pantalla — este
  componente no se combina con una barra de cerrar sesión en la misma vista.
-->
<script setup lang="ts">
defineProps<{ items: { etiqueta: string; to?: string }[] }>()
</script>

<template>
  <nav aria-label="Ruta de navegación" class="w-full border-b border-borde bg-fondo">
    <ol class="mx-auto flex max-w-[880px] items-center gap-2 px-4 py-[9px] text-[13px] leading-[19.5px]">
      <li v-for="(item, indice) in items" :key="item.etiqueta" class="flex items-center gap-2">
        <RouterLink v-if="item.to && indice < items.length - 1" :to="item.to" class="text-enlace hover:underline">
          {{ item.etiqueta }}
        </RouterLink>
        <span v-else class="font-semibold text-tinta">{{ item.etiqueta }}</span>
        <span v-if="indice < items.length - 1" class="text-tinta-suave" aria-hidden="true">›</span>
      </li>
    </ol>
  </nav>
</template>
