<!--
  Campo de selección (HU-W04, W04-02b "Perito / firma de peritaje asignada"). Misma estructura y
  accesibilidad que CampoFormulario (Figma 2006:12): etiqueta visible encima, caja de 40 px, error con
  role="alert" e ícono, hint debajo. Usa un <select> nativo: teclado y lectores de pantalla sin trabajo extra.
-->
<script setup lang="ts">
import { ref, useId } from 'vue'
import IconoMaterial from './IconoMaterial.vue'

export interface OpcionSeleccion {
  valor: string
  texto: string
}

withDefaults(
  defineProps<{
    modelValue: string
    label: string
    opciones: OpcionSeleccion[]
    /** Texto de la opción vacía inicial (deshabilitada). */
    placeholder?: string
    error?: string
    hint?: string
    required?: boolean
    disabled?: boolean
    /** Ícono a la izquierda (W04-02b: el del perito). */
    icono?: 'engineering'
  }>(),
  { placeholder: undefined, error: undefined, hint: undefined, required: false, disabled: false, icono: undefined },
)

defineEmits<{ 'update:modelValue': [valor: string] }>()

const idCampo = useId()
const idError = useId()
const idHint = useId()

// El modal de rechazo (bloque 5) y W04-02b enfocan el <select> al abrir o tras un error.
const select = ref<HTMLSelectElement | null>(null)
defineExpose({ focus: () => select.value?.focus() })
</script>

<template>
  <div class="flex w-full flex-col gap-1">
    <label :for="idCampo" class="font-medium text-etiqueta text-tinta-suave">
      {{ label }}<span v-if="required" aria-hidden="true"> *</span>
    </label>
    <div
      class="relative flex h-[40px] items-center rounded-[4px] border pr-9 focus-within:border-2"
      :class="[
        disabled
          ? 'cursor-not-allowed border-borde bg-fondo'
          : error
            ? 'border-error bg-white'
            : 'border-borde bg-white focus-within:border-enlace',
        icono ? 'pl-10 focus-within:pl-[39px]' : 'pl-3 focus-within:pl-[11px]',
      ]"
    >
      <IconoMaterial
        v-if="icono"
        :nombre="icono"
        class="pointer-events-none absolute left-3 h-5 w-5 text-tinta-suave"
      />
      <select
        :id="idCampo"
        ref="select"
        :value="modelValue"
        :required="required"
        :disabled="disabled"
        :aria-invalid="!!error"
        :aria-describedby="error ? idError : hint ? idHint : undefined"
        class="h-full w-full appearance-none bg-transparent text-cuerpo text-tinta outline-none disabled:cursor-not-allowed disabled:text-tinta-suave"
        @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option v-for="opcion in opciones" :key="opcion.valor" :value="opcion.valor">{{ opcion.texto }}</option>
      </select>
      <IconoMaterial nombre="chevron_abajo" class="pointer-events-none absolute right-3 h-5 w-5 text-tinta-suave" />
    </div>
    <p v-if="error" :id="idError" role="alert" class="flex items-center gap-1 text-nota text-error">
      <IconoMaterial nombre="cancel" class="h-[14px] w-[14px] shrink-0" />{{ error }}
    </p>
    <p v-else-if="hint" :id="idHint" class="text-nota text-tinta-suave">{{ hint }}</p>
  </div>
</template>
