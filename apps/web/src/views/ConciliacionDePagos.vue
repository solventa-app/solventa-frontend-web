<!--
  W05-01 · Conciliación de pagos (Figma 2001:3156), CA-W05-01 (ver estado de cobro) y CA-W05-02
  (reintentar un cobro rechazado). No usa MigasDePan: el mockup trae un enlace simple "‹ Volver a
  Inicio", no la barra formal "Inicio › Sección" de las pantallas de cliente — se respeta tal cual,
  y tampoco lleva la barra de "Cerrar sesión" de las pantallas Home (SG-01: una sola barra de
  navegación por pantalla).

  Brecha de fidelidad con el contrato (contrato/schema.graphql, tipo Cobro: id, polizaId, estado,
  monto, actualizadoEn): el mockup trae columnas "Cliente" e "ID de transacción" que el contrato NO
  respalda (no hay nombre de cliente ni id de transacción en el tipo Cobro). Siguiendo el precedente
  de HU-W01 (el contrato manda sobre el mockup literal), se omiten esas dos columnas en vez de
  inventar datos; "N.º de póliza" usa `polizaId` tal cual lo expone el contrato.

  "Fecha del intento" para un cobro en estado COBRANDO se muestra como "en curso" (igual que el
  mockup) en vez de formatear `actualizadoEn`: mientras se está cobrando no hay todavía una fecha de
  intento que mostrar, solo la hora en que entró a ese estado.

  "Reintentar cobro" solo aparece en filas RECHAZADO (así está en el mockup: la fila PENDIENTE no
  trae el botón, ver nota en el header de la tabla más abajo) — PENDIENTE representa un reintento ya
  agendado automáticamente, no uno que el operador dispare a mano.

  El indicador de "corte operativo" y el bloque de "Control de dispersión y reintentos automáticos"
  son texto informativo estático (no hay campo del contrato detrás): se mantienen como copy fijo,
  igual que otros textos de ayuda/legal ya existentes en la librería (FooterPantalla), documentado
  aquí por transparencia en vez de fabricar un campo que no existe.
-->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
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

const totalProcesado = computed(() => {
  const moneda = cobrosFiltrados.value[0]?.monto.moneda ?? 'COP'
  const suma = cobrosFiltrados.value.reduce((acc, c) => acc + Number(c.monto.valor), 0)
  return formatearMonto({ valor: String(suma), moneda })
})

const INSIGNIA: Record<EstadoCobro, { etiqueta: string; icono: 'check_circle' | 'sync' | 'cancel' | 'schedule'; texto: string; fondo: string }> = {
  COBRADO: { etiqueta: 'Cobrado', icono: 'check_circle', texto: 'text-exito', fondo: 'bg-exito-fondo' },
  COBRANDO: { etiqueta: 'Cobrando', icono: 'sync', texto: 'text-info', fondo: 'bg-info-fondo' },
  RECHAZADO: { etiqueta: 'Rechazado', icono: 'cancel', texto: 'text-error', fondo: 'bg-error-fondo' },
  PENDIENTE: { etiqueta: 'Pendiente de reintento', icono: 'schedule', texto: 'text-alerta', fondo: 'bg-alerta-fondo' },
}

function fechaDelIntento(cobro: Cobro): string {
  return cobro.estado === 'COBRANDO' ? 'en curso' : formatearFecha(cobro.actualizadoEn)
}

onMounted(() => cargarCobros())
</script>

