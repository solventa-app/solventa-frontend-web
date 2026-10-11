<!--
  Chip (filtro) · librería de componentes (Figma 2032:99-106, ficha "Componentes base" de SG-01):
  par activo/inactivo para filtros tipo "Todos" / "Pendiente". Pastilla (radio completo), 14 px
  horizontal / 6 px vertical, 11 px medium. Activo: fondo `primario` + texto blanco. Inactivo: fondo
  blanco + borde `borde` + texto `tinta-suave`. No existía ningún componente Chip en D-F1 (mismo
  hallazgo que Badge.vue: documentado en SG-01, sin consumidor en código).

  Es un botón (no un enlace ni un span): seleccionar un filtro es una acción, debe ser accesible por
  teclado y anunciar su estado con aria-pressed, igual que cualquier toggle.
-->
<script setup lang="ts">
withDefaults(
  defineProps<{
    activo?: boolean
  }>(),
  { activo: false },
)

defineEmits<{ click: [MouseEvent] }>()
</script>

<template>
  <button
    type="button"
    class="rounded-full px-[14px] py-[6px] text-[11px] font-medium leading-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-1"
    :class="
      activo
        ? 'bg-primario text-white'
        : 'border border-borde bg-white text-tinta-suave hover:border-tinta-suave'
    "
    :aria-pressed="activo"
    @click="$emit('click', $event)"
  >
    <slot />
  </button>
</template>
