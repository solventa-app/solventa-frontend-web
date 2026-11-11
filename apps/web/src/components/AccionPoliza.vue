<!--
  La acción de una póliza en G-06, en la fila de la tabla y en la tarjeta del teléfono: «Ver PDF» si está emitida,
  «Retomar» para el asesor si no, y «En proceso» para el cliente. Detiene el clic para no abrir además el detalle.
-->
<script setup lang="ts">
import type { Propuesta } from '../graphql/tipos'
import { t } from '../i18n'
import { estadoVisibleDe } from '../utils/estadoPoliza'
import { Boton } from './ui'

defineProps<{ propuesta: Propuesta; esAsesor: boolean; abriendo: boolean }>()
defineEmits<{ verPdf: [] }>()
</script>

<template>
  <Boton
    v-if="estadoVisibleDe(propuesta) === 'EMITIDA' && propuesta.poliza"
    variante="secundario"
    :disabled="abriendo"
    :aria-busy="abriendo"
    @click.stop="$emit('verPdf')"
  >
    {{ abriendo ? t('polizas.abriendo') : t('polizas.verPdf') }}
  </Boton>
  <RouterLink
    v-else-if="esAsesor && estadoVisibleDe(propuesta) !== 'EMITIDA'"
    :to="`/suscripcion/${propuesta.ofertaId}`"
    @click.stop
  >
    <Boton variante="secundario">{{ t('polizas.retomar') }}</Boton>
  </RouterLink>
  <span v-else class="text-[11px] text-tinta-suave">{{ t('polizas.enProceso') }}</span>
</template>
