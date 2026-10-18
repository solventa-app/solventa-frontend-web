<!--
  W05-01 · Conciliación de pagos (Figma "Solventa-web-Final", nodo 2001:3156). CA-W05-01 (ver el estado
  de cada cobro) y CA-W05-02 (reintentar un cobro rechazado).

  - "ID de transacción" sale vacío ("—"): el contrato del backend no expone ese campo. Está pedido como
    cambio aditivo en contrato/CHANGELOG.md.
  - El toast "Cobro reenviado a la pasarela" se oculta a los 3,5 s (anotación del propio Figma).
  - Pendiente: el `role="tablist"` no implementa el patrón completo de WAI-ARIA (roving tabindex).
-->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Boton, FooterPantalla, HeaderPantalla, TituloPantalla } from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
import { useConciliacion } from '../composables/useConciliacion'
import { formatearFecha, formatearMonto } from '../utils/formato'
import type { Cobro, EstadoCobro } from '../graphql/tipos'

const { estado, cargarCobros, reintentarCobro } = useConciliacion()

const PESTANAS: { etiqueta: string; valor?: EstadoCobro }[] = [
  { etiqueta: 'Todos' },
  { etiqueta: 'Cobrando', valor: 'COBRANDO' },
  { etiqueta: 'Cobrado', valor: 'COBRADO' },
  { etiqueta: 'Rechazado', valor: 'RECHAZADO' },
  { etiqueta: 'Pendiente de reintento', valor: 'PENDIENTE' },
]

const pestanaActiva = ref<EstadoCobro | undefined>(undefined)

const cobrosFiltrados = computed(() =>
  pestanaActiva.value ? estado.cobros.filter((c) => c.estado === pestanaActiva.value) : estado.cobros,
)

// "Total procesado" (nodo 2001:3297): suma de los cobros visibles en la pestaña activa, en cualquier estado.
const totalProcesado = computed(() => {
  const moneda = cobrosFiltrados.value[0]?.monto.moneda ?? 'COP'
  const suma = cobrosFiltrados.value.reduce((acc, c) => acc + Number(c.monto.valor), 0)
  return formatearMonto({ valor: String(suma), moneda })
})

const INSIGNIA: Record<
  EstadoCobro,
  { etiqueta: string; texto: string; fondo: string; icono: 'check_circle' | 'sync' | 'cancel' | 'schedule' }
> = {
  COBRADO: { etiqueta: 'Cobrado', texto: 'text-exito', fondo: 'bg-exito-fondo', icono: 'check_circle' },
  COBRANDO: { etiqueta: 'Cobrando', texto: 'text-info', fondo: 'bg-info-fondo', icono: 'sync' },
  RECHAZADO: { etiqueta: 'Rechazado', texto: 'text-error', fondo: 'bg-error-fondo', icono: 'cancel' },
  PENDIENTE: { etiqueta: 'Pendiente', texto: 'text-alerta', fondo: 'bg-alerta-fondo', icono: 'schedule' },
}

// CA-W05-02 (prototipo W05-01, decisión del 2026-10-17): un RECHAZADO se reintenta a mano hasta 3 veces; el
// BFF dice cuántos le quedan. Un PENDIENTE lo reintenta el sistema solo.
function puedeReintentar(cobro: Cobro): boolean {
  return cobro.estado === 'RECHAZADO' && (cobro.reintentosRestantes ?? 0) > 0
}

