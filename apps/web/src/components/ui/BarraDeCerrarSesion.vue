<!--
  Barra de cerrar sesión · librería de componentes (Figma 2032:115-118, ficha "Componentes base" ·
  "Navegación" de SG-01). Franja fondo gris (`fondo`) de ancho completo: a la izquierda "nombre ·
  rol" del usuario en `tinta-suave`, a la derecha el enlace "Cerrar sesión" en `enlace` medium.
  `px-4 py-[10px]`, 11 px / 14 px tanto en el nombre como en el enlace. No existía en D-F1 (mismo
  hallazgo que Badge/Chip).

  "Cerrar sesión" es un botón, no un <a>: no navega a una URL, dispara una acción (cerrar la
  sesión) — quien use este componente decide qué pasa (emite `cerrar-sesion`).
-->
<script setup lang="ts">
defineProps<{
  nombre: string
  rol: string
}>()

defineEmits<{ 'cerrar-sesion': [] }>()
</script>

<template>
  <div class="flex w-full items-center justify-between bg-fondo px-4 py-[10px] text-[11px] leading-[14px]">
    <p class="text-tinta-suave">{{ nombre }} · {{ rol }}</p>
    <button
      type="button"
      class="font-medium text-enlace hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-1"
      @click="$emit('cerrar-sesion')"
    >
      Cerrar sesión
    </button>
  </div>
</template>
