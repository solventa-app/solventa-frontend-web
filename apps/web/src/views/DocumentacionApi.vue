<!--
  W07-03 · Documentación de la API (Figma "Solventa-web-Final", nodo 2001:3434; plan-hu-w07-front.md 5.4).

  Del prototipo se conservan el estilo, la barra de pestañas bajo el encabezado, las migas, el título con su ícono, el
  subtítulo, las tarjetas blancas y el distintivo del entorno. Cambia el contenido: tres pestañas (criterios de UX del
  plan) en vez de cuatro, y la lista fija de endpoints con un ejemplo se reemplaza por el Swagger del contrato, que sí
  se puede probar:
  1. «Guía de integración» (por defecto: no es la que cuesta): el PDF de public/socios/ en el idioma activo, con
     «Abrir en otra pestaña» y «Descargar». Si el navegador no muestra PDF, una tarjeta con la descarga; si la guía aún
     no se publica (paso 5.5), se dice así.
  2. «Pruebas (sandbox)»: Swagger con el token de pruebas y una caja con los documentos de prueba y el código 000000.
  3. «Producción»: Swagger con el token de producción y la alerta fija de que cotizar descuenta presupuesto real.
  La pestaña activa va en la URL (`?pestana=guia|pruebas|produccion`, no es un dato personal) para compartir el enlace.
  Título del encabezado: «Documentación de la API» en vez de «Documentación y playground» (criterio 1 del plan).
-->
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SwaggerSocios from '../components/socios/SwaggerSocios.vue'
import {
  BarraDeCerrarSesion,
  FooterPantalla,
  HeaderPantalla,
  MigasDePan,
  Pestanas,
  type Pestana,
} from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
import { usePanelSocio } from '../composables/usePanelSocio'
import { useSesionSocio } from '../composables/useSesionSocio'
import { idioma, t } from '../i18n'

type IdPestana = 'guia' | 'pruebas' | 'produccion'
const IDS: IdPestana[] = ['guia', 'pruebas', 'produccion']

const route = useRoute()
const router = useRouter()
const sesion = useSesionSocio()
const panel = usePanelSocio()

const pestanas = computed<Pestana[]>(() => [
  { id: 'guia', texto: t('socios.docs.pestana.guia'), icono: 'menu_book' },
  { id: 'pruebas', texto: t('socios.docs.pestana.pruebas'), icono: 'science' },
  { id: 'produccion', texto: t('socios.docs.pestana.produccion'), icono: 'rocket_launch' },
])

const activa = computed<IdPestana>(() => {
  const valor = route.query.pestana
  return IDS.includes(valor as IdPestana) ? (valor as IdPestana) : 'guia'
})

function cambiarPestana(id: string) {
  router.replace({ query: { ...route.query, pestana: id } })
}

const barra = ref<InstanceType<typeof Pestanas> | null>(null)
const nombre = computed(() => sesion.estado.nombre || sesion.estado.socioId)

const TITULO_ICONO = { guia: 'menu_book', pruebas: 'science', produccion: 'rocket_launch' } as const

// La guía en PDF (paso 5.5) se publica en public/socios/ en los dos idiomas.
const urlGuia = computed(() => `/socios/guia-integracion-${idioma.value === 'EN' ? 'en' : 'es'}.pdf`)
const guiaDisponible = ref<boolean | null>(null)
const visorPdf = typeof navigator === 'undefined' || navigator.pdfViewerEnabled !== false

async function comprobarGuia() {
  guiaDisponible.value = null
  try {
    const respuesta = await fetch(urlGuia.value, { method: 'HEAD' })
    guiaDisponible.value = respuesta.ok && !!respuesta.headers.get('content-type')?.includes('pdf')
  } catch {
    guiaDisponible.value = false
  }
}
watch(urlGuia, comprobarGuia)

function cerrarSesion() {
  sesion.cerrarSesion()
  router.push('/socios/ingreso')
}

watch(
  () => panel.estado.sesionVencida,
  (vencida) => {
    if (vencida) router.replace('/socios/ingreso')
  },
)

onMounted(() => {
  panel.estado.sesionVencida = false
  comprobarGuia()
  // Las credenciales dan el nombre del socio tras recargar y las claves para pedir el token de cada Swagger.
  if (!panel.estado.credenciales) panel.cargarCredenciales()
})
</script>

