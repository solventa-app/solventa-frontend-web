<!--
  Campo de formulario · librería de componentes (Figma 2006:12). Etiqueta siempre visible encima y
  caja de 40 px. En error: borde rojo y mensaje debajo con role="alert". `disabled` es un prop
  explícito porque la raíz es un <div> y el atributo no llegaría al <input>.
-->
<script setup lang="ts">
import { computed, ref, useId } from 'vue'
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
    /** Ícono final dentro del campo (Figma: Documento → badge, Monto → payments, Dirección → home). */
    icono?: 'badge' | 'payments' | 'home' | 'lock'
  }>(),
  {
    type: 'text',
    placeholder: undefined,
    error: undefined,
    hint: undefined,
    required: false,
    disabled: false,
    icono: undefined,
  },
)

defineEmits<{ 'update:modelValue': [valor: string] }>()

// Una contraseña lleva un botón para verla u ocultarla en vez del ícono decorativo.
const esClave = computed(() => props.type === 'password')
const claveVisible = ref(false)
const tipoEfectivo = computed(() => (esClave.value && claveVisible.value ? 'text' : props.type || 'text'))

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
      class="relative flex h-[40px] items-center rounded-[4px] border px-3 focus-within:border-2 focus-within:px-[11px]"
      :class="[
        disabled
          ? 'cursor-not-allowed border-borde bg-fondo'
          : error
            ? 'border-error bg-white'
            : 'border-borde bg-white focus-within:border-enlace',
        icono || esClave ? 'pr-9' : '',
      ]"
    >
      <input
        :id="idCampo"
        :type="tipoEfectivo"
        :value="modelValue"
        :placeholder="placeholder"
        :required="required"
        :disabled="disabled"
        :aria-invalid="!!error"
        :aria-describedby="error ? idError : hint ? idHint : undefined"
        class="w-full bg-transparent text-cuerpo text-tinta outline-none placeholder:text-tinta-suave disabled:cursor-not-allowed disabled:text-tinta-suave"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <button
        v-if="esClave"
        type="button"
        class="absolute right-2 flex h-7 w-7 items-center justify-center rounded text-tinta-suave hover:text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace"
        :aria-label="claveVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'"
        :aria-pressed="claveVisible"
        :aria-controls="idCampo"
        :disabled="disabled"
        @click="claveVisible = !claveVisible"
      >
        <IconoMaterial :nombre="claveVisible ? 'visibility_off' : 'visibility'" class="h-5 w-5" />
      </button>
      <IconoMaterial
        v-else-if="icono"
        :nombre="icono"
        class="pointer-events-none absolute right-3 h-5 w-5 text-tinta-suave"
      />
    </div>
    <p v-if="error" :id="idError" role="alert" class="flex items-center gap-1 text-nota text-error">
      <IconoMaterial nombre="cancel" class="h-[14px] w-[14px] shrink-0" />{{ error }}
    </p>
    <p v-else-if="hint" :id="idHint" class="text-nota text-tinta-suave">{{ hint }}</p>
  </div>
</template>
