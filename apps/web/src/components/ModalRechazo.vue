<!--
  Modal de rechazo de un siniestro (HU-W04, dentro de W04-02). CA-W04-24, CA-W04-25 y CA-W04-26.
  No existe en Figma: sigue la especificación del diseñador (sección F), sobre la base de G-04
  (ModalCerrarSesion) y los campos del bloque 1 (CampoSeleccion, CampoAreaTexto).
  Solo presentación: emite `confirmar` con motivo y comentario; DetalleSiniestro llama a `rechazar()`.
  Accesible: role="dialog" + aria-modal, foco inicial al motivo, trampa de foco con Tab/Shift+Tab, Escape,
  velo, X y Cancelar cierran (salvo mientras se envía) y el foco vuelve al elemento que lo abrió.
-->
<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'
import { Boton } from './ui'
import CampoAreaTexto from './ui/CampoAreaTexto.vue'
import CampoSeleccion from './ui/CampoSeleccion.vue'
import IconoMaterial from './ui/IconoMaterial.vue'
import type { MotivoRechazo } from '../graphql/tipos'
import { t } from '../i18n'

const props = defineProps<{ abierto: boolean; radicado: string; enviando: boolean; error: string | null }>()
const emit = defineEmits<{ cancelar: []; confirmar: [datos: { motivo: MotivoRechazo; comentario: string | null }] }>()

// Orden del enum del contrato.
const MOTIVOS: MotivoRechazo[] = [
  'EVIDENCIA_INSUFICIENTE',
  'FUERA_DE_COBERTURA',
  'INCONSISTENCIA_EN_RELATO',
  'OTRO',
  'POLIZA_NO_VIGENTE',
]
const opciones = computed(() => MOTIVOS.map((m) => ({ valor: m, texto: t(`siniestros.motivo.${m}`) })))

const idTitulo = useId()
const idTexto = useId()
const idAviso = useId()
const motivo = ref('')
const comentario = ref('')
const caja = ref<HTMLElement | null>(null)
const selector = ref<InstanceType<typeof CampoSeleccion> | null>(null)
const banner = ref<HTMLElement | null>(null)
let previo: HTMLElement | null = null

watch(
  () => props.abierto,
  async (abierto) => {
    if (abierto) {
      motivo.value = ''
      comentario.value = ''
      previo = document.activeElement instanceof HTMLElement ? document.activeElement : null
      await nextTick()
      selector.value?.focus()
    } else {
      // Si la pantalla navega (éxito), el elemento ya no está en el documento y no pasa nada.
      if (previo?.isConnected) previo.focus()
      previo = null
    }
  },
)

watch(
  () => props.error,
  async (error) => {
    if (!error || !props.abierto) return
    await nextTick()
    banner.value?.focus()
  },
)

function cancelar() {
  if (!props.enviando) emit('cancelar')
}

function confirmar() {
  if (!motivo.value || props.enviando) return
  emit('confirmar', { motivo: motivo.value as MotivoRechazo, comentario: comentario.value.trim() || null })
}

// Trampa de foco: Tab y Shift+Tab giran dentro de la caja.
function atraparFoco(e: KeyboardEvent) {
  if (!caja.value) return
  const enfocables = Array.from(
    caja.value.querySelectorAll<HTMLElement>(
      'button:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  )
  if (!enfocables.length) {
    e.preventDefault()
    return
  }
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
    data-prueba="velo"
    @click.self="cancelar"
    @keydown.esc="cancelar"
    @keydown.tab="atraparFoco"
  >
    <div
      ref="caja"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="idTitulo"
      :aria-describedby="idTexto"
      :aria-busy="enviando ? 'true' : undefined"
      data-componente="modal-rechazo"
      class="flex max-h-[calc(100vh-32px)] w-full max-w-[440px] flex-col gap-4 overflow-y-auto rounded-lg bg-white p-5"
    >
      <div class="flex items-start justify-between">
        <span class="flex h-12 w-12 items-center justify-center rounded-lg bg-error-fondo text-error">
          <IconoMaterial nombre="cancel" class="h-6 w-6" />
        </span>
        <button
          type="button"
          data-prueba="cerrar"
          :aria-label="t('modal.cerrar')"
          :disabled="enviando"
          class="rounded p-1 text-tinta-suave hover:text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace disabled:cursor-not-allowed"
          @click="cancelar"
        >
          <IconoMaterial nombre="close" class="h-5 w-5" />
        </button>
      </div>
      <div class="flex flex-col gap-1">
        <h2 :id="idTitulo" class="text-[20px] font-bold text-tinta">
          {{ t('siniestros.rechazo.titulo', { radicado }) }}
        </h2>
        <p :id="idTexto" class="text-[13px] text-tinta-suave">{{ t('siniestros.rechazo.texto') }}</p>
      </div>

      <CampoSeleccion
        ref="selector"
        v-model="motivo"
        :label="t('siniestros.rechazo.motivo')"
        :placeholder="t('siniestros.rechazo.motivoPlaceholder')"
        :opciones="opciones"
        :disabled="enviando"
        required
      />
      <CampoAreaTexto
        v-model="comentario"
        :label="t('siniestros.rechazo.comentario')"
        :placeholder="t('siniestros.rechazo.comentarioPlaceholder')"
        :maxlength="500"
        :filas="3"
        :disabled="enviando"
      />

      <div
        v-if="error"
        ref="banner"
        role="alert"
        tabindex="-1"
        data-prueba="error-rechazo"
        class="flex items-center gap-2 rounded border border-error bg-error-fondo px-4 py-3 text-[13px] text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace"
      >
        <IconoMaterial nombre="cancel" class="h-[18px] w-[18px] shrink-0" />
        {{ error }}
      </div>

      <div class="flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          data-prueba="cancelar"
          :disabled="enviando"
          class="h-11 min-w-[120px] rounded-md sm:flex-1 border border-borde bg-white text-[13px] font-semibold text-tinta hover:bg-fondo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace disabled:cursor-not-allowed disabled:opacity-60"
          @click="cancelar"
        >
          {{ t('siniestros.rechazo.cancelar') }}
        </button>
        <Boton
          variante="destructivo"
          data-prueba="confirmar-rechazo"
          class="min-w-[120px] text-[13px] sm:flex-1"
          :disabled="!motivo || enviando"
          :aria-describedby="!motivo ? idAviso : undefined"
          @click="confirmar"
        >
          <template #icono>
            <IconoMaterial
              :nombre="enviando ? 'progress_activity' : 'close'"
              class="h-4 w-4"
              :class="{ 'animate-spin': enviando }"
            />
          </template>
          {{ enviando ? t('siniestros.rechazo.rechazando') : t('siniestros.rechazo.confirmar') }}
        </Boton>
      </div>
      <p v-if="!motivo" :id="idAviso" class="text-[11px] text-tinta-suave">
        {{ t('siniestros.rechazo.elegirMotivo') }}
      </p>
    </div>
  </div>
</template>
