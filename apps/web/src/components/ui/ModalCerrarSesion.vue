<!--
  G-04 · Confirmar cierre de sesión (Figma "Solventa-web-Final", nodo 2001:861). Modal sobre la pantalla
  actual: quién está conectado (nombre real y rol), cuándo inició la sesión, "Cancelar" y "Cerrar sesión".
  Desviación: el prototipo muestra la cédula del usuario, pero el backend no guarda un documento de los
  usuarios (solo alias, nombre y rol): se muestra el alias.
  Accesible: role="dialog" con aria-modal, Escape cancela y el foco entra al botón "Cancelar".
  Responsive: ocupa el ancho disponible menos 16 px por lado, hasta 336 px.
-->
<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'
import IconoMaterial from './IconoMaterial.vue'
import { etiquetaRol, useSesion } from '../../composables/useSesion'
import { t } from '../../i18n'
import { formatearFecha } from '../../utils/formato'

const props = defineProps<{ abierto: boolean }>()
const emit = defineEmits<{ cancelar: []; confirmar: [] }>()

const { estado } = useSesion()
const idTitulo = useId()
const botonCancelar = ref<HTMLButtonElement | null>(null)

const rol = computed(() => (estado.rol ? etiquetaRol(estado.rol) : ''))
const iniciada = computed(() => (estado.iniciadaEn ? formatearFecha(new Date(estado.iniciadaEn).toISOString()) : '—'))

watch(
  () => props.abierto,
  async (abierto) => {
    if (!abierto) return
    await nextTick()
    botonCancelar.value?.focus()
  },
)
</script>

<template>
  <div
    v-if="abierto"
    class="fixed inset-0 z-20 flex items-center justify-center px-4"
    style="background: rgba(17, 24, 39, 0.45)"
    @click.self="emit('cancelar')"
    @keydown.esc="emit('cancelar')"
  >
    <div
      data-pantalla="G-04"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="idTitulo"
      class="flex w-full max-w-[336px] flex-col gap-4 rounded-lg bg-white p-5 shadow-lg"
    >
      <div class="flex items-start justify-between">
        <span class="flex h-12 w-12 items-center justify-center rounded-lg bg-alerta-fondo text-alerta">
          <IconoMaterial nombre="logout" class="h-6 w-6" />
        </span>
        <button
          type="button"
          :aria-label="t('modal.cerrar')"
          class="rounded p-1 text-tinta-suave hover:text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace"
          @click="emit('cancelar')"
        >
          <IconoMaterial nombre="close" class="h-5 w-5" />
        </button>
      </div>
      <div class="flex flex-col gap-1">
        <h2 :id="idTitulo" class="text-[20px] font-bold text-tinta">{{ t('modal.titulo') }}</h2>
        <p class="text-[13px] text-tinta-suave">{{ t('modal.texto') }}</p>
      </div>
      <dl class="flex flex-col gap-3 rounded-md border border-borde bg-fondo p-3 text-[13px]">
        <div class="flex flex-wrap items-start justify-between gap-2">
          <dt class="flex items-center gap-1 text-tinta-suave">
            <IconoMaterial nombre="person" class="h-4 w-4" />{{ t('modal.usuarioActivo') }}
          </dt>
          <dd class="flex flex-col items-end text-right">
            <span class="font-semibold text-tinta" data-dato="nombre">{{ estado.nombre }}</span>
            <span class="text-[11px] text-tinta-suave">{{ rol }} · {{ estado.usuario }}</span>
          </dd>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-2 border-t border-borde pt-3">
          <dt class="flex items-center gap-1 text-tinta-suave">
            <IconoMaterial nombre="schedule" class="h-4 w-4" />{{ t('modal.sesionIniciada') }}
          </dt>
          <dd class="font-semibold text-tinta" data-dato="iniciada">{{ iniciada }}</dd>
        </div>
      </dl>
      <div class="flex flex-wrap gap-3">
        <button
          ref="botonCancelar"
          type="button"
          class="h-11 min-w-[120px] flex-1 rounded-md border border-borde bg-white text-[13px] font-semibold text-tinta hover:bg-fondo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace"
          @click="emit('cancelar')"
        >
          {{ t('modal.cancelar') }}
        </button>
        <button
          type="button"
          class="flex h-11 min-w-[120px] flex-1 items-center justify-center gap-2 rounded-md bg-primario text-[13px] font-semibold text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
          @click="emit('confirmar')"
        >
          <IconoMaterial nombre="logout" class="h-4 w-4" />{{ t('sesion.cerrar') }}
        </button>
      </div>
      <p class="flex items-start gap-1 border-t border-borde pt-3 text-[11px] text-tinta-suave">
        <IconoMaterial nombre="shield" class="h-4 w-4 shrink-0" />
        {{ t('modal.seguridad') }}
      </p>
    </div>
  </div>
</template>
