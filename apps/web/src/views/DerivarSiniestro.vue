<!--
  W04-02b · Derivar a perito (Figma "Solventa-web-Final", frame 2001:2721). CA-W04-17 a CA-W04-22.

  Diferencias con el frame, acordadas con diseño (especificación de los bloques 4 y 5, sección I):
  - Migas de 3 niveles; insignia según el estado (PENDIENTE "Pendiente de valoración", EN_REVISION "En revisión").
  - Perito sin preselección y Confirmar deshabilitado hasta elegirlo; el hint muestra el registro del perito.
  - Se omite el botón ⓘ de SLA (sin contenido en Figma).
  - Estados que el frame no dibuja: ya derivado o ya resuelto (sin formulario), peritos cargando/vacíos/con error.
-->
<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Badge,
  Boton,
  CampoAreaTexto,
  CampoSeleccion,
  EstadoOperador,
  FooterPantalla,
  HeaderPantalla,
  MigasDePan,
} from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
import { esErrorSiniestro, useSiniestros } from '../composables/useSiniestros'
import { t } from '../i18n'
import { formatearFecha } from '../utils/formato'

const route = useRoute()
const router = useRouter()
const { estado, cargarSiniestro, cargarPeritos, derivar } = useSiniestros()

const id = computed(() => String(route.params.id))
const s = computed(() => (estado.detalle?.id === id.value ? estado.detalle : null))

const migas = computed(() => [
  { texto: t('siniestros.migas.siniestros'), to: '/operador/siniestros' },
  { texto: t('siniestros.migas.derivar') },
])

// Motivo por el que ya no admite derivación (sin formulario).
const noAdmite = computed(() => {
  const x = s.value
  if (!x) return null
  if (x.estado === 'APROBADO') return t('siniestros.derivar.yaAprobado')
  if (x.estado === 'RECHAZADO') return t('siniestros.derivar.yaRechazado')
  if (x.resolucion?.tipo === 'DERIVACION')
    return t('siniestros.derivar.yaDerivado', { nombre: x.resolucion.perito?.nombre ?? '' })
  return null
})

// Formulario.
const peritoId = ref('')
const instrucciones = ref('')
const perito = computed(() => estado.peritos.find((p) => p.id === peritoId.value) ?? null)
const opciones = computed(() =>
  estado.peritos.map((p) => ({ valor: p.id, texto: `${p.nombre} — ${p.ciudad} (${p.red})` })),
)
const sinPeritos = computed(() => !estado.cargandoPeritos && !estado.errorPeritos && estado.peritos.length === 0)
const selectorDeshabilitado = computed(
  () => estado.enviando || estado.cargandoPeritos || !!estado.errorPeritos || sinPeritos.value,
)
const hintPerito = computed(() => {
  if (sinPeritos.value) return t('siniestros.derivar.sinPeritos')
  if (perito.value) return t('siniestros.derivar.registroHint', { registro: perito.value.registro })
  return t('siniestros.campo.peritoHint')
})
const puedeConfirmar = computed(() => !!perito.value && !estado.enviando && !estado.cargandoPeritos)

// Error de la derivación: el mensaje de negocio (ErrorSiniestro) o uno genérico seguro.
const errorDerivar = computed(() => {
  if (!estado.errorAccion) return null
  return esErrorSiniestro(estado.resultado) ? estado.resultado.mensaje : t('siniestros.derivar.error')
})

const h1 = ref<HTMLElement | null>(null)
const banner = ref<HTMLElement | null>(null)

async function confirmar() {
  if (!perito.value || estado.enviando) return
  const ok = await derivar(id.value, perito.value.id, instrucciones.value.trim() || undefined)
  if (ok) {
    await router.replace(`/operador/siniestros/${id.value}/derivado`)
    return
  }
  await nextTick()
  banner.value?.focus()
}

watch(
  id,
  (nuevo) => {
    estado.errorAccion = null
    peritoId.value = ''
    instrucciones.value = ''
    if (estado.detalle?.id !== nuevo) void cargarSiniestro(nuevo)
    void cargarPeritos(nuevo)
  },
  { immediate: true },
)

// Foco al h1 cuando el siniestro está listo.
watch(
  () => s.value?.id,
  async (listo) => {
    if (!listo) return
    await nextTick()
    h1.value?.focus()
  },
  { immediate: true, flush: 'post' },
)

