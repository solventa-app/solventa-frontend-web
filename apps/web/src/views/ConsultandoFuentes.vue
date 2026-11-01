<!--
  W01-02 · Consultando fuentes (Figma "Solventa-web-Final", nodo 2001:1135). CA-W01-02.

  Avanza sola según el resultado de `solicitarOferta` (nota del prototipo: "no tiene botón manual").
  Sin datos capturados (entrada por URL o recarga) no llama al BFF: muestra un mensaje y un enlace a
  la solicitud, en la misma región `aria-live`.
-->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { FooterPantalla, HeaderPantalla, MigasDePan, TituloPantalla } from '../components/ui'
import { esErrorOferta, esOferta, useCotizacion } from '../composables/useCotizacion'
import { useSesion } from '../composables/useSesion'
import { t } from '../i18n'

const router = useRouter()
const { estado, captura, solicitarOferta } = useCotizacion()
const { rutaInicio } = useSesion()

// Se llegó sin pasar por W01-01: no hay nada que consultar.
const sinDatosCapturados = ref(false)

onMounted(async () => {
  if (!captura.documentoIdentidad || !captura.consentimiento) {
    sinDatosCapturados.value = true
    return
  }

  await solicitarOferta()
  const resultado = estado.resultado
  if (esErrorOferta(resultado)) {
    router.replace(resultado.motivo === 'CONSENTIMIENTO_NO_VIGENTE' ? '/cotizacion' : '/cotizacion/error')
  } else if (esOferta(resultado)) {
    router.replace(resultado.tipo === 'PRELIMINAR' ? '/cotizacion/oferta-preliminar' : '/cotizacion/oferta')
  }
})
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden" data-pantalla="W01-02">
    <HeaderPantalla :titulo="t('consulta.titulo')" />
    <TituloPantalla class="sr-only">{{ t('consulta.titulo') }}</TituloPantalla>
    <MigasDePan :seccion="t('comun.nuevaCotizacion')" :a-inicio="rutaInicio()" />
    <main
      v-if="!sinDatosCapturados"
      class="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 overflow-y-auto bg-fondo px-10 py-16"
      role="status"
      aria-live="polite"
    >
      <svg class="h-6 w-6 animate-spin text-primario" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
        <path
          class="opacity-80"
          d="M22 12a10 10 0 0 0-10-10"
          stroke="currentColor"
          stroke-width="3"
          stroke-linecap="round"
        />
      </svg>
      <h2 class="text-center text-[16px] font-semibold leading-[22px] text-tinta">
        {{ t('consulta.verificando') }}
      </h2>
      <div
        class="h-[6px] w-[400px] max-w-full overflow-hidden rounded-full bg-info-fondo"
        data-prueba="barra-indeterminada"
      >
        <div class="barra-indeterminada h-full w-1/3 rounded-full bg-enlace" />
      </div>
      <p class="text-center text-[11px] leading-[14px] text-tinta-suave">
        {{ t('consulta.nota') }}
      </p>
    </main>
    <main
      v-else
      class="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-y-auto bg-fondo px-10 py-16 text-center"
      role="status"
      aria-live="polite"
    >
      <p class="text-[13px] text-tinta-suave">{{ t('consulta.sinSolicitud') }}</p>
      <RouterLink to="/cotizacion" class="text-[13px] font-semibold text-enlace hover:underline">{{
        t('comun.irSolicitud')
      }}</RouterLink>
    </main>
    <FooterPantalla />
  </div>
</template>
