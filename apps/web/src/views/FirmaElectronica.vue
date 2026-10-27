<!--
  W03-02 · Firma electrónica (Figma "Solventa-web-Final", nodo 2001:1832), página del enlace `/firma#t=…`.
  CA-W03-02 y CA-W03-12.

  - Pública: el cliente entra con el token del enlace, sin sesión. Sin perfil ni migas (W03-31).
  - El contrato es el PDF que entrega el BFF (se pide con el token y se muestra en un iframe) más el resumen legible;
    ya no las cláusulas escritas en la pantalla del prototipo.
  - Firma en tres modos (FirmaTresModos) y casilla de términos sin marcar (regla 6): «Firmar» se habilita con las dos.
    «Firmar» no firma todavía: lleva a W03-02b, donde se confirma con la autorización de cobro.
  - Si la propuesta va en otro paso, lleva allí («retoma donde iba», W03-22). Enlace vencido o inexistente: estado
    vacío, sin botones que no lleven a nada.
-->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Boton, FooterPantalla, HeaderPantalla } from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
import FirmaTresModos from '../components/FirmaTresModos.vue'
import TarjetaEnlace from '../components/TarjetaEnlace.vue'
import { useEnlaceFirma, type FirmaCapturada, type PasoEnlace } from '../composables/useEnlaceFirma'
import { t } from '../i18n'
import { formatearHora, formatearMonto } from '../utils/formato'

const router = useRouter()
const { estado, entrar, urlDelPdf } = useEnlaceFirma()

const paso = ref<PasoEnlace | null | 'cargando'>('cargando')
const urlPdf = ref<string | null>(null)
const firma = ref<FirmaCapturada | null>(null)
const documento = computed(() => estado.enlace?.documento ?? null)
const puedeFirmar = computed(() => !!firma.value && estado.aceptaTerminos)

async function abrir() {
  paso.value = 'cargando'
  paso.value = await entrar(router, ['firmar', 'vencido', 'otro'])
  if (paso.value === 'firmar' && estado.enlace?.documentoUrl) urlPdf.value = await urlDelPdf(estado.enlace.documentoUrl)
}

function continuar() {
  if (!puedeFirmar.value) return
  estado.firmaCapturada = firma.value
  router.push('/firma/confirmar')
}

onMounted(abrir)
onBeforeUnmount(() => {
  if (urlPdf.value) URL.revokeObjectURL(urlPdf.value)
})
</script>

