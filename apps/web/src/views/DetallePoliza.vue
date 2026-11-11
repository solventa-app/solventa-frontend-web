<!--
  G-06b · Detalle de la póliza (QA 2026-11-10, Q-09). Lo abre la fila de G-06, o G-06 directamente cuando hay una sola.
  - Sirve al CLIENTE titular y al ASESOR que la aceptó: el BFF filtra por rol. El titular solo lo ve el asesor.
  - Prima y cobertura convertidas a la moneda de consulta (D-2); el PDF firmado conserva su moneda.
  - Si no está emitida explica el estado; el asesor puede retomarla, el cliente continúa con su enlace.
  - Se mantiene al día con el aviso `propuesta` del SSE mientras la pestaña está visible.
-->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import InsigniaEstadoPoliza from '../components/InsigniaEstadoPoliza.vue'
import { Boton, FooterPantalla, HeaderPantalla, TituloPantalla } from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
import { useAvisos } from '../composables/useAvisos'
import { useDetallePoliza } from '../composables/useDetallePoliza'
import { montoVisible } from '../composables/useMoneda'
import { useSesion } from '../composables/useSesion'
import { t } from '../i18n'
import { estadoVisibleDe } from '../utils/estadoPoliza'
import { formatearFecha, formatearFechaCorta } from '../utils/formato'

const route = useRoute()
const { estado: sesion } = useSesion()
const { estado, cargar, pdf } = useDetallePoliza()

const id = computed(() => String(route.params.propuestaId ?? ''))
const esAsesor = computed(() => sesion.rol === 'ASESOR')
const propuesta = computed(() => estado.propuesta)
const visible = computed(() => (propuesta.value ? estadoVisibleDe(propuesta.value) : 'EMITIENDO'))
const poliza = computed(() => (visible.value === 'EMITIDA' ? (propuesta.value?.poliza ?? null) : null))
const titulo = computed(() => (esAsesor.value ? t('polizas.tituloAsesor') : t('polizas.tituloCliente')))
// `?lista=1` evita que G-06 vuelva a saltar al detalle cuando la persona tiene una sola póliza.
const rutaLista = '/polizas?lista=1'

const avisos = useAvisos(null, fetch, undefined, (aviso) => {
  if (aviso.propuestaId === id.value) void cargar(id.value, { silencioso: true })
})

const errorPdf = ref(false)
const abriendo = ref(false)
const urls: string[] = []

