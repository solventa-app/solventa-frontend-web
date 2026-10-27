<!--
  Firma en tres modos de W03-02 (HU-W03, W03-24; sin Figma, aprobado en el plan principal 5.2). CA-W03-02.
  - Dibujar: lienzo con puntero (mouse, dedo o lápiz) y «Borrar»; sale como PNG.
  - Subir imagen: PNG o JPG validado antes de enviar (tipo real, 500 KB, 1200×600 y bordes blancos o transparentes,
    utils/firma.ts). POLICY la vuelve a validar.
  - Escribir nombre: el nombre con vista previa en Inter cursiva (D-4: sin fuentes nuevas); POLICY lo dibuja en el PDF.
  Emite la firma lista para `firmarPorEnlace` o null mientras no haya una válida. La imagen solo vive en memoria.
-->
<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useId, watch } from 'vue'
import { CampoFormulario, Chip } from './ui'
import IconoMaterial from './ui/IconoMaterial.vue'
import type { FirmaCapturada } from '../composables/useEnlaceFirma'
import type { ModoFirma } from '../graphql/tipos-borrador'
import { t, type Clave } from '../i18n'
import {
  MAX_ALTO_FIRMA,
  MAX_ANCHO_FIRMA,
  base64DeBytes,
  quitarPrefijoDataUrl,
  revisarArchivoFirma,
  revisarImagenFirma,
} from '../utils/firma'

const emit = defineEmits<{ cambio: [firma: FirmaCapturada | null] }>()

const MODOS: { modo: ModoFirma; icono: 'draw' | 'upload' | 'text_fields' }[] = [
  { modo: 'TRAZO', icono: 'draw' },
  { modo: 'IMAGEN', icono: 'upload' },
  { modo: 'NOMBRE', icono: 'text_fields' },
]
const modo = ref<ModoFirma>('TRAZO')
const idGrupo = useId()

// ---- Dibujar ----
const lienzo = ref<HTMLCanvasElement | null>(null)
const hayTrazo = ref(false)
let dibujando = false

function contexto(): CanvasRenderingContext2D | null {
  return lienzo.value?.getContext('2d') ?? null
}

function prepararLienzo() {
  const canvas = lienzo.value
  const ctx = contexto()
  if (!canvas || !ctx) return
  // Resolución real = tamaño en pantalla (nítido en cualquier ancho), fondo transparente.
  canvas.width = canvas.clientWidth || 560
  canvas.height = canvas.clientHeight || 180
  ctx.lineWidth = 2.5
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = '#1e4680'
}

function punto(e: PointerEvent) {
  const caja = lienzo.value!.getBoundingClientRect()
  return { x: e.clientX - caja.left, y: e.clientY - caja.top }
}

function empezar(e: PointerEvent) {
  const ctx = contexto()
  if (!ctx) return
  dibujando = true
  lienzo.value!.setPointerCapture?.(e.pointerId)
  const { x, y } = punto(e)
  ctx.beginPath()
  ctx.moveTo(x, y)
}

function mover(e: PointerEvent) {
  const ctx = contexto()
  if (!dibujando || !ctx) return
  const { x, y } = punto(e)
  ctx.lineTo(x, y)
  ctx.stroke()
  hayTrazo.value = true
}

function terminar() {
  if (!dibujando) return
  dibujando = false
  if (hayTrazo.value) emitirTrazo()
}

function emitirTrazo() {
  const dataUrl = lienzo.value?.toDataURL('image/png')
  emit('cambio', dataUrl ? { modo: 'TRAZO', contenido: quitarPrefijoDataUrl(dataUrl) } : null)
}

function borrar() {
  const canvas = lienzo.value
  contexto()?.clearRect(0, 0, canvas?.width ?? 0, canvas?.height ?? 0)
  hayTrazo.value = false
  emit('cambio', null)
}

// ---- Subir imagen ----
const vistaImagen = ref<string | null>(null)
const errorImagen = ref<Clave | null>(null)
const imagenValida = ref<string | null>(null)

async function elegirArchivo(e: Event) {
  const archivo = (e.target as HTMLInputElement).files?.[0]
  limpiarImagen()
  if (!archivo) return
  const bytes = new Uint8Array(await archivo.arrayBuffer())
  const error = revisarArchivoFirma(bytes)
  if (error) {
    errorImagen.value = error
    return
  }
  const url = URL.createObjectURL(archivo)
  const imagen = new Image()
  imagen.onload = () => {
    const errorDecodificada = revisarImagenFirma(imagen.naturalWidth, imagen.naturalHeight, pixelesDe(imagen))
    if (errorDecodificada) {
      errorImagen.value = errorDecodificada
      URL.revokeObjectURL(url)
      return
    }
    vistaImagen.value = url
    imagenValida.value = base64DeBytes(bytes)
    emit('cambio', { modo: 'IMAGEN', contenido: imagenValida.value })
  }
  imagen.onerror = () => {
    errorImagen.value = 'firma.imagen.errorTipo'
    URL.revokeObjectURL(url)
  }
  imagen.src = url
}

