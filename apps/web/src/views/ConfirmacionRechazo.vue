<!--
  W04-03b · Confirmación de rechazo (Figma "Solventa-web-Final", frame 2001:2963). CA-W04-27 y CA-W04-29.
  Lee el resultado de `rechazarSiniestro` en memoria (useResultadoReciente); sin él, estado vacío.
  Diferencias con el frame (especificación, sección I): migas de 3 niveles con "›", insignia con mayúscula
  inicial y glifo, mosaico de 56 px y fila de comentario solo si el operador lo escribió.
-->
<script setup lang="ts">
import { computed } from 'vue'
import TarjetaConfirmacion from '../components/TarjetaConfirmacion.vue'
import { useResultadoReciente } from '../composables/useResultadoReciente'
import { idioma, t, tPiezas } from '../i18n'
import { formatearFecha, sinPuntoFinal } from '../utils/formato'

const resultado = useResultadoReciente('RECHAZO')
const rechazo = computed(() => resultado.value?.resolucion ?? null)

// En español el motivo va en minúscula inicial dentro de la frase ("Motivo: evidencia insuficiente.").
const motivo = computed(() => {
  if (!rechazo.value?.motivo) return ''
  const texto = sinPuntoFinal(t(`siniestros.motivo.${rechazo.value.motivo}`))
  return idioma.value === 'ES' ? texto.charAt(0).toLocaleLowerCase('es') + texto.slice(1) : texto
})

const subtitulo = computed(() =>
  resultado.value
    ? tPiezas('siniestros.confirmacion.subtituloRechazado', {
        radicado: `#${resultado.value.radicado}`,
        motivo: motivo.value,
      })
    : [],
)

const miga = computed(() =>
  resultado.value
    ? t('siniestros.migas.resolucion', { radicado: resultado.value.radicado })
    : t('siniestros.migas.resolucionSinRadicado'),
)
</script>

<template>
  <TarjetaConfirmacion
    data-pantalla="W04-03b"
    :con-resultado="!!resultado && !!rechazo"
    :titulo-header="t('siniestros.confirmacion.headerRechazo')"
    :miga="miga"
    icono="cancel"
    clase-mosaico="bg-error-fondo text-error"
    :insignia="{ tipo: 'error', texto: t('siniestros.confirmacion.insigniaRechazado') }"
    :titulo="t('siniestros.confirmacion.tituloRechazado')"
  >
    <template v-if="resultado && rechazo">
      <p data-prueba="subtitulo" class="max-w-[576px] text-[13px] leading-[18px] text-tinta-suave">
        <template v-for="(p, i) in subtitulo" :key="i">
          <span v-if="p.parametro === 'radicado'" class="font-semibold text-tinta">{{ p.texto }}</span>
          <template v-else>{{ p.texto }}</template>
        </template>
      </p>

      <section
        aria-labelledby="titulo-notificacion"
        data-prueba="panel"
        class="mt-4 w-full max-w-[576px] rounded border border-borde bg-fondo p-4 text-left"
      >
        <h2 id="titulo-notificacion" class="border-b border-borde pb-2 text-[16px] font-semibold text-tinta">
          {{ t('siniestros.confirmacion.detalleNotificacion') }}
        </h2>
        <dl class="flex flex-col">
          <div class="flex flex-wrap justify-between gap-2 border-b border-borde py-1.5 last:border-0">
            <dt class="text-[12px] font-medium text-tinta-suave">{{ t('siniestros.confirmacion.radicado') }}</dt>
            <dd class="max-w-[320px] text-right text-[13px] text-tinta">#{{ resultado.radicado }}</dd>
          </div>
          <div class="flex flex-wrap justify-between gap-2 border-b border-borde py-1.5 last:border-0">
            <dt class="text-[12px] font-medium text-tinta-suave">
              {{ t('siniestros.confirmacion.notificacionAsegurado') }}
            </dt>
            <dd class="max-w-[320px] text-right text-[13px] text-tinta">{{ rechazo.notificacion }}</dd>
          </div>
          <div class="flex flex-wrap justify-between gap-2 border-b border-borde py-1.5 last:border-0">
            <dt class="text-[12px] font-medium text-tinta-suave">{{ t('siniestros.confirmacion.fechaResolucion') }}</dt>
            <dd class="max-w-[320px] text-right text-[13px] text-tinta">{{ formatearFecha(rechazo.resueltaEn) }}</dd>
          </div>
          <div
            v-if="rechazo.comentario"
            data-prueba="comentario"
            class="flex flex-wrap justify-between gap-2 border-b border-borde py-1.5 last:border-0"
          >
            <dt class="text-[12px] font-medium text-tinta-suave">
              {{ t('siniestros.confirmacion.comentarioOperador') }}
            </dt>
            <dd class="max-w-[320px] whitespace-pre-line text-right text-[13px] text-tinta">
              {{ rechazo.comentario }}
            </dd>
          </div>
          <div
            v-if="rechazo.viaRecurso"
            class="flex flex-wrap justify-between gap-2 border-b border-borde py-1.5 last:border-0"
          >
            <dt class="text-[12px] font-medium text-tinta-suave">{{ t('siniestros.confirmacion.viaRecurso') }}</dt>
            <dd class="max-w-[320px] text-right text-[13px] text-tinta-suave">{{ rechazo.viaRecurso }}</dd>
          </div>
        </dl>
      </section>
    </template>
  </TarjetaConfirmacion>
</template>