<template>
  <div data-pantalla="W07-03" class="flex h-screen flex-col overflow-hidden">
    <HeaderPantalla :titulo="t('socios.docs.titulo')" sin-perfil />
    <BarraDeCerrarSesion :nombre="nombre" :rol="t('socios.panel.rol')" @cerrar-sesion="cerrarSesion" />
    <Pestanas
      ref="barra"
      prefijo="docs"
      :pestanas="pestanas"
      :model-value="activa"
      :etiqueta="t('socios.docs.pestanas')"
      @update:model-value="cambiarPestana"
    />

    <main class="min-h-0 flex-1 overflow-y-auto bg-fondo">
      <div class="mx-auto flex w-full max-w-[1020px] flex-col gap-5 px-4 py-8 sm:px-10">
        <MigasDePan a-inicio="/socios/panel" :seccion="t('socios.docs.titulo')" />

        <div
          :id="barra?.idPanel(activa)"
          role="tabpanel"
          :aria-labelledby="barra?.idPestana(activa)"
          class="flex flex-col gap-5"
          :data-prueba="`panel-${activa}`"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="flex flex-col gap-1">
              <h1 class="flex items-center gap-2 text-[22px] font-bold leading-[28px] tracking-[-0.55px] text-tinta">
                <IconoMaterial :nombre="TITULO_ICONO[activa]" class="h-6 w-6 text-primario" />
                {{ t(`socios.docs.pestana.${activa}`) }}
              </h1>
              <p class="text-[13px] leading-[18px] text-tinta-suave">{{ t(`socios.docs.subtitulo.${activa}`) }}</p>
            </div>
            <span
              v-if="activa !== 'guia'"
              data-prueba="distintivo-entorno"
              class="rounded-[12px] border px-[9px] py-[5px] text-[11px] leading-[14px]"
              :class="
                activa === 'produccion'
                  ? 'border-alerta bg-alerta-fondo font-semibold text-alerta'
                  : 'border-borde bg-[#f0eded] text-tinta-suave'
              "
            >
              {{ t(`socios.docs.distintivo.${activa}`) }}
            </span>
          </div>

          <template v-if="activa === 'guia'">
            <p v-if="guiaDisponible === null" class="text-[13px] text-tinta-suave">{{ t('socios.panel.cargando') }}</p>
            <div
              v-else-if="!guiaDisponible"
              data-prueba="guia-pendiente"
              class="flex items-start gap-2 rounded-[8px] border border-borde bg-white p-4 text-[13px] text-tinta"
            >
              <IconoMaterial nombre="info" class="h-6 w-6 shrink-0 text-info" />
              {{ t('socios.docs.guiaPendiente') }}
            </div>
            <template v-else>
              <div class="flex flex-wrap gap-2">
                <a
                  :href="urlGuia"
                  target="_blank"
                  rel="noopener"
                  class="inline-flex h-[44px] items-center gap-2 rounded-[4px] border border-primario bg-white px-5 text-cuerpo font-semibold text-primario focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace"
                >
                  <IconoMaterial nombre="open_in_new" class="h-5 w-5" />
                  {{ t('socios.docs.abrirGuia') }}
                </a>
                <a
                  :href="urlGuia"
                  download
                  class="inline-flex h-[44px] items-center gap-2 rounded-[4px] border border-primario bg-white px-5 text-cuerpo font-semibold text-primario focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace"
                >
                  <IconoMaterial nombre="download" class="h-5 w-5" />
                  {{ t('socios.docs.descargarGuia') }}
                </a>
              </div>
              <iframe
                v-if="visorPdf"
                :src="urlGuia"
                :title="t('socios.docs.pestana.guia')"
                data-prueba="guia-pdf"
                class="h-[70vh] w-full rounded-[8px] border border-borde bg-white"
              />
              <p v-else class="rounded-[8px] border border-borde bg-white p-4 text-[13px] text-tinta">
                {{ t('socios.docs.sinVisorPdf') }}
              </p>
            </template>
          </template>

          <template v-else-if="activa === 'pruebas'">
            <div
              data-prueba="caja-pruebas"
              class="flex items-start gap-2 rounded-[8px] border border-borde bg-white p-4 text-[13px] leading-[18px] text-tinta"
            >
              <IconoMaterial nombre="info" class="h-6 w-6 shrink-0 text-info" />
              <div class="flex flex-col gap-1">
                <strong class="font-semibold">{{ t('socios.docs.pruebas.titulo') }}</strong>
                <ul class="list-disc pl-5">
                  <li>{{ t('socios.docs.pruebas.preliminar') }}</li>
                  <li>{{ t('socios.docs.pruebas.completa') }}</li>
                  <li>{{ t('socios.docs.pruebas.codigo') }}</li>
                </ul>
              </div>
            </div>
            <SwaggerSocios :key="'PRUEBAS'" entorno="PRUEBAS" />
          </template>

          <template v-else>
            <p
              role="note"
              data-prueba="alerta-produccion"
              class="flex items-start gap-2 rounded-[8px] border border-alerta bg-alerta-fondo p-4 text-[13px] font-semibold text-alerta"
            >
              <IconoMaterial nombre="warning" class="h-6 w-6 shrink-0" />
              {{ t('socios.docs.produccion.alerta') }}
            </p>
            <SwaggerSocios :key="'PRODUCCION'" entorno="PRODUCCION" />
          </template>
        </div>
      </div>
    </main>
    <FooterPantalla />
  </div>
</template>
