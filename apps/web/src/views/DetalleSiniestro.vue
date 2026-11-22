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

  Evidencias (ajuste 10 del plan de W04): sus URLs firmadas vencen a los 5 min. Una imagen que falla renueva las URLs
  una vez (consulta silenciosa) y el enlace renueva antes de abrir si pasaron 4 min; solo si vuelve a fallar se ve
  «Imagen no disponible».
-->
<script setup lang="ts">
import TarjetaEsqueleto from '../components/ui/TarjetaEsqueleto.vue'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Badge, Boton, CampoMonto, EstadoOperador, FooterPantalla, HeaderPantalla, MigasDePan } from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
import ModalRechazo from '../components/ModalRechazo.vue'
import { esErrorSiniestro, useSiniestros } from '../composables/useSiniestros'
import type { ActorSiniestro, EstadoSiniestro, Evidencia, MotivoRechazo } from '../graphql/tipos'
import { t } from '../i18n'
import { moneda, montoVisible } from '../composables/useMoneda'
import { formatearFecha, formatearNumero } from '../utils/formato'
import { textoRestante } from '../utils/plazo'

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

// v0.67: quién tomó la decisión. El sistema aprueba solo al vencer el plazo; sin nombre (AUTH no respondió), «un operador».
function nombreActor(actor: ActorSiniestro): string {
  if (actor.sistema) return t('siniestros.detalle.actorSistema')
  return actor.nombre ?? t('siniestros.detalle.actorSinNombre')
}

// Galería: evidencias cuya imagen no cargó (estado degradado).
const fallidas = ref(new Set<string>())

// Las URLs firmadas de las evidencias vencen a los 5 min (KAN-250). Si una imagen falla, se pide el caso de nuevo en
// silencio (trae URLs nuevas) sin tocar la acción en curso, el banner ni el foco. Una sola vez por evidencia: si la URL
// nueva también falla, o no cambió, queda «Imagen no disponible». Al cargar bien, la evidencia puede renovarse otra vez.
const VIGENCIA_URL_MS = 4 * 60_000
const renovadas = ref(new Set<string>())
let cargadoEn = Date.now()
watch(s, () => (cargadoEn = Date.now()))
let renovando: Promise<void> | null = null
function renovarUrls(): Promise<void> {
  // Varias imágenes fallan a la vez al vencer: una sola consulta para todas.
  renovando ??= cargarSiniestro(id.value, { silencioso: true }).finally(() => (renovando = null))
  return renovando
}
const urlDe = (evidenciaId: string) => s.value?.evidencias.find((x) => x.id === evidenciaId)?.url
function marcarNoDisponible(evidenciaId: string) {
  fallidas.value = new Set(fallidas.value).add(evidenciaId)
}

async function marcarFallida(e: Evidencia) {
  if (renovadas.value.has(e.id)) {
    marcarNoDisponible(e.id)
    return
  }
  renovadas.value = new Set(renovadas.value).add(e.id)
  const anterior = e.url
  await renovarUrls()
  // Sin URL nueva (la consulta falló o el backend devolvió la misma) la imagen no va a volver a intentar.
  const nueva = urlDe(e.id)
  if (!nueva || nueva === anterior) marcarNoDisponible(e.id)
}

function imagenCargada(e: Evidencia) {
  if (!renovadas.value.has(e.id)) return
  const siguiente = new Set(renovadas.value)
  siguiente.delete(e.id)
  renovadas.value = siguiente
}

/** El enlace nunca abre una URL vencida: pasados 4 min desde la carga, renueva antes de abrir. */
async function abrirEvidencia(evento: MouseEvent, e: Evidencia) {
  if (Date.now() - cargadoEn < VIGENCIA_URL_MS) return // la URL sigue vigente: el enlace hace lo suyo
  evento.preventDefault()
  // La pestaña se abre ya, dentro del clic, para que el navegador no la bloquee; la URL llega después.
  const pestana = window.open('', '_blank')
  if (pestana) pestana.opener = null
  await renovarUrls()
  const nueva = urlDe(e.id)
  if (nueva && Date.now() - cargadoEn < VIGENCIA_URL_MS) {
    if (pestana) pestana.location.href = nueva
    else window.open(nueva, '_blank', 'noopener')
    return
  }
  pestana?.close()
  marcarNoDisponible(e.id)
}
const textoArchivos = computed(() => {
  const n = s.value?.evidencias.length ?? 0
  return n === 1 ? t('siniestros.detalle.archivoVerificado') : t('siniestros.detalle.archivosVerificados', { n })
})

