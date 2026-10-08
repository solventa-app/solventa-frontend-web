<!--
  W01-04 · Detalle de fuentes consultadas (Figma 2001:1412, CA-W01-06). 5 filas (2 Open Finance + 3
  Open Data) con el nombre y estado reales de `Oferta.fuentes` — no los nombres de ejemplo del
  mockup de Figma, sino los que de verdad vienen del contrato/mocks (`src/mocks/handlers.ts`), para
  no mostrarle al usuario una fuente que el backend nunca reportó. El timestamp "12 sep 2026, 10:41"
  del mockup tampoco tiene campo equivalente en el contrato (ni Oferta ni ResultadoOferta exponen
  cuándo se consultó): se omite en vez de inventarlo. La fecha de consentimiento sí es real
  (`Consentimiento.otorgadoEn`, guardado por `useCotizacion` al registrar el consentimiento).
-->
<script setup lang="ts">
import { computed } from 'vue'
import { FooterPantalla, HeaderPantalla } from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
import { esOferta, useCotizacion } from '../composables/useCotizacion'
import { formatearFecha } from '../utils/formato'

const { estado } = useCotizacion()
const oferta = computed(() => (esOferta(estado.resultado) ? estado.resultado : null))
const openFinance = computed(() => oferta.value?.fuentes.filter((f) => f.origen === 'OPEN_FINANCE') ?? [])
const openData = computed(() => oferta.value?.fuentes.filter((f) => f.origen === 'OPEN_DATA') ?? [])

function rutaVolver() {
  if (!oferta.value) return '/cotizacion'
  return oferta.value.tipo === 'PRELIMINAR' ? '/cotizacion/oferta-preliminar' : '/cotizacion/oferta'
}
</script>

<template>
  <div class="pantalla flex min-h-screen flex-col" data-pantalla="W01-04">
    <HeaderPantalla titulo="Detalle de fuentes" />
    <nav aria-label="Ruta de navegación" class="flex w-full items-center justify-between border-b border-borde bg-white px-10 py-2">
      <div class="flex items-center gap-1 text-[11px] leading-[14px]">
        <RouterLink to="/inicio" class="text-tinta-suave hover:underline">Inicio</RouterLink>
        <span class="text-tinta-suave" aria-hidden="true">›</span>
        <span class="text-tinta">Detalle de fuentes</span>
      </div>
      <div class="flex items-center gap-1.5 text-[11px] leading-[14px] text-tinta-suave">
        <IconoMaterial nombre="shield" class="h-[18px] w-[18px]" />
        Consulta auditada
      </div>
    </nav>
    <main v-if="oferta" class="flex flex-1 flex-col items-center bg-fondo px-10 py-6">
      <div class="flex w-full max-w-[880px] flex-col gap-5 rounded-lg border border-borde bg-white p-5">
        <h1 class="border-b border-borde pb-4 text-[22px] font-bold leading-[28px] text-tinta">
          Fuentes consultadas para tu oferta
        </h1>

        <section v-if="openFinance.length" class="flex flex-col gap-2">
          <h2 class="flex items-center gap-2 text-[16px] font-semibold uppercase tracking-[0.8px] text-primario">
            <IconoMaterial nombre="verified_user" class="h-5 w-5" />
            Open Finance
          </h2>
          <ul class="flex flex-col overflow-hidden rounded border border-borde">
            <li
              v-for="fuente in openFinance"
              :key="fuente.id"
              class="flex items-center justify-between border-b border-borde bg-white px-4 py-3.5 last:border-b-0"
            >
              <span class="text-[13px] font-semibold text-tinta">{{ fuente.nombre }}</span>
              <span class="flex items-center gap-2">
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
                  {{ fuente.estado === 'OK' ? 'Consultado en línea' : fuente.estado === 'CACHE' ? 'Usando último valor cacheado' : 'No disponible' }}
                </span>
                <span v-if="fuente.capturadoEn" class="text-[11px] text-tinta-suave">{{ formatearFecha(fuente.capturadoEn) }}</span>
              </span>
            </li>
          </ul>
        </section>

        <section v-if="openData.length" class="flex flex-col gap-2">
          <h2 class="flex items-center gap-2 text-[16px] font-semibold uppercase tracking-[0.8px] text-primario">
            <IconoMaterial nombre="shield" class="h-5 w-5" />
            Open Data
          </h2>
          <ul class="flex flex-col overflow-hidden rounded border border-borde">
            <li
              v-for="fuente in openData"
              :key="fuente.id"
              class="flex items-center justify-between border-b border-borde bg-white px-4 py-3.5 last:border-b-0"
            >
              <span class="text-[13px] font-semibold text-tinta">{{ fuente.nombre }}</span>
              <span class="flex items-center gap-2">
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
                  {{ fuente.estado === 'OK' ? 'Consultado en línea' : fuente.estado === 'CACHE' ? 'Usando último valor cacheado' : 'No disponible' }}
                </span>
                <span v-if="fuente.capturadoEn" class="text-[11px] text-tinta-suave">{{ formatearFecha(fuente.capturadoEn) }}</span>
              </span>
            </li>
          </ul>
        </section>

        <div class="flex items-center justify-between border-t border-borde pt-4">
          <p class="flex items-center gap-1 text-[11px] text-tinta-suave">
            <IconoMaterial nombre="lock" class="h-3.5 w-3.5" />
            <template v-if="estado.consentimiento">
              Consentimiento vigente desde {{ formatearFecha(estado.consentimiento.otorgadoEn) }} · Ley 1581 Habeas Data
            </template>
          </p>
          <RouterLink :to="rutaVolver()" class="rounded-sm border border-borde bg-white px-5 py-2.5 text-[13px] font-semibold text-primario hover:bg-fondo">
            Volver a la oferta
          </RouterLink>
        </div>
      </div>
    </main>
    <main v-else class="flex flex-1 flex-col items-center justify-center gap-3 bg-fondo px-10 py-12 text-center">
      <p class="text-[13px] text-tinta-suave">No hay fuentes para mostrar: aún no se ha consultado ninguna oferta.</p>
      <RouterLink to="/cotizacion" class="text-[13px] font-semibold text-enlace hover:underline">Ir a la solicitud</RouterLink>
    </main>
    <FooterPantalla />
  </div>
</template>
