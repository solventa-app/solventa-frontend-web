<!--
  Barra de navegación (migas de pan) · librería de componentes (Figma 2006:22).

  Siempre "Inicio › Sección", nunca más de un nivel (lo dice el componente en Figma): por eso la API
  es `seccion` + `aInicio` y no una lista de ítems. Sigue la instancia de alta fidelidad 2006:22, no
  la ficha autogenerada de SG-01. No se combina con BarraDeCerrarSesion en la misma pantalla.
-->
<script setup lang="ts">
defineProps<{
  /** Texto de la sección actual, p. ej. "Nueva cotización". */
  seccion: string
  /** Ruta de "Inicio" (home del rol/flujo correspondiente a esta pantalla). */
  aInicio: string
}>()
</script>

<template>
  <nav aria-label="Ruta de navegación" class="w-full border-b border-borde bg-white">
    <div class="mx-auto flex max-w-[880px] items-center gap-2 px-4 py-2 text-[13px] leading-[19.5px]">
      <RouterLink
        :to="aInicio"
        class="text-tinta-suave hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
      >
        Inicio
      </RouterLink>
      <span class="text-tinta-suave" aria-hidden="true">›</span>
      <span class="font-semibold text-tinta">{{ seccion }}</span>
    </div>
  </nav>
</template>
