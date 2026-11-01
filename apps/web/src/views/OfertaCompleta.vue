<!--
  W01-03a · Oferta, éxito completo (Figma "Solventa-web-Final", nodo 2001:1189). CA-W01-03.

  - Se muestra `desgloseScore` en vez del score único del prototipo, que el contrato no trae. El plazo
    sale de la captura (`plazoMeses`).
  - El guard exige `oferta.prima` (nula en la PRELIMINAR) para no formatear un monto nulo al navegar
    atrás/adelante.
  - "Continuar a suscripción" lleva al ASESOR a W03-01 (HU-W03). El CLIENTE tiene «Firmar» (T7, W03-32), que sigue a
    la firma en su sesión; «Contactar a un asesor» (W01-05) queda como acción secundaria.
-->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Boton, FooterPantalla, HeaderPantalla, MigasDePan, TituloPantalla } from '../components/ui'
import { esOferta, useCotizacion } from '../composables/useCotizacion'
import { esErrorEmision, useSuscripcion } from '../composables/useSuscripcion'
import { useSesion } from '../composables/useSesion'
import { t } from '../i18n'
import { montoVisible } from '../composables/useMoneda'
import { formatearPorcentaje } from '../utils/formato'
import { nombreFuente } from '../utils/nombres'

const { estado, captura } = useCotizacion()
const { estado: sesion, rutaInicio } = useSesion()
const oferta = computed(() => (esOferta(estado.resultado) ? estado.resultado : null))

// T7 (W03-32): el CLIENTE firma por su cuenta: «Firmar» acepta la oferta, UNDER decide al emitir y, si aprueba, sigue
// a la firma en su sesión. Si queda en revisión o no se emite, no pasa a firmar y se le ofrece al asesor.
const router = useRouter()
const suscripcion = useSuscripcion()
const firmando = ref(false)
const avisoFirma = ref<string | null>(null)

