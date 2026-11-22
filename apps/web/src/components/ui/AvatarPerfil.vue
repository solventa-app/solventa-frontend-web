<!--
  Avatar · Mi perfil · librería de componentes (Figma 2006:66). Botón circular de 32x32 px en el
  header. En el plano v21 lleva a G-05 (Mi perfil), que no está en el catálogo del Sprint 1
  (apps/web/src/router/pantallas.ts): por eso este componente no asume una ruta y solo emite
  "click" — quien lo use decide qué hacer hasta que G-05 exista.
-->
<script setup lang="ts">
import IconoMaterial from './IconoMaterial.vue'
import { t } from '../../i18n'

defineProps<{ etiqueta?: string; iniciales?: string }>()
defineEmits<{ click: [] }>()
</script>

<template>
  <button
    type="button"
    :aria-label="etiqueta ?? t('perfil.avatar')"
    class="flex h-8 w-8 items-center justify-center rounded-full bg-primario text-[12px] font-bold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
    :title="etiqueta ?? t('perfil.avatar')"
    @click="$emit('click')"
  >
    <span v-if="iniciales" aria-hidden="true">{{ iniciales }}</span>
    <IconoMaterial v-else nombre="person" class="h-4 w-4" />
  </button>
</template>
