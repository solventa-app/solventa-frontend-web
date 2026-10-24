<!--
  Pastilla "Operador de back-office activo" (HU-W04). Va en el slot `#derecha` de MigasDePan. El punto es
  decorativo (aria-hidden): el estado lo comunica el texto, nunca solo el color (SG-01). Una sola variante
  (info) aunque los frames mezclan verde/azul/ámbar: esos colores se confunden con los estados del siniestro.
-->
<script setup lang="ts">
import { t } from '../../i18n'
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full bg-info-fondo px-[10px] py-1 text-nota font-normal text-info"
  >
    <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-info" aria-hidden="true"></span>
    {{ t('siniestros.operadorActivo') }}
  </span>
</template>
