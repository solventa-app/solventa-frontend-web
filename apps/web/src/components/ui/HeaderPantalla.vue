<!--
  Header de pantalla · librería de componentes (Figma 2006:47). Cromo superior: logo Solventa +
  título, selector de idioma, selector de moneda y avatar de perfil — "idéntico en 18 de las 28
  pantallas" (nota del componente en Figma). El título es opcional: la nota solo exige logo +
  selectores + avatar; el texto corto junto al logo varía por pantalla (aquí, "Home del Cliente").
  Compone los componentes de la librería (SelectorIdioma, SelectorMoneda, AvatarPerfil) en vez de
  repetir su marcado.
-->
<script setup lang="ts">
import AvatarPerfil from './AvatarPerfil.vue'
import SelectorIdioma from './SelectorIdioma.vue'
import SelectorMoneda from './SelectorMoneda.vue'

withDefaults(
  defineProps<{
    titulo?: string
    idioma?: 'ES' | 'EN'
    moneda?: string
  }>(),
  { titulo: undefined, idioma: 'ES', moneda: 'COP' },
)

defineEmits<{
  'update:idioma': [valor: 'ES' | 'EN']
  'update:moneda': [valor: string]
  perfil: []
}>()
</script>

<template>
  <header class="flex w-full items-center justify-between border-b border-borde bg-white px-10 pb-[17px] pt-4">
    <div class="flex items-center gap-3">
      <span class="text-[24px] font-bold tracking-[-0.6px] text-enlace">Solventa</span>
      <span v-if="titulo" class="text-[16px] text-borde" aria-hidden="true">|</span>
      <span v-if="titulo" class="font-bold text-titulo text-tinta">{{ titulo }}</span>
    </div>
    <div class="flex items-center gap-3">
      <SelectorIdioma :model-value="idioma" @update:model-value="$emit('update:idioma', $event)" />
      <SelectorMoneda :model-value="moneda" @update:model-value="$emit('update:moneda', $event)" />
      <AvatarPerfil @click="$emit('perfil')" />
    </div>
  </header>
</template>
