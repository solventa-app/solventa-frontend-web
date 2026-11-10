<!--
  G-04b · Aviso de inactividad. Modal sobre la pantalla actual: la sesión se cerrará en unos segundos por no usar
  la web. «Seguir conectado» la mantiene; «Cerrar sesión» la cierra ya. Mismo patrón que ModalCerrarSesion (G-04):
  role="dialog" con aria-modal, foco en el botón principal y cuenta regresiva anunciada con role="timer".
-->
<script setup lang="ts">
import { nextTick, ref, useId, watch } from 'vue'
import Boton from './Boton.vue'
import IconoMaterial from './IconoMaterial.vue'
import { t } from '../../i18n'

const props = defineProps<{ abierto: boolean; segundos: number }>()
const emit = defineEmits<{ seguir: []; cerrar: [] }>()

const idTitulo = useId()
const botonSeguir = ref<InstanceType<typeof Boton> | null>(null)

watch(
  () => props.abierto,
  async (abierto) => {
    if (!abierto) return
    await nextTick()
    botonSeguir.value?.$el.focus()
  },
)
</script>

<template>
  <div
    v-if="abierto"
    class="fixed inset-0 z-30 flex items-center justify-center px-4"
    style="background: rgba(17, 24, 39, 0.45)"
    @keydown.esc="emit('seguir')"
  >
    <div
      data-pantalla="G-04b"
      role="alertdialog"
      aria-modal="true"
      :aria-labelledby="idTitulo"
      class="flex w-full max-w-[336px] flex-col gap-4 rounded-lg bg-white p-5 shadow-lg"
    >
      <span class="flex h-12 w-12 items-center justify-center rounded-lg bg-alerta-fondo text-alerta">
        <IconoMaterial nombre="timer" class="h-6 w-6" />
      </span>
      <div class="flex flex-col gap-1">
        <h2 :id="idTitulo" class="text-[20px] font-bold text-tinta">{{ t('inactividad.titulo') }}</h2>
        <p class="text-[13px] text-tinta-suave">{{ t('inactividad.texto') }}</p>
        <p role="timer" data-testid="cuenta-inactividad" class="text-[13px] font-semibold text-tinta">
          {{ t('inactividad.cuenta', { segundos }) }}
        </p>
      </div>
      <div class="flex flex-col gap-2 sm:flex-row-reverse">
        <Boton ref="botonSeguir" class="flex-1" @click="emit('seguir')">{{ t('inactividad.seguir') }}</Boton>
        <Boton variante="secundario" class="flex-1" @click="emit('cerrar')">{{ t('inactividad.cerrar') }}</Boton>
      </div>
    </div>
  </div>
</template>
