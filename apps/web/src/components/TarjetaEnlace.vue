<!--
  Marco de las páginas del enlace de firma (HU-W03: W03-02b, W03-03, retorno de la pasarela, W03-04 y el estado vacío
  del enlace vencido). Sigue la tarjeta centrada de W03-03 y W03-04 (Figma 2001:1969 y 2001:2057): mosaico con ícono,
  título, texto y el contenido de cada pantalla (slot). Sin perfil ni migas (W03-31): el cliente entra solo con el
  enlace, sin sesión. Foco al título al montar, para que el lector de pantalla anuncie el paso.
-->
<script setup lang="ts">
import { nextTick, onMounted, ref } from 'vue'
import { FooterPantalla, HeaderPantalla } from './ui'
import IconoMaterial from './ui/IconoMaterial.vue'

defineProps<{
  pantalla: string
  tituloHeader: string
  titulo?: string
  texto?: string
  icono?: 'check_circle' | 'verified' | 'link_off' | 'credit_card' | 'progress_activity' | 'warning' | 'error'
  /** Fondo y color del mosaico, p. ej. `bg-exito-fondo text-exito`. */
  claseMosaico?: string
  /** Ancho de la tarjeta: `angosta` (W03-03 y W03-04) o `ancha` (W03-02b). */
  ancho?: 'angosta' | 'ancha'
}>()

const h1 = ref<HTMLElement | null>(null)
onMounted(async () => {
  await nextTick()
  h1.value?.focus()
})
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden" :data-pantalla="pantalla">
    <HeaderPantalla :titulo="tituloHeader" sin-perfil />
    <main class="flex min-h-0 flex-1 flex-col items-center overflow-y-auto bg-fondo px-4 py-10 sm:px-10">
      <section
        class="flex w-full flex-col items-center gap-4 rounded-lg border border-borde bg-white p-6"
        :class="ancho === 'ancha' ? 'max-w-[800px] items-start' : 'max-w-[560px] text-center'"
        :aria-busy="icono === 'progress_activity' ? 'true' : undefined"
      >
        <span
          v-if="icono"
          class="flex h-16 w-16 items-center justify-center rounded-lg"
          :class="[claseMosaico ?? 'bg-info-fondo text-info', ancho === 'ancha' ? '' : 'self-center']"
        >
          <IconoMaterial :nombre="icono" class="h-7 w-7" :class="{ 'animate-spin': icono === 'progress_activity' }" />
        </span>
        <h1
          v-if="titulo"
          ref="h1"
          tabindex="-1"
          class="text-[22px] font-bold leading-tight text-tinta focus-visible:outline-none"
        >
          {{ titulo }}
        </h1>
        <p v-if="texto" class="text-[14px] leading-[21px] text-tinta-suave">{{ texto }}</p>
        <slot />
      </section>
    </main>
    <FooterPantalla />
  </div>
</template>
