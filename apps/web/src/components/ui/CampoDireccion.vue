<!--
  T19 · Campo de dirección con autocompletado de Google Places, opcional y configurable.
  Con VITE_GOOGLE_PLACES_KEY carga la librería de Places y sugiere direcciones del país indicado; al elegir una
  emite `lugar` con el place_id. Sin clave, o si Google no carga, es el campo de texto de siempre y la dirección
  escrita queda «sin verificar»: nunca bloquea la cotización.
-->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import CampoFormulario from './CampoFormulario.vue'
import { t } from '../../i18n'

const props = defineProps<{ modelValue: string; label: string; placeholder?: string; error?: string; pais?: string }>()
const emit = defineEmits<{ 'update:modelValue': [valor: string]; lugar: [placeId: string | null] }>()

const clave = import.meta.env.VITE_GOOGLE_PLACES_KEY as string | undefined
const verificada = ref(false)
const raiz = ref<HTMLElement | null>(null)

interface PlacesGlobal {
  maps?: { places?: { Autocomplete: new (el: HTMLInputElement, op: object) => PlacesAutocomplete } }
}
interface PlacesAutocomplete {
  addListener: (evento: string, fn: () => void) => void
  getPlace: () => { place_id?: string; formatted_address?: string }
}

function cargarLibreria(): Promise<void> {
  return new Promise((resolver, rechazar) => {
    if ((window as unknown as { google?: PlacesGlobal }).google?.maps?.places) return resolver()
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(clave!)}&libraries=places`
    s.async = true
    s.onload = () => resolver()
    s.onerror = () => rechazar(new Error('places'))
    document.head.appendChild(s)
  })
}

onMounted(async () => {
  const entrada = raiz.value?.querySelector('input')
  if (!clave || !entrada) return
  try {
    await cargarLibreria()
    const google = (window as unknown as { google: PlacesGlobal }).google
    const auto = new google.maps!.places!.Autocomplete(entrada, {
      types: ['address'],
      fields: ['place_id', 'formatted_address'],
      ...(props.pais ? { componentRestrictions: { country: props.pais.toLowerCase() } } : {}),
    })
    auto.addListener('place_changed', () => {
      const lugar = auto.getPlace()
      if (!lugar.place_id) return
      verificada.value = true
      emit('update:modelValue', lugar.formatted_address ?? entrada.value)
      emit('lugar', lugar.place_id)
    })
  } catch {
    // Google no respondió: se queda el campo de texto.
  }
})

function alEscribir(valor: string) {
  verificada.value = false
  emit('update:modelValue', valor)
  emit('lugar', null)
}
</script>

<template>
  <div ref="raiz">
    <CampoFormulario
      :model-value="modelValue"
      :label="label"
      :placeholder="placeholder"
      icono="home"
      :error="error"
      :hint="clave ? (verificada ? t('direccion.verificada') : t('direccion.sinVerificar')) : undefined"
      required
      @update:model-value="alEscribir"
    />
  </div>
</template>
