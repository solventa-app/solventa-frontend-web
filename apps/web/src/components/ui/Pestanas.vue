<!--
  Barra de pestañas (Figma 2001:3553, «Nav» de W07-03 Documentación; plan-hu-w07-front.md 5.4). Es la única pieza nueva
  de la librería para HU-W07: el `Chip` es para filtros y la web no tenía pestañas con este estilo (fondo beige, texto
  de 13 px y la activa subrayada en semibold).
  Accesible con el patrón de pestañas de WAI-ARIA: `role="tablist"`/`tab`, `aria-selected`, `aria-controls`, foco
  móvil (solo la activa entra con Tab) y flechas, Inicio y Fin para moverse; al moverse con el teclado se activa.
  El contenido lo pinta quien la usa, en un `role="tabpanel"` con el id de `idPanel(pestana)`.
-->
<script setup lang="ts">
import { nextTick, ref, useId } from 'vue'
import IconoMaterial from './IconoMaterial.vue'

type NombreIcono = InstanceType<typeof IconoMaterial>['$props']['nombre']

export interface Pestana {
  id: string
  texto: string
  icono?: NombreIcono
}

const props = defineProps<{
  pestanas: Pestana[]
  modelValue: string
  /** Nombre accesible de la barra. */
  etiqueta: string
  /** Prefijo de los ids de pestaña y panel; por defecto uno único. */
  prefijo?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [id: string] }>()

const base = props.prefijo ?? useId()
const botones = ref<HTMLButtonElement[]>([])

const idPestana = (id: string) => `${base}-pestana-${id}`
const idPanel = (id: string) => `${base}-panel-${id}`
defineExpose({ idPestana, idPanel })

async function mover(desde: number, paso: number | 'inicio' | 'fin') {
  const total = props.pestanas.length
  const destino = paso === 'inicio' ? 0 : paso === 'fin' ? total - 1 : (desde + paso + total) % total
  emit('update:modelValue', props.pestanas[destino].id)
  await nextTick()
  botones.value[destino]?.focus()
}

function teclado(evento: KeyboardEvent, indice: number) {
  const acciones: Record<string, number | 'inicio' | 'fin'> = {
    ArrowRight: 1,
    ArrowLeft: -1,
    Home: 'inicio',
    End: 'fin',
  }
  const accion = acciones[evento.key]
  if (accion === undefined) return
  evento.preventDefault()
  mover(indice, accion)
}
</script>

<template>
  <div
    role="tablist"
    :aria-label="etiqueta"
    class="flex h-[44px] w-full items-center gap-6 overflow-x-auto border-b border-borde bg-[#f6f3f2] px-6"
  >
    <button
      v-for="(pestana, indice) in pestanas"
      :id="idPestana(pestana.id)"
      :key="pestana.id"
      ref="botones"
      type="button"
      role="tab"
      :aria-selected="modelValue === pestana.id"
      :aria-controls="idPanel(pestana.id)"
      :tabindex="modelValue === pestana.id ? 0 : -1"
      class="flex h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[2px] border-b-2 text-[13px] leading-[18px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-inset"
      :class="
        modelValue === pestana.id
          ? 'border-enlace font-semibold text-enlace'
          : 'border-transparent font-medium text-tinta-suave hover:text-tinta'
      "
      @click="emit('update:modelValue', pestana.id)"
      @keydown="teclado($event, indice)"
    >
      <IconoMaterial v-if="pestana.icono" :nombre="pestana.icono" class="h-[18px] w-[18px]" />
      {{ pestana.texto }}
    </button>
  </div>
</template>
