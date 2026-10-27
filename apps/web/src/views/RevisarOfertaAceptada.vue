<!--
  W03-01 · Revisar oferta aceptada (Figma "Solventa-web-Final", nodo 2001:1704). CA-W03-01, CA-W03-11 y CA-W03-12.

  - Solo ASESOR (W03-19 y D-2): el asesor acepta la oferta con el contacto que capturó en W01-01, y el modal
    (ModalVerificacionAsesor) verifica la identidad del cliente con un código y emite.
  - Del prototipo se quitan «Entidad beneficiaria onerosa» y «Fecha de cotización»: el contrato no trae esos datos y no
    se inventan. El texto de la caja de alerta cambia al flujo nuevo (código y enlace de firma, no certificado aquí).
  - Errores de `aceptarOferta`: una PRELIMINAR o vencida se recalcula (D-11); un consentimiento no vigente vuelve a
    W01-01 con el aviso de re-autorización (bloque 4 de W01). Una falla técnica nunca muestra un 5xx (regla 5).
  - Con el enlace enviado, la tarjeta muestra el estado de la propuesta; «Actualizar estado» la vuelve a consultar.
-->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Badge, Boton, FooterPantalla, HeaderPantalla, MigasDePan, TituloPantalla } from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
import ModalVerificacionAsesor from '../components/ModalVerificacionAsesor.vue'
import { esOferta, exigirNuevoConsentimiento, useCotizacion } from '../composables/useCotizacion'
import { useSesion } from '../composables/useSesion'
import { useSuscripcion } from '../composables/useSuscripcion'
import type { EstadoPropuesta } from '../graphql/tipos-borrador'
import { t } from '../i18n'
import { formatearHora, formatearMonto } from '../utils/formato'

const route = useRoute()
const router = useRouter()
const { estado: cotizacion, captura } = useCotizacion()
const { rutaInicio } = useSesion()
const { estado, cargarOferta, aceptar, consultarPropuesta } = useSuscripcion()

const ofertaId = computed(() => String(route.params.ofertaId))
const modalAbierto = ref(false)

// La oferta que acaba de calcular W01 (en memoria) o, si se recargó la página, la que guarda RATING (`oferta(id)`).
const oferta = computed(() => {
  if (esOferta(cotizacion.resultado) && cotizacion.resultado.id === ofertaId.value) return cotizacion.resultado
  return estado.oferta?.id === ofertaId.value ? estado.oferta : null
})
const plazo = computed(() => estado.propuesta?.plazoMeses ?? (Number(captura.plazoMeses) || null))
const propuesta = computed(() => (estado.propuesta?.ofertaId === ofertaId.value ? estado.propuesta : null))
const enCurso = computed(() => !!propuesta.value && propuesta.value.estado !== 'ACEPTADA')

const TIPO_BADGE: Partial<Record<EstadoPropuesta, 'exito' | 'alerta' | 'error' | 'enCurso'>> = {
  EMITIDA: 'exito',
  EN_REVISION: 'alerta',
  PENDIENTE_PAGO: 'alerta',
  NO_EMITIDA: 'error',
  PAGO_RECHAZADO: 'error',
  CANCELADA: 'error',
}

onMounted(async () => {
  if (!oferta.value) await cargarOferta(ofertaId.value)
})

async function aceptarYContinuar() {
  // Aceptar dos veces la misma oferta devuelve la misma propuesta: reabrir el modal no duplica nada.
  if (propuesta.value || (await aceptar(ofertaId.value))) {
    modalAbierto.value = true
    return
  }
  if (estado.errorAceptacion?.motivo === 'CONSENTIMIENTO_NO_VIGENTE') {
    exigirNuevoConsentimiento()
    router.push('/cotizacion')
  }
}