const claseBotonBlanco =
  'inline-flex h-11 items-center justify-center gap-2 rounded border border-borde bg-white px-5 text-[13px] font-semibold text-tinta hover:bg-fondo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2'
</script>

<template>
  <div data-pantalla="W04-02b" class="flex min-h-screen flex-col bg-fondo">
    <HeaderPantalla :titulo="t('siniestros.derivar.tituloHeader')" />
    <MigasDePan :niveles="migas" a-inicio="/operador">
      <template #derecha><EstadoOperador /></template>
    </MigasDePan>

    <main class="mx-auto flex w-full max-w-[880px] flex-1 flex-col gap-5 px-10 py-8">
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

      <div v-else-if="!s" class="flex flex-col items-center gap-2 py-12 text-center">
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

      <section v-else class="flex flex-col gap-5 rounded-lg border border-borde bg-white p-4">
        <div class="border-b border-borde pb-4">
          <div class="flex flex-wrap items-start justify-between gap-2">
            <h1
              ref="h1"
              tabindex="-1"
              class="text-[22px] font-bold leading-7 tracking-[-0.55px] text-tinta focus:outline-none"
            >
              {{ t('siniestros.derivar.titulo', { radicado: s.radicado }) }}
            </h1>
            <Badge v-if="s.estado === 'PENDIENTE'" tipo="alerta">{{
              t('siniestros.estado.pendienteValoracion')
            }}</Badge>
            <Badge v-else-if="s.estado === 'EN_REVISION'" tipo="enCurso">{{
              t('siniestros.estado.EN_REVISION')
            }}</Badge>
          </div>
          <p class="mt-1 text-[13px] leading-[18px] text-tinta-suave">{{ t('siniestros.derivar.descripcion') }}</p>
        </div>

        <dl
          data-prueba="metadatos"
          class="grid grid-cols-1 gap-5 rounded border border-borde bg-fondo p-4 sm:grid-cols-3"
        >
          <div>
            <dt class="text-[11px] leading-[14px] text-tinta-suave">{{ t('siniestros.derivar.aseguradoTitular') }}</dt>
            <dd class="text-[13px] font-semibold text-tinta">{{ s.asegurado.nombre }}</dd>
            <dd class="text-[11px] text-tinta-suave">{{ s.asegurado.documento }}</dd>
          </div>
          <div>
            <dt class="text-[11px] leading-[14px] text-tinta-suave">{{ t('siniestros.derivar.polizaRamo') }}</dt>
            <dd class="text-[13px] font-semibold text-tinta">{{ s.poliza.numero }}</dd>
            <dd class="text-[11px] text-tinta-suave">{{ s.poliza.ramo }}</dd>
          </div>
          <div>
            <dt class="text-[11px] leading-[14px] text-tinta-suave">{{ t('siniestros.derivar.fechaNotificacion') }}</dt>
            <dd class="text-[13px] font-semibold text-tinta">{{ formatearFecha(s.notificadoEn) }}</dd>
            <dd class="text-[11px] text-tinta-suave">{{ t('siniestros.derivar.horaColombia') }}</dd>
          </div>
        </dl>

        <!-- Ya derivado o ya resuelto: sin formulario -->
        <div
          v-if="noAdmite"
          data-prueba="no-admite"
          class="flex flex-col items-start gap-3 rounded-lg border border-borde bg-info-fondo p-4"
        >
          <div class="flex gap-2 text-[13px] text-tinta">
            <IconoMaterial nombre="info" class="h-6 w-6 shrink-0 text-enlace" />
            <div>
              <p class="font-semibold">{{ t('siniestros.derivar.noAdmite') }}</p>
              <p>{{ noAdmite }}</p>
            </div>
          </div>
          <RouterLink :to="`/operador/siniestros/${s.id}`" :class="claseBotonBlanco">
            {{ t('siniestros.derivar.verDetalle') }}
          </RouterLink>
        </div>

        <form
          v-else
          novalidate
          class="flex flex-col gap-5"
          :aria-busy="estado.enviando ? 'true' : undefined"
          @submit.prevent="confirmar"
        >
          <div class="flex flex-col gap-2">
            <CampoSeleccion
              v-model="peritoId"
              data-prueba="perito"
              :label="t('siniestros.campo.perito')"
              required
              icono="engineering"
              :placeholder="
                estado.cargandoPeritos
                  ? t('siniestros.derivar.cargandoPeritos')
                  : t('siniestros.campo.peritoPlaceholder')
              "
              :opciones="opciones"
              :hint="hintPerito"
              :disabled="selectorDeshabilitado"
            />
            <div
              v-if="estado.errorPeritos"
              role="alert"
              data-prueba="error-peritos"
              class="flex flex-wrap items-center gap-3 rounded border border-error bg-error-fondo px-4 py-3 text-[13px] text-error"
            >
              <IconoMaterial nombre="cancel" class="h-[18px] w-[18px] shrink-0" />
              <span class="flex-1">{{ t('siniestros.derivar.errorPeritos') }}</span>
              <Boton variante="secundario" @click="cargarPeritos(id)">{{ t('siniestros.bandeja.reintentar') }}</Boton>
            </div>
          </div>

          <CampoAreaTexto
            v-model="instrucciones"
            data-prueba="instrucciones"
            :label="t('siniestros.campo.instrucciones')"
            :placeholder="t('siniestros.campo.instruccionesPlaceholder')"
            :maxlength="500"
            :filas="3"
            :disabled="estado.enviando"
          />

          <div
            data-prueba="tiempo"
            class="flex flex-wrap items-center gap-2 rounded border border-borde bg-fondo p-4"
            aria-live="polite"
          >
            <IconoMaterial nombre="schedule" class="h-6 w-6 shrink-0 text-enlace" />
            <template v-if="perito">
              <p class="text-[13px] font-semibold text-tinta">
                {{ t('siniestros.derivar.tiempoRespuesta', { n: perito.tiempoRespuestaDias }) }}
              </p>
              <template v-if="perito.vencimientoInforme">
                <span aria-hidden="true" class="text-borde">|</span>
                <p class="text-[11px] text-tinta-suave">
                  {{ t('siniestros.derivar.vencimientoInforme', { fecha: formatearFecha(perito.vencimientoInforme) }) }}
                </p>
              </template>
            </template>
            <p v-else class="text-[13px] text-tinta-suave">{{ t('siniestros.derivar.sinPerito') }}</p>
          </div>

          <div
            v-if="errorDerivar"
            ref="banner"
            role="alert"
            tabindex="-1"
            data-prueba="error-derivar"
            class="flex items-center gap-2 rounded border border-error bg-error-fondo px-4 py-3 text-[13px] text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace"
          >
            <IconoMaterial nombre="cancel" class="h-[18px] w-[18px] shrink-0" />
            {{ errorDerivar }}
          </div>

          <div class="flex flex-col-reverse gap-2 border-t border-borde pt-4 sm:flex-row sm:flex-wrap sm:justify-end">
            <p v-if="!perito" id="aviso-elegir-perito" class="self-center text-[11px] text-tinta-suave sm:mr-auto">
              {{ t('siniestros.derivar.elegirPerito') }}
            </p>
            <RouterLink
              :to="`/operador/siniestros/${s.id}`"
              data-prueba="cancelar"
              :class="[claseBotonBlanco, { 'pointer-events-none opacity-60': estado.enviando }]"
              :aria-disabled="estado.enviando ? 'true' : undefined"
              :tabindex="estado.enviando ? -1 : undefined"
            >
              {{ t('siniestros.derivar.cancelar') }}
            </RouterLink>
            <Boton
              variante="primario"
              type="submit"
              data-prueba="confirmar"
              class="w-full text-[13px] sm:w-auto"
              :disabled="!puedeConfirmar"
              :aria-describedby="!perito ? 'aviso-elegir-perito' : undefined"
            >
              <template #icono>
                <IconoMaterial
                  :nombre="estado.enviando ? 'progress_activity' : 'send'"
                  class="h-6 w-6"
                  :class="{ 'animate-spin': estado.enviando }"
                />
              </template>
              {{ estado.enviando ? t('siniestros.derivar.derivando') : t('siniestros.derivar.confirmar') }}
            </Boton>
          </div>
        </form>
      </section>
    </main>

    <FooterPantalla />
  </div>
</template>
