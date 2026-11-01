<!--
  W05-01 · Conciliación de pagos (Figma "Solventa-web-Final", nodo 2001:3156). CA-W05-01 (ver el estado
  de cada cobro) y CA-W05-02 (reintentar un cobro rechazado).

  - "ID de transacción" sale vacío ("—"): el contrato del backend no expone ese campo. Está pedido como
    cambio aditivo en contrato/CHANGELOG.md.
  - El toast "Cobro reenviado a la pasarela" se oculta a los 3,5 s (anotación del propio Figma).
  - Pendiente: el `role="tablist"` no implementa el patrón completo de WAI-ARIA (roving tabindex).
  - W05-A5 (sin Figma, borrador de la v0.17): columna «Medio de pago» con la marca y el tipo (nunca dígitos de la
    tarjeta) y el origen. Un cobro «En línea» lo pagó el cliente en la pasarela: el operador no lo reintenta (cobraría
    una tarjeta que el cliente pudo cambiar, W03-30); un rechazado lo resuelve el cliente y un pendiente se concilia.
-->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Boton, FooterPantalla, HeaderPantalla, TituloPantalla } from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
import { useAvisos } from '../composables/useAvisos'
import { useConciliacion } from '../composables/useConciliacion'
import { formatearFecha, formatearMonto } from '../utils/formato'
import type { Cobro, EstadoCobro } from '../graphql/tipos'
import { t } from '../i18n'

const { estado, cargarCobros, reintentarCobro, aplicarAviso } = useConciliacion()
const avisos = useAvisos(aplicarAviso)

// `undefined` es la pestaña "Todos".
const PESTANAS: (EstadoCobro | undefined)[] = [undefined, 'COBRANDO', 'COBRADO', 'RECHAZADO', 'PENDIENTE']

function etiquetaPestana(valor?: EstadoCobro): string {
  return valor ? t(`conciliacion.pestana.${valor}`) : t('conciliacion.todos')
}

const pestanaActiva = ref<EstadoCobro | undefined>(undefined)
const paginaActual = ref(1)
const TAMANO_PAGINA = 10

function cambiarPestana(valor?: EstadoCobro) {
  pestanaActiva.value = valor
  paginaActual.value = 1
}

const cobrosFiltrados = computed(() =>
  pestanaActiva.value ? estado.cobros.filter((c) => c.estado === pestanaActiva.value) : estado.cobros,
)

const totalPaginas = computed(() => Math.max(1, Math.ceil(cobrosFiltrados.value.length / TAMANO_PAGINA)))

const cobrosPaginados = computed(() => {
  const inicio = (paginaActual.value - 1) * TAMANO_PAGINA
  return cobrosFiltrados.value.slice(inicio, inicio + TAMANO_PAGINA)
})

// "Total procesado" (nodo 2001:3297): suma de los cobros visibles en la pestaña activa, en cualquier estado.
const totalProcesado = computed(() => {
  const moneda = cobrosFiltrados.value[0]?.monto.moneda ?? 'COP'
  const suma = cobrosFiltrados.value.reduce((acc, c) => acc + Number(c.monto.valor), 0)
  return formatearMonto({ valor: String(suma), moneda })
})

const INSIGNIA: Record<
  EstadoCobro,
  { texto: string; fondo: string; icono: 'check_circle' | 'sync' | 'cancel' | 'schedule' }
> = {
  COBRADO: { texto: 'text-exito', fondo: 'bg-exito-fondo', icono: 'check_circle' },
  COBRANDO: { texto: 'text-info', fondo: 'bg-info-fondo', icono: 'sync' },
  RECHAZADO: { texto: 'text-error', fondo: 'bg-error-fondo', icono: 'cancel' },
  PENDIENTE: { texto: 'text-alerta', fondo: 'bg-alerta-fondo', icono: 'schedule' },
}

// CA-W05-02 (prototipo W05-01, decisión del 2026-10-17): un RECHAZADO se reintenta a mano hasta 3 veces; el
// BFF dice cuántos le quedan. Un PENDIENTE lo reintenta el sistema solo.
function puedeReintentar(cobro: Cobro): boolean {
  return cobro.estado === 'RECHAZADO' && !enLinea(cobro) && (cobro.reintentosRestantes ?? 0) > 0
}

function enLinea(cobro: Cobro): boolean {
  return cobro.origen === 'INTERACTIVO'
}

function fechaDelIntento(cobro: Cobro): string {
  return cobro.estado === 'COBRANDO' ? t('conciliacion.enCurso') : formatearFecha(cobro.actualizadoEn)
}

const mostrarToast = ref(false)
let temporizadorToast: ReturnType<typeof setTimeout> | undefined

