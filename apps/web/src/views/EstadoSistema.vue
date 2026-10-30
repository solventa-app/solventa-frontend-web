<!--
  W07-04 · Estado del sistema para el BACKOFFICE (sin Figma, aprobado; plan-hu-w07-front.md 5.6).

  Arriba, la misma caja de estado y métricas del panel del socio (TarjetaEstado) con el selector de ventana, y la tabla
  de APIs externas (el circuito de cada proveedor del ACL). Debajo, la tabla por servicio con el estilo de la de W05-01:
  peso, salud, disponibilidad, latencia media, p95, si responde `/health` y «sin tráfico». El operador sí ve los nombres
  de los micros (W07-14); el socio no. Datos: `estadoSistema(ventana)` del contrato v0.22. Se recarga sola cada 30 s
  mientras está abierta, como W05-01, y apenas se vuelve a la pestaña.
-->
<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import TarjetaEstado from '../components/socios/TarjetaEstado.vue'
import { Badge, Boton, FooterPantalla, HeaderPantalla } from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
import { comoEstadoGeneral, useEstadoSistema } from '../composables/useEstadoSistema'
import type { ColorSalud, EstadoCircuito } from '../graphql/tipos'
import { t } from '../i18n'
import { formatearNumero } from '../utils/formato'

const { estado, cargar, cambiarVentana } = useEstadoSistema()

const BADGE_SALUD: Record<ColorSalud, 'exito' | 'alerta' | 'error'> = {
  VERDE: 'exito',
  AMARILLO: 'alerta',
  ROJO: 'error',
}
const BADGE_CIRCUITO: Record<EstadoCircuito, 'exito' | 'alerta' | 'error'> = {
  CERRADO: 'exito',
  SEMIABIERTO: 'alerta',
  ABIERTO: 'error',
  DESCONOCIDO: 'alerta',
}

const general = computed(() => (estado.datos ? comoEstadoGeneral(estado.datos) : null))
const externas = computed(() =>
  (estado.datos?.apis ?? []).flatMap((api) => api.externas.map((externa) => ({ api: api.nombre, ...externa }))),
)

const milisegundos = (valor: number | null | undefined) => (valor == null ? '—' : `${formatearNumero(valor)} ms`)

// Recarga en segundo plano, como W05-01: no con la pestaña oculta, y apenas se vuelve a ella.
const INTERVALO_REFRESCO_MS = 30_000
let temporizador: ReturnType<typeof setInterval> | undefined

function refrescar() {
  if (document.visibilityState === 'hidden') return
  void cargar({ silencioso: true })
}

function alCambiarVisibilidad() {
  if (document.visibilityState === 'visible') refrescar()
}

onMounted(() => {
  void cargar()
  temporizador = setInterval(refrescar, INTERVALO_REFRESCO_MS)
  document.addEventListener('visibilitychange', alCambiarVisibilidad)
})

onUnmounted(() => {
  clearInterval(temporizador)
  document.removeEventListener('visibilitychange', alCambiarVisibilidad)
})
</script>

