<!--
  Selector de idioma (ES/EN) · librería de componentes (Figma 2006:74). Evidencia de que el idioma
  es una variable de la interfaz, no texto quemado (nota del componente en Figma). Este componente
  es presentacional: cambia el valor seleccionado, pero el Sprint 1 no pide traducir la interfaz
  (no hay ninguna CA de i18n en docs/plan-frontend.md), así que no se construye esa capa aquí.
-->
<script setup lang="ts">
withDefaults(defineProps<{ modelValue?: 'ES' | 'EN' }>(), { modelValue: 'ES' })
defineEmits<{ 'update:modelValue': [valor: 'ES' | 'EN'] }>()
</script>

<template>
  <div role="group" aria-label="Selector de idioma" class="flex h-7 items-center gap-1 rounded-full border border-borde bg-fondo px-[13px] text-[11px] leading-[11px]">
    <span class="text-tinta">Idioma:</span>
    <button
      type="button"
      :aria-pressed="modelValue === 'ES'"
      class="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-1"
      :class="modelValue === 'ES' ? 'font-semibold text-tinta' : 'text-tinta-suave'"
      @click="$emit('update:modelValue', 'ES')"
    >
      ES
    </button>
    <span class="text-tinta" aria-hidden="true">|</span>
    <button
      type="button"
      :aria-pressed="modelValue === 'EN'"
      class="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-1"
      :class="modelValue === 'EN' ? 'font-semibold text-tinta' : 'text-tinta-suave'"
      @click="$emit('update:modelValue', 'EN')"
    >
      EN
    </button>
  </div>
</template>
