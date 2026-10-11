<!--
  Campo de formulario · librería de componentes (Figma 2006:12). Etiqueta siempre visible encima,
  caja de 40 px de alto. En error: borde rojo, mensaje debajo con role="alert" (CA de accesibilidad
  de docs/convenciones.md). No usa v-model directo sobre un elemento nativo: expone
  modelValue/update:modelValue para que el padre controle el valor (sin guardar datos personales
  aquí mismo, ver CLAUDE.md regla 7).
-->
<script setup lang="ts">
import { useId } from 'vue'
import IconoMaterial from './IconoMaterial.vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    label: string
    type?: string
    placeholder?: string
    /** Mensaje de error. Si está presente, el campo se pinta en estado de error. */
    error?: string
    hint?: string
    required?: boolean
    /** Ícono final dentro del campo (Figma: Documento → badge, Monto → payments, Dirección → home). */
    icono?: 'badge' | 'payments' | 'home' | 'lock'
  }>(),
  { type: 'text', placeholder: undefined, error: undefined, hint: undefined, required: false, icono: undefined },
)

defineEmits<{ 'update:modelValue': [valor: string] }>()

const idCampo = useId()
const idError = useId()
const idHint = useId()
</script>

<template>
  <div class="flex w-full flex-col gap-1">
    <label :for="idCampo" class="text-[12px] font-medium leading-[16px] text-tinta-suave">
      {{ label }}<span v-if="required" aria-hidden="true"> *</span>
    </label>
    <div
      class="relative flex h-[40px] items-center rounded-[4px] border bg-white px-3 focus-within:border-2 focus-within:px-[11px]"
      :class="[error ? 'border-error' : 'border-borde focus-within:border-enlace', icono ? 'pr-9' : '']"
    >
      <input
        :id="idCampo"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :required="required"
        :aria-invalid="!!error"
        :aria-describedby="error ? idError : hint ? idHint : undefined"
        class="w-full bg-transparent text-[13px] leading-[18px] text-tinta outline-none placeholder:text-tinta-suave"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <IconoMaterial v-if="icono" :nombre="icono" class="pointer-events-none absolute right-3 h-5 w-5 text-tinta-suave" />
    </div>
    <p v-if="error" :id="idError" role="alert" class="flex items-center gap-1 text-[11px] leading-[14px] text-error">
      <IconoMaterial nombre="cancel" class="h-[14px] w-[14px] shrink-0" />{{ error }}
    </p>
    <p v-else-if="hint" :id="idHint" class="text-[11px] leading-[14px] text-tinta-suave">{{ hint }}</p>
  </div>
</template>
