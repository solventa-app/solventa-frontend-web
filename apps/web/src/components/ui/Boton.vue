<!--
  Botón · librería de componentes (Figma 2006:5 / 2006:8), fiel a "SG-01 · Guía de estilos":
  44 px de alto, radio 4 px, ancho hug (se ajusta al texto). La guía documenta el radio de la
  variante secundaria como 2 px en la instancia suelta de Figma, pero la ficha "Componentes base"
  de SG-01 fija 4 px para todos los botones; seguimos la ficha (fuente de verdad del sistema) y lo
  dejamos anotado aquí por transparencia.
  Un solo botón primario por pantalla (regla de "Qué no hacer" de SG-01): lo decide quien use este
  componente, no el componente en sí.

  `disabled` (antes no era un prop declarado): funcionaba igual por fallthrough de atributos, porque
  la plantilla tiene una sola raíz (`<button>`), pero no estaba documentado en el tipo — un
  consumidor no lo descubría por autocompletado/TypeScript. Se declara explícito (hallazgo de la
  revisión de QA de D-F1).
-->
<script setup lang="ts">
withDefaults(
  defineProps<{
    /** primario: una por pantalla. secundario: acción alterna, siempre junto a una primaria. destructivo: acción irreversible. */
    variante?: 'primario' | 'secundario' | 'destructivo'
    disabled?: boolean
  }>(),
  { variante: 'primario', disabled: false },
)
</script>

<template>
  <button
    type="button"
    :disabled="disabled"
    class="inline-flex h-[44px] items-center justify-center gap-2 rounded-[4px] px-5 font-semibold text-cuerpo transition-opacity enabled:hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-borde disabled:text-tinta-suave"
    :class="{
      'bg-primario text-white': variante === 'primario',
      'border border-primario bg-white text-primario': variante === 'secundario',
      'bg-error text-white': variante === 'destructivo',
    }"
  >
    <!-- Ícono líder opcional (p. ej. Figma 2001:1359 "Reintentar", con glifo refresh): el botón base
    no trae ninguno por defecto, solo abre el hueco para cuando Figma sí documenta uno. -->
    <slot name="icono" />
    <slot />
  </button>
</template>
