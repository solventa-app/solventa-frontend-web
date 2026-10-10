<!--
  W05-01 · Conciliación de pagos. Reconstruida para ser fiel al prototipo de alta fidelidad
  (Figma 2vfK0e8t62OvvDk4c7QnK5 "Solventa-web", frame W05-01 = nodo 27:44), que reemplaza al
  archivo "Solventa-web-Final" usado en la primera versión de esta pantalla. CA-W05-01 (ver estado
  de cobro) y CA-W05-02 (reintentar un cobro rechazado).

  Cambios de fidelidad frente a la primera versión:
  - Las columnas "Cliente" e "ID de transacción" SÍ están en este prototipo (en el primero no,
    por eso se habían omitido). El contrato (contrato/schema.graphql) no tenía esos campos: se
    agregaron como cambio aditivo (Cobro.cliente, Cobro.idTransaccion) adelantado en el frontend
    — ver contrato/CHANGELOG.md — porque todavía falta el PR gemelo del backend (ADR-06 regla 2).
  - Se usa MigasDePan (ahora con el diseño real de "Barra de navegación": franja con ícono de
    casa) en vez del enlace de texto suelto "‹ Volver a Inicio" de la primera versión.
  - El indicador de "corte operativo" y el bloque de "Control de dispersión y reintentos
    automáticos" NO están en este prototipo: se quitan (eran contenido de la versión anterior del
    Figma, no de este).
  - Pestaña "Pendiente" (no "Pendiente de reintento"): se deja el texto tal cual el mockup.
  - Al reintentar un cobro, aparece un toast "Cobro reenviado a la pasarela" que se oculta solo a
    los 3-4s (anotación del propio archivo de Figma).
  - "ID de transacción" / "N.º de póliza" usan una fuente monoespaciada (el mockup pide IBM Plex
    Mono; aquí se usa la pila monoespaciada del sistema vía la utilidad font-mono en vez de sumar
    una fuente nueva al proyecto — mismo efecto visual sin una dependencia más).
-->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Boton, Divisor, FooterPantalla, HeaderPantalla, MigasDePan, TituloPantalla } from '../components/ui'
import { useConciliacion } from '../composables/useConciliacion'
import { formatearFecha, formatearMonto } from '../utils/formato'
import type { Cobro, EstadoCobro } from '../graphql/tipos'

const { estado, cargarCobros, reintentarCobro } = useConciliacion()

const PESTANAS: { etiqueta: string; valor?: EstadoCobro }[] = [
  { etiqueta: 'Todos' },
  { etiqueta: 'Cobrando', valor: 'COBRANDO' },
  { etiqueta: 'Cobrado', valor: 'COBRADO' },
  { etiqueta: 'Rechazado', valor: 'RECHAZADO' },
  { etiqueta: 'Pendiente', valor: 'PENDIENTE' },
]

const pestanaActiva = ref<EstadoCobro | undefined>(undefined)

const cobrosFiltrados = computed(() =>
  pestanaActiva.value ? estado.cobros.filter((c) => c.estado === pestanaActiva.value) : estado.cobros,
)

const INSIGNIA: Record<EstadoCobro, { etiqueta: string; texto: string; fondo: string }> = {
  COBRADO: { etiqueta: 'Cobrado', texto: 'text-exito', fondo: 'bg-exito-fondo' },
  COBRANDO: { etiqueta: 'Cobrando', texto: 'text-info', fondo: 'bg-info-fondo' },
  RECHAZADO: { etiqueta: 'Rechazado', texto: 'text-error', fondo: 'bg-error-fondo' },
  PENDIENTE: { etiqueta: 'Pendiente', texto: 'text-alerta', fondo: 'bg-alerta-fondo' },
}

function fechaDelIntento(cobro: Cobro): string {
  return cobro.estado === 'COBRANDO' ? 'En curso' : formatearFecha(cobro.actualizadoEn)
}

// Toast "Cobro reenviado a la pasarela": temporal, se oculta solo a los 3-4s (anotación del
// propio Figma). Vive en la vista (no en el composable): es un efecto de UI de esta pantalla, no
// estado de negocio que otra pantalla necesite leer.
const mostrarToast = ref(false)
let temporizadorToast: ReturnType<typeof setTimeout> | undefined

async function alReintentar(cobroId: string) {
  await reintentarCobro(cobroId)
  if (estado.error) return // no se confirma un reenvío que en realidad falló
  mostrarToast.value = true
  clearTimeout(temporizadorToast)
  temporizadorToast = setTimeout(() => {
    mostrarToast.value = false
  }, 3500)
}

