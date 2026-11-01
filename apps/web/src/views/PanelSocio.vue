<!--
  W07-02 · Panel del socio (Figma "Solventa-web-Final", nodo 2001:3562; plan-hu-w07-front.md 5.3).

  De arriba abajo: el marco común del portal (PortalSocio), la descripción, «Ver datos de» para elegir el entorno de lo
  que se muestra (no es navegación: va como radios), las tres tarjetas de Figma (credenciales,
  consumo y estado) y dos secciones sin Figma aprobadas: consumo por API (gráfico y tabla) y ventas y comisiones.
  Cada sección carga por separado y tiene sus estados de carga, error con reintento y vacío (regla 5).
-->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import GraficoLlamadas from '../components/socios/GraficoLlamadas.vue'
import PortalSocio from '../components/socios/PortalSocio.vue'
import TarjetaConsumo from '../components/socios/TarjetaConsumo.vue'
import TarjetaCredenciales from '../components/socios/TarjetaCredenciales.vue'
import TarjetaEstado from '../components/socios/TarjetaEstado.vue'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
import { convertirMontos, type Entorno } from '../api/socios'
import { montoVisible, usarConversor } from '../composables/useMoneda'
import { usePanelSocio } from '../composables/usePanelSocio'
import { useSesionSocio } from '../composables/useSesionSocio'
import { localeIntl, t } from '../i18n'
import { formatearFechaCorta, formatearNumero, formatearPorcentaje } from '../utils/formato'

const router = useRouter()
const sesion = useSesionSocio()
const { estado, cargarTodo, cambiarEntorno, cambiarVentana, cargarEstado, cargarConsumo, cargarVentas } =
  usePanelSocio()

const ENTORNOS: Entorno[] = ['PRODUCCION', 'PRUEBAS']
const ventas = computed(() => estado.ventas)
/** Conversión de propuesta a póliza emitida (el contrato da los dos totales, no la tasa). */
const conversion = computed(() =>
  ventas.value && ventas.value.totales.propuestas > 0
    ? ventas.value.totales.emitidas / ventas.value.totales.propuestas
    : 0,
)
// En pruebas, las ventas del contrato son simuladas (W07-10).
const simuladas = computed(() => estado.entorno === 'PRUEBAS')

/** «Del 30 sep 2026 al 29 oct 2026»: el rango que devuelve el contrato (`desde` y `hasta`, fechas sin hora). */
function rango(desde: string, hasta: string): string {
  const dia = (fecha: string) => formatearFechaCorta(`${fecha}T17:00:00Z`)
  return t('socios.panel.rango', { desde: dia(desde), hasta: dia(hasta) })
}

function etiquetaMes(mes: string): string {
  const [anio, numero] = mes.split('-').map(Number)
  const texto = new Intl.DateTimeFormat(localeIntl(), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(anio, numero - 1, 15)),
  )
  // «octubre de 2026» → «Octubre de 2026»: solo la primera letra (la clase `capitalize` subiría también el «de»).
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

// Un 401 con la sesión abierta: el token venció. La sesión técnica ya quedó cerrada con el aviso.
watch(
  () => estado.sesionVencida,
  (vencida) => {
    if (vencida) router.replace('/socios/ingreso')
  },
)

// El socio no tiene sesión de GraphQL: convierte con su API.
onMounted(() => {
  estado.sesionVencida = false
  usarConversor(async (montos, moneda) => {
    const resultado = await convertirMontos(sesion.estado.token ?? '', montos, moneda)
    return resultado.montos
  })
  cargarTodo()
})
onBeforeUnmount(() => usarConversor(null))
</script>

