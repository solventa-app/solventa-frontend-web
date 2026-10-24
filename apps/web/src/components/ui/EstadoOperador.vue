<!--
  Pastilla "Operador de back-office activo" (HU-W04), fiel a Figma (W04-01 2001:2316 y W04-02 nodo 2001:2519):
  fondo blanco, borde gris (`borde`), radio 12 px, padding 3/9 px, separación 4 px, punto verde de 8 px (`exito`)
  y texto de 11/14 px en `tinta-suave`. Va en el slot `#derecha` de MigasDePan. El punto es decorativo
  (aria-hidden): el estado lo comunica el texto, nunca solo el color (SG-01).
-->
<script setup lang="ts">
import { t } from '../../i18n'
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center gap-1 rounded-[12px] border border-borde bg-white px-[9px] py-[3px] text-nota font-normal text-tinta-suave"
  >
    <span class="h-2 w-2 shrink-0 rounded-full bg-exito" aria-hidden="true"></span>
    {{ t('siniestros.operadorActivo') }}
  </span>
</template>
