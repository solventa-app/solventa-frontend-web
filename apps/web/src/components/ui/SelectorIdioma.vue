<!--
  Selector de idioma (ES/EN) · librería de componentes (Figma 2006:74). Evidencia de que el idioma
  es una variable de la interfaz, no texto quemado (nota del componente en Figma). Es presentacional
  (v-model); quien lo conecta al idioma global de la app es HeaderPantalla (ver src/i18n).
  El idioma activo va en negrita y con el color de enlace para que se distinga a simple vista: con solo
  negrita sobre gris, a 11 px, casi no se notaba cuál estaba elegido.
-->
<script setup lang="ts">
import { t } from '../../i18n'

withDefaults(defineProps<{ modelValue?: 'ES' | 'EN' }>(), { modelValue: 'ES' })
defineEmits<{ 'update:modelValue': [valor: 'ES' | 'EN'] }>()
</script>

<template>
  <div
    role="group"
    :aria-label="t('idioma.grupo')"
    class="flex h-7 items-center gap-1 rounded-full border border-borde bg-fondo px-[13px] text-[11px] leading-[11px]"
  >
    <span class="text-tinta">{{ t('idioma.etiqueta') }}</span>
    <button
      type="button"
      :aria-pressed="modelValue === 'ES'"
      class="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-1"
      :class="modelValue === 'ES' ? 'font-bold text-enlace' : 'text-tinta-suave hover:text-tinta'"
      @click="$emit('update:modelValue', 'ES')"
    >
      ES
    </button>
    <span class="text-tinta" aria-hidden="true">|</span>
    <button
      type="button"
      :aria-pressed="modelValue === 'EN'"
      class="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-1"
      :class="modelValue === 'EN' ? 'font-bold text-enlace' : 'text-tinta-suave hover:text-tinta'"
      @click="$emit('update:modelValue', 'EN')"
    >
      EN
    </button>
  </div>
</template>