function recalcular() {
  // D-11: reintentar es volver a cotizar con la misma captura, no repetir `aceptarOferta`.
  router.push(cotizacion.consentimientoId ? '/cotizacion/consulta' : '/cotizacion')
}
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden" data-pantalla="W03-01">
    <HeaderPantalla :titulo="t('revisarOferta.header')" />
    <MigasDePan :seccion="t('revisarOferta.miga')" :a-inicio="rutaInicio()" />
    <main class="flex min-h-0 flex-1 flex-col items-center overflow-y-auto bg-fondo px-4 py-8 sm:px-10">
      <div class="flex w-full max-w-[640px] flex-col gap-5">
        <TituloPantalla>{{ t('revisarOferta.titulo') }}</TituloPantalla>

        <p v-if="estado.cargando && !oferta" role="status" class="flex items-center gap-2 text-[13px] text-tinta-suave">
          <IconoMaterial nombre="progress_activity" class="h-4 w-4 animate-spin" />
          {{ t('comun.cargando') }}
        </p>

        <section
          v-else-if="oferta && oferta.prima"
          class="flex flex-col gap-4 rounded-lg border border-borde bg-white p-4"
          data-prueba="tarjeta-oferta"
        >
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-borde pb-4">
            <div class="flex items-center gap-3">
              <span class="flex h-10 w-10 items-center justify-center rounded-md bg-info-fondo text-info">
                <IconoMaterial nombre="description" class="h-5 w-5" />
              </span>
              <div class="flex flex-col">
                <span class="text-[11px] text-tinta-suave">{{ t('revisarOferta.tipoProducto') }}</span>
                <span class="text-[15px] font-semibold text-tinta">{{ t('revisarOferta.producto') }}</span>
              </div>
            </div>
            <span
              class="inline-flex items-center gap-1.5 rounded-full bg-exito-fondo px-3 py-1 text-[12px] font-medium text-exito"
            >
              <IconoMaterial nombre="check_circle" class="h-4 w-4" />
              {{ t('revisarOferta.aprobada') }}
            </span>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-4 rounded-md bg-fondo p-4">
            <div class="flex flex-col gap-1">
              <span class="text-[12px] text-tinta-suave">{{ t('revisarOferta.prima') }}</span>
              <span class="text-[24px] font-bold leading-none text-primario">
                {{ formatearMonto(oferta.prima) }}
                <span class="text-[13px] font-normal text-tinta-suave">{{ t('revisarOferta.porMes') }}</span>
              </span>
            </div>
            <div class="flex flex-col gap-1 sm:items-end sm:border-l sm:border-borde sm:pl-4">
              <span class="text-[12px] text-tinta-suave">{{ t('revisarOferta.cobertura') }}</span>
              <span class="text-[18px] font-semibold text-tinta">{{ formatearMonto(oferta.cobertura) }}</span>
              <span class="text-[11px] text-exito">{{ t('revisarOferta.amparo') }}</span>
            </div>
          </div>

          <dl class="flex flex-col">
            <div v-if="plazo" class="flex items-center justify-between border-b border-borde py-3">
              <dt class="flex items-center gap-2 text-[13px] text-tinta-suave">
                <IconoMaterial nombre="schedule" class="h-5 w-5" />{{ t('revisarOferta.plazo') }}
              </dt>
              <dd class="text-[13px] text-tinta">{{ t('comun.meses', { meses: plazo }) }}</dd>
            </div>
            <div v-if="oferta.perfilRiesgo" class="flex items-center justify-between py-3">
              <dt class="flex items-center gap-2 text-[13px] text-tinta-suave">
                <IconoMaterial nombre="leaderboard" class="h-5 w-5" />{{ t('revisarOferta.score') }}
              </dt>
              <dd class="flex flex-col items-end text-[13px] text-tinta">
                {{ oferta.perfilRiesgo.score }}
                <span class="text-[11px] text-tinta-suave">{{ t('revisarOferta.scoreAyuda') }}</span>
              </dd>
            </div>
          </dl>

          <!-- Estado de la propuesta, una vez emitida por el asesor (el cliente firma y paga desde su correo). -->
          <div
            v-if="enCurso && propuesta"
            class="flex flex-col gap-3 rounded-md border border-borde p-4"
            data-prueba="estado-propuesta"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="text-[13px] font-semibold text-tinta">{{ t('revisarOferta.estadoTitulo') }}</span>
              <Badge :tipo="TIPO_BADGE[propuesta.estado] ?? 'enCurso'">
                {{ t(`revisarOferta.estado.${propuesta.estado}`) }}
              </Badge>
            </div>
            <p v-if="propuesta.mensajeEstado" class="text-[13px] text-tinta">{{ propuesta.mensajeEstado }}</p>
            <p v-else-if="estado.enlace && propuesta.estado !== 'EMITIDA'" class="text-[13px] text-tinta">
              {{
                t('modalAsesor.textoEnviado', {
                  correo: estado.enlace.correoEnmascarado,
                  hora: formatearHora(estado.enlace.venceEn),
                })
              }}
            </p>
            <div class="flex flex-wrap gap-3">
              <Boton variante="secundario" :disabled="estado.cargando" @click="consultarPropuesta">
                <template #icono><IconoMaterial nombre="refresh" class="h-4 w-4" /></template>
                {{ t('revisarOferta.actualizar') }}
              </Boton>
              <Boton
                v-if="propuesta.estado === 'EN_FIRMA' || propuesta.estado === 'FIRMADA'"
                variante="secundario"
                @click="modalAbierto = true"
              >
                {{ t('modalAsesor.reenviar') }}
              </Boton>
            </div>
          </div>

          <template v-else>
            <p
              class="flex items-start gap-3 rounded-md border border-alerta bg-alerta-fondo p-3 text-[12px] leading-[18px] text-alerta"
            >
              <IconoMaterial nombre="info" class="mt-[1px] h-5 w-5 shrink-0" />
              {{ t('revisarOferta.aviso') }}
            </p>

            <div
              v-if="estado.errorAceptacion"
              role="alert"
              data-prueba="error-aceptacion"
              class="flex flex-col gap-2 rounded border border-error bg-error-fondo px-4 py-3 text-[13px] text-error"
            >
              <span>{{ estado.errorAceptacion.mensaje }}</span>
              <button
                v-if="estado.errorAceptacion.puedeReintentar"
                type="button"
                class="self-start font-semibold underline"
                @click="recalcular"
              >
                {{ t('revisarOferta.recalcular') }}
              </button>
            </div>
            <p
              v-if="estado.error"
              role="alert"
              class="rounded border border-error bg-error-fondo px-4 py-3 text-[13px] text-error"
            >
              {{ estado.error }}
            </p>

            <Boton class="w-full" data-prueba="aceptar" :disabled="estado.cargando" @click="aceptarYContinuar">
              {{ estado.cargando ? t('revisarOferta.aceptando') : t('revisarOferta.aceptar') }}
              <IconoMaterial nombre="arrow_forward" class="h-4 w-4" />
            </Boton>
          </template>

          <RouterLink
            v-if="esOferta(cotizacion.resultado)"
            to="/cotizacion/fuentes"
            class="flex items-center justify-center gap-2 text-[13px] font-semibold text-enlace hover:underline"
          >
            <IconoMaterial nombre="account_balance" class="h-5 w-5" />
            {{ t('comun.verFuentes') }}
          </RouterLink>
        </section>

        <!-- Una PRELIMINAR no se acepta: se recalcula (D-11, CA-W03-01). -->
        <section
          v-else-if="oferta"
          class="flex flex-col items-center gap-3 rounded-lg border border-alerta bg-alerta-fondo p-6 text-center"
          data-prueba="oferta-preliminar"
        >
          <p class="text-[13px] text-alerta">{{ t('revisarOferta.preliminar') }}</p>
          <Boton @click="recalcular">{{ t('revisarOferta.recalcular') }}</Boton>
        </section>

        <!-- Sin oferta: venció, no existe o no es de este asesor (`oferta(id)` devuelve null). -->
        <section
          v-else
          class="flex flex-col items-center gap-3 rounded-lg border border-borde bg-white p-6 text-center"
        >
          <p class="text-[13px] text-tinta-suave">{{ estado.error ?? t('revisarOferta.sinOferta') }}</p>
          <RouterLink to="/cotizacion" class="text-[13px] font-semibold text-enlace hover:underline">
            {{ t('comun.irSolicitud') }}
          </RouterLink>
        </section>
      </div>
    </main>
    <FooterPantalla />
    <ModalVerificacionAsesor :abierto="modalAbierto" @cerrar="modalAbierto = false" />
  </div>
</template>
