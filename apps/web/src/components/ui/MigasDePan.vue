<!--
  Barra de navegación ("Barra de navegación", Figma nodo 80:344 en el prototipo de alta fidelidad
  2vfK0e8t62OvvDk4c7QnK5 "Solventa-web"). Reconstruida para ser fiel a ese archivo: reemplaza el
  diseño anterior (franja fina de varios niveles, con lista de `items`, basada en el archivo
  "Solventa-web-Final") por el real, una sola franja clicable "⌂ Inicio › <sección>" que siempre
  vuelve al home del rol correspondiente (Cliente/Asesor comercial → G-02/G-02a, Operador → G-02b).
  El prototipo no tiene navegación anidada de más de un nivel, así que toda la franja es un único
  enlace (no una lista de ítems).

  Envuelto en <nav aria-label> (landmark que el componente anterior sí tenía) y con aria-label
  explícito en el enlace: el nombre accesible por defecto sería "Inicio › <sección>" completo
  (confuso, como si "sección" también fuera parte de la acción), así que se fija un nombre claro
  ("Volver a Inicio") y se oculta a lectores de pantalla el contenido visual redundante (texto,
  separador y sección), que sigue siendo visible para usuarios con vista.

  SG-01 es explícita: una u otra barra de navegación, nunca las dos en la misma pantalla — este
  componente no se combina con una barra de cerrar sesión en la misma vista.
-->
<script setup lang="ts">
import IconoMaterial from './IconoMaterial.vue'

defineProps<{
  /** Texto de la sección actual, p. ej. "Nueva cotización". */
  seccion: string
  /** Ruta de "Inicio" (home del rol correspondiente a esta pantalla). */
  aInicio: string
}>()
</script>

<template>
  <nav aria-label="Ruta de navegación">
    <RouterLink
      :to="aInicio"
      aria-label="Volver a Inicio"
      class="flex w-full items-center gap-2 rounded-md bg-fondo px-[14px] py-[10px] text-[13px] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
    >
      <IconoMaterial nombre="home" aria-hidden="true" class="h-[16px] w-[16px] shrink-0 text-enlace" />
      <span aria-hidden="true" class="font-bold text-enlace">Inicio</span>
      <span aria-hidden="true" class="text-tinta-suave">›</span>
      <span aria-hidden="true" class="text-tinta-suave">{{ seccion }}</span>
    </RouterLink>
  </nav>
</template>
