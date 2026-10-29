<!--
  Tarjeta «Credenciales» del panel del socio (W07-02, Figma 2001:3594; plan-hu-w07-front.md 5.3). Para el entorno
  elegido: el ID de socio, la clave larga enmascarada (Mostrar, Copiar y Regenerar con confirmación) y «Generar token»,
  que pide el token de 15 minutos con esa clave y muestra su cuenta regresiva (W07-4: un par por entorno).
  El aviso de Figma sobre regenerar vive en la confirmación (ModalRegenerar), no fijo en la tarjeta.
-->
<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import BotonCopiar from './BotonCopiar.vue'
import ModalRegenerar from './ModalRegenerar.vue'
import { Boton } from '../ui'
import IconoMaterial from '../ui/IconoMaterial.vue'
import type { Credencial } from '../../api/socios'
import { usePanelSocio, type TokenGenerado } from '../../composables/usePanelSocio'
import { t } from '../../i18n'

const { estado, credencialDe, rotar, generarToken, cargarCredenciales } = usePanelSocio()

const credencial = computed(() => credencialDe(estado.entorno))
const claveVisible = ref(false)
const modalAbierto = ref(false)
const token = ref<TokenGenerado | null>(null)
const generando = ref(false)
const errorToken = ref<string | null>(null)
const ahora = ref(Date.now())
let reloj: ReturnType<typeof setInterval> | undefined

// Al cambiar de entorno se oculta la clave y se descarta el token del otro entorno.
watch(
  () => estado.entorno,
  () => {
    claveVisible.value = false
    token.value = null
    errorToken.value = null
  },
)