<template>
  <div data-pantalla="W07-04" class="flex h-screen flex-col overflow-hidden bg-fondo">
    <HeaderPantalla :titulo="t('estadoSistema.titulo')" />

    <main class="mx-auto flex min-h-0 w-full max-w-[1100px] flex-1 flex-col gap-5 overflow-y-auto px-4 py-6 sm:px-10">
      <RouterLink to="/operador" class="text-[13px] font-normal text-primario hover:underline">
        {{ t('estadoSistema.volver') }}
      </RouterLink>

      <div class="grid grid-cols-1 items-start gap-5 lg:grid-cols-[360px_1fr]">
        <TarjetaEstado
          :salud="general"
          :ventana="estado.ventana"
          :cargando="estado.cargando"
          :error="estado.error"
          @update:ventana="cambiarVentana"
          @reintentar="cargar()"
        />

        <section
          class="flex flex-col gap-3 rounded-[8px] border border-borde bg-white p-[17px]"
          aria-labelledby="titulo-externas"
        >
          <h2
            id="titulo-externas"
            class="flex items-center justify-between border-b border-borde pb-[9px] text-[16px] font-semibold text-tinta"
          >
            {{ t('estadoSistema.externas') }}
            <IconoMaterial nombre="shield" class="h-6 w-6 text-primario" />
          </h2>
          <p v-if="!estado.datos" class="text-[13px] text-tinta-suave">
            {{ estado.cargando ? t('socios.panel.cargando') : t('estadoSistema.sinDatos') }}
          </p>
          <table v-else class="w-full border-collapse text-left" data-prueba="tabla-externas">
            <caption class="sr-only">
              {{
                t('estadoSistema.externas')
              }}
            </caption>
            <thead>
              <tr class="border-b border-borde text-[12px] font-semibold text-tinta-suave">
                <th scope="col" class="py-2 pr-3">{{ t('estadoSistema.proveedor') }}</th>
                <th scope="col" class="py-2 pr-3">{{ t('estadoSistema.api') }}</th>
                <th scope="col" class="py-2">{{ t('estadoSistema.circuito') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="externa in externas"
                :key="`${externa.api}-${externa.nombre}`"
                class="border-b border-borde text-[13px] text-tinta last:border-b-0"
              >
                <td class="py-2 pr-3 font-mono">{{ externa.nombre }}</td>
                <td class="py-2 pr-3">{{ t(`socios.estado.api.${externa.api as 'COTIZACION' | 'EMISION'}`) }}</td>
                <td class="py-2">
                  <Badge :tipo="BADGE_CIRCUITO[externa.estado]">{{
                    t(`estadoSistema.circuitoEstado.${externa.estado}`)
                  }}</Badge>
                </td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>

      <section class="flex flex-col gap-3" aria-labelledby="titulo-micros">
        <h2 id="titulo-micros" class="text-[16px] font-semibold text-tinta">{{ t('estadoSistema.micros') }}</h2>
        <div v-if="estado.error && !estado.datos" role="alert" class="flex flex-col items-start gap-2">
          <p class="text-[13px] text-error">{{ estado.error }}</p>
          <Boton variante="secundario" @click="cargar()">{{ t('socios.panel.reintentar') }}</Boton>
        </div>
        <div v-else-if="estado.datos" class="w-full overflow-x-auto rounded-[8px] border border-borde bg-white">
          <table class="w-full min-w-[900px] border-collapse text-left" data-prueba="tabla-micros">
            <caption class="sr-only">
              {{
                t('estadoSistema.micros')
              }}
            </caption>
            <thead>
              <tr class="border-b border-borde bg-[#f6f3f2] text-[13px] font-semibold text-tinta">
                <th scope="col" class="py-4 pl-4 pr-3">{{ t('estadoSistema.micro') }}</th>
                <th scope="col" class="py-4 pr-3 text-right">{{ t('estadoSistema.peso') }}</th>
                <th scope="col" class="py-4 pr-3">{{ t('estadoSistema.salud') }}</th>
                <th scope="col" class="py-4 pr-3 text-right">{{ t('estadoSistema.disponibilidad') }}</th>
                <th scope="col" class="py-4 pr-3 text-right">{{ t('estadoSistema.latencia') }}</th>
                <th scope="col" class="py-4 pr-3 text-right">{{ t('estadoSistema.p95') }}</th>
                <th scope="col" class="py-4 pr-4">{{ t('estadoSistema.health') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="m in estado.datos.micros"
                :key="m.nombre"
                class="border-b border-borde text-[13px] text-tinta last:border-b-0"
              >
                <td class="py-4 pl-4 pr-3 font-mono">{{ m.nombre }}</td>
                <td class="py-4 pr-3 text-right">{{ formatearNumero(m.peso) }}</td>
                <td class="py-4 pr-3">
                  <Badge :tipo="BADGE_SALUD[m.color]">{{ formatearNumero(m.porcentaje) }} %</Badge>
                </td>
                <td class="py-4 pr-3 text-right">
                  <span v-if="m.sinTrafico" class="text-tinta-suave">{{ t('estadoSistema.sinTrafico') }}</span>
                  <template v-else>{{
                    m.disponibilidad == null ? '—' : `${formatearNumero(m.disponibilidad, 2)} %`
                  }}</template>
                </td>
                <td class="py-4 pr-3 text-right">{{ milisegundos(m.latenciaMediaMs) }}</td>
                <td class="py-4 pr-3 text-right">{{ milisegundos(m.latenciaP95Ms) }}</td>
                <td class="py-4 pr-4">
                  <span class="flex items-center gap-1" :class="m.responde ? 'text-exito' : 'text-error'">
                    <IconoMaterial :nombre="m.responde ? 'check_circle' : 'cancel'" class="h-5 w-5" />
                    {{ m.responde ? t('estadoSistema.responde') : t('estadoSistema.noResponde') }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>

    <FooterPantalla />
  </div>
</template>
