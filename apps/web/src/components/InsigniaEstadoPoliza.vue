<!-- Insignia del estado visible de una póliza (G-06 y G-06b). El ícono acompaña al color: no se depende solo de él. -->
<script setup lang="ts">
import type { EstadoVisible } from '../graphql/tipos'
import { t } from '../i18n'
import IconoMaterial from './ui/IconoMaterial.vue'

defineProps<{ estado: EstadoVisible }>()

const INSIGNIA: Record<EstadoVisible, { texto: string; fondo: string; icono: 'check_circle' | 'sync' | 'cancel' }> = {
  EMITIDA: { texto: 'text-exito', fondo: 'bg-exito-fondo', icono: 'check_circle' },
  EMITIENDO: { texto: 'text-info', fondo: 'bg-info-fondo', icono: 'sync' },
  NO_EMITIDA: { texto: 'text-error', fondo: 'bg-error-fondo', icono: 'cancel' },
}
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-semibold"
    :class="[INSIGNIA[estado].fondo, INSIGNIA[estado].texto]"
  >
    <IconoMaterial :nombre="INSIGNIA[estado].icono" class="h-3.5 w-3.5" />
    {{ t(`polizas.estadoVisible.${estado}`) }}
  </span>
</template>