const restante = computed(() => (token.value ? Math.max(0, token.value.expiraEn - ahora.value) : 0))
const cuentaRegresiva = computed(() => {
  const segundos = Math.ceil(restante.value / 1000)
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`
})

function enmascarar(clave: string): string {
  return `${clave.slice(0, 8)}${'•'.repeat(8)}`
}

async function pedirToken() {
  if (generando.value) return
  generando.value = true
  errorToken.value = null
  const resultado = await generarToken(estado.entorno)
  generando.value = false
  if (typeof resultado === 'string') {
    errorToken.value = resultado
    return
  }
  token.value = resultado
  ahora.value = Date.now()
  clearInterval(reloj)
  reloj = setInterval(() => {
    ahora.value = Date.now()
    if (restante.value === 0) clearInterval(reloj)
  }, 1000)
}

async function confirmarRegenerar(responder: (resultado: Credencial | string) => void) {
  const resultado = await rotar(estado.entorno)
  // La clave anterior ya no sirve: el token generado con ella deja de mostrarse.
  if (typeof resultado !== 'string') token.value = null
  responder(resultado)
}

onUnmounted(() => clearInterval(reloj))
</script>

<template>
  <section
    data-prueba="tarjeta-credenciales"
    :aria-label="t('socios.credenciales.titulo')"
    class="flex flex-col gap-3 rounded-[8px] border border-borde bg-white p-[17px]"
  >
    <h2 class="flex items-center justify-between border-b border-borde pb-[9px] text-[16px] font-semibold text-tinta">
      {{ t('socios.credenciales.titulo') }}
      <IconoMaterial nombre="key" class="h-6 w-6 text-primario" />
    </h2>

    <p v-if="estado.cargando.credenciales && !credencial" class="text-[13px] text-tinta-suave">
      {{ t('socios.panel.cargando') }}
    </p>
    <div v-else-if="estado.error.credenciales && !credencial" role="alert" class="flex flex-col items-start gap-2">
      <p class="text-[13px] text-error">{{ estado.error.credenciales }}</p>
      <Boton variante="secundario" @click="cargarCredenciales()">{{ t('socios.panel.reintentar') }}</Boton>
    </div>

    <template v-else-if="credencial">
      <div class="flex flex-col gap-1">
        <span class="text-[11px] leading-[14px] text-tinta-suave">{{ t('socios.credenciales.socioId') }}</span>
        <div class="flex items-center justify-between gap-2">
          <code class="break-all font-mono text-[13px] text-tinta" data-prueba="socio-id">{{
            credencial.clientId
          }}</code>
          <BotonCopiar :texto="credencial.clientId" :etiqueta="t('socios.credenciales.socioId')" />
        </div>
      </div>

      <div class="flex flex-col gap-1">
        <span class="text-[11px] leading-[14px] text-tinta-suave">{{ t('socios.credenciales.clave') }}</span>
        <div
          class="flex min-h-[40px] items-center justify-between gap-2 rounded-[2px] border border-borde px-[9px] py-1"
        >
          <span class="flex min-w-0 items-center gap-1">
            <IconoMaterial nombre="key" class="h-6 w-6 shrink-0 text-tinta-suave" />
            <code
              class="truncate font-mono text-[13px] text-tinta"
              data-prueba="clave"
              :title="claveVisible ? credencial.clave : undefined"
            >
              {{ claveVisible ? credencial.clave : enmascarar(credencial.clave) }}
            </code>
          </span>
          <span class="shrink-0 rounded-[2px] bg-fondo px-[6px] py-[2px] text-[11px] leading-[14px] text-tinta-suave">
            {{ t(`socios.entorno.${credencial.entorno}`) }}
          </span>
        </div>
        <div class="flex flex-wrap items-center gap-1">
          <button
            type="button"
            :aria-pressed="claveVisible"
            class="inline-flex h-[32px] items-center gap-1 rounded-[4px] px-2 text-[12px] font-semibold text-enlace hover:bg-fondo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace"
            @click="claveVisible = !claveVisible"
          >
            <IconoMaterial :nombre="claveVisible ? 'visibility_off' : 'visibility'" class="h-[18px] w-[18px]" />
            {{ claveVisible ? t('socios.credenciales.ocultar') : t('socios.credenciales.mostrar') }}
          </button>
          <BotonCopiar :texto="credencial.clave" :etiqueta="t('socios.credenciales.clave')" />
        </div>
      </div>

      <div class="flex flex-wrap gap-2 pt-1">
        <Boton variante="secundario" :disabled="generando" :aria-busy="generando" @click="pedirToken">
          <template #icono><IconoMaterial nombre="timer" class="h-5 w-5" /></template>
          {{ t('socios.credenciales.generarToken') }}
        </Boton>
        <Boton variante="peligroBorde" @click="modalAbierto = true">
          <template #icono><IconoMaterial nombre="refresh" class="h-5 w-5" /></template>
          {{ t('socios.credenciales.regenerar') }}
        </Boton>
      </div>

      <p v-if="errorToken" role="alert" class="text-[13px] text-error">{{ errorToken }}</p>
      <div
        v-if="token"
        data-prueba="token"
        class="flex flex-col gap-1 rounded-[4px] border border-borde bg-fondo p-[9px]"
      >
        <span class="flex items-center justify-between gap-2 text-[11px] leading-[14px] text-tinta-suave">
          {{ t('socios.credenciales.token') }}
          <span class="flex items-center gap-1" :class="restante ? 'text-tinta' : 'text-error'" aria-live="polite">
            <IconoMaterial nombre="timer" class="h-4 w-4" />
            {{
              restante
                ? t('socios.credenciales.venceEn', { tiempo: cuentaRegresiva })
                : t('socios.credenciales.tokenVencido')
            }}
          </span>
        </span>
        <div class="flex items-center justify-between gap-2">
          <code class="min-w-0 truncate font-mono text-[12px] text-tinta">{{ token.token }}</code>
          <BotonCopiar v-if="restante" :texto="token.token" :etiqueta="t('socios.credenciales.token')" />
        </div>
      </div>
    </template>

    <ModalRegenerar
      :abierto="modalAbierto"
      :entorno="estado.entorno"
      @cerrar="modalAbierto = false"
      @confirmar="confirmarRegenerar"
    />
  </section>
</template>