<template>
  <div data-pantalla="W05-01" class="flex min-h-screen flex-col bg-fondo">
    <HeaderPantalla titulo="Conciliación de pagos" />

    <main class="mx-auto flex w-full max-w-[1000px] flex-1 flex-col gap-5 px-10 py-6">
      <RouterLink to="/operador" class="text-[13px] text-enlace hover:underline">‹ Volver a Inicio</RouterLink>

      <!--
        El mockup de Figma no repite el título dentro del cuerpo (solo aparece en la barra superior,
        que es un <span>, no un <h1>): se agrega aquí oculto visualmente (sr-only) para cumplir la
        convención del proyecto de un <h1> por pantalla (ver TituloPantalla.vue) sin duplicar texto
        visible que el diseño no pide.
      -->
      <TituloPantalla class="sr-only">Conciliación de pagos</TituloPantalla>

      <div class="flex w-full justify-end">
        <div class="flex items-center gap-1 rounded-[2px] border border-borde bg-white px-[17px] py-[5px]">
          <IconoMaterial nombre="info" class="h-6 w-6 shrink-0 text-tinta-suave" />
          <p class="text-[11px] text-tinta-suave">Corte contable diario: 18:00 COT • Modo pasarela activa</p>
        </div>
      </div>

      <p v-if="estado.cargando" class="text-[13px] text-tinta-suave">Cargando conciliación de pagos…</p>
      <p v-else-if="estado.error" role="alert" class="flex items-center gap-1 text-[13px] text-error">
        <IconoMaterial nombre="cancel" class="h-[14px] w-[14px] shrink-0" />{{ estado.error }}
      </p>

      <template v-else>
        <div role="tablist" aria-label="Filtros de estado de conciliación" class="flex w-full items-center gap-1 overflow-auto pb-2">
          <button
            v-for="pestana in PESTANAS"
            :key="pestana.etiqueta"
            type="button"
            role="tab"
            :aria-selected="pestanaActiva === pestana.valor"
            class="flex h-[44px] shrink-0 items-center gap-1 rounded-xl px-4 text-[12px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
            :class="
              pestanaActiva === pestana.valor
                ? 'bg-primario text-white'
                : 'border border-borde bg-white text-tinta-suave hover:bg-fondo'
            "
            @click="pestanaActiva = pestana.valor"
          >
            {{ pestana.etiqueta }}
            <span
              v-if="!pestana.valor"
              class="rounded-xl px-[6px] py-[2px] text-[11px]"
              :class="pestanaActiva === pestana.valor ? 'bg-white/20' : 'bg-fondo'"
            >
              {{ estado.cobros.length }}
            </span>
          </button>
        </div>

        <div class="w-full overflow-hidden rounded-lg border border-borde bg-white">
          <div class="w-full overflow-auto">
            <table class="w-full border-collapse text-left">
              <thead class="border-b border-borde bg-[#f6f3f2]">
                <tr>
                  <th scope="col" class="px-4 py-[18px] text-[13px] font-semibold text-tinta">N.º de póliza</th>
                  <th scope="col" class="px-4 py-[18px] text-right text-[13px] font-semibold text-tinta">Prima</th>
                  <th scope="col" class="px-4 py-[18px] text-[13px] font-semibold text-tinta">Estado</th>
                  <th scope="col" class="px-4 py-[18px] text-[13px] font-semibold text-tinta">Fecha del intento</th>
                  <!-- Solo las filas RECHAZADO traen acción (ver nota de fidelidad arriba). -->
                  <th scope="col" class="px-4 py-[18px] text-center text-[13px] font-semibold text-tinta">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="cobrosFiltrados.length === 0">
                  <td colspan="5" class="px-4 py-6 text-center text-[13px] text-tinta-suave">
                    No hay cobros en este estado.
                  </td>
                </tr>
                <tr v-for="cobro in cobrosFiltrados" :key="cobro.id" class="border-t border-borde">
                  <td class="px-4 py-[18px] text-[13px] text-tinta">{{ cobro.polizaId }}</td>
                  <td class="px-4 py-[18px] text-right text-[13px] text-tinta">{{ formatearMonto(cobro.monto) }}</td>
                  <td class="px-4 py-[18px]">
                    <span
                      class="inline-flex items-center gap-1 rounded-xl px-[10px] py-[4px] text-[11px] font-semibold"
                      :class="[INSIGNIA[cobro.estado].fondo, INSIGNIA[cobro.estado].texto]"
                    >
                      <IconoMaterial :nombre="INSIGNIA[cobro.estado].icono" class="h-[14px] w-[14px] shrink-0" />
                      {{ INSIGNIA[cobro.estado].etiqueta }}
                    </span>
                  </td>
                  <td class="px-4 py-[18px] text-[13px]" :class="cobro.estado === 'COBRANDO' ? 'italic text-tinta-suave' : 'text-tinta-suave'">
                    {{ fechaDelIntento(cobro) }}
                  </td>
                  <td class="px-4 py-[18px] text-center">
                    <Boton
                      v-if="cobro.estado === 'RECHAZADO'"
                      variante="secundario"
                      :disabled="estado.reintentando === cobro.id"
                      :aria-busy="estado.reintentando === cobro.id"
                      @click="reintentarCobro(cobro.id)"
                    >
                      <IconoMaterial nombre="refresh" class="mr-1 h-[18px] w-[18px] shrink-0" />
                      {{ estado.reintentando === cobro.id ? 'Reintentando…' : 'Reintentar cobro' }}
                    </Boton>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="flex items-center justify-between border-t border-borde bg-[#f6f3f2] px-4 py-[16px]">
            <p class="flex items-center gap-1 text-[11px] text-tinta-suave">
              <IconoMaterial nombre="swap_horiz" class="h-6 w-6 shrink-0" />
              Mostrando {{ cobrosFiltrados.length }} transacciones sincronizadas con Core Asegurador
            </p>
            <p class="text-[11px] text-tinta-suave">
              Total procesado: <span class="font-semibold text-tinta">{{ totalProcesado }}</span>
            </p>
          </div>
        </div>

        <div class="flex w-full items-start gap-4 rounded border border-borde bg-white p-[17px]">
          <IconoMaterial nombre="gavel" class="h-6 w-6 shrink-0 text-tinta-suave" />
          <div class="flex flex-col gap-1">
            <h2 class="text-[16px] font-semibold text-tinta">Control de dispersión y reintentos automáticos</h2>
            <p class="text-[11px] text-tinta-suave">
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