function fechaDelIntento(cobro: Cobro): string {
  return cobro.estado === 'COBRANDO' ? 'en curso' : formatearFecha(cobro.actualizadoEn)
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

// La tabla se vuelve a pedir sola mientras la pantalla está abierta, para ver un cobro pendiente que el
// sistema ya cobró (CA-W05-05) sin recargar la página. Sin botón nuevo: el prototipo no lo tiene. No
// recarga con la pestaña oculta y recarga apenas se vuelve a ella.
const INTERVALO_REFRESCO_MS = 30_000
let temporizadorRefresco: ReturnType<typeof setInterval> | undefined

function refrescar() {
  if (document.visibilityState === 'hidden') return
  void cargarCobros(undefined, { silencioso: true })
}

function alCambiarVisibilidad() {
  if (document.visibilityState === 'visible') refrescar()
}

onMounted(() => {
  void cargarCobros()
  temporizadorRefresco = setInterval(refrescar, INTERVALO_REFRESCO_MS)
  document.addEventListener('visibilitychange', alCambiarVisibilidad)
})

onUnmounted(() => {
  clearTimeout(temporizadorToast)
  clearInterval(temporizadorRefresco)
  document.removeEventListener('visibilitychange', alCambiarVisibilidad)
})
</script>

<template>
  <div data-pantalla="W05-01" class="flex h-screen flex-col overflow-hidden bg-fondo">
    <HeaderPantalla titulo="Conciliación de pagos" />
    <TituloPantalla class="sr-only">Conciliación de pagos</TituloPantalla>

    <main class="mx-auto flex w-full max-w-[1100px] flex-1 flex-col gap-5 overflow-y-auto px-10 py-6 min-h-0">
      <RouterLink to="/operador" class="text-[13px] font-normal text-primario hover:underline">
        ‹ Volver a Inicio
      </RouterLink>

      <div class="flex w-full justify-end">
        <span
          class="flex items-center gap-1 rounded-sm border border-borde bg-white px-3 py-1.5 text-[11px] text-tinta-suave"
        >
          <IconoMaterial nombre="info" class="h-[18px] w-[18px]" />
          Corte contable diario: 18:00 COT • Modo pasarela activa
        </span>
      </div>

      <div
        role="status"
        aria-live="polite"
        class="fixed right-10 top-6 z-10 flex items-center gap-2 rounded-md bg-tinta px-4 py-[10px] text-[13px] font-bold text-white shadow-lg transition-opacity"
        :class="mostrarToast ? 'opacity-100' : 'pointer-events-none opacity-0'"
      >
        <span class="text-[#8cd9a6]" aria-hidden="true">✓</span>
        Cobro reenviado a la pasarela
      </div>

      <p v-if="estado.cargando" class="text-[13px] text-tinta-suave">Cargando conciliación de pagos…</p>
      <p v-else-if="estado.error" role="alert" class="text-[13px] text-error">{{ estado.error }}</p>

      <template v-else>
        <div
          v-if="estado.errorReintento"
          role="alert"
          class="w-full rounded-md border border-error bg-error-fondo px-4 py-3 text-[13px] text-error"
        >
          {{ estado.errorReintento }}
        </div>

        <div
          role="tablist"
          aria-label="Filtros de estado de conciliación"
          class="flex w-full flex-wrap items-center gap-2"
        >
          <button
            v-for="pestana in PESTANAS"
            :key="pestana.etiqueta"
            type="button"
            role="tab"
            :aria-selected="pestanaActiva === pestana.valor"
            class="flex h-11 items-center gap-1.5 rounded-xl px-[16px] text-[12px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
            :class="
              pestanaActiva === pestana.valor
                ? 'bg-primario text-white'
                : 'border border-borde bg-white text-tinta-suave hover:bg-fondo'
            "
            @click="pestanaActiva = pestana.valor"
          >
            {{ pestana.etiqueta }}
            <span v-if="!pestana.valor" class="rounded-xl bg-white/20 px-1.5 py-0.5 text-[11px]">{{
              estado.cobros.length
            }}</span>
          </button>
        </div>

        <div class="w-full overflow-hidden rounded-lg border border-borde bg-white">
          <div class="overflow-auto">
            <table class="w-full min-w-[880px] border-collapse text-left">
              <thead>
                <tr class="border-b border-borde bg-[#f6f3f2] text-[13px] font-semibold text-tinta">
                  <th scope="col" class="py-[25px] pl-4 pr-[14px]">Cliente</th>
                  <th scope="col" class="py-[25px] pr-[14px]">N.º de póliza</th>
                  <th scope="col" class="py-[25px] pr-[14px] text-right">Prima</th>
                  <th scope="col" class="py-[25px] pr-[14px]">Estado</th>
                  <th scope="col" class="py-[25px] pr-[14px]">Fecha del intento</th>
                  <th scope="col" class="py-[25px] pr-[14px]">ID de transacción</th>
                  <th scope="col" class="py-[25px] pr-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="cobrosFiltrados.length === 0">
                  <td colspan="7" class="py-6 text-center text-[13px] text-tinta-suave">
                    No hay cobros en este estado.
                  </td>
                </tr>
                <tr v-for="cobro in cobrosFiltrados" :key="cobro.id" class="border-b border-borde last:border-b-0">
                  <td class="py-[24px] pl-4 pr-[14px] text-[13px] text-tinta">{{ cobro.cliente?.nombre ?? '—' }}</td>
                  <td class="py-[24px] pr-[14px] font-mono text-[13px] text-tinta-suave">{{ cobro.polizaId }}</td>
                  <td class="py-[24px] pr-[14px] text-right text-[13px] text-tinta">
                    {{ formatearMonto(cobro.monto) }}
                  </td>
                  <td class="py-[18px] pr-[14px]">
                    <span
                      class="inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-semibold"
                      :class="[INSIGNIA[cobro.estado].fondo, INSIGNIA[cobro.estado].texto]"
                    >
                      <IconoMaterial :nombre="INSIGNIA[cobro.estado].icono" class="h-3.5 w-3.5" />
                      {{ INSIGNIA[cobro.estado].etiqueta }}
                    </span>
                  </td>
                  <td
                    class="py-[24px] pr-[14px] text-[13px] text-tinta-suave"
                    :class="{ italic: cobro.estado === 'COBRANDO' }"
                  >
                    {{ fechaDelIntento(cobro) }}
                  </td>
                  <td class="py-[24px] pr-[14px] font-mono text-[11px] text-tinta">{{ cobro.idTransaccion ?? '—' }}</td>
                  <td class="py-[16px] pr-4 text-center">
                    <Boton
                      v-if="puedeReintentar(cobro)"
                      variante="secundario"
                      :disabled="estado.reintentando === cobro.id"
                      :aria-busy="estado.reintentando === cobro.id"
                      @click="alReintentar(cobro.id)"
                    >
                      {{ estado.reintentando === cobro.id ? 'Reintentando…' : 'Reintentar cobro' }}
                    </Boton>
                    <span v-else-if="cobro.estado === 'RECHAZADO'" class="text-[11px] text-error">
                      Requiere otro medio de pago
                    </span>
                    <span v-else-if="cobro.estado === 'PENDIENTE'" class="text-[11px] text-tinta-suave">
                      Reintento automático
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="flex items-center justify-between border-t border-borde bg-[#f6f3f2] px-4 py-4">
            <span class="flex items-center gap-1 text-[11px] text-tinta-suave">
              <IconoMaterial nombre="sync" class="h-[18px] w-[18px]" />
              Mostrando {{ cobrosFiltrados.length }} transacciones sincronizadas con Core Asegurador
            </span>
            <span class="text-[11px] text-tinta-suave">
              Total procesado: <strong class="font-semibold text-tinta">{{ totalProcesado }} COP</strong>
            </span>
          </div>
        </div>

        <div class="flex w-full items-start gap-4 rounded border border-borde bg-white p-4">
          <IconoMaterial nombre="gavel" class="mt-0.5 h-6 w-6 shrink-0 text-primario" />
          <div>
            <h2 class="text-[16px] font-semibold leading-[22px] text-tinta">
              Control de dispersión y reintentos automáticos
            </h2>
            <p class="text-[11px] leading-[18px] text-tinta-suave">
              Las pólizas en estado <em>Rechazado</em> permiten hasta un máximo de tres reintentos operativos antes de
              suspender la vigencia provisional según la Circular Básica Jurídica de la Superintendencia Financiera de
              Colombia. Todos los eventos de cobro generan registro inmutable de auditoría.
            </p>
          </div>
        </div>
      </template>
    </main>

    <FooterPantalla />
  </div>
</template>
