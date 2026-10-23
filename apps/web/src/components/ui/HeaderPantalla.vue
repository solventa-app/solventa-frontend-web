<!--
  Header de pantalla · librería de componentes (Figma 2006:47). Cromo superior: logo Solventa +
  título, selector de idioma, selector de moneda y avatar de perfil — "idéntico en 18 de las 28
  pantallas" (nota del componente en Figma). El título es opcional: la nota solo exige logo +
  selectores + avatar; el texto corto junto al logo varía por pantalla (aquí, "Home del Cliente").
  Compone los componentes de la librería (SelectorIdioma, SelectorMoneda, AvatarPerfil) en vez de
  repetir su marcado.

  KAN-203: se agrega flex-wrap (+ min-w-0/truncate/shrink-0 en los grupos internos) porque sin
  esto el logo+título de un lado y los 3 selectores del otro se salían del ancho del viewport en
  pantallas angostas (no hay ningún punto de quiebre responsive en todo el proyecto; la técnica
  usada en el resto del código es siempre flex-wrap, nunca prefijos sm:/md:/lg:).

  El selector de idioma está conectado al idioma global (src/i18n): antes cada pantalla lo montaba sin
  v-model, así que el clic en EN no cambiaba nada ni movía el resaltado. Sigue emitiendo `update:idioma`.
-->
<script setup lang="ts">
import { useRouter } from 'vue-router'
import AvatarPerfil from './AvatarPerfil.vue'
import SelectorIdioma from './SelectorIdioma.vue'
import SelectorMoneda from './SelectorMoneda.vue'
import { cambiarIdioma, idioma, type Idioma } from '../../i18n'

withDefaults(
  defineProps<{
    titulo?: string
    moneda?: string
    /** Sin avatar de perfil: en el login todavía no hay nadie con perfil (pedido de felipe, 2026-10-19). */
    sinPerfil?: boolean
  }>(),
  { titulo: undefined, moneda: 'COP', sinPerfil: false },
)

const emit = defineEmits<{
  'update:idioma': [valor: Idioma]
  'update:moneda': [valor: string]
  perfil: []
}>()

// El avatar lleva a "Mi perfil" (G-05). Sin router (p. ej. en el índice de componentes) solo emite.
const router = useRouter()
function elegirIdioma(valor: Idioma) {
  cambiarIdioma(valor)
  emit('update:idioma', valor)
}
function abrirPerfil() {
  emit('perfil')
  router?.push('/perfil')
}
</script>

<template>
  <header
    class="flex w-full flex-wrap items-center justify-between gap-3 border-b border-borde bg-white px-10 pb-[17px] pt-4"
  >
    <div class="flex min-w-0 items-center gap-3">
      <span class="shrink-0 text-[24px] font-bold tracking-[-0.6px] text-enlace">Solventa</span>
      <span v-if="titulo" class="text-[16px] text-borde" aria-hidden="true">|</span>
      <span v-if="titulo" class="truncate font-bold text-titulo text-tinta">{{ titulo }}</span>
    </div>
    <div class="flex shrink-0 items-center gap-3">
      <SelectorIdioma :model-value="idioma" @update:model-value="elegirIdioma" />
      <SelectorMoneda :model-value="moneda" @update:model-value="$emit('update:moneda', $event)" />
      <AvatarPerfil v-if="!sinPerfil" @click="abrirPerfil" />
    </div>
  </header>
</template>
