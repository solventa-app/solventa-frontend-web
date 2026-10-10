<!--
  Barra de navegación ("Barra de navegación", Figma nodo 80:344 en el prototipo de alta fidelidad
  2vfK0e8t62OvvDk4c7QnK5 "Solventa-web"). Reconstruida para HU-W05: reemplaza el diseño anterior
  (franja fina de varios niveles, basada en el archivo "Solventa-web-Final") por el real, una sola
  franja clicable "⌂ Inicio › <sección>" que siempre vuelve al home del rol correspondiente
  (Cliente/Asesor comercial → G-02/G-02a, Operador → G-02b). El prototipo no tiene navegación
  anidada más de un nivel, así que toda la franja es un único enlace (no una lista de ítems).

  Pendiente: esta misma actualización todavía no se aplicó en feature/D-F1-libreria-componentes ni
  en feature/HU-W01-pantallas (que usan la forma anterior, con prop `items`); para que las tres
  ramas queden consistentes hay que repetir este cambio allá.

  SG-01 es explícita: una u otra barra de navegación, nunca las dos en la misma pantalla — este
  componente no se combina con una barra de cerrar sesión en la misma vista.
-->
<script setup lang="ts">
import IconoMaterial from './IconoMaterial.vue'

defineProps<{
  /** Texto de la sección actual, p. ej. "Recaudo de prima". */
  seccion: string
  /** Ruta de "Inicio" (home del rol correspondiente a esta pantalla). */
  aInicio: string
}>()
</script>

<template>
  <RouterLink
    :to="aInicio"
    class="flex w-full items-center gap-2 rounded-md bg-fondo px-[14px] py-[10px] text-[13px] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
  >
    <IconoMaterial nombre="home" class="h-[16px] w-[16px] shrink-0 text-enlace" />
    <span class="font-bold text-enlace">Inicio</span>
    <span class="text-tinta-suave" aria-hidden="true">›</span>
    <span class="text-tinta-suave">{{ seccion }}</span>
  </RouterLink>
</template>
