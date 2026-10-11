<!--
  Campo de formulario · librería de componentes (Figma 2006:12). Etiqueta siempre visible encima,
  caja de 40 px de alto. En error: borde rojo, mensaje debajo con role="alert" (CA de accesibilidad
  de docs/convenciones.md). No usa v-model directo sobre un elemento nativo: expone
  modelValue/update:modelValue para que el padre controle el valor (sin guardar datos personales
  aquí mismo, ver CLAUDE.md regla 7).

  `disabled` (antes no existía, hallazgo de la revisión de QA de D-F1): la plantilla tiene como raíz
  un `<div>` que envuelve el `<input>`, así que el fallthrough de atributos de Vue colocaba
  `disabled` en ese `<div>` (que lo ignora en silencio) y el campo seguía editable — sin error de
  TypeScript ni de consola. Se agrega el prop explícito, enlazado al `<input>` real, con un
  tratamiento visual análogo al de Boton.vue deshabilitado (bg/texto apagados): SG-01 no documenta
  un estado "Campo deshabilitado" en su ficha de Figma (solo Normal/Con foco/Error), así que este
  estilo es una extrapolación razonada, no una cita literal de un nodo.
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
    disabled?: boolean
  }>(),
  { type: 'text', placeholder: undefined, error: undefined, hint: undefined, required: false, disabled: false },
)

defineEmits<{ 'update:modelValue': [valor: string] }>()

const idCampo = useId()
const idError = useId()
const idHint = useId()
</script>

<template>
  <div class="flex w-full flex-col gap-1">
    <label :for="idCampo" class="font-medium text-etiqueta text-tinta-suave">
      {{ label }}<span v-if="required" aria-hidden="true"> *</span>
    </label>
    <div
      class="flex h-[40px] items-center rounded-[4px] border px-3 focus-within:border-2 focus-within:px-[11px]"
      :class="disabled ? 'cursor-not-allowed border-borde bg-fondo' : error ? 'border-error bg-white' : 'border-borde bg-white focus-within:border-enlace'"
    >
      <input
        :id="idCampo"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :aria-invalid="!!error"
        :aria-describedby="error ? idError : hint ? idHint : undefined"
        class="w-full bg-transparent text-cuerpo text-tinta outline-none placeholder:text-tinta-suave disabled:cursor-not-allowed disabled:text-tinta-suave"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <p v-if="error" :id="idError" role="alert" class="flex items-center gap-1 text-nota text-error">
      <IconoMaterial nombre="cancel" class="h-[14px] w-[14px] shrink-0" />{{ error }}
    </p>
    <p v-else-if="hint" :id="idHint" class="text-nota text-tinta-suave">{{ hint }}</p>
  </div>
</template>