<template>
  <PortalSocio pantalla="W07-02" :titulo="t('socios.panel.titulo')" activa="panel">
    <div class="mx-auto flex w-full max-w-[1020px] flex-col gap-5 px-4 py-8 sm:px-10">
      <p class="text-[13px] leading-[18px] text-tinta-suave">{{ t('socios.panel.descripcion') }}</p>

      <div role="radiogroup" :aria-label="t('socios.panel.verDatos')" class="flex flex-wrap items-center gap-3">
        <span class="text-[13px] font-medium text-tinta">{{ t('socios.panel.verDatos') }}</span>
        <button
          v-for="opcion in ENTORNOS"
          :key="opcion"
          type="button"
          role="radio"
          :aria-checked="estado.entorno === opcion"
          class="flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
          :class="
            estado.entorno === opcion
              ? 'border-primario bg-info-fondo text-primario'
              : 'border-borde bg-white text-tinta-suave hover:bg-fondo'
          "
          @click="cambiarEntorno(opcion)"
        >
          <IconoMaterial :nombre="opcion === 'PRODUCCION' ? 'rocket_launch' : 'science'" class="h-4 w-4" />
          {{ t(`socios.panel.entornoOpcion.${opcion}`) }}
        </button>
      </div>

      <div class="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <TarjetaCredenciales />
        <TarjetaConsumo />
        <TarjetaEstado
          :salud="estado.salud"
          :ventana="estado.ventana"
          :cargando="estado.cargando.estado"
          :error="estado.error.estado"
          @update:ventana="cambiarVentana"
          @reintentar="cargarEstado()"
        />
      </div>

      <section class="flex flex-col gap-3" :aria-labelledby="'titulo-consumo-api'">
        <h2 id="titulo-consumo-api" class="text-[16px] font-semibold text-tinta">
          {{ t('socios.consumoApi.titulo') }}
        </h2>
        <div class="flex flex-col gap-4 rounded-[8px] border border-borde bg-white p-[17px]">
          <p v-if="estado.cargando.consumo && !estado.consumo" class="text-[13px] text-tinta-suave">
            {{ t('socios.panel.cargando') }}
          </p>
          <div v-else-if="estado.error.consumo && !estado.consumo" role="alert" class="flex flex-col items-start gap-2">
            <p class="text-[13px] text-error">{{ estado.error.consumo }}</p>
            <Boton variante="secundario" @click="cargarConsumo()">{{ t('socios.panel.reintentar') }}</Boton>
          </div>
          <template v-else-if="estado.consumo">
            <p class="text-[11px] leading-[14px] text-tinta-suave" data-prueba="rango-consumo">
              {{ rango(estado.consumo.desde, estado.consumo.hasta) }}
            </p>
            <GraficoLlamadas v-if="estado.consumo.diario.length" :datos="estado.consumo.diario" />
            <div class="w-full overflow-x-auto">
              <table class="w-full min-w-[560px] border-collapse text-left" data-prueba="tabla-consumo">
                <caption class="sr-only">
                  {{
                    t('socios.consumoApi.titulo')
                  }}
                </caption>
                <thead>
                  <tr class="border-b border-borde bg-[#f6f3f2] text-[13px] font-semibold text-tinta">
                    <th scope="col" class="py-4 pl-4 pr-3">{{ t('socios.consumoApi.api') }}</th>
                    <th scope="col" class="py-4 pr-3 text-right">{{ t('socios.consumoApi.llamadas') }}</th>
                    <th scope="col" class="py-4 pr-3 text-right">{{ t('socios.consumoApi.exitosas') }}</th>
                    <th scope="col" class="py-4 pr-3 text-right">{{ t('socios.consumoApi.conError') }}</th>
                    <th scope="col" class="py-4 pr-4 text-right">{{ t('socios.consumoApi.latencia') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="!estado.consumo.porApi.length">
                    <td colspan="5" class="py-6 text-center text-[13px] text-tinta-suave">
                      {{ t('socios.consumoApi.vacio') }}
                    </td>
                  </tr>
                  <tr
                    v-for="fila in estado.consumo.porApi"
                    :key="fila.api"
                    class="border-b border-borde text-[13px] text-tinta last:border-b-0"
                  >
                    <td class="py-4 pl-4 pr-3 font-mono">{{ fila.api }}</td>
                    <td class="py-4 pr-3 text-right">{{ formatearNumero(fila.llamadas) }}</td>
                    <td class="py-4 pr-3 text-right">{{ formatearNumero(fila.llamadas - fila.errores) }}</td>
                    <td class="py-4 pr-3 text-right">{{ formatearNumero(fila.errores) }}</td>
                    <td class="py-4 pr-4 text-right">
                      {{ fila.latenciaMediaMs == null ? '—' : `${formatearNumero(fila.latenciaMediaMs)} ms` }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </div>
      </section>

      <section class="flex flex-col gap-3" :aria-labelledby="'titulo-ventas'">
        <h2 id="titulo-ventas" class="flex flex-wrap items-center gap-2 text-[16px] font-semibold text-tinta">
          {{ t('socios.ventas.titulo') }}
          <span
            v-if="simuladas"
            class="flex items-center gap-1 rounded-full bg-info-fondo px-2 py-[2px] text-[11px] font-semibold text-info"
          >
            <IconoMaterial nombre="science" class="h-4 w-4" />
            {{ t('socios.ventas.simulado') }}
          </span>
        </h2>

        <p v-if="estado.cargando.ventas && !ventas" class="text-[13px] text-tinta-suave">
          {{ t('socios.panel.cargando') }}
        </p>
        <div v-else-if="estado.error.ventas && !ventas" role="alert" class="flex flex-col items-start gap-2">
          <p class="text-[13px] text-error">{{ estado.error.ventas }}</p>
          <Boton variante="secundario" @click="cargarVentas()">{{ t('socios.panel.reintentar') }}</Boton>
        </div>

        <template v-else-if="ventas">
          <p class="text-[11px] leading-[14px] text-tinta-suave" data-prueba="rango-ventas">
            {{ rango(ventas.desde, ventas.hasta) }}
          </p>
          <ul class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5" data-prueba="indicadores">
            <li class="flex flex-col gap-1 rounded-[8px] border border-borde bg-white p-4">
              <span class="text-[11px] leading-[14px] text-tinta-suave">{{ t('socios.ventas.propuestas') }}</span>
              <strong class="text-[22px] font-bold text-tinta">{{ formatearNumero(ventas.totales.propuestas) }}</strong>
            </li>
            <li class="flex flex-col gap-1 rounded-[8px] border border-borde bg-white p-4">
              <span class="text-[11px] leading-[14px] text-tinta-suave">{{ t('socios.ventas.polizas') }}</span>
              <strong class="text-[22px] font-bold text-tinta">{{ formatearNumero(ventas.totales.emitidas) }}</strong>
            </li>
            <li class="flex flex-col gap-1 rounded-[8px] border border-borde bg-white p-4">
              <span class="text-[11px] leading-[14px] text-tinta-suave">{{ t('socios.ventas.conversion') }}</span>
              <strong class="text-[22px] font-bold text-tinta">{{ formatearPorcentaje(conversion) }}</strong>
            </li>
            <li class="flex flex-col gap-1 rounded-[8px] border border-borde bg-white p-4">
              <span class="text-[11px] leading-[14px] text-tinta-suave">{{ t('socios.ventas.primas') }}</span>
              <strong class="text-[18px] font-bold text-tinta">{{ montoVisible(ventas.totales.primas) }}</strong>
            </li>
            <li class="flex flex-col gap-1 rounded-[8px] border border-borde bg-white p-4">
              <span class="text-[11px] leading-[14px] text-tinta-suave">{{ t('socios.ventas.comision') }}</span>
              <strong class="text-[18px] font-bold text-tinta">{{ montoVisible(ventas.totales.comision) }}</strong>
              <span class="text-[11px] leading-[14px] text-tinta-suave">{{
                t('socios.ventas.tasa', { tasa: formatearPorcentaje(Number(ventas.tasaComision)) })
              }}</span>
            </li>
          </ul>

          <div class="w-full overflow-x-auto rounded-[8px] border border-borde bg-white">
            <table class="w-full min-w-[640px] border-collapse text-left" data-prueba="tabla-ventas">
              <caption class="sr-only">
                {{
                  t('socios.ventas.porMes')
                }}
              </caption>
              <thead>
                <tr class="border-b border-borde bg-[#f6f3f2] text-[13px] font-semibold text-tinta">
                  <th scope="col" class="py-4 pl-4 pr-3">{{ t('socios.ventas.mes') }}</th>
                  <th scope="col" class="py-4 pr-3 text-right">{{ t('socios.ventas.propuestas') }}</th>
                  <th scope="col" class="py-4 pr-3 text-right">{{ t('socios.ventas.polizas') }}</th>
                  <th scope="col" class="py-4 pr-3 text-right">{{ t('socios.ventas.primas') }}</th>
                  <th scope="col" class="py-4 pr-4 text-right">{{ t('socios.ventas.comision') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!ventas.meses.length">
                  <td colspan="5" class="py-6 text-center text-[13px] text-tinta-suave">
                    {{ t('socios.ventas.vacio') }}
                  </td>
                </tr>
                <tr
                  v-for="fila in ventas.meses"
                  :key="fila.mes"
                  class="border-b border-borde text-[13px] text-tinta last:border-b-0"
                >
                  <td class="py-4 pl-4 pr-3">{{ etiquetaMes(fila.mes) }}</td>
                  <td class="py-4 pr-3 text-right">{{ formatearNumero(fila.propuestas) }}</td>
                  <td class="py-4 pr-3 text-right">{{ formatearNumero(fila.emitidas) }}</td>
                  <td class="py-4 pr-3 text-right">{{ montoVisible(fila.primas) }}</td>
                  <td class="py-4 pr-4 text-right">{{ montoVisible(fila.comision) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </section>
    </div>
  </PortalSocio>
</template>
