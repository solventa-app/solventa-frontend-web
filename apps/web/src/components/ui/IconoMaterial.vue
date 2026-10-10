<!--
  Envoltorio interno para los glifos de Material Symbols Outlined que usa la librería (SG-01 exige
  ese set y ningún otro, "siempre acompañado de texto"). A propósito no es un sistema de iconos
  genérico: en vez de cargar la fuente variable completa del paquete `material-symbols` (~4 MB,
  miles de glifos) se copian aquí solo los trazos SVG que hacen falta hoy, tomados del paquete
  oficial `@material-symbols/svg-400/outlined` (devDependency, no se publica como icon font), con
  fill="currentColor" para heredar el color del texto. Un glifo nuevo se agrega aquí con una razón
  concreta, nunca mezclado con otro set de iconos.
-->
<script setup lang="ts">
const RUTAS = {
  cancel:
    'm330-288 150-150 150 150 42-42-150-150 150-150-42-42-150 150-150-150-42 42 150 150-150 150 42 42ZM480-80q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 31.5-156t86-127Q252-817 325-848.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 82-31.5 155T763-197.5q-54 54.5-127 86T480-80Zm0-60q142 0 241-99.5T820-480q0-142-99-241t-241-99q-141 0-240.5 99T140-480q0 141 99.5 240.5T480-140Zm0-340Z',
  lock: 'M220-80q-24.75 0-42.37-17.63Q160-115.25 160-140v-434q0-24.75 17.63-42.38Q195.25-634 220-634h70v-96q0-78.85 55.61-134.42Q401.21-920 480.11-920q78.89 0 134.39 55.58Q670-808.85 670-730v96h70q24.75 0 42.38 17.62Q800-598.75 800-574v434q0 24.75-17.62 42.37Q764.75-80 740-80H220Zm0-60h520v-434H220v434Zm314.5-162.03Q557-324.06 557-355q0-30-22.67-54.5t-54.5-24.5q-31.83 0-54.33 24.5t-22.5 55q0 30.5 22.67 52.5t54.5 22q31.83 0 54.33-22.03ZM350-634h260v-96q0-54.17-37.88-92.08-37.88-37.92-92-37.92T388-822.08q-38 37.91-38 92.08v96ZM220-140v-434 434Z',
  person:
    'M372-523q-42-42-42-108t42-108q42-42 108-42t108 42q42 42 42 108t-42 108q-42 42-108 42t-108-42ZM160-160v-94q0-38 19-65t49-41q67-30 128.5-45T480-420q62 0 123 15.5T731-360q31 14 50 41t19 65v94H160Zm60-60h520v-34q0-16-9.5-30.5T707-306q-64-31-117-42.5T480-360q-57 0-111 11.5T252-306q-14 7-23 21.5t-9 30.5v34Zm324.5-346.5Q570-592 570-631t-25.5-64.5Q519-721 480-721t-64.5 25.5Q390-670 390-631t25.5 64.5Q441-541 480-541t64.5-25.5ZM480-631Zm0 411Z',
  chevron_abajo: 'M480-344 240-584l43-43 197 197 197-197 43 43-240 240Z',
  // Agregado para MigasDePan.vue (ver ese archivo): el ícono de casa de la franja "Inicio › Sección".
  home:
    'M220-180h150v-250h220v250h150v-390L480-765 220-570v390Zm-60 60v-480l320-240 320 240v480H530v-250H430v250H160Zm320-353Z',
} as const

defineProps<{ nombre: keyof typeof RUTAS }>()
</script>

<template>
  <svg viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true" focusable="false">
    <path :d="RUTAS[nombre]" />
  </svg>
</template>