<template>
  <TarjetaEnlace
    v-if="paso === 'cargando'"
    pantalla="W03-02"
    :titulo-header="t('firma.header')"
    :titulo="t('firma.cargando')"
    icono="progress_activity"
  />
  <TarjetaEnlace
    v-else-if="paso === null"
    pantalla="W03-02"
    :titulo-header="t('firma.header')"
    :titulo="t('firma.errorTitulo')"
    :texto="estado.error ?? t('firma.errorTecnico')"
    icono="warning"
    clase-mosaico="bg-alerta-fondo text-alerta"
  >
    <Boton @click="abrir">
      <template #icono><IconoMaterial nombre="refresh" class="h-4 w-4" /></template>
      {{ t('firma.reintentar') }}
    </Boton>
  </TarjetaEnlace>
  <TarjetaEnlace
    v-else-if="paso !== 'firmar' || !documento"
    pantalla="W03-02"
    :titulo-header="t('firma.header')"
    :titulo="t('firma.vencido.titulo')"
    :texto="t('firma.vencido.texto')"
    icono="link_off"
    clase-mosaico="bg-fondo text-tinta-suave"
  />

  <div v-else class="flex h-screen flex-col overflow-hidden" data-pantalla="W03-02">
    <HeaderPantalla :titulo="t('firma.header')" sin-perfil />
    <main class="flex min-h-0 flex-1 flex-col items-center overflow-y-auto bg-fondo px-4 py-8 sm:px-10">
      <div class="flex w-full max-w-[800px] flex-col gap-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="flex flex-col gap-1">
            <h1 class="text-[24px] font-bold text-tinta">{{ t('firma.titulo') }}</h1>
            <p class="text-[13px] text-tinta-suave">{{ t('firma.subtitulo') }}</p>
          </div>
          <span
            class="inline-flex items-center gap-1.5 rounded-md bg-info-fondo px-3 py-1.5 text-[12px] font-medium text-info"
          >
            <IconoMaterial nombre="verified_user" class="h-4 w-4" />
            {{ t('firma.identidadVerificada') }}
          </span>
        </div>

        <section class="flex flex-col gap-4 rounded-lg border border-borde bg-white p-4 sm:p-5">
          <div class="flex flex-wrap items-start justify-between gap-3 border-b border-borde pb-4">
            <div class="flex items-start gap-3">
              <IconoMaterial nombre="description" class="mt-0.5 h-6 w-6 text-tinta" />
              <div class="flex flex-col">
                <h2 class="text-[16px] font-semibold text-tinta">{{ t('firma.contrato') }}</h2>
                <span class="text-[12px] text-tinta-suave">
                  {{ t('firma.version', { version: documento.version }) }}
                </span>
              </div>
            </div>
            <div class="flex flex-col items-end text-right">
              <span class="text-[11px] text-tinta-suave">{{ t('firma.enlaceVence') }}</span>
              <span class="text-[13px] font-semibold text-tinta">{{ formatearHora(estado.enlace!.venceEn) }}</span>
            </div>
          </div>

          <iframe
            v-if="urlPdf"
            :src="urlPdf"
            :title="t('firma.contrato')"
            data-prueba="contrato-pdf"
            class="h-[420px] w-full rounded border border-borde"
          />
          <p v-else class="rounded border border-borde bg-fondo p-4 text-[13px] text-tinta-suave">
            {{ t('firma.sinPdf') }}
          </p>
          <a
            v-if="urlPdf"
            :href="urlPdf"
            target="_blank"
            rel="noopener"
            class="inline-flex items-center gap-1.5 self-start text-[13px] font-semibold text-enlace hover:underline"
          >
            <IconoMaterial nombre="open_in_new" class="h-4 w-4" />
            {{ t('firma.abrirPdf') }}
          </a>

          <div class="flex flex-col gap-1 rounded-md border border-borde bg-fondo p-4">
            <span class="text-[13px] font-semibold text-tinta">{{ t('firma.resumen') }}</span>
            <p class="text-[13px] leading-[20px] text-tinta">{{ documento.resumen }}</p>
            <p class="text-[13px] leading-[20px] text-tinta">
              {{
                t('firma.resumenCobro', {
                  monto: formatearMonto(documento.montoMensual),
                  meses: documento.meses,
                  forma: documento.formaCobro,
                })
              }}
            </p>
          </div>
        </section>

        <section class="rounded-lg border border-borde bg-white p-4 sm:p-5">
          <FirmaTresModos @cambio="firma = $event" />
        </section>

        <label class="flex items-start gap-2">
          <input
            v-model="estado.aceptaTerminos"
            type="checkbox"
            data-prueba="acepta-terminos"
            class="mt-[2px] h-4 w-4 shrink-0 rounded-[2.5px] accent-primario"
          />
          <span class="text-[13px] leading-[18px] text-tinta">{{ t('firma.terminos') }}</span>
        </label>

        <div class="flex flex-col items-center gap-3">
          <Boton class="w-full max-w-[280px]" data-prueba="firmar" :disabled="!puedeFirmar" @click="continuar">
            <template #icono><IconoMaterial nombre="draw" class="h-5 w-5" /></template>
            {{ t('firma.firmar') }}
          </Boton>
          <p v-if="!puedeFirmar" class="text-[11px] italic text-tinta-suave">{{ t('firma.deshabilitado') }}</p>
          <p class="flex items-center gap-2 text-[11px] text-tinta-suave">
            <IconoMaterial nombre="lock" class="h-4 w-4" />
            {{ t('firma.nota') }}
          </p>
        </div>
      </div>
    </main>
    <FooterPantalla />
  </div>
</template>
