<!--
  «Copiar» común: copia un dato (el ID de socio, la clave o el token del panel del socio, W07-02; el número de póliza de
  W03-04) al portapapeles y avisa «Copiado» por 2 s, también a los lectores de pantalla. Si el navegador no deja
  copiar, lo dice; nunca falla en silencio.
-->
<script setup lang="ts">
import { ref } from 'vue'
import IconoMaterial from './ui/IconoMaterial.vue'
import { t } from '../i18n'

const props = defineProps<{ texto: string; etiqueta: string }>()

const resultado = ref<'copiado' | 'fallo' | null>(null)
let temporizador: ReturnType<typeof setTimeout> | undefined

async function copiar() {
  try {
    await navigator.clipboard.writeText(props.texto)
    resultado.value = 'copiado'
  } catch {
    resultado.value = 'fallo'
  }
  clearTimeout(temporizador)
  temporizador = setTimeout(() => (resultado.value = null), 2000)
}
</script>

<template>
  <button
    type="button"
    :aria-label="t('comun.copiar.etiqueta', { dato: etiqueta })"
    class="inline-flex h-[32px] shrink-0 items-center gap-1 rounded-[4px] px-2 text-[12px] font-semibold text-enlace hover:bg-fondo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace"
    @click="copiar"
  >
    <IconoMaterial nombre="content_copy" class="h-[18px] w-[18px]" />
    <span aria-live="polite">{{
      resultado === 'copiado'
        ? t('comun.copiar.listo')
        : resultado === 'fallo'
          ? t('comun.copiar.fallo')
          : t('comun.copiar.boton')
    }}</span>
  </button>
</template>