function pixelesDe(imagen: HTMLImageElement): Uint8ClampedArray | null {
  const ancho = imagen.naturalWidth
  const alto = imagen.naturalHeight
  if (!ancho || !alto || ancho > MAX_ANCHO_FIRMA || alto > MAX_ALTO_FIRMA) return null
  const canvas = document.createElement('canvas')
  canvas.width = ancho
  canvas.height = alto
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(imagen, 0, 0)
  return ctx.getImageData(0, 0, ancho, alto).data
}

function limpiarImagen() {
  if (vistaImagen.value) URL.revokeObjectURL(vistaImagen.value)
  vistaImagen.value = null
  imagenValida.value = null
  errorImagen.value = null
  emit('cambio', null)
}

// ---- Escribir nombre ----
const nombre = ref('')
const nombreValido = computed(() => {
  const limpio = nombre.value.trim()
  return limpio.length >= 2 && limpio.length <= 100
})
watch(nombre, () => {
  if (modo.value === 'NOMBRE')
    emit('cambio', nombreValido.value ? { modo: 'NOMBRE', contenido: nombre.value.trim() } : null)
})

// Cambiar de modo descarta lo de los otros: se firma con uno solo.
watch(modo, async (nuevo) => {
  emit('cambio', null)
  if (nuevo === 'TRAZO') {
    hayTrazo.value = false
    await nextTick()
    prepararLienzo()
  } else if (nuevo === 'IMAGEN' && imagenValida.value) {
    emit('cambio', { modo: 'IMAGEN', contenido: imagenValida.value })
  } else if (nuevo === 'NOMBRE' && nombreValido.value) {
    emit('cambio', { modo: 'NOMBRE', contenido: nombre.value.trim() })
  }
})

onMounted(prepararLienzo)
</script>

<template>
  <fieldset class="flex w-full flex-col gap-3" data-componente="firma-tres-modos">
    <legend :id="idGrupo" class="mb-2 text-[15px] font-semibold text-tinta">{{ t('firma.modos.titulo') }}</legend>
    <div role="group" :aria-labelledby="idGrupo" class="flex flex-wrap gap-2">
      <Chip
        v-for="opcion in MODOS"
        :key="opcion.modo"
        tamano="filtro"
        :activo="modo === opcion.modo"
        :data-prueba="`modo-${opcion.modo}`"
        @click="modo = opcion.modo"
      >
        <IconoMaterial :nombre="opcion.icono" class="mr-1.5 h-4 w-4" />
        {{ t(`firma.modos.${opcion.modo}`) }}
      </Chip>
    </div>

    <div v-if="modo === 'TRAZO'" class="flex flex-col gap-2">
      <canvas
        ref="lienzo"
        role="img"
        :aria-label="t('firma.trazo.lienzo')"
        data-prueba="lienzo-firma"
        class="h-[180px] w-full touch-none rounded-md border border-dashed border-tinta-suave bg-white"
        @pointerdown="empezar"
        @pointermove="mover"
        @pointerup="terminar"
        @pointerleave="terminar"
      />
      <div class="flex items-center justify-between text-[12px] text-tinta-suave">
        <span>{{ t('firma.trazo.ayuda') }}</span>
        <button
          type="button"
          class="font-semibold text-enlace hover:underline disabled:cursor-not-allowed disabled:text-tinta-suave disabled:no-underline"
          :disabled="!hayTrazo"
          @click="borrar"
        >
          {{ t('firma.trazo.borrar') }}
        </button>
      </div>
    </div>

    <div v-else-if="modo === 'IMAGEN'" class="flex flex-col gap-2">
      <label
        class="flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed border-tinta-suave bg-white p-4 text-center text-[13px] text-tinta focus-within:ring-2 focus-within:ring-enlace"
      >
        <img
          v-if="vistaImagen"
          :src="vistaImagen"
          :alt="t('firma.imagen.vista')"
          class="max-h-[140px] max-w-full object-contain"
        />
        <IconoMaterial v-else nombre="upload" class="h-6 w-6 text-tinta-suave" />
        <span class="font-semibold text-enlace">
          {{ vistaImagen ? t('firma.imagen.cambiar') : t('firma.imagen.elegir') }}
        </span>
        <input
          type="file"
          accept="image/png,image/jpeg"
          class="sr-only"
          data-prueba="archivo-firma"
          @change="elegirArchivo"
        />
      </label>
      <p class="text-[12px] text-tinta-suave">{{ t('firma.imagen.ayuda') }}</p>
      <p v-if="errorImagen" role="alert" class="text-[12px] text-error" data-prueba="error-imagen">
        {{ t(errorImagen) }}
      </p>
    </div>

    <div v-else class="flex flex-col gap-2">
      <CampoFormulario
        v-model="nombre"
        :label="t('firma.nombre.campo')"
        :placeholder="t('firma.nombre.ejemplo')"
        icono="person"
        :error="nombre && !nombreValido ? t('solicitud.errorNombreCliente') : undefined"
        required
      />
      <p
        v-if="nombreValido"
        class="rounded-md border border-borde bg-white px-4 py-3 text-[28px] italic text-primario"
        data-prueba="vista-nombre"
      >
        {{ nombre.trim() }}
      </p>
    </div>
  </fieldset>
</template>
