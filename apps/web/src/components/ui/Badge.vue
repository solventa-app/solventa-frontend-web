<!--
  Badge · librería de componentes (Figma 2032:83-96, ficha "Componentes base" de SG-01): "el estado
  nunca se comunica solo con color" — por eso cada tipo lleva su propio glifo de texto delante de la
  etiqueta (no un icono, un glifo, para no mezclar con Material Symbols Outlined fuera de lo que
  documenta "Qué no hacer"), además del color. 4 tipos documentados: éxito (✓), alerta (!), error (✕)
  y "en curso" (→). Pastilla (radio completo), 10 px horizontal / 4 px vertical, 11 px semibold.

  No existía ningún componente Badge/Chip en D-F1 todavía (hallazgo de la revisión de diseño): los
  tokens de color `exito`/`alerta`/`error`/`info` + sus `-fondo` en twind.ts ya existían para esto,
  pero no tenían ningún consumidor.
-->
<script setup lang="ts">
const GLIFOS = { exito: '✓', alerta: '!', error: '✕', enCurso: '→' } as const

const CLASES = {
  exito: 'bg-exito-fondo text-exito',
  alerta: 'bg-alerta-fondo text-alerta',
  error: 'bg-error-fondo text-error',
  // Figma nombra este token "En curso" en la ficha de estilos; en twind.ts es `info`/`info-fondo`
  // (mismo color #2b5aa3 que `enlace`) — se documenta aquí el mapeo de nombre.
  enCurso: 'bg-info-fondo text-info',
} as const

defineProps<{
  tipo: 'exito' | 'alerta' | 'error' | 'enCurso'
}>()
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-full px-[10px] py-1 text-[11px] font-semibold leading-[14px]"
    :class="CLASES[tipo]"
  >
    <span aria-hidden="true">{{ GLIFOS[tipo] }}</span><slot />
  </span>
</template>
