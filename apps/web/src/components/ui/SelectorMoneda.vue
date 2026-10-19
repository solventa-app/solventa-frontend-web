<!--
  Selector de moneda · librería de componentes (Figma 2006:79). "Pastilla COP con desplegable. La
  lista completa de monedas está documentada en el plano" (nota del componente en Figma): el plano
  no nos da esa lista completa todavía, así que el componente recibe las opciones por prop en vez
  de inventarlas, con COP como único valor por defecto (el único que usan los mocks del contrato).

  Dos hallazgos de la revisión de QA de D-F1, corregidos aquí: (1) no había forma de deshabilitar el
  control (mismo problema de fallthrough que CampoFormulario.vue: la raíz es un `<div>` envolvente,
  no el `<select>`) — se agrega el prop `disabled` explícito; (2) el `<select>` tiene `outline-none`
  sin ningún reemplazo visual de foco, era la única superficie interactiva de toda la librería donde
  el foco de teclado quedaba completamente invisible (viola WCAG 2.4.7) — se agrega un anillo de
  foco en el contenedor vía `focus-within`, mismo patrón que ya usa CampoFormulario.vue.
-->
<script lang="ts">
export const MONEDAS_SOPORTADAS = ['COP', 'MXN', 'BRL', 'CLP', 'PEN', 'USD', 'EUR'] as const
export type MonedaSoportada = (typeof MONEDAS_SOPORTADAS)[number]
</script>

<script setup lang="ts">
import { useId } from 'vue'
import IconoMaterial from './IconoMaterial.vue'

withDefaults(defineProps<{ modelValue?: string; opciones?: string[]; disabled?: boolean }>(), {
  modelValue: 'COP',
  opciones: () => [...MONEDAS_SOPORTADAS],
  disabled: false,
})
defineEmits<{ 'update:modelValue': [valor: string] }>()

const idSelector = useId()
</script>

<template>
  <div
    class="inline-flex h-7 items-center gap-1 rounded-full border border-borde bg-fondo pl-[13px] pr-[11px] focus-within:ring-2 focus-within:ring-enlace focus-within:ring-offset-2"
    :class="{ 'cursor-not-allowed opacity-60': disabled }"
  >
    <label :for="idSelector" class="sr-only">Moneda</label>
    <select
      :id="idSelector"
      :value="modelValue"
      :disabled="disabled"
      :aria-label="`Cambiar moneda. Moneda actual: ${modelValue}`"
      class="appearance-none bg-transparent text-[11px] font-semibold leading-[11px] text-tinta outline-none disabled:cursor-not-allowed"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option v-for="opcion in opciones" :key="opcion" :value="opcion">{{ opcion }}</option>
    </select>
    <IconoMaterial nombre="chevron_abajo" class="h-[14px] w-[14px] text-tinta-suave" />
  </div>
</template>