onUnmounted(() => clearTimeout(temporizadorToast))
onMounted(() => cargarCobros())
</script>

<template>
  <div data-pantalla="W05-01" class="flex min-h-screen flex-col bg-fondo">
    <HeaderPantalla titulo="Conciliación de pagos" />
    <TituloPantalla class="sr-only">Conciliación de pagos</TituloPantalla>

    <main class="mx-auto flex w-full max-w-[1100px] flex-1 flex-col gap-5 px-10 py-6">
      <MigasDePan seccion="Recaudo de prima" aInicio="/operador" />
      <Divisor />

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
        <div role="tablist" aria-label="Filtros de estado de conciliación" class="flex w-full flex-wrap items-center gap-2">
          <button
            v-for="pestana in PESTANAS"
            :key="pestana.etiqueta"
            type="button"
            role="tab"
            :aria-selected="pestanaActiva === pestana.valor"
            class="rounded-xl px-[12px] py-[6px] text-[12px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
            :class="pestanaActiva === pestana.valor ? 'bg-tinta text-white' : 'bg-fondo text-tinta-suave hover:bg-borde/40'"
            @click="pestanaActiva = pestana.valor"
          >
            {{ pestana.etiqueta }}
          </button>
        </div>

        <Divisor />

        <div class="w-full overflow-auto">
          <table class="w-full min-w-[880px] border-collapse text-left">
            <thead>
              <tr class="text-[12px] font-bold text-tinta-suave">
                <th scope="col" class="py-[10px] pr-[14px]">Cliente</th>
                <th scope="col" class="py-[10px] pr-[14px]">N.º de póliza</th>
                <th scope="col" class="py-[10px] pr-[14px]">Monto</th>
                <th scope="col" class="py-[10px] pr-[14px]">Estado</th>
                <th scope="col" class="py-[10px] pr-[14px]">Fecha / hora</th>
                <th scope="col" class="py-[10px] pr-[14px]">ID transacción</th>
                <th scope="col" class="py-[10px]"><span class="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="cobrosFiltrados.length === 0">
                <td colspan="7" class="py-6 text-center text-[13px] text-tinta-suave">No hay cobros en este estado.</td>
              </tr>
              <tr v-for="cobro in cobrosFiltrados" :key="cobro.id">
                <td class="py-[10px] pr-[14px] text-[13px] text-tinta">{{ cobro.cliente }}</td>
                <td class="py-[10px] pr-[14px] font-mono text-[12px] text-tinta-suave">{{ cobro.polizaId }}</td>
                <td class="py-[10px] pr-[14px] text-[13px] text-tinta">{{ formatearMonto(cobro.monto) }}</td>
                <td class="py-[10px] pr-[14px]">
                  <span
                    class="inline-flex items-center rounded-xl px-2 py-[3px] text-[11px] font-bold"
                    :class="[INSIGNIA[cobro.estado].fondo, INSIGNIA[cobro.estado].texto]"
                  >
                    {{ INSIGNIA[cobro.estado].etiqueta }}
                  </span>
                </td>
                <td class="py-[10px] pr-[14px] text-[12px]" :class="cobro.estado === 'COBRANDO' ? 'text-tinta-suave' : 'text-tinta-suave'">
                  {{ fechaDelIntento(cobro) }}
                </td>
                <td class="py-[10px] pr-[14px] font-mono text-[11px] text-tinta-suave">{{ cobro.idTransaccion ?? '—' }}</td>
                <td class="py-[10px]">
                  <!--
                    El botón secundario de la librería (Boton.vue) es azul (border-primario /
                    text-primario); la instancia puntual de este botón en el Figma trae borde y
                    texto gris neutro (#999/#333). Se reutiliza el componente compartido tal cual
                    en vez de ajustarlo para esta sola instancia — mismo criterio ya documentado
                    en Boton.vue (la ficha de componentes base de SG-01 manda sobre una instancia
                    suelta de Figma).
                  -->
                  <Boton
                    v-if="cobro.estado === 'RECHAZADO'"
                    variante="secundario"
                    :disabled="estado.reintentando === cobro.id"
                    :aria-busy="estado.reintentando === cobro.id"
                    @click="alReintentar(cobro.id)"
                  >
                    {{ estado.reintentando === cobro.id ? 'Reintentando…' : 'Reintentar cobro' }}
                  </Boton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </main>

    <FooterPantalla />
  </div>
</template>