async function firmar() {
  if (!oferta.value || firmando.value) return
  firmando.value = true
  avisoFirma.value = null
  try {
    if (!(await suscripcion.aceptar(oferta.value.id))) {
      avisoFirma.value =
        suscripcion.estado.errorAceptacion?.mensaje ?? suscripcion.estado.error ?? t('oferta.errorFirmar')
      return
    }
    const respuesta = await suscripcion.emitir()
    if (!respuesta || esErrorEmision(respuesta)) {
      avisoFirma.value = (respuesta && esErrorEmision(respuesta) ? respuesta.mensaje : null) ?? t('oferta.errorFirmar')
      return
    }
    const propuesta = suscripcion.estado.propuesta
    if (!propuesta) return
    if (propuesta.estado === 'EN_REVISION' || propuesta.estado === 'NO_EMITIDA') {
      avisoFirma.value =
        propuesta.mensajeEstado ?? t(propuesta.estado === 'EN_REVISION' ? 'oferta.enRevision' : 'oferta.noEmitida')
      return
    }
    await router.push(`/propuestas/${propuesta.id}/firma`)
  } finally {
    firmando.value = false
  }
}
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden" data-pantalla="W01-03a">
    <HeaderPantalla :titulo="t('oferta.titulo')" />
    <TituloPantalla class="sr-only">{{ t('oferta.titulo') }}</TituloPantalla>
    <MigasDePan :seccion="t('comun.nuevaCotizacion')" :a-inicio="rutaInicio()" />
    <main
      v-if="oferta && oferta.prima"
      class="flex min-h-0 flex-1 flex-col items-center overflow-y-auto bg-fondo px-10 py-12"
    >
      <div class="flex w-full max-w-[560px] flex-col items-center gap-5 rounded-lg border border-borde bg-white p-6">
        <div class="flex h-14 w-14 items-center justify-center rounded-full border-2 border-exito text-exito">
          <svg viewBox="0 -960 960 960" fill="currentColor" class="h-7 w-7" aria-hidden="true">
            <path
              d="m421-298 283-283-46-45-237 237-120-120-45 45 165 166Zm59 218q-82 0-155-31.5t-127.5-86Q143-252 111.5-325T80-480q0-83 31.5-156t86-127Q252-817 325-848.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 82-31.5 155T763-197.5q-54 54.5-127 86T480-80Zm0-60q142 0 241-99.5T820-480q0-142-99-241t-241-99q-141 0-240.5 99T140-480q0 141 99.5 240.5T480-140Zm0-340Z"
            />
          </svg>
        </div>
        <h2 class="text-center text-[16px] font-semibold leading-[22px] text-tinta">{{ t('oferta.lista') }}</h2>
        <div class="flex w-full flex-col items-center gap-1.5 rounded-md border border-borde p-4">
          <p class="text-[22px] font-bold leading-normal text-primario">
            {{ t('comun.porMes', { monto: montoVisible(oferta.prima!) }) }}
          </p>
          <p class="text-[13px] leading-[18px] text-tinta">
            {{ t('comun.cobertura', { monto: montoVisible(oferta.cobertura) }) }}
          </p>
        </div>
        <div class="flex w-full flex-col gap-2 border-y border-borde py-4">
          <div class="flex items-center justify-between px-1">
            <span class="text-[13px] text-tinta-suave">{{ t('comun.plazo') }}</span>
            <span class="text-[13px] font-semibold text-tinta">{{
              t('comun.meses', { meses: captura.plazoMeses })
            }}</span>
          </div>
          <div
            v-for="factor in oferta.desgloseScore"
            :key="factor.nombre"
            class="flex items-center justify-between px-1"
          >
            <span class="text-[13px] text-tinta-suave">{{ nombreFuente(factor.nombre) }}:</span>
            <span class="text-[13px] font-semibold text-tinta">{{
              t('comun.delScore', { porcentaje: formatearPorcentaje(factor.peso) })
            }}</span>
          </div>
        </div>
        <RouterLink
          v-if="sesion.rol === 'ASESOR'"
          :to="`/suscripcion/${oferta.id}`"
          class="inline-flex h-[44px] w-full items-center justify-center rounded-[4px] bg-primario px-5 font-semibold text-cuerpo text-white hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
        >
          {{ t('oferta.continuar') }}
        </RouterLink>
        <template v-else>
          <Boton data-prueba="firmar" class="w-full" :disabled="firmando" :aria-busy="firmando" @click="firmar">
            {{ firmando ? t('oferta.firmando') : t('oferta.firmar') }}
          </Boton>
          <p v-if="avisoFirma" role="alert" data-prueba="aviso-firma" class="text-center text-[13px] text-error">
            {{ avisoFirma }}
          </p>
          <RouterLink
            to="/cotizacion/asesor"
            class="inline-flex h-[44px] w-full items-center justify-center rounded-[4px] border border-borde bg-white px-5 font-semibold text-cuerpo text-primario hover:bg-fondo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
          >
            {{ t('oferta.contactarAsesor') }}
          </RouterLink>
          <p class="-mt-3 text-center text-[11px] text-tinta-suave">{{ t('oferta.conAsesor') }}</p>
        </template>
        <RouterLink
          v-if="sesion.rol !== 'CLIENTE'"
          to="/cotizacion/fuentes"
          class="text-[13px] font-semibold leading-[18px] text-enlace hover:underline"
        >
          {{ t('comun.verFuentes') }}
        </RouterLink>
        <p class="text-center text-[12px] font-semibold leading-normal text-tinta-suave">
          {{ t('oferta.sinCobro') }}
        </p>
      </div>
    </main>
    <main
      v-else
      class="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-y-auto bg-fondo px-10 py-12 text-center"
    >
      <p class="text-[13px] text-tinta-suave">{{ t('oferta.vacia') }}</p>
      <RouterLink to="/cotizacion" class="text-[13px] font-semibold text-enlace hover:underline">{{
        t('comun.irSolicitud')
      }}</RouterLink>
    </main>
    <FooterPantalla />
  </div>
</template>
