<!--
  W04-02 · Detalle del siniestro (Figma "Solventa-web-Final", frame 2001:2503). CA-W04-08 a CA-W04-16.

  Diferencias con el frame, acordadas con diseño (especificación del bloque 3):
  - Datos del dummy; la etiqueta de cada evidencia es su `archivo` en mayúsculas.
  - "Geoetiquetada" solo en evidencias geoetiquetadas; los documentos se ven completos (object-contain).
  - Ubicación y relato como filas del `dl`; la verificación que no cumple lleva `cancel` + "No cumple".
  - Estados por caso que el frame no dibuja: perito asignado (EN_REVISION derivado) y solo lectura (resueltos).
  - Rechazar con borde y texto de error (Boton `peligroBorde`), Derivar con borde gris, sin sombras.
  - Móvil: el aside (datos) va antes de la galería y "Aprobar" encabeza la barra de acciones.

  Rechazar abre ModalRechazo (bloque 5, CA-W04-24 a CA-W04-26); al cancelar, el foco vuelve a `botonRechazar`.
  Aprobar y rechazar navegan con `router.replace` a su confirmación (W04-03a / W04-03b), como derivar.
-->
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Badge, Boton, EstadoOperador, FooterPantalla, HeaderPantalla, MigasDePan } from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
import ModalRechazo from '../components/ModalRechazo.vue'
import { esErrorSiniestro, useSiniestros } from '../composables/useSiniestros'
import type { EstadoSiniestro, Evidencia, MotivoRechazo } from '../graphql/tipos'
import { t } from '../i18n'
import { formatearFecha, formatearMonto } from '../utils/formato'

const route = useRoute()
const router = useRouter()
const { estado, cargarSiniestro, aprobar, rechazar } = useSiniestros()

const id = computed(() => String(route.params.id))
const s = computed(() => estado.detalle)

const BADGE: Record<EstadoSiniestro, 'alerta' | 'enCurso' | 'exito' | 'error'> = {
  PENDIENTE: 'alerta',
  EN_REVISION: 'enCurso',
  APROBADO: 'exito',
  RECHAZADO: 'error',
}
const textoEstado = (e: EstadoSiniestro) =>
  e === 'PENDIENTE' ? t('siniestros.estado.pendienteDictamen') : t(`siniestros.estado.${e}`)

const niveles = computed(() => [
  { texto: t('siniestros.migas.siniestros'), to: '/operador/siniestros' },
  {
    texto: s.value
      ? t('siniestros.migas.detalle', { radicado: s.value.radicado })
      : t('siniestros.detalle.migaSinRadicado'),
  },
])

const resuelto = computed(() => s.value?.estado === 'APROBADO' || s.value?.estado === 'RECHAZADO')
const derivacion = computed(() =>
  s.value?.estado === 'EN_REVISION' && s.value.resolucion?.tipo === 'DERIVACION' ? s.value.resolucion : null,
)

// Galería: evidencias cuya imagen no cargó (estado degradado).
const fallidas = ref(new Set<string>())
function marcarFallida(e: Evidencia) {
  fallidas.value = new Set(fallidas.value).add(e.id)
}
const textoArchivos = computed(() => {
  const n = s.value?.evidencias.length ?? 0
  return n === 1 ? t('siniestros.detalle.archivoVerificado') : t('siniestros.detalle.archivosVerificados', { n })
})

// Tiempo restante para el dictamen: se recalcula cada minuto.
const ahora = ref(Date.now())
const reloj = setInterval(() => (ahora.value = Date.now()), 60_000)
onBeforeUnmount(() => clearInterval(reloj))
const restanteMs = computed(() => (s.value?.venceDictamenEn ? Date.parse(s.value.venceDictamenEn) - ahora.value : null))
const vencido = computed(() => restanteMs.value !== null && restanteMs.value <= 0)
const textoRestante = computed(() => {
  const ms = restanteMs.value
  if (ms === null) return ''
  if (ms <= 0) return t('siniestros.detalle.vencido')
  const minutos = Math.floor(ms / 60_000)
  const horas = Math.floor(minutos / 60)
  if (horas >= 24) return t('siniestros.detalle.tiempoDias', { d: Math.floor(horas / 24), h: horas % 24 })
  return t('siniestros.detalle.tiempoHoras', { h: horas, m: String(minutos % 60).padStart(2, '0') })
})

