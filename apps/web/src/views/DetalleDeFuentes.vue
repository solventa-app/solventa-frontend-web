<!--
  W01-04b · Detalle de fuentes consultadas (Figma "Solventa-web-Final", nodo 2001:1412). CA-W01-06.

  Siempre es una consulta del historial del asesor (`/cotizacion/fuentes/:consultaId`, `consultaFuentes`, QA 2026-11-10
  Q-08), con su fecha y el documento enmascarado. Una ajena o inexistente responde «No encontramos esta consulta».
  Ya no hay un detalle de «la última oferta en memoria»: cada cotización tiene su fila y su detalle, y el enlace
  `/cotizacion/fuentes/oferta` (marcadores viejos) lleva al historial.
  Las 5 fuentes (2 Open Finance + 3 Open Data) salen de la consulta, no de los nombres de ejemplo del prototipo. Se omite
  la hora de consulta del prototipo (no está en el contrato).
  Pendiente: los tooltips de ayuda junto a OPEN FINANCE/OPEN DATA (nodos 2001:1447/1483) y el ícono
  propio de cada fila.
-->
<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Boton, FooterPantalla, HeaderPantalla, MigasDePan, TituloPantalla } from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
import { useConsultaFuentes } from '../composables/useConsultasFuentes'
import { useSesion } from '../composables/useSesion'
import type { FuenteConsultada, OrigenFuente } from '../graphql/tipos'
import { t } from '../i18n'
import { formatearFecha } from '../utils/formato'
import { nombreFuente } from '../utils/nombres'

const route = useRoute()
const router = useRouter()
const { rutaInicio } = useSesion()
const { estado: consulta, cargar } = useConsultaFuentes()

// El id de la consulta del historial. `oferta` (o sin parámetro) es un enlace viejo: se manda al historial.
const idConsulta = computed(() => {
  const id = route.params.consultaId
  return typeof id === 'string' && id !== 'oferta' ? id : null
})
const fuentes = computed<FuenteConsultada[]>(() => consulta.consulta?.fuentes ?? [])
const hayDatos = computed(() => consulta.consulta !== null)

const GRUPOS: { origen: OrigenFuente; titulo: string; icono: 'verified_user' | 'shield' }[] = [
  { origen: 'OPEN_FINANCE', titulo: 'Open Finance', icono: 'verified_user' },
  { origen: 'OPEN_DATA', titulo: 'Open Data', icono: 'shield' },
]
const grupos = computed(() =>
  GRUPOS.map((g) => ({ ...g, fuentes: fuentes.value.filter((f) => f.origen === g.origen) })).filter(
    (g) => g.fuentes.length,
  ),
)

onMounted(() => {
  if (idConsulta.value) void cargar(idConsulta.value)
  else void router.replace('/cotizacion/fuentes')
})
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden" data-pantalla="W01-04b">
    <HeaderPantalla :titulo="t('fuentes.titulo')" />
    <MigasDePan :seccion="t('fuentes.titulo')" :a-inicio="rutaInicio()" />
    <main v-if="hayDatos" class="flex min-h-0 flex-1 flex-col items-center overflow-y-auto bg-fondo px-4 py-6 sm:px-10">
      <div class="flex w-full max-w-[880px] flex-col gap-5 rounded-lg border border-borde bg-white p-5">
        <div class="flex flex-col gap-1 border-b border-borde pb-4">
          <TituloPantalla>{{ t('fuentes.encabezado') }}</TituloPantalla>
          <p v-if="consulta.consulta" data-prueba="consulta-datos" class="text-[13px] text-tinta-suave">
            {{
              t('fuentes.historial.deConsulta', {
                fecha: formatearFecha(consulta.consulta.creadaEn),
                documento: consulta.consulta.documentoEnmascarado,
              })
            }}
          </p>
        </div>

        <section v-for="grupo in grupos" :key="grupo.origen" class="flex flex-col gap-2">
          <h2 class="flex items-center gap-2 text-[16px] font-semibold uppercase tracking-[0.8px] text-primario">
            <IconoMaterial :nombre="grupo.icono" class="h-5 w-5" />
            {{ grupo.titulo }}
          </h2>
          <ul class="flex flex-col overflow-hidden rounded border border-borde">
            <li
              v-for="fuente in grupo.fuentes"
              :key="fuente.id"
              class="flex flex-wrap items-center justify-between gap-2 border-b border-borde bg-white px-4 py-3.5 last:border-b-0"
            >
              <span class="text-[13px] font-semibold text-tinta">{{ nombreFuente(fuente.nombre) }}</span>
              <span class="flex flex-wrap items-center justify-end gap-2">
                <span
                  class="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
                  :class="{
                    'bg-exito-fondo text-exito': fuente.estado === 'OK',
                    'bg-alerta-fondo text-alerta': fuente.estado === 'CACHE',
                    'bg-error-fondo text-error': fuente.estado === 'FALLO',
                  }"
                >
                  <IconoMaterial
                    :nombre="fuente.estado === 'OK' ? 'cloud_done' : fuente.estado === 'CACHE' ? 'sync' : 'error'"
                    class="h-3.5 w-3.5"
                  />
                  {{
                    fuente.estado === 'OK'
                      ? t('fuentes.enLinea')
                      : fuente.estado === 'CACHE'
                        ? t('fuentes.cache')
                        : t('fuentes.noDisponible')
                  }}
                </span>
                <span v-if="fuente.capturadoEn" class="text-[11px] text-tinta-suave">{{
                  formatearFecha(fuente.capturadoEn)
                }}</span>
              </span>
            </li>
          </ul>
        </section>

        <div class="flex flex-wrap items-center justify-end gap-3 border-t border-borde pt-4">
          <RouterLink
            to="/cotizacion/fuentes?lista=1"
            class="flex items-center gap-2 rounded-sm border border-borde bg-white px-5 py-2.5 text-[13px] font-semibold text-primario hover:bg-fondo"
          >
            <IconoMaterial nombre="arrow_back" class="h-5 w-5" />
            {{ t('fuentes.volverHistorial') }}
          </RouterLink>
        </div>
      </div>
    </main>
    <main
      v-else-if="consulta.cargando"
      class="flex min-h-0 flex-1 flex-col items-center justify-center bg-fondo px-4 py-12"
    >
      <p class="text-[13px] text-tinta-suave">{{ t('fuentes.cargando') }}</p>
    </main>
    <main
      v-else
      data-prueba="consulta-no-encontrada"
      class="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 overflow-y-auto bg-fondo px-4 py-12 text-center"
    >
      <p role="alert" class="text-[13px] text-tinta-suave">
        {{ consulta.problema === 'error' ? t('fuentes.historial.errorDetalle') : t('fuentes.historial.noEncontrada') }}
      </p>
      <RouterLink to="/cotizacion/fuentes?lista=1">
        <Boton variante="secundario">{{ t('fuentes.volverHistorial') }}</Boton>
      </RouterLink>
    </main>
    <FooterPantalla />
  </div>
</template>