async function alReintentar(cobroId: string) {
  await reintentarCobro(cobroId)
  if (estado.errorReintento) return // no se confirma un reenvío que en realidad falló
  mostrarToast.value = true
  clearTimeout(temporizadorToast)
  temporizadorToast = setTimeout(() => {
    mostrarToast.value = false
  }, 3500)
}

// La tabla se actualiza por SSE (W05-A6), sin botón: el prototipo no lo tiene. La conexión solo vive con la pestaña
// visible; al volver se abre otra y se consulta una vez lo que pasó mientras tanto.
function alCambiarVisibilidad() {
  if (document.visibilityState === 'hidden') {
    avisos.cerrar()
    return
  }
  void avisos.abrir()
  void cargarCobros(undefined, { silencioso: true })
}

onMounted(() => {
  void cargarCobros()
  void avisos.abrir()
  document.addEventListener('visibilitychange', alCambiarVisibilidad)
})

onUnmounted(() => {
  clearTimeout(temporizadorToast)
  avisos.cerrar()
  document.removeEventListener('visibilitychange', alCambiarVisibilidad)
})
</script>

<template>
  <div data-pantalla="W05-01" class="sentry-block flex h-screen flex-col overflow-hidden bg-fondo">
    <HeaderPantalla :titulo="t('conciliacion.titulo')" />
    <TituloPantalla class="sr-only">{{ t('conciliacion.titulo') }}</TituloPantalla>

    <main class="mx-auto flex w-full max-w-[1100px] flex-1 flex-col gap-5 overflow-y-auto px-10 py-6 min-h-0">
      <RouterLink to="/operador" class="text-[13px] font-normal text-primario hover:underline">
        {{ t('conciliacion.volver') }}
      </RouterLink>

      <div class="flex w-full justify-end">
        <span
          class="flex items-center gap-1 rounded-sm border border-borde bg-white px-3 py-1.5 text-[11px] text-tinta-suave"
        >
          <IconoMaterial nombre="info" class="h-[18px] w-[18px]" />
          {{ t('conciliacion.corte') }}
        </span>
      </div>

      <div
        role="status"
        aria-live="polite"
        class="fixed right-10 top-6 z-10 flex items-center gap-2 rounded-md bg-tinta px-4 py-[10px] text-[13px] font-bold text-white shadow-lg transition-opacity"
        :class="mostrarToast ? 'opacity-100' : 'pointer-events-none opacity-0'"
      >
        <span class="text-[#8cd9a6]" aria-hidden="true">✓</span>
        {{ t('conciliacion.toast') }}
      </div>

      <p v-if="estado.cargando" class="text-[13px] text-tinta-suave">{{ t('conciliacion.cargando') }}</p>
      <p v-else-if="estado.error" role="alert" class="text-[13px] text-error">{{ estado.error }}</p>

      <template v-else>
        <div
          v-if="estado.errorReintento"
          role="alert"
          class="w-full rounded-md border border-error bg-error-fondo px-4 py-3 text-[13px] text-error"
        >
          {{ estado.errorReintento }}
        </div>

        <div role="tablist" :aria-label="t('conciliacion.filtros')" class="flex w-full flex-wrap items-center gap-2">
          <button
            v-for="pestana in PESTANAS"
            :key="pestana ?? 'TODOS'"
            type="button"
            role="tab"
            :aria-selected="pestanaActiva === pestana"
            class="flex h-11 items-center gap-1.5 rounded-xl px-[16px] text-[12px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
            :class="
              pestanaActiva === pestana
                ? 'bg-primario text-white'
                : 'border border-borde bg-white text-tinta-suave hover:bg-fondo'
            "
            @click="cambiarPestana(pestana)"
          >
            {{ etiquetaPestana(pestana) }}
            <span v-if="!pestana" class="rounded-xl bg-white/20 px-1.5 py-0.5 text-[11px]">{{
              estado.cobros.length
            }}</span>
          </button>
        </div>

        <div class="w-full overflow-hidden rounded-lg border border-borde bg-white">
          <div class="max-h-[520px] overflow-auto">
            <table class="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr class="border-b border-borde bg-[#f6f3f2] text-[13px] font-semibold text-tinta">
                  <th scope="col" class="py-[25px] pl-4 pr-[14px]">{{ t('conciliacion.cliente') }}</th>
                  <th scope="col" class="py-[25px] pr-[14px]">{{ t('conciliacion.poliza') }}</th>
                  <th scope="col" class="py-[25px] pr-[14px] text-right">{{ t('conciliacion.prima') }}</th>
                  <th scope="col" class="py-[25px] pr-[14px]">{{ t('conciliacion.medio') }}</th>
                  <th scope="col" class="py-[25px] pr-[14px]">{{ t('conciliacion.estado') }}</th>
                  <th scope="col" class="py-[25px] pr-[14px]">{{ t('conciliacion.fecha') }}</th>
                  <th scope="col" class="py-[25px] pr-4 text-center">{{ t('conciliacion.acciones') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="cobrosFiltrados.length === 0">
                  <td colspan="7" class="py-6 text-center text-[13px] text-tinta-suave">
                    {{ t('conciliacion.vacio') }}
                  </td>
                </tr>
                <tr v-for="cobro in cobrosPaginados" :key="cobro.id" class="border-b border-borde last:border-b-0">
                  <td class="py-[24px] pl-4 pr-[14px] text-[13px] text-tinta">{{ cobro.cliente?.nombre ?? '—' }}</td>
                  <td class="py-[24px] pr-[14px] font-mono text-[13px] text-tinta-suave">{{ cobro.polizaId }}</td>
                  <td class="py-[24px] pr-[14px] text-right text-[13px] text-tinta">
                    {{ formatearMonto(cobro.monto) }}
                  </td>
                  <td class="py-[18px] pr-[14px] text-[13px] text-tinta" data-prueba="medio-pago">
                    <template v-if="cobro.medio">
                      {{ cobro.medio.marca }} · {{ t(`conciliacion.tipoMedio.${cobro.medio.tipo}`) }}
                    </template>
                    <template v-else>—</template>
                    <span v-if="cobro.origen" class="block text-[11px] text-tinta-suave">
                      {{ t(`conciliacion.origen.${cobro.origen}`) }}
                    </span>
                  </td>
                  <td class="py-[18px] pr-[14px]">
                    <span
                      class="inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-semibold"
                      :class="[INSIGNIA[cobro.estado].fondo, INSIGNIA[cobro.estado].texto]"
                    >
                      <IconoMaterial :nombre="INSIGNIA[cobro.estado].icono" class="h-3.5 w-3.5" />
                      {{ t(`conciliacion.estado.${cobro.estado}`) }}
                    </span>
                  </td>
                  <td
                    class="py-[24px] pr-[14px] text-[13px] text-tinta-suave"
                    :class="{ italic: cobro.estado === 'COBRANDO' }"
                  >
                    {{ fechaDelIntento(cobro) }}
                  </td>
                  <td class="py-[16px] pr-4 text-center">
                    <Boton
                      v-if="puedeReintentar(cobro)"
                      variante="secundario"
                      :disabled="estado.reintentando === cobro.id"
                      :aria-busy="estado.reintentando === cobro.id"
                      @click="alReintentar(cobro.id)"
                    >
                      {{
                        estado.reintentando === cobro.id ? t('conciliacion.reintentando') : t('conciliacion.reintentar')
                      }}
                    </Boton>
                    <span
                      v-else-if="cobro.estado === 'RECHAZADO' && enLinea(cobro)"
                      class="text-[11px] text-tinta-suave"
                    >
                      {{ t('conciliacion.loResuelveCliente') }}
                    </span>
                    <span v-else-if="cobro.estado === 'RECHAZADO'" class="text-[11px] text-error">
                      {{ t('conciliacion.otroMedio') }}
                    </span>
                    <span v-else-if="cobro.estado === 'PENDIENTE'" class="text-[11px] text-tinta-suave">
                      {{ enLinea(cobro) ? t('conciliacion.seConcilia') : t('conciliacion.automatico') }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-4 border-t border-borde bg-[#f6f3f2] px-4 py-3">
            <Paginador v-model:pagina="paginaActual" :total-paginas="totalPaginas" />
            <div class="flex items-center gap-4 text-[11px] text-tinta-suave">
              <span class="flex items-center gap-1">
                <IconoMaterial nombre="sync" class="h-[18px] w-[18px]" />
                {{ t('conciliacion.mostrando', { visibles: cobrosPaginados.length, total: cobrosFiltrados.length }) }}
              </span>
              <span>
                {{ t('conciliacion.total') }} <strong class="font-semibold text-tinta">{{ totalProcesado }} COP</strong>
              </span>
            </div>
          </div>
        </div>

        <div class="flex w-full items-start gap-4 rounded border border-borde bg-white p-4">
          <IconoMaterial nombre="gavel" class="mt-0.5 h-6 w-6 shrink-0 text-primario" />
          <div>
            <h2 class="text-[16px] font-semibold leading-[22px] text-tinta">
              {{ t('conciliacion.controlTitulo') }}
            </h2>
            <p class="text-[11px] leading-[18px] text-tinta-suave">
              {{ t('conciliacion.controlAntes') }} <em>{{ t('conciliacion.estado.RECHAZADO') }}</em>
              {{ t('conciliacion.controlDespues') }}
              {{ t('conciliacion.controlEnLinea') }}
              {{ t('conciliacion.controlRecurrente') }}
            </p>
          </div>
        </div>
      </template>
    </main>

    <FooterPantalla />
  </div>
</template>
