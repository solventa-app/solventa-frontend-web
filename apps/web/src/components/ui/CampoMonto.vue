<!--
  Campo de monto · variante de CampoFormulario (Figma 2006:12, "Monto → payments") para capturar dinero.

  - El valor del modelo es solo dígitos ("8000000"), listo para mandarse al BFF como texto decimal; lo que se ve lleva
    los separadores de miles del idioma activo (es-CO «8.000.000», en-US «8,000,000») y cambia solo si cambia el idioma.
  - Acepta pegar «8.000.000», «8,000,000» o «$ 8000000»: se queda con los dígitos. Sin decimales (COP, CLP).
  - La moneda no se escribe aquí: va en la etiqueta que arma la pantalla con la moneda del dato (`Monto.moneda`).
  - El cursor se queda junto al dígito que se editó al reinsertar los separadores.
-->
<script setup lang="ts">
import { computed, nextTick } from 'vue'
import CampoFormulario from './CampoFormulario.vue'
import { formatearNumero } from '../../utils/formato'

const props = withDefaults(
  defineProps<{
    /** Solo dígitos, sin separadores. */
    modelValue: string
    label: string
    placeholder?: string
    error?: string
    hint?: string
    required?: boolean
    /** Tope de dígitos (13 cabe en un `number` sin perder precisión). */
    maxDigitos?: number
  }>(),
  { placeholder: undefined, error: undefined, hint: undefined, required: false, maxDigitos: 13 },
)

const emit = defineEmits<{ 'update:modelValue': [valor: string] }>()

const soloDigitos = (texto: string) => texto.replace(/\D/g, '')

/** Lo que se ve: el número con los separadores del idioma activo. */
const visible = computed(() => (props.modelValue ? formatearNumero(Number(props.modelValue)) : ''))

function alEscribir(evento: Event) {
  const campo = evento.target as HTMLInputElement
  const posicion = campo.selectionStart ?? campo.value.length
  const digitosAntesDelCursor = soloDigitos(campo.value.slice(0, posicion)).length
  const digitos = soloDigitos(campo.value)
    .replace(/^0+(?=\d)/, '')
    .slice(0, props.maxDigitos)
  emit('update:modelValue', digitos)
  void nextTick(() => {
    // Si el modelo no cambió (p. ej. se tecleó una letra) no hay re-render: se fuerza el texto con separadores.
    campo.value = visible.value
    let digitosVistos = 0
    let lugar = 0
    while (lugar < campo.value.length && digitosVistos < digitosAntesDelCursor) {
      if (/\d/.test(campo.value[lugar])) digitosVistos++
      lugar++
    }
    campo.setSelectionRange(lugar, lugar)
  })
}
</script>

<template>
  <!-- Sin @update:model-value: el texto se lee del evento `input` nativo (arriba), que trae el cursor. -->
  <CampoFormulario
    :model-value="visible"
    :label="label"
    :placeholder="placeholder"
    :error="error"
    :hint="hint"
    :required="required"
    icono="payments"
    inputmode="numeric"
    @input="alEscribir"
  />
</template>
