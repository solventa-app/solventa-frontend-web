<!--
  Modal del asesor en W03-01 (HU-W03, bloque 9; sin Figma, aprobado en el plan principal 5.2). CA-W03-11 y CA-W03-12.
  Pasos: 1) enviar el código al correo del cliente (enmascarado, con «Corregir»); 2) digitar el código que el cliente
  dicta; 3) «Emitir» (UNDER decide); 4) resultado: enlace enviado (con «Reenviar enlace») o la decisión de UNDER.
  Nunca muestra la URL del enlace (W07-17) ni el correo completo que no escribió el asesor.
  Accesible como ModalRechazo (W04): role="dialog", trampa de foco, Escape, velo y X cierran salvo mientras espera.
  A diferencia de ModalRechazo, llama él mismo a useSuscripcion: son varias operaciones encadenadas.
-->
<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'
import { Boton, CampoFormulario } from './ui'
import IconoMaterial from './ui/IconoMaterial.vue'
import { contactoCapturado, correoClienteValido } from '../composables/useCotizacion'
import { esEnlaceEnviado, esErrorEmision, useSuscripcion } from '../composables/useSuscripcion'
import type { ErrorCodigo } from '../graphql/tipos'
import { t } from '../i18n'
import { useEsperaReenvio } from '../composables/useEsperaReenvio'
import { formatearHora } from '../utils/formato'

const props = defineProps<{ abierto: boolean }>()
const emit = defineEmits<{ cerrar: [] }>()

const { estado, enviarCodigo, verificarCodigo, emitir, reenviarEnlace } = useSuscripcion()

type Paso = 'correo' | 'codigo' | 'emitir' | 'resultado'
const paso = ref<Paso>('correo')
const corrigiendo = ref(false)
const correoCorregido = ref('')
const codigo = ref('')
const errorCodigo = ref<ErrorCodigo | null>(null)
const errorEmision = ref<string | null>(null)
const reenviado = ref(false)
const codigoNuevo = ref(false)
const espera = useEsperaReenvio()
const intentoCorreo = ref(false)

const idTitulo = useId()
const caja = ref<HTMLElement | null>(null)
let previo: HTMLElement | null = null

/** El correo que capturó el asesor en W01-01, enmascarado; si no hay (no debería), el del código enviado. */
const correoMostrado = computed(() => {
  const capturado = contactoCapturado()?.correo
  if (correoCorregido.value && correoClienteValido(correoCorregido.value)) return enmascarar(correoCorregido.value)
  return capturado ? enmascarar(capturado) : (estado.codigo?.correoEnmascarado ?? '')
})
const codigoCompleto = computed(() => /^\d{6}$/.test(codigo.value))
const identidadVerificada = computed(() => estado.propuesta?.estado === 'IDENTIDAD_VERIFICADA')
const propuestaDecidida = computed(() =>
  ['EN_REVISION', 'NO_EMITIDA'].includes(estado.propuesta?.estado ?? '') ? estado.propuesta : null,
)
const pideOtroCodigo = computed(
  () => errorCodigo.value?.motivo === 'CODIGO_VENCIDO' || errorCodigo.value?.motivo === 'INTENTOS_AGOTADOS',
)

function enmascarar(correo: string): string {
  const [usuario, dominio] = correo.trim().toLowerCase().split('@')
  return `${usuario.slice(0, 1)}•••@${dominio}`
}

watch(
  () => props.abierto,
  async (abierto) => {
    if (abierto) {
      paso.value = estado.enlace ? 'resultado' : identidadVerificada.value ? 'emitir' : 'correo'
      errorCodigo.value = null
      errorEmision.value = null
      codigo.value = ''
      previo = document.activeElement instanceof HTMLElement ? document.activeElement : null
      await enfocarPrimero()
    } else {
      if (previo?.isConnected) previo.focus()
      previo = null
    }
  },
)

async function enfocarPrimero() {
  await nextTick()
  caja.value?.querySelector<HTMLElement>('input, button:not([disabled])')?.focus()
}

function cerrar() {
  if (!estado.cargando) emit('cerrar')
}

async function pedirCodigo() {
  intentoCorreo.value = true
  if (corrigiendo.value && !correoClienteValido(correoCorregido.value)) return
  errorCodigo.value = null
  const error = await enviarCodigo(corrigiendo.value ? correoCorregido.value.trim().toLowerCase() : null)
  if (error) {
    errorCodigo.value = error
    return
  }
  if (estado.error) return
  corrigiendo.value = false
  codigo.value = ''
  codigoNuevo.value = paso.value === 'codigo'
  espera.iniciar()
  paso.value = 'codigo'
  await enfocarPrimero()
}

async function verificar() {
  if (!codigoCompleto.value) return
  const error = await verificarCodigo(codigo.value)
  errorCodigo.value = error
  if (!error && !estado.error) {
    paso.value = 'emitir'
    await enfocarPrimero()
  }
}