// Tiempo restante: se recalcula cada 30 s. Mientras el caso está derivado, el dictamen queda en pausa y cuenta el
// informe del perito (D-3b): el sistema solo aprueba solos los casos PENDIENTE.
const ahora = ref(Date.now())
const reloj = setInterval(() => (ahora.value = Date.now()), 30_000)
onBeforeUnmount(() => clearInterval(reloj))
const plazo = computed(() => derivacion.value?.vencimientoInforme ?? s.value?.venceDictamenEn ?? null)
const restanteMs = computed(() => (plazo.value ? Date.parse(plazo.value) - ahora.value : null))
const vencido = computed(() => restanteMs.value !== null && restanteMs.value <= 0)
const restante = computed(() => (restanteMs.value === null ? '' : textoRestante(restanteMs.value)))
// Q-03: el tic de 30 s llegaría tarde al cero; un disparo justo al vencer cambia el contador a tiempo.
let alVencer: ReturnType<typeof setTimeout> | undefined
watch(
  plazo,
  (fecha) => {
    clearTimeout(alVencer)
    const falta = fecha ? Date.parse(fecha) - Date.now() : 0
    if (falta > 0 && falta < 2 ** 31 - 1) alVencer = setTimeout(() => (ahora.value = Date.now()), falta + 500)
  },
  { immediate: true },
)
onBeforeUnmount(() => clearTimeout(alVencer))

// Acciones.
const modalRechazoAbierto = ref(false)
const botonRechazar = ref<InstanceType<typeof Boton> | null>(null)
const bannerAccion = ref<HTMLElement | null>(null)

const errorRechazo = ref<string | null>(null)
/** Qué acción está en curso: "Aprobando…" solo se muestra al aprobar, no mientras el modal rechaza. */
const accion = ref<'aprobar' | 'rechazar' | null>(null)

// KAN-290: en auto parcial o RC el operador digita el valor del daño (ver abajo); CLAIMS no lo inventa.
const TIPOS_CON_VALOR = ['CHOQUE_PARCIAL', 'HURTO_PARCIAL', 'RESPONSABILIDAD_CIVIL']
const necesitaValorDano = computed(() => TIPOS_CON_VALOR.includes(s.value?.tipoSiniestroAuto ?? ''))

// Q-03 (D-3): vencido y PENDIENTE, CLAIMS lo aprueba en su siguiente pasada (cada minuto). Mientras tanto se pide el
// caso en cada tic, sin vaciar la pantalla, hasta verlo resuelto. Un caso derivado no se aprueba solo (D-3b).
// KAN-27: un caso que necesita el valor del daño tampoco se aprueba solo (CLAIMS lo salta en cada pasada): no se
// promete la aprobación ni se consulta en bucle; se le pide al operador que digite el valor y lo apruebe.
const vencidoPendiente = computed(
  () => vencido.value && s.value?.estado === 'PENDIENTE' && !derivacion.value && accion.value === null,
)
const esperandoAutomatica = computed(() => vencidoPendiente.value && !necesitaValorDano.value)
const vencidoRequiereValor = computed(() => vencidoPendiente.value && necesitaValorDano.value)
watch(ahora, () => {
  if (esperandoAutomatica.value) void cargarSiniestro(id.value, { silencioso: true })
})

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

// KAN-290: en un siniestro de auto parcial o de responsabilidad civil el operador digita el valor del daño; CLAIMS
// lo acota a la cobertura y le resta el deducible. En pérdida total no se pide: es el valor asegurado.
// El valor se captura siempre en la moneda de la póliza (la del dato, contrato v0.42): CLAIMS lo acota a la cobertura y le
// resta el deducible en esa moneda, y lo capturado sigue en su moneda original (docs/convenciones.md). El selector del
// header queda libre: convierte lo que se consulta (la suma reclamada) y el campo avisa en qué moneda se digita.
const monedaPoliza = computed(() => s.value?.sumaReclamada.moneda)
const notaMoneda = computed(() =>
  monedaPoliza.value && monedaPoliza.value !== moneda.value
    ? t('siniestros.detalle.valorDanoEnMonedaPoliza', { moneda: monedaPoliza.value })
    : null,
)
const ayudaValorDano = computed(() =>
  [t('siniestros.detalle.valorDanoAyuda'), notaMoneda.value].filter(Boolean).join(' '),
)
const ejemploValorDano = computed(() =>
  t('siniestros.detalle.valorDanoEjemplo', { ejemplo: formatearNumero(8_000_000) }),
)

const valorDano = ref('')
const errorValorDano = ref<string | null>(null)
watch(valorDano, () => (errorValorDano.value = null))

