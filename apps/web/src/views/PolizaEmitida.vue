<!--
  W03-04 · Póliza emitida (Figma "Solventa-web-Final", nodo 2001:2057). CA-W03-07 y CA-W03-08.

  - Página del enlace: sin perfil ni migas y sin «Ir al inicio» (el cliente no tiene sesión, W03-31). Tampoco «Ver
    detalle de fuentes» (D-6): exige sesión.
  - «Descargar documento» pide el PDF con el token del enlace y lo abre en una pestaña nueva (`blob:`); si el navegador
    bloquea la ventana, lo descarga. El documento también llega al correo en segundo plano.
-->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Boton } from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
import TarjetaEnlace from '../components/TarjetaEnlace.vue'
import { useEnlaceFirma, type PasoEnlace } from '../composables/useEnlaceFirma'
import { t } from '../i18n'
import { formatearFecha, formatearFechaCorta } from '../utils/formato'

const router = useRouter()
const { estado, entrar, urlDelPdf } = useEnlaceFirma()

const paso = ref<PasoEnlace | null | 'cargando'>('cargando')
const descargando = ref(false)
const errorDescarga = ref(false)
const poliza = computed(() => estado.enlace?.poliza ?? null)
const urls: string[] = []

onMounted(async () => {
  paso.value = await entrar(router, ['emitida'])
})
onBeforeUnmount(() => urls.forEach((url) => URL.revokeObjectURL(url)))

async function descargar() {
  if (!poliza.value) return
  descargando.value = true
  errorDescarga.value = false
  const url = await urlDelPdf(poliza.value.documentoUrl)
  descargando.value = false
  if (!url) {
    errorDescarga.value = true
    return
  }
  urls.push(url)
  if (!window.open(url, '_blank')) {
    const enlace = document.createElement('a')
    enlace.href = url
    enlace.download = `poliza-${poliza.value.numero}.pdf`
    enlace.click()
  }
}
</script>

<template>
  <TarjetaEnlace
    v-if="paso === 'cargando'"
    pantalla="W03-04"
    :titulo-header="t('polizaEmitida.header')"
    :titulo="t('firma.cargando')"
    icono="progress_activity"
  />
  <TarjetaEnlace
    v-else-if="paso === 'vencido'"
    pantalla="W03-04"
    :titulo-header="t('polizaEmitida.header')"
    :titulo="t('firma.vencido.titulo')"
    :texto="t('firma.vencido.texto')"
    icono="link_off"
    clase-mosaico="bg-fondo text-tinta-suave"
  />
  <TarjetaEnlace
    v-else-if="!poliza"
    pantalla="W03-04"
    :titulo-header="t('polizaEmitida.header')"
    :titulo="t('firma.errorTitulo')"
    :texto="estado.error ?? t('firma.errorTecnico')"
    icono="warning"
    clase-mosaico="bg-alerta-fondo text-alerta"
  />
  <TarjetaEnlace
    v-else
    pantalla="W03-04"
    :titulo-header="t('polizaEmitida.header')"
    :titulo="t('polizaEmitida.titulo')"
    icono="verified"
    clase-mosaico="bg-info-fondo text-info"
  >
    <p class="text-[14px] text-enlace" data-prueba="numero-poliza">
      {{ t('polizaEmitida.numero', { numero: poliza.numero }) }}
    </p>
    <p class="text-[13px] text-tinta-suave">
      {{
        t('polizaEmitida.fechas', {
          emitida: formatearFecha(poliza.vigenciaDesde),
          desde: formatearFechaCorta(poliza.vigenciaDesde),
        })
      }}
    </p>
    <hr class="w-full border-borde" />
    <Boton data-prueba="descargar" :disabled="descargando" @click="descargar">
      <template #icono>
        <IconoMaterial
          :nombre="descargando ? 'progress_activity' : 'download'"
          class="h-5 w-5"
          :class="{ 'animate-spin': descargando }"
        />
      </template>
      {{ t('polizaEmitida.descargar') }}
      <IconoMaterial nombre="open_in_new" class="h-4 w-4" />
    </Boton>
    <p v-if="errorDescarga" role="alert" class="text-[13px] text-error">{{ t('polizaEmitida.errorDescarga') }}</p>
    <p class="w-full rounded-md border border-borde bg-fondo px-4 py-3 text-[12px] text-tinta-suave">
      {{ t('polizaEmitida.correo') }}
    </p>
  </TarjetaEnlace>
</template>