// Acciones.
const modalRechazoAbierto = ref(false)
const botonRechazar = ref<InstanceType<typeof Boton> | null>(null)
const bannerAccion = ref<HTMLElement | null>(null)

const errorRechazo = ref<string | null>(null)
/** Qué acción está en curso: "Aprobando…" solo se muestra al aprobar, no mientras el modal rechaza. */
const accion = ref<'aprobar' | 'rechazar' | null>(null)

function abrirRechazo() {
  estado.errorAccion = null
  errorRechazo.value = null
  modalRechazoAbierto.value = true
}

async function cerrarRechazo() {
  modalRechazoAbierto.value = false
  errorRechazo.value = null
  await nextTick()
  botonRechazar.value?.$el?.focus()
}

async function confirmarRechazo(datos: { motivo: MotivoRechazo; comentario: string | null }) {
  accion.value = 'rechazar'
  errorRechazo.value = null
  const resultado = await rechazar(id.value, datos.motivo, datos.comentario ?? undefined)
  accion.value = null
  if (resultado) {
    await router.replace(`/operador/siniestros/${id.value}/rechazado`)
    return
  }
  // El error se muestra dentro del modal (con los valores conservados), no en el banner de la página.
  errorRechazo.value = esErrorSiniestro(estado.resultado) ? estado.resultado.mensaje : t('siniestros.rechazo.error')
  estado.errorAccion = null
}

async function aprobarSiniestro() {
  accion.value = 'aprobar'
  const resultado = await aprobar(id.value)
  accion.value = null
  if (resultado) {
    await router.replace(`/operador/siniestros/${id.value}/aprobado`)
    return
  }
  await nextTick()
  bannerAccion.value?.focus()
}

watch(
  id,
  (nuevo) => {
    fallidas.value = new Set()
    estado.errorAccion = null
    void cargarSiniestro(nuevo)
  },
  { immediate: true },
)
</script>

