<!--
  W04-03a · Confirmación de aprobación (Figma "Solventa-web-Final", frame 2001:2865). CA-W04-28 y CA-W04-29.
  Lee el resultado de `aprobarSiniestro` en memoria (useResultadoReciente); sin él, estado vacío.
  Diferencias con el frame (especificación, sección I): migas de 3 niveles, insignia con glifo, monto con
  formatearMonto y filas sin dato (método o plazo nulos) que no se pintan.
-->
<script setup lang="ts">
import { computed } from 'vue'
import TarjetaConfirmacion from '../components/TarjetaConfirmacion.vue'
import { useResultadoReciente } from '../composables/useResultadoReciente'
import { t, tPiezas } from '../i18n'
import { formatearMonto, sinPuntoFinal } from '../utils/formato'

const resultado = useResultadoReciente('APROBACION')
const aprobacion = computed(() => resultado.value?.resolucion ?? null)
const monto = computed(() => (aprobacion.value?.indemnizacion ? formatearMonto(aprobacion.value.indemnizacion) : ''))

const subtitulo = computed(() => {
  if (!resultado.value || !aprobacion.value) return []
  const radicado = `#${resultado.value.radicado}`
  const plazo = aprobacion.value.plazoDispersion
  return plazo
    ? tPiezas('siniestros.confirmacion.subtituloAprobado', {
        radicado,
        monto: monto.value,
        plazo: sinPuntoFinal(plazo),
      })
    : tPiezas('siniestros.confirmacion.subtituloAprobadoSinPlazo', { radicado, monto: monto.value })
})
</script>

<template>
  <TarjetaConfirmacion
    data-pantalla="W04-03a"
    :con-resultado="!!resultado && !!aprobacion"
    :titulo-header="t('siniestros.confirmacion.headerAprobacion')"
    :miga="t('siniestros.migas.aprobacion')"
    icono="check_circle"
    clase-mosaico="bg-exito-fondo text-exito"
    :insignia="{ tipo: 'exito', texto: t('siniestros.confirmacion.insigniaAprobado') }"
    :titulo="t('siniestros.confirmacion.tituloAprobado')"
  >
    <template v-if="resultado && aprobacion">
      <p data-prueba="subtitulo" class="max-w-[576px] text-[13px] leading-[18px] text-tinta-suave">
        <template v-for="(p, i) in subtitulo" :key="i">
          <span v-if="p.parametro === 'radicado' || p.parametro === 'monto'" class="font-semibold text-tinta">{{
            p.texto
          }}</span>
          <template v-else>{{ p.texto }}</template>
        </template>
      </p>

      <section
        aria-labelledby="titulo-liquidacion"
        data-prueba="panel"
        class="mt-4 w-full max-w-[620px] rounded border border-borde bg-fondo p-4 text-left"
      >
        <h2
          id="titulo-liquidacion"
          class="border-b border-borde pb-2 text-[11px] uppercase tracking-[0.55px] text-tinta-suave"
        >
          {{ t('siniestros.confirmacion.resumenLiquidacion') }}
        </h2>
        <dl class="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
          <div>
            <dt class="text-[11px] text-tinta-suave">{{ t('siniestros.confirmacion.radicado') }}</dt>
            <dd class="text-[13px] font-semibold text-tinta">#{{ resultado.radicado }}</dd>
          </div>
          <div v-if="aprobacion.indemnizacion">
            <dt class="text-[11px] text-tinta-suave">{{ t('siniestros.confirmacion.valorIndemnizar') }}</dt>
            <dd data-prueba="monto" class="text-[16px] font-semibold tracking-[-0.4px] text-tinta">{{ monto }}</dd>
          </div>
          <div v-if="aprobacion.metodoTransferencia">
            <dt class="text-[11px] text-tinta-suave">{{ t('siniestros.confirmacion.metodoTransferencia') }}</dt>
            <dd class="text-[13px] text-tinta">{{ aprobacion.metodoTransferencia }}</dd>
          </div>
          <div v-if="aprobacion.plazoDispersion">
            <dt class="text-[11px] text-tinta-suave">{{ t('siniestros.confirmacion.plazoDispersion') }}</dt>
            <dd class="text-[13px] text-tinta">{{ aprobacion.plazoDispersion }}</dd>
          </div>
        </dl>
      </section>
    </template>
  </TarjetaConfirmacion>
</template>
