<!--
  Área de texto con contador (HU-W04: instrucciones al perito en W04-02b y comentario del rechazo). Misma
  estructura y accesibilidad que CampoFormulario (Figma 2006:12). El contador "{n} / {max} caracteres" va
  enlazado por aria-describedby y solo se anuncia (aria-live) desde el 90 % del límite; al llegar al máximo
  dice "Límite alcanzado" además de cambiar de color (SG-01: nunca solo color). "(opcional)" va en la label.
-->
<script setup lang="ts">
import { computed, useId } from 'vue'
import IconoMaterial from './IconoMaterial.vue'
import { t } from '../../i18n'

const props = withDefaults(
  defineProps<{
    modelValue: string
    label: string
    placeholder?: string
    error?: string
    hint?: string
    required?: boolean
    disabled?: boolean
    /** Máximo de caracteres (el dummy de siniestros acepta hasta 500). */
    maxlength?: number
    filas?: number
  }>(),
  {
    placeholder: undefined,
    error: undefined,
    hint: undefined,
    required: false,
    disabled: false,
    maxlength: 500,
    filas: 3,
  },
)

defineEmits<{ 'update:modelValue': [valor: string] }>()

const idCampo = useId()
const idContador = useId()
const idError = useId()
const idHint = useId()

const largo = computed(() => props.modelValue.length)
const enLimite = computed(() => largo.value >= props.maxlength)
const cercaDelLimite = computed(() => largo.value >= props.maxlength * 0.9)
const describedby = computed(() =>
  [idContador, props.error ? idError : props.hint ? idHint : null].filter(Boolean).join(' '),
)
</script>

<template>
  <div class="flex w-full flex-col gap-1">
    <div class="flex items-baseline justify-between gap-2">
      <label :for="idCampo" class="font-medium text-etiqueta text-tinta-suave">
        {{ label }}<span v-if="required" aria-hidden="true"> *</span>
      </label>
      <span
        :id="idContador"
        class="shrink-0 text-nota"
        :class="enLimite ? 'text-alerta' : 'text-tinta-suave'"
        :aria-live="cercaDelLimite ? 'polite' : undefined"
        data-contador
      >
        {{ t('siniestros.campo.contador', { n: largo, max: maxlength })
        }}<template v-if="enLimite"> · {{ t('siniestros.campo.limite') }}</template>
      </span>
    </div>
    <textarea
      :id="idCampo"
      :value="modelValue"
      :placeholder="placeholder"
      :required="required"
      :disabled="disabled"
      :maxlength="maxlength"
      :rows="filas"
      :aria-invalid="!!error"
      :aria-describedby="describedby"
      class="min-h-[98px] w-full resize-none rounded-[4px] border px-3 py-3 text-cuerpo text-tinta outline-none placeholder:text-tinta-suave focus:border-2 focus:px-[11px] focus:py-[11px]"
      :class="
        disabled
          ? 'cursor-not-allowed border-borde bg-fondo text-tinta-suave'
          : error
            ? 'border-error bg-white'
            : 'border-borde bg-white focus:border-enlace'
      "
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    ></textarea>
    <p v-if="error" :id="idError" role="alert" class="flex items-center gap-1 text-nota text-error">
      <IconoMaterial nombre="cancel" class="h-[14px] w-[14px] shrink-0" />{{ error }}
    </p>
    <p v-else-if="hint" :id="idHint" class="text-nota text-tinta-suave">{{ hint }}</p>
  </div>
</template>
