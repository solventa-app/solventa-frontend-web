<!--
  Confirmación de «Regenerar» la clave de un entorno (W07-02, plan-hu-w07-front.md 5.3). Sigue el patrón de
  ModalCerrarSesion y ModalRechazo (foco atrapado, Escape, foco de regreso) con el aviso de Figma (2001:3623) en la
  caja de alerta. Tras regenerar muestra la clave nueva una sola vez, con «Copiar».
-->
<script setup lang="ts">
import { nextTick, ref, useId, watch } from 'vue'
import BotonCopiar from './BotonCopiar.vue'
import { Boton } from '../ui'
import IconoMaterial from '../ui/IconoMaterial.vue'
import type { Credencial, Entorno } from '../../api/socios'
import { t } from '../../i18n'

const props = defineProps<{ abierto: boolean; entorno: Entorno }>()
const emit = defineEmits<{
  cerrar: []
  confirmar: [responder: (resultado: Credencial | string) => void]
}>()

const idTitulo = useId()
const idTexto = useId()
const caja = ref<HTMLElement | null>(null)
const enviando = ref(false)
const error = ref<string | null>(null)
const nueva = ref<Credencial | null>(null)
let previo: HTMLElement | null = null

watch(
  () => props.abierto,
  async (abierto) => {
    if (abierto) {
      enviando.value = false
      error.value = null
      nueva.value = null
      previo = document.activeElement instanceof HTMLElement ? document.activeElement : null
      await nextTick()
      caja.value?.querySelector<HTMLElement>('button')?.focus()
    } else {
      if (previo?.isConnected) previo.focus()
      previo = null
    }
  },
)

function cerrar() {
  if (!enviando.value) emit('cerrar')
}

function confirmar() {
  if (enviando.value) return
  enviando.value = true
  error.value = null
  emit('confirmar', async (resultado) => {
    enviando.value = false
    if (typeof resultado === 'string') {
      error.value = resultado
      return
    }
    nueva.value = resultado
    await nextTick()
    caja.value?.querySelector<HTMLElement>('button')?.focus()
  })
}

// Trampa de foco: Tab y Shift+Tab giran dentro de la caja.
function atraparFoco(e: KeyboardEvent) {
  if (!caja.value) return
  const enfocables = Array.from(caja.value.querySelectorAll<HTMLElement>('button:not([disabled])'))
  if (!enfocables.length) return e.preventDefault()
  const primero = enfocables[0]
  const ultimo = enfocables[enfocables.length - 1]
  const activo = document.activeElement
  if (e.shiftKey && (activo === primero || !caja.value.contains(activo))) {
    e.preventDefault()
    ultimo.focus()
  } else if (!e.shiftKey && (activo === ultimo || !caja.value.contains(activo))) {
    e.preventDefault()
    primero.focus()
  }
}
</script>

<template>
  <div
    v-if="abierto"
    class="fixed inset-0 z-20 flex items-center justify-center px-4"
    style="background: rgba(17, 24, 39, 0.45)"
    @click.self="cerrar"
    @keydown.esc="cerrar"
    @keydown.tab="atraparFoco"
  >
    <div
      ref="caja"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="idTitulo"
      :aria-describedby="idTexto"
      :aria-busy="enviando ? 'true' : undefined"
      data-componente="modal-regenerar"
      class="flex max-h-[calc(100vh-32px)] w-full max-w-[440px] flex-col gap-4 overflow-y-auto rounded-lg bg-white p-5"
    >
      <div class="flex items-start justify-between">
        <span class="flex h-12 w-12 items-center justify-center rounded-lg bg-error-fondo text-error">
          <IconoMaterial nombre="refresh" class="h-6 w-6" />
        </span>
        <button
          type="button"
          :aria-label="t('modal.cerrar')"
          :disabled="enviando"
          class="rounded p-1 text-tinta-suave hover:text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace disabled:cursor-not-allowed"
          @click="cerrar"
        >
          <IconoMaterial nombre="close" class="h-5 w-5" />
        </button>
      </div>

      <template v-if="!nueva">
        <div class="flex flex-col gap-1">
          <h2 :id="idTitulo" class="text-[20px] font-bold text-tinta">
            {{ t('socios.regenerar.titulo', { entorno: t(`socios.entorno.${entorno}`) }) }}
          </h2>
          <p :id="idTexto" class="text-[13px] text-tinta-suave">{{ t('socios.regenerar.texto') }}</p>
        </div>
        <p
          class="flex items-start gap-1 rounded-[4px] border border-alerta bg-alerta-fondo p-[9px] text-[11px] leading-[14px] text-alerta"
        >
          <IconoMaterial nombre="warning" class="h-6 w-6 shrink-0" />
          {{ t('socios.regenerar.aviso') }}
        </p>
        <p v-if="error" role="alert" class="text-[13px] text-error">{{ error }}</p>
        <div class="flex flex-wrap justify-end gap-3">
          <Boton variante="secundario" :disabled="enviando" @click="cerrar">{{ t('socios.regenerar.cancelar') }}</Boton>
          <Boton variante="destructivo" :disabled="enviando" :aria-busy="enviando" @click="confirmar">
            {{ enviando ? t('socios.regenerar.enviando') : t('socios.regenerar.confirmar') }}
          </Boton>
        </div>
      </template>

      <template v-else>
        <div class="flex flex-col gap-1">
          <h2 :id="idTitulo" class="text-[20px] font-bold text-tinta">{{ t('socios.regenerar.listaTitulo') }}</h2>
          <p :id="idTexto" class="text-[13px] text-tinta-suave">{{ t('socios.regenerar.listaTexto') }}</p>
        </div>
        <div class="flex items-center justify-between gap-2 rounded-[4px] border border-borde bg-fondo px-3 py-2">
          <code class="break-all font-mono text-[13px] text-tinta" data-prueba="clave-nueva">{{ nueva.clave }}</code>
          <BotonCopiar :texto="nueva.clave" :etiqueta="t('socios.credenciales.clave')" />
        </div>
        <div class="flex justify-end">
          <Boton @click="cerrar">{{ t('socios.regenerar.listo') }}</Boton>
        </div>
      </template>
    </div>
  </div>
</template>