async function alEmitir() {
  errorEmision.value = null
  const resultado = await emitir()
  if (!resultado) return
  if (esErrorEmision(resultado)) {
    errorEmision.value = resultado.mensaje
    return
  }
  paso.value = 'resultado'
  await enfocarPrimero()
}

async function alReenviar() {
  reenviado.value = false
  const resultado = await reenviarEnlace()
  if (resultado && esEnlaceEnviado(resultado)) reenviado.value = true
  else if (resultado && esErrorEmision(resultado)) errorEmision.value = resultado.mensaje
}

function atraparFoco(e: KeyboardEvent) {
  if (!caja.value) return
  const enfocables = Array.from(
    caja.value.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
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

const claseSecundaria =
  'h-11 rounded-md border border-borde bg-white px-4 text-[13px] font-semibold text-tinta hover:bg-fondo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace disabled:cursor-not-allowed disabled:opacity-60'
const claseEnlace =
  'self-start text-[13px] font-semibold text-enlace hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace disabled:cursor-not-allowed disabled:opacity-60'
</script>

<template>
  <div
    v-if="abierto"
    class="fixed inset-0 z-20 flex items-center justify-center px-4"
    style="background: rgba(17, 24, 39, 0.45)"
    data-prueba="velo"
    @click.self="cerrar"
    @keydown.esc="cerrar"
    @keydown.tab="atraparFoco"
  >
    <div
      ref="caja"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="idTitulo"
      :aria-busy="estado.cargando ? 'true' : undefined"
      data-componente="modal-verificacion-asesor"
      class="flex max-h-[calc(100vh-32px)] w-full max-w-[460px] flex-col gap-4 overflow-y-auto rounded-lg bg-white p-5"
    >
      <div class="flex items-start justify-between">
        <span class="flex h-12 w-12 items-center justify-center rounded-lg bg-info-fondo text-info">
          <IconoMaterial :nombre="paso === 'resultado' ? 'send' : 'verified_user'" class="h-6 w-6" />
        </span>
        <button
          type="button"
          data-prueba="cerrar"
          :aria-label="t('modal.cerrar')"
          :disabled="estado.cargando"
          class="rounded p-1 text-tinta-suave hover:text-tinta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace disabled:cursor-not-allowed"
          @click="cerrar"
        >
          <IconoMaterial nombre="close" class="h-5 w-5" />
        </button>
      </div>

      <!-- 1 · Enviar el código -->
      <template v-if="paso === 'correo'">
        <div class="flex flex-col gap-1">
          <h2 :id="idTitulo" class="text-[20px] font-bold text-tinta">{{ t('modalAsesor.tituloCorreo') }}</h2>
          <p class="text-[13px] text-tinta-suave">{{ t('modalAsesor.textoCorreo') }}</p>
        </div>
        <div
          v-if="!corrigiendo"
          class="flex items-center justify-between gap-3 rounded-md border border-borde px-3 py-2"
        >
          <span class="flex items-center gap-2 text-[14px] text-tinta">
            <IconoMaterial nombre="mail" class="h-[18px] w-[18px] text-tinta-suave" />
            <span data-prueba="correo-enmascarado">{{ correoMostrado }}</span>
          </span>
          <button type="button" :class="claseEnlace" @click="corrigiendo = true">
            {{ t('modalAsesor.corregir') }}
          </button>
        </div>
        <CampoFormulario
          v-else
          v-model="correoCorregido"
          :label="t('solicitud.correoCliente')"
          type="email"
          :placeholder="t('solicitud.correoClienteEjemplo')"
          icono="mail"
          :error="
            intentoCorreo && !correoClienteValido(correoCorregido) ? t('solicitud.errorCorreoCliente') : undefined
          "
          required
        />
        <Boton class="w-full" data-prueba="enviar-codigo" :disabled="estado.cargando" @click="pedirCodigo">
          <template #icono>
            <IconoMaterial
              :nombre="estado.cargando ? 'progress_activity' : 'send'"
              class="h-4 w-4"
              :class="{ 'animate-spin': estado.cargando }"
            />
          </template>
          {{ estado.cargando ? t('modalAsesor.enviando') : t('modalAsesor.enviarCodigo') }}
        </Boton>
      </template>

      <!-- 2 · Digitar el código -->
      <template v-else-if="paso === 'codigo'">
        <div class="flex flex-col gap-1">
          <h2 :id="idTitulo" class="text-[20px] font-bold text-tinta">{{ t('modalAsesor.tituloCodigo') }}</h2>
          <p class="text-[13px] text-tinta-suave">
            {{ t('modalAsesor.textoCodigo', { correo: estado.codigo?.correoEnmascarado ?? correoMostrado }) }}
          </p>
        </div>
        <CampoFormulario
          v-model="codigo"
          :label="t('modalAsesor.codigo')"
          :placeholder="t('modalAsesor.codigoEjemplo')"
          :hint="estado.codigo ? t('modalAsesor.vence', { hora: formatearHora(estado.codigo.venceEn) }) : undefined"
          icono="lock"
          required
          @keydown.enter="verificar"
        />
        <Boton class="w-full" data-prueba="verificar" :disabled="!codigoCompleto || estado.cargando" @click="verificar">
          {{ estado.cargando ? t('modalAsesor.verificando') : t('modalAsesor.verificar') }}
        </Boton>
        <p v-if="codigoNuevo" role="status" class="text-[13px] font-semibold text-exito" data-prueba="codigo-nuevo">
          {{ t('modalAsesor.codigoNuevo') }}
        </p>
        <button
          type="button"
          :class="claseEnlace"
          data-prueba="reenviar-codigo"
          :disabled="estado.cargando || espera.activa.value"
          @click="pedirCodigo"
        >
          {{
            espera.activa.value
              ? t('modalAsesor.reenviarEn', { tiempo: espera.texto.value })
              : t('modalAsesor.otroCodigo')
          }}
        </button>
      </template>

      <!-- 3 · Emitir -->
      <template v-else-if="paso === 'emitir'">
        <div class="flex flex-col gap-1">
          <h2 :id="idTitulo" class="text-[20px] font-bold text-tinta">{{ t('modalAsesor.tituloEmitir') }}</h2>
          <p class="text-[13px] text-tinta-suave">{{ t('modalAsesor.textoEmitir') }}</p>
        </div>
        <p class="flex items-center gap-2 rounded-md bg-exito-fondo px-3 py-2 text-[13px] font-semibold text-exito">
          <IconoMaterial nombre="verified_user" class="h-[18px] w-[18px]" />
          {{ t('modalAsesor.identidadVerificada') }}
        </p>
        <Boton
          class="w-full"
          data-prueba="emitir"
          :disabled="!identidadVerificada || estado.cargando"
          @click="alEmitir"
        >
          <template #icono>
            <IconoMaterial
              :nombre="estado.cargando ? 'progress_activity' : 'send'"
              class="h-4 w-4"
              :class="{ 'animate-spin': estado.cargando }"
            />
          </template>
          {{ estado.cargando ? t('modalAsesor.emitiendo') : t('modalAsesor.emitir') }}
        </Boton>
      </template>

      <!-- 4 · Resultado -->
      <template v-else>
        <template v-if="propuestaDecidida">
          <h2 :id="idTitulo" class="text-[20px] font-bold text-tinta">
            {{ t(`modalAsesor.decision.${propuestaDecidida.estado as 'EN_REVISION' | 'NO_EMITIDA'}`) }}
          </h2>
          <p class="text-[13px] text-tinta" data-prueba="mensaje-estado">{{ propuestaDecidida.mensajeEstado }}</p>
        </template>
        <template v-else-if="estado.enlace">
          <h2 :id="idTitulo" class="text-[20px] font-bold text-tinta">{{ t('modalAsesor.tituloEnviado') }}</h2>
          <p class="text-[13px] text-tinta" data-prueba="enlace-enviado">
            {{
              t('modalAsesor.textoEnviado', {
                correo: estado.enlace.correoEnmascarado,
                hora: formatearHora(estado.enlace.venceEn),
              })
            }}
          </p>
          <p v-if="reenviado" role="status" class="text-[13px] font-semibold text-exito">
            {{ t('modalAsesor.reenviado') }}
          </p>
          <button type="button" :class="claseSecundaria" :disabled="estado.cargando" @click="alReenviar">
            {{ estado.cargando ? t('modalAsesor.enviando') : t('modalAsesor.reenviar') }}
          </button>
        </template>
        <Boton class="w-full" variante="secundario" :disabled="estado.cargando" @click="cerrar">
          {{ t('modalAsesor.listo') }}
        </Boton>
      </template>

      <div
        v-if="errorCodigo || errorEmision || estado.error"
        role="alert"
        data-prueba="error-modal"
        class="flex flex-col gap-1 rounded border border-error bg-error-fondo px-4 py-3 text-[13px] text-error"
      >
        <span>{{ errorCodigo?.mensaje ?? errorEmision ?? estado.error }}</span>
        <span v-if="errorCodigo?.motivo === 'CODIGO_INVALIDO' && errorCodigo.intentosRestantes != null">
          {{ t('modalAsesor.intentosRestantes', { intentos: errorCodigo.intentosRestantes }) }}
        </span>
        <span v-if="pideOtroCodigo">{{ t('modalAsesor.pideOtro') }}</span>
      </div>
    </div>
  </div>
</template>