async function verPdf() {
  if (!poliza.value) return
  abriendo.value = true
  errorPdf.value = false
  const url = await pdf(poliza.value.documentoUrl)
  abriendo.value = false
  if (!url) {
    errorPdf.value = true
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

// La conexión solo vive con la pestaña visible; al volver se consulta una vez lo que pasó mientras tanto.
function alCambiarVisibilidad() {
  if (document.visibilityState === 'hidden') {
    avisos.cerrar()
    return
  }
  void avisos.abrir()
  void cargar(id.value, { silencioso: true })
}

onMounted(() => {
  void cargar(id.value)
  void avisos.abrir()
  document.addEventListener('visibilitychange', alCambiarVisibilidad)
})
onUnmounted(() => {
  avisos.cerrar()
  urls.forEach((url) => URL.revokeObjectURL(url))
  document.removeEventListener('visibilitychange', alCambiarVisibilidad)
})
</script>

<template>
  <div data-pantalla="G-06b" class="sentry-block flex h-screen flex-col overflow-hidden bg-fondo">
    <HeaderPantalla :titulo="titulo" />
    <TituloPantalla class="sr-only">{{ t('detallePoliza.titulo') }}</TituloPantalla>

    <main class="mx-auto flex w-full max-w-[760px] min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-6 sm:px-10">
      <RouterLink :to="rutaLista" class="text-[13px] font-normal text-primario hover:underline">
        {{ t('detallePoliza.volver') }}
      </RouterLink>

      <p v-if="estado.cargando" class="text-[13px] text-tinta-suave">{{ t('detallePoliza.cargando') }}</p>
      <p v-else-if="estado.problema === 'error'" role="alert" class="text-[13px] text-error">
        {{ estado.mensajeError }}
      </p>
      <div
        v-else-if="estado.problema === 'no-encontrada' || !propuesta"
        data-prueba="poliza-no-encontrada"
        class="flex w-full flex-col items-center gap-3 rounded-lg border border-borde bg-white px-6 py-12 text-center"
      >
        <IconoMaterial nombre="description" class="h-8 w-8 text-tinta-suave" />
        <p class="text-[16px] font-semibold text-tinta">{{ t('detallePoliza.noEncontrada') }}</p>
        <RouterLink :to="rutaLista">
          <Boton variante="secundario">{{ t('detallePoliza.verLista') }}</Boton>
        </RouterLink>
      </div>

      <section v-else class="flex w-full flex-col gap-5 rounded-lg border border-borde bg-white p-5 sm:p-6">
        <header class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-col gap-1">
            <h2 class="text-[18px] font-semibold text-tinta">{{ t('detallePoliza.titulo') }}</h2>
            <p class="font-mono text-[14px] text-tinta-suave" data-prueba="detalle-numero">
              {{ propuesta.poliza?.numero ?? t('detallePoliza.sinNumero') }}
            </p>
          </div>
          <InsigniaEstadoPoliza :estado="visible" data-prueba="detalle-estado" />
        </header>

        <p
          v-if="visible !== 'EMITIDA'"
          data-prueba="detalle-mensaje"
          class="rounded-md border border-borde bg-fondo px-4 py-3 text-[13px] text-tinta-suave"
        >
          {{ propuesta.mensajeEstado ?? t(`detallePoliza.mensaje.${visible}`) }}
        </p>

        <dl class="grid grid-cols-1 gap-x-8 gap-y-4 text-[13px] sm:grid-cols-2">
          <div v-if="esAsesor" class="flex flex-col gap-1" data-prueba="detalle-titular">
            <dt class="text-tinta-suave">{{ t('polizas.titular') }}</dt>
            <dd class="font-medium text-tinta">{{ propuesta.nombreTitular ?? '—' }}</dd>
          </div>
          <div class="flex flex-col gap-1">
            <dt class="text-tinta-suave">{{ t('polizas.prima') }}</dt>
            <dd class="font-medium text-tinta">{{ montoVisible(propuesta.prima) }}</dd>
          </div>
          <div class="flex flex-col gap-1">
            <dt class="text-tinta-suave">{{ t('polizas.cobertura') }}</dt>
            <dd class="font-medium text-tinta">{{ montoVisible(propuesta.cobertura) }}</dd>
          </div>
          <div class="flex flex-col gap-1">
            <dt class="text-tinta-suave">{{ t('detallePoliza.plazo') }}</dt>
            <dd class="font-medium text-tinta">{{ t('detallePoliza.plazoMeses', { n: propuesta.plazoMeses }) }}</dd>
          </div>
          <template v-if="poliza">
            <div class="flex flex-col gap-1" data-prueba="detalle-vigencia">
              <dt class="text-tinta-suave">{{ t('detallePoliza.vigencia') }}</dt>
              <dd class="font-medium text-tinta">
                {{
                  t('detallePoliza.vigenciaRango', {
                    desde: formatearFechaCorta(poliza.vigenciaDesde),
                    hasta: formatearFechaCorta(poliza.vigenciaHasta),
                  })
                }}
              </dd>
            </div>
            <div class="flex flex-col gap-1">
              <dt class="text-tinta-suave">{{ t('detallePoliza.emitida') }}</dt>
              <dd class="font-medium text-tinta">{{ formatearFecha(poliza.vigenciaDesde) }}</dd>
            </div>
          </template>
          <div class="flex flex-col gap-1">
            <dt class="text-tinta-suave">{{ t('polizas.actualizada') }}</dt>
            <dd class="font-medium text-tinta">{{ formatearFecha(propuesta.actualizadoEn) }}</dd>
          </div>
        </dl>

        <p v-if="errorPdf" role="alert" class="text-[13px] text-error">{{ t('polizas.errorPdf') }}</p>

        <div class="flex flex-wrap items-center gap-3">
          <Boton v-if="poliza" data-prueba="detalle-pdf" :disabled="abriendo" :aria-busy="abriendo" @click="verPdf">
            {{ abriendo ? t('polizas.abriendo') : t('polizas.verPdf') }}
          </Boton>
          <RouterLink v-else-if="esAsesor && visible !== 'EMITIDA'" :to="`/suscripcion/${propuesta.ofertaId}`">
            <Boton variante="secundario" data-prueba="detalle-retomar">{{ t('polizas.retomar') }}</Boton>
          </RouterLink>
        </div>
      </section>
    </main>
    <FooterPantalla />
  </div>
</template>
