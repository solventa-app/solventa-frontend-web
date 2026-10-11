<!--
  Barra de navegación (migas de pan) · librería de componentes (Figma 2006:22, instancia real dentro
  de "Librería de componentes · alta fidelidad", archivo yKWD8jrwERtJkuSj0mk0Gz "Solventa-web-Final").
  Franja "Inicio › Sección" para las pantallas que no son login ni home: resuelve "dónde estoy" y
  "cómo regreso" sin depender del botón atrás del navegador (nota del componente en Figma). "Inicio"
  siempre es enlace de vuelta; la sección actual no es enlace (va en negrita).

  Reemplaza una versión anterior de este componente que se había construido contra el archivo
  2vfK0e8t62OvvDk4c7QnK5 "Solventa-web" (con ícono de casita, "Inicio" en azul/negrita y fondo gris
  en pastilla, y sin el landmark <nav>): "Solventa-web-Final" es la fuente de verdad confirmada para
  toda la librería de componentes, y la instancia real 2006:22 se ve distinto — sin ícono, "Inicio"
  en gris `tinta-suave` (con subrayado al pasar el mouse como única señal de que es clicable, patrón
  estándar de breadcrumb), separador gris, sección actual en negrita `tinta`, 13 px, fondo blanco
  con borde inferior (no la pastilla gris).

  (Dentro de "Solventa-web-Final" hay además una ficha de referencia en SG-01, nodo 2032:110, que
  tampoco coincide del todo con esta instancia real -dibuja "Inicio" en azul-: se sigue la instancia
  real 2006:22 porque esa página de SG-01 se genera automáticamente desde DESIGN.md, nodo 2028:47,
  así que es documentación, no el pixel final.)

  API `seccion` + `aInicio` (en vez de una lista genérica de `items`): la propia descripción del
  componente en Figma dice que el patrón es siempre "Inicio › Sección", nunca más de un nivel —
  una lista de ítems genérica sería sobre-construir para un caso que nunca varía de profundidad.

  SG-01 es explícito: una u otra barra de navegación, nunca las dos en la misma pantalla — este
  componente no se combina con una barra de cerrar sesión en la misma vista.
-->
<script setup lang="ts">
defineProps<{
  /** Texto de la sección actual, p. ej. "Recaudo de prima". */
  seccion: string
  /** Ruta de "Inicio" (home del rol/flujo correspondiente a esta pantalla). */
  aInicio: string
}>()
</script>

<template>
  <nav aria-label="Ruta de navegación" class="w-full border-b border-borde bg-white">
    <div class="mx-auto flex max-w-[880px] items-center gap-2 px-4 py-2 text-[13px] leading-[19.5px]">
      <RouterLink :to="aInicio" class="text-tinta-suave hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2">
        Inicio
      </RouterLink>
      <span class="text-tinta-suave" aria-hidden="true">›</span>
      <span class="font-semibold text-tinta">{{ seccion }}</span>
    </div>
  </nav>
</template>