<template>
  <div data-pantalla="W04-02" class="flex h-screen flex-col overflow-hidden bg-fondo">
    <HeaderPantalla :titulo="t('siniestros.detalle.titulo')" />
    <MigasDePan :niveles="niveles" a-inicio="/operador">
      <template #derecha><EstadoOperador /></template>
    </MigasDePan>

    <main class="min-h-0 flex-1 overflow-y-auto">
      <div class="mx-auto flex w-full max-w-[880px] flex-col gap-5 px-4 py-8 sm:px-10">
        <p v-if="estado.cargandoDetalle" role="status" class="text-[13px] text-tinta-suave">
          {{ t('siniestros.detalle.cargando') }}
        </p>

        <div
          v-else-if="estado.errorDetalle"
          role="alert"
          class="flex flex-wrap items-center gap-3 rounded border border-error bg-error-fondo px-4 py-3 text-[13px] text-error"
        >
          <IconoMaterial nombre="cancel" class="h-[18px] w-[18px] shrink-0" />
          <span class="flex-1">{{ estado.errorDetalle }}</span>
          <Boton variante="secundario" @click="cargarSiniestro(id)">{{ t('siniestros.bandeja.reintentar') }}</Boton>
        </div>

        <div v-else-if="estado.noEncontrado || !s" class="flex flex-col items-center gap-2 py-12 text-center">
          <IconoMaterial nombre="inbox" class="h-8 w-8 text-tinta-suave" />
          <p class="text-[13px] font-semibold text-tinta">{{ t('siniestros.detalle.noEncontrado') }}</p>
          <p class="text-[13px] text-tinta-suave">{{ t('siniestros.detalle.noEncontradoDetalle') }}</p>
          <RouterLink
            to="/operador/siniestros"
            class="mt-2 inline-flex h-11 items-center rounded border border-primario bg-white px-5 text-[13px] font-semibold text-primario hover:bg-fondo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
          >
            {{ t('siniestros.detalle.volverBandeja') }}
          </RouterLink>
        </div>

        <template v-else>
          <h1 class="sr-only">{{ t('siniestros.detalle.encabezadoSr', { radicado: s.radicado }) }}</h1>

          <div class="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
            <!-- Galería de evidencia -->
            <section aria-labelledby="titulo-galeria" class="flex min-w-0 flex-col gap-5">
              <div class="flex items-center justify-between gap-2">
                <h2 id="titulo-galeria" class="text-[18px] font-semibold leading-[22px] text-tinta">
                  {{ t('siniestros.detalle.galeria') }}
                </h2>
                <p class="text-[11px] text-tinta-suave">{{ textoArchivos }}</p>
              </div>
              <ul class="flex flex-col gap-5">
                <li v-for="e in s.evidencias" :key="e.id" data-prueba="evidencia">
                  <article class="rounded-lg border border-borde bg-white p-4">
                    <figure class="relative aspect-[16/7] overflow-hidden rounded border border-borde">
                      <div
                        v-if="fallidas.has(e.id)"
                        class="flex h-full w-full flex-col items-center justify-center gap-1 bg-fondo text-[13px] text-tinta-suave"
                      >
                        <IconoMaterial nombre="broken_image" class="h-8 w-8" />
                        {{ t('siniestros.detalle.imagenNoDisponible') }}
                      </div>
                      <a
                        v-else
                        :href="e.url"
                        target="_blank"
                        rel="noopener"
                        :aria-label="t('siniestros.detalle.abrirEvidencia', { titulo: e.titulo })"
                        class="block h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace"
                      >
                        <img
                          :src="e.url"
                          :alt="e.titulo"
                          loading="lazy"
                          class="h-full w-full"
                          :class="e.tipo === 'DOCUMENTO' ? 'bg-fondo object-contain' : 'object-cover'"
                          @error="marcarFallida(e)"
                        />
                      </a>
                      <span
                        v-if="e.geoetiquetada"
                        class="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-enlace"
                      >
                        <IconoMaterial nombre="location_on" class="h-5 w-5" />
                        {{ t('siniestros.detalle.geoetiquetada') }}
                      </span>
                      <span
                        class="absolute bottom-2 right-2 rounded-sm border border-borde bg-white px-1.5 text-[11px] uppercase text-tinta"
                        >{{ e.archivo }}</span
                      >
                    </figure>
                    <h3 class="mt-2 text-[13px] font-semibold text-tinta">{{ e.titulo }}</h3>
                    <p class="text-[11px] text-tinta-suave">
                      <template v-if="e.tipo === 'FOTO' || !e.nota">
                        {{ t('siniestros.detalle.registrada', { fecha: formatearFecha(e.registradaEn) })
                        }}<template v-if="e.nota"> · {{ e.nota }}</template>
                      </template>
                      <template v-else>{{ e.nota }}</template>
                    </p>
                  </article>
                </li>
              </ul>
            </section>

            <aside class="order-first flex min-w-0 flex-col gap-5 lg:order-none">
              <!-- Datos del cliente y la póliza -->
              <section aria-labelledby="titulo-datos" class="rounded-lg border border-borde bg-white p-4">
                <h2 id="titulo-datos" class="text-[18px] font-semibold leading-[22px] text-tinta">
                  {{ t('siniestros.detalle.datosTitulo') }}
                </h2>
                <div class="mb-4 flex flex-wrap items-center gap-2 border-b border-borde pb-4 pt-2">
                  <span class="text-[11px] text-tinta-suave">
                    {{ t('siniestros.detalle.siniestroNumero', { radicado: s.radicado }) }}
                  </span>
                  <Badge :tipo="BADGE[s.estado]">{{ textoEstado(s.estado) }}</Badge>
                </div>
                <dl data-prueba="datos">
                  <div class="py-1.5">
                    <dt class="text-[11px] text-tinta-suave">{{ t('siniestros.detalle.nombreAsegurado') }}</dt>
                    <dd class="text-[13px] text-tinta">{{ s.asegurado.nombre }}</dd>
                  </div>
                  <div class="border-t border-borde py-1.5">
                    <dt class="text-[11px] text-tinta-suave">{{ t('siniestros.detalle.documento') }}</dt>
                    <dd class="text-[13px] text-tinta">{{ s.asegurado.documento }}</dd>
                  </div>
                  <div class="border-t border-borde py-1.5">
                    <dt class="text-[11px] text-tinta-suave">{{ t('siniestros.detalle.numeroPoliza') }}</dt>
                    <dd class="text-[13px] text-tinta">{{ s.poliza.numero }}</dd>
                  </div>
                  <div class="border-t border-borde py-1.5">
                    <dt class="text-[11px] text-tinta-suave">{{ t('siniestros.detalle.cobertura') }}</dt>
                    <dd class="text-[13px] text-tinta">{{ s.coberturaAplicada }}</dd>
                  </div>
                  <div class="border-t border-borde py-1.5">
                    <dt class="text-[11px] text-tinta-suave">{{ t('siniestros.detalle.fechaSiniestro') }}</dt>
                    <dd class="text-[13px] text-tinta">{{ formatearFecha(s.ocurridoEn) }}</dd>
                  </div>
                  <div class="border-t border-borde py-1.5">
                    <dt class="text-[11px] text-tinta-suave">{{ t('siniestros.detalle.lugar') }}</dt>
                    <dd class="text-[13px] text-tinta">
                      {{ s.ubicacion.descripcion }}, {{ s.ubicacion.ciudad }}
                      <span class="block text-[11px] text-tinta-suave">
                        {{
                          t('siniestros.detalle.coordenadas', { lat: s.ubicacion.latitud, lon: s.ubicacion.longitud })
                        }}
                      </span>
                    </dd>
                  </div>
                  <div class="border-t border-borde py-1.5">
                    <dt class="text-[11px] text-tinta-suave">{{ t('siniestros.detalle.entidad') }}</dt>
                    <dd class="text-[13px] text-tinta">{{ s.entidadAcreedora }}</dd>
                  </div>
                  <div class="mt-2 rounded bg-fondo px-6 py-2">
                    <dt class="text-[11px] text-tinta-suave">{{ t('siniestros.detalle.sumaReclamada') }}</dt>
                    <dd data-prueba="suma" class="text-[18px] font-semibold text-primario">
                      {{ formatearMonto(s.sumaReclamada) }}
                    </dd>
                  </div>
                  <div class="py-1.5">
                    <dt class="text-[11px] text-tinta-suave">{{ t('siniestros.detalle.relato') }}</dt>
                    <dd class="text-[13px] leading-5 text-tinta">{{ s.descripcion }}</dd>
                  </div>
                </dl>
              </section>

              <!-- Conformidad regulatoria SFC -->
              <section aria-labelledby="titulo-sfc" class="rounded-lg border border-borde bg-white p-4">
                <div class="flex gap-2">
                  <IconoMaterial nombre="verified_user" class="h-6 w-6 shrink-0 text-exito" />
                  <div>
                    <h2 id="titulo-sfc" class="text-[18px] font-semibold leading-[22px] text-tinta">
                      {{ t('siniestros.detalle.sfcTitulo') }}
                    </h2>
                    <p class="text-[11px] text-tinta-suave">{{ t('siniestros.detalle.sfcSubtitulo') }}</p>
                  </div>
                </div>
                <ul
                  v-if="s.verificaciones.length"
                  data-prueba="verificaciones"
                  class="mt-2 flex flex-col gap-1 border-t border-borde pt-2"
                >
                  <li
                    v-for="(v, i) in s.verificaciones"
                    :key="i"
                    class="flex items-start gap-1 text-[11px] leading-6 text-tinta"
                  >
                    <IconoMaterial
                      :nombre="v.cumple ? 'check_circle' : 'cancel'"
                      class="h-6 w-6 shrink-0"
                      :class="v.cumple ? 'text-exito' : 'text-error'"
                    />
                    <span>
                      <span class="sr-only">{{
                        v.cumple ? t('siniestros.detalle.cumple') : t('siniestros.detalle.noCumple')
                      }}</span>
                      {{ v.descripcion
                      }}<span v-if="!v.cumple" class="font-semibold text-error">{{
                        t('siniestros.detalle.noCumpleSufijo')
                      }}</span>
                    </span>
                  </li>
                </ul>
              </section>

              <!-- Tiempo restante para dictamen -->
              <div
                v-if="!resuelto && s.venceDictamenEn"
                data-prueba="tiempo-restante"
                class="flex items-center justify-between gap-2 rounded-lg border p-4"
                :class="vencido ? 'border-error bg-error-fondo' : 'border-borde bg-fondo'"
              >
                <span class="flex items-center gap-2 text-[11px] text-tinta-suave">
                  <IconoMaterial nombre="timer" class="h-6 w-6 shrink-0 text-enlace" />
                  {{ t('siniestros.detalle.tiempoRestante') }}
                </span>
                <span class="flex items-center gap-1">
                  <IconoMaterial v-if="vencido" nombre="warning" class="h-5 w-5 text-error" />
                  <time
                    :datetime="s.venceDictamenEn"
                    :title="formatearFecha(s.venceDictamenEn)"
                    class="text-[13px] font-semibold"
                    :class="vencido ? 'text-error' : 'text-tinta'"
                    >{{ textoRestante }}</time
                  >
                </span>
              </div>
            </aside>
          </div>

          <div class="border-t border-borde" />

          <!-- Resolución (solo lectura) -->
          <section
            v-if="resuelto && s.resolucion"
            aria-labelledby="titulo-resolucion"
            data-prueba="resolucion"
            class="rounded-lg border border-borde bg-white p-4"
          >
            <h2 id="titulo-resolucion" class="text-[18px] font-semibold leading-[22px] text-tinta">
              {{ t('siniestros.detalle.resolucionTitulo') }}
            </h2>
            <div class="mt-2 flex flex-wrap items-center gap-2">
              <Badge :tipo="BADGE[s.estado]">{{ textoEstado(s.estado) }}</Badge>
              <span class="text-[11px] text-tinta-suave">
                {{ t('siniestros.detalle.resueltoEl', { fecha: formatearFecha(s.resolucion.resueltaEn) }) }}
              </span>
            </div>
            <dl class="mt-2">
              <template v-if="s.resolucion.tipo === 'APROBACION'">
                <div v-if="s.resolucion.indemnizacion" class="py-1.5">
                  <dt class="text-[11px] text-tinta-suave">{{ t('siniestros.detalle.indemnizacion') }}</dt>
                  <dd class="text-[13px] font-semibold text-primario">
                    {{ formatearMonto(s.resolucion.indemnizacion) }}
                  </dd>
                </div>
                <div v-if="s.resolucion.metodoTransferencia" class="border-t border-borde py-1.5">
                  <dt class="text-[11px] text-tinta-suave">{{ t('siniestros.detalle.metodoTransferencia') }}</dt>
                  <dd class="text-[13px] text-tinta">{{ s.resolucion.metodoTransferencia }}</dd>
                </div>
                <div v-if="s.resolucion.plazoDispersion" class="border-t border-borde py-1.5">
                  <dt class="text-[11px] text-tinta-suave">{{ t('siniestros.detalle.plazoDispersion') }}</dt>
                  <dd class="text-[13px] text-tinta">{{ s.resolucion.plazoDispersion }}</dd>
                </div>
              </template>
              <template v-else>
                <div v-if="s.resolucion.motivo" class="py-1.5">
                  <dt class="text-[11px] text-tinta-suave">{{ t('siniestros.detalle.motivo') }}</dt>
                  <dd class="text-[13px] text-tinta">{{ t(`siniestros.motivo.${s.resolucion.motivo}`) }}</dd>
                </div>
                <div v-if="s.resolucion.comentario" class="border-t border-borde py-1.5">
                  <dt class="text-[11px] text-tinta-suave">{{ t('siniestros.detalle.comentario') }}</dt>
                  <dd class="text-[13px] text-tinta">{{ s.resolucion.comentario }}</dd>
                </div>
                <div v-if="s.resolucion.viaRecurso" class="border-t border-borde py-1.5">
                  <dt class="text-[11px] text-tinta-suave">{{ t('siniestros.detalle.viaRecurso') }}</dt>
                  <dd class="text-[13px] text-tinta">{{ s.resolucion.viaRecurso }}</dd>
                </div>
              </template>
              <div class="border-t border-borde py-1.5">
                <dt class="text-[11px] text-tinta-suave">{{ t('siniestros.detalle.notificacion') }}</dt>
                <dd class="text-[13px] text-tinta">{{ s.resolucion.notificacion }}</dd>
              </div>
            </dl>
            <RouterLink
              to="/operador/siniestros"
              class="mt-4 inline-flex h-11 items-center rounded border border-primario bg-white px-5 text-[13px] font-semibold text-primario hover:bg-fondo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
            >
              {{ t('siniestros.detalle.volverBandeja') }}
            </RouterLink>
          </section>

          <!-- Acciones del operador -->
          <section
            v-else
            aria-labelledby="titulo-acciones"
            :aria-busy="estado.enviando ? 'true' : undefined"
            data-prueba="acciones"
          >
            <h2 id="titulo-acciones" class="sr-only">{{ t('siniestros.detalle.accionesSr') }}</h2>
            <div class="rounded-lg border border-borde bg-white p-4">
              <p class="flex items-center gap-1 text-[11px] text-tinta-suave">
                <IconoMaterial nombre="info" class="h-6 w-6 shrink-0" />
                {{ t('siniestros.detalle.notaNotificacion') }}
              </p>

              <div
                v-if="derivacion?.perito"
                id="perito-asignado"
                data-prueba="perito"
                class="mt-4 flex gap-2 rounded bg-info-fondo px-4 py-3 text-[13px] text-tinta"
              >
                <IconoMaterial nombre="engineering" class="h-6 w-6 shrink-0 text-enlace" />
                <div>
                  <p class="font-semibold">{{ t('siniestros.detalle.peritoAsignado') }}</p>
                  <p>
                    {{
                      t('siniestros.detalle.peritoDatos', {
                        nombre: derivacion.perito.nombre,
                        ciudad: derivacion.perito.ciudad,
                        red: derivacion.perito.red,
                      })
                    }}
                  </p>
                  <p v-if="derivacion.vencimientoInforme" class="text-[11px] text-tinta-suave">
                    {{
                      t('siniestros.detalle.informeEsperado', { fecha: formatearFecha(derivacion.vencimientoInforme) })
                    }}
                  </p>
                </div>
              </div>

              <div
                v-if="estado.errorAccion"
                ref="bannerAccion"
                role="alert"
                tabindex="-1"
                class="mt-4 flex items-center gap-2 rounded border border-error bg-error-fondo px-4 py-3 text-[13px] text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace"
              >
                <IconoMaterial nombre="cancel" class="h-[18px] w-[18px] shrink-0" />
                {{ estado.errorAccion }}
              </div>

              <div class="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <button
                  v-if="derivacion?.perito"
                  type="button"
                  disabled
                  aria-disabled="true"
                  aria-describedby="perito-asignado"
                  data-prueba="derivar"
                  class="inline-flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded border border-borde bg-white px-5 text-[13px] font-semibold text-tinta opacity-60 sm:w-auto"
                >
                  <IconoMaterial nombre="engineering" class="h-6 w-6" />
                  {{ t('siniestros.detalle.derivar') }}
                </button>
                <button
                  v-else-if="estado.enviando"
                  type="button"
                  disabled
                  data-prueba="derivar"
                  class="inline-flex h-11 w-full cursor-not-allowed items-center justify-center gap-2 rounded border border-borde bg-white px-5 text-[13px] font-semibold text-tinta opacity-60 sm:w-auto"
                >
                  <IconoMaterial nombre="engineering" class="h-6 w-6" />
                  {{ t('siniestros.detalle.derivar') }}
                </button>
                <RouterLink
                  v-else
                  :to="`/operador/siniestros/${s.id}/derivar`"
                  data-prueba="derivar"
                  class="inline-flex h-11 w-full items-center justify-center gap-2 rounded border border-borde bg-white px-5 text-[13px] font-semibold text-tinta hover:bg-fondo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2 sm:w-auto"
                >
                  <IconoMaterial nombre="engineering" class="h-6 w-6" />
                  {{ t('siniestros.detalle.derivar') }}
                </RouterLink>

                <Boton
                  ref="botonRechazar"
                  variante="peligroBorde"
                  aria-haspopup="dialog"
                  data-prueba="rechazar"
                  class="w-full text-[13px] sm:w-auto"
                  :disabled="estado.enviando"
                  @click="abrirRechazo"
                >
                  <template #icono><IconoMaterial nombre="close" class="h-6 w-6" /></template>
                  {{ t('siniestros.detalle.rechazar') }}
                </Boton>

                <Boton
                  variante="primario"
                  data-prueba="aprobar"
                  class="order-first w-full text-[13px] sm:order-none sm:w-auto"
                  :disabled="estado.enviando"
                  @click="aprobarSiniestro"
                >
                  <template #icono>
                    <IconoMaterial
                      :nombre="accion === 'aprobar' ? 'progress_activity' : 'check'"
                      class="h-6 w-6"
                      :class="{ 'animate-spin': accion === 'aprobar' }"
                    />
                  </template>
                  {{ accion === 'aprobar' ? t('siniestros.detalle.aprobando') : t('siniestros.detalle.aprobar') }}
                </Boton>
              </div>
            </div>
          </section>
        </template>
      </div>
    </main>

    <FooterPantalla />

    <ModalRechazo
      v-if="s"
      :abierto="modalRechazoAbierto"
      :radicado="s.radicado"
      :enviando="estado.enviando"
      :error="errorRechazo"
      @cancelar="cerrarRechazo"
      @confirmar="confirmarRechazo"
    />
  </div>
</template>
