<!--
  W04-03c · Confirmación de derivación (Figma "Solventa-web-Final", frame 2001:3068). CA-W04-23 y CA-W04-29.
  Lee el resultado de `derivarSiniestro` en memoria (useResultadoReciente); sin él, estado vacío.
  Diferencias con el frame (especificación, sección I): insignia "en curso" (no ámbar), migas de 3 niveles,
  fecha real de vencimiento del informe y fila de instrucciones solo si las hay.
-->
<script setup lang="ts">
import { computed } from 'vue'
import TarjetaConfirmacion from '../components/TarjetaConfirmacion.vue'
import { useResultadoReciente } from '../composables/useResultadoReciente'
import { t, tPiezas } from '../i18n'
import { formatearFecha, sinPuntoFinal } from '../utils/formato'

const resultado = useResultadoReciente('DERIVACION')
const derivacion = computed(() => resultado.value?.resolucion ?? null)
const perito = computed(() => derivacion.value?.perito ?? null)

const subtitulo = computed(() =>
  resultado.value && perito.value
    ? tPiezas('siniestros.confirmacion.subtituloDerivado', {
        radicado: `#${resultado.value.radicado}`,
        perito: sinPuntoFinal(perito.value.nombre),
        n: perito.value.tiempoRespuestaDias,
      })
    : [],
)

const tiempo = computed(() => {
  if (!perito.value) return ''
  const vence = derivacion.value?.vencimientoInforme ?? perito.value.vencimientoInforme
  return vence
    ? t('siniestros.confirmacion.diasHabilesConFecha', {
        n: perito.value.tiempoRespuestaDias,
        fecha: formatearFecha(vence),
      })
    : t('siniestros.confirmacion.diasHabiles', { n: perito.value.tiempoRespuestaDias })
})
</script>

<template>
  <TarjetaConfirmacion
    data-pantalla="W04-03c"
    :con-resultado="!!resultado && !!perito"
    :titulo-header="t('siniestros.confirmacion.headerDerivacion')"
    :miga="t('siniestros.migas.derivacion')"
    icono="arrow_circle_right"
    clase-mosaico="bg-info-fondo text-info"
    :insignia="{ tipo: 'enCurso', texto: t('siniestros.confirmacion.insigniaDerivado') }"
    :titulo="t('siniestros.confirmacion.tituloDerivado')"
  >
    <template v-if="resultado && derivacion && perito">
      <p data-prueba="subtitulo" class="max-w-[576px] text-[13px] leading-[18px] text-tinta-suave">
        <template v-for="(p, i) in subtitulo" :key="i">
          <span v-if="p.parametro === 'radicado'" class="font-semibold text-tinta">{{ p.texto }}</span>
          <span v-else-if="p.parametro" class="text-tinta">{{ p.texto }}</span>
          <template v-else>{{ p.texto }}</template>
        </template>
      </p>

      <dl
        data-prueba="panel"
        class="mt-4 w-full max-w-[576px] divide-y divide-borde rounded border border-borde bg-white text-left"
      >
        <div class="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <dt class="text-[11px] text-tinta-suave">{{ t('siniestros.confirmacion.radicado') }}</dt>
          <dd class="text-right text-[13px] text-tinta">#{{ resultado.radicado }}</dd>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <dt class="text-[11px] text-tinta-suave">{{ t('siniestros.confirmacion.peritoAsignado') }}</dt>
          <dd class="text-right text-[13px] text-tinta">{{ perito.nombre }} — {{ perito.ciudad }}</dd>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <dt class="text-[11px] text-tinta-suave">{{ t('siniestros.confirmacion.tiempoRespuesta') }}</dt>
          <dd class="text-right text-[13px] text-tinta">{{ tiempo }}</dd>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <dt class="text-[11px] text-tinta-suave">{{ t('siniestros.confirmacion.notificacionEnviada') }}</dt>
          <dd class="text-right text-[13px] text-tinta">{{ derivacion.notificacion }}</dd>
        </div>
        <div v-if="derivacion.instrucciones" class="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <dt class="text-[11px] text-tinta-suave">{{ t('siniestros.confirmacion.instrucciones') }}</dt>
          <dd class="whitespace-pre-line text-left text-[13px] text-tinta">{{ derivacion.instrucciones }}</dd>
        </div>
      </dl>
    </template>
  </TarjetaConfirmacion>
</template>
