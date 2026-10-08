<!--
  Selector de moneda · librería de componentes (Figma 2006:79). "Pastilla COP con desplegable. La
  lista completa de monedas está documentada en el plano" (nota del componente en Figma): el plano
  no nos da esa lista completa todavía, así que el componente recibe las opciones por prop en vez
  de inventarlas, con COP como único valor por defecto (el único que usan los mocks del contrato).
-->
<script setup lang="ts">
import { useId } from 'vue'
import IconoMaterial from './IconoMaterial.vue'

withDefaults(defineProps<{ modelValue?: string; opciones?: string[] }>(), {
  modelValue: 'COP',
  opciones: () => ['COP'],
})
defineEmits<{ 'update:modelValue': [valor: string] }>()

const idSelector = useId()
</script>

<template>
  <div class="inline-flex h-7 items-center gap-1 rounded-full border border-borde bg-fondo pl-[13px] pr-[11px]">
    <label :for="idSelector" class="sr-only">Moneda</label>
    <select
      :id="idSelector"
      :value="modelValue"
      :aria-label="`Cambiar moneda. Moneda actual: ${modelValue}`"
      class="appearance-none bg-transparent text-[11px] font-semibold leading-[11px] text-tinta outline-none"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option v-for="opcion in opciones" :key="opcion" :value="opcion">{{ opcion }}</option>
    </select>
    <IconoMaterial nombre="chevron_abajo" class="h-[14px] w-[14px] text-tinta-suave" />
  </div>
</template>