async function aprobarSiniestro() {
  errorValorDano.value = null
  // `valorDano` ya es solo dígitos (CampoMonto); el cero no es un daño.
  if (necesitaValorDano.value && !/^[1-9]\d{0,12}$/.test(valorDano.value)) {
    errorValorDano.value = t('siniestros.detalle.valorDanoError')
    return
  }
  accion.value = 'aprobar'
  const resultado = await aprobar(id.value, necesitaValorDano.value ? valorDano.value : null)
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
    renovadas.value = new Set()
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
        <TarjetaEsqueleto
          v-if="estado.cargandoDetalle"
          :etiqueta="t('siniestros.detalle.cargando')"
          :tarjetas="3"
          :lineas="3"
        />

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
                        @click="abrirEvidencia($event, e)"
                      >
                        <img
                          :src="e.url"
                          :alt="e.titulo"
                          loading="lazy"
                          class="h-full w-full"
                          :class="e.tipo === 'DOCUMENTO' ? 'bg-fondo object-contain' : 'object-cover'"
                          @error="marcarFallida(e)"
                          @load="imagenCargada(e)"
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
                      {{ montoVisible(s.sumaReclamada) }}
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
                v-if="!resuelto && plazo"
                data-prueba="tiempo-restante"
                class="flex items-center justify-between gap-2 rounded-lg border p-4"
                :class="vencido ? 'border-error bg-error-fondo' : 'border-borde bg-fondo'"
              >
                <span class="flex items-center gap-2 text-[11px] text-tinta-suave">
                  <IconoMaterial nombre="timer" class="h-6 w-6 shrink-0 text-enlace" />
                  {{
                    t(
                      derivacion?.vencimientoInforme
                        ? 'siniestros.detalle.tiempoInforme'
                        : 'siniestros.detalle.tiempoRestante',
                    )
                  }}
                </span>
                <span class="flex items-center gap-1">
                  <IconoMaterial v-if="vencido" nombre="warning" class="h-5 w-5 text-error" />
                  <time
                    :datetime="plazo"
                    :title="formatearFecha(plazo)"
                    class="text-[13px] font-semibold"
                    :class="vencido ? 'text-error' : 'text-tinta'"
                    >{{ restante }}</time
                  >
                </span>
              </div>
              <p
                v-if="esperandoAutomatica"
                data-prueba="aprobando-automatica"
                role="status"
                class="text-[11px] text-tinta-suave"
              >
                {{ t('siniestros.detalle.aprobandoAutomatica') }}
              </p>
              <p
                v-if="vencidoRequiereValor"
                data-prueba="vencido-requiere-valor"
                role="status"
                class="text-[11px] font-semibold text-error"
              >
                {{ t('siniestros.detalle.vencidoRequiereValor') }}
              </p>
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
              <span
                v-if="s.resolucion.automatica"
                data-prueba="automatica"
                class="text-[11px] font-semibold text-alerta"
              >
                {{ t('siniestros.detalle.aprobadaAutomatica') }}
              </span>
            </div>
            <p v-if="s.resolucion.resueltaPor" data-prueba="resuelta-por" class="mt-1 text-[13px] text-tinta">
              {{
                t(
                  s.resolucion.tipo === 'APROBACION'
                    ? 'siniestros.detalle.aprobadoPor'
                    : 'siniestros.detalle.rechazadoPor',
                  { nombre: nombreActor(s.resolucion.resueltaPor) },
                )
              }}
            </p>
            <p
              v-if="s.resolucion.derivadaPor && s.resolucion.derivadaEn"
              data-prueba="derivada-por"
              class="text-[11px] text-tinta-suave"
            >
              {{
                t('siniestros.detalle.derivadoPor', {
                  nombre: nombreActor(s.resolucion.derivadaPor),
                  fecha: formatearFecha(s.resolucion.derivadaEn),
                })
              }}
            </p>
            <dl class="mt-2">
              <template v-if="s.resolucion.tipo === 'APROBACION'">
                <div v-if="s.resolucion.indemnizacion" class="py-1.5">
                  <dt class="text-[11px] text-tinta-suave">{{ t('siniestros.detalle.indemnizacion') }}</dt>
                  <dd class="text-[13px] font-semibold text-primario">
                    {{ montoVisible(s.resolucion.indemnizacion) }}
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
                  <p
                    v-if="derivacion.derivadaPor && derivacion.derivadaEn"
                    data-prueba="derivada-por"
                    class="text-[11px] text-tinta-suave"
                  >
                    {{
                      t('siniestros.detalle.derivadoPor', {
                        nombre: nombreActor(derivacion.derivadaPor),
                        fecha: formatearFecha(derivacion.derivadaEn),
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

              <!-- KAN-290: el valor del daño va en su propio bloque, no entre las acciones. -->
              <CampoMonto
                v-if="necesitaValorDano"
                v-model="valorDano"
                class="mt-4 sm:max-w-[360px]"
                :label="t('siniestros.detalle.valorDano', { moneda: monedaPoliza ?? '' })"
                :placeholder="ejemploValorDano"
                :hint="errorValorDano ? undefined : ayudaValorDano"
                :error="errorValorDano ?? undefined"
                required
                data-prueba="valor-dano"
              />

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
