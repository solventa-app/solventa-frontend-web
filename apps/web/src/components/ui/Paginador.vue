<!--
  Paginador de las tablas de la web: «Anterior», «Página N de M» y «Siguiente». Salió de W05-01 (ConciliacionDePagos) y lo
  comparten W04-01 y las demás tablas. Se muestra aunque haya una sola página, con los dos botones deshabilitados.
-->
<script setup lang="ts">
import { t } from '../../i18n'

const props = defineProps<{ pagina: number; totalPaginas: number }>()
const emit = defineEmits<{ 'update:pagina': [valor: number] }>()

const clase =
  'rounded border border-borde bg-white px-3 py-1 text-[12px] font-medium text-tinta hover:bg-fondo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace disabled:cursor-not-allowed disabled:opacity-40'
</script>

<template>
  <nav class="flex items-center gap-2" :aria-label="t('paginador.etiqueta')" data-componente="paginador">
    <button type="button" :class="clase" :disabled="pagina <= 1" @click="emit('update:pagina', props.pagina - 1)">
      {{ t('paginador.anterior') }}
    </button>
    <span class="text-[12px] text-tinta-suave">
      {{ t('paginador.pagina') }} <strong class="font-semibold text-tinta">{{ pagina }}</strong>
      {{ t('paginador.de') }}
      <strong class="font-semibold text-tinta">{{ totalPaginas }}</strong>
    </span>
    <button
      type="button"
      :class="clase"
      :disabled="pagina >= totalPaginas"
      @click="emit('update:pagina', props.pagina + 1)"
    >
      {{ t('paginador.siguiente') }}
    </button>
  </nav>
</template>
