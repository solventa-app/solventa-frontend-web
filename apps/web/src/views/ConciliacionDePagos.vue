<!--
  W05-01 · Conciliación de pagos (Figma yKWD8jrwERtJkuSj0mk0Gz "Solventa-web-Final", nodo
  2001:3156). CA-W05-01 (ver estado de cobro) y CA-W05-02 (reintentar un cobro rechazado).

  Re-verificada contra el archivo correcto (confirmado con captura de pantalla vía
  get_design_context, no solo con la metadata): una ronda anterior había reconstruido esta pantalla
  citando 2vfK0e8t62OvvDk4c7QnK5 "Solventa-web" (nodo 27:44, el archivo equivocado), con varias
  regresiones de fidelidad sobre el archivo correcto — en algunos casos revirtiendo a propósito
  contenido que la primera versión de la pantalla ya tenía bien:
  - El enlace "‹ Volver a Inicio" (nodo 2008:32) SÍ es el real: la ronda anterior lo había cambiado
    por `MigasDePan` (la Barra de navegación "Inicio › Sección") creyendo que corregía una
    regresión, pero el archivo correcto usa el enlace de texto suelto, no la barra de breadcrumb —
    a diferencia del resto de pantallas de la app, esta es una vista de back-office de una sola
    tabla, no un flujo de varios pasos.
  - El indicador "Corte contable diario: 18:00 COT • Modo pasarela activa" (nodo 2001:3160-3164) SÍ
    está en el archivo correcto — se había quitado por error.
  - La pestaña "Todos" lleva un contador (nodo 2001:3168-3169, total de cobros).
  - Las columnas son "Prima" (no "Monto") y "Fecha del intento" (no "Fecha / hora"); "ID de
    transacción" (no "ID transacción"); "Acciones" es un encabezado VISIBLE, no oculto (nodos
    2001:3187/3191/3193/3195).
  - La pestaña es "Pendiente de reintento" (no "Pendiente" a secas, nodo 2001:3177) — una ronda
    anterior la había dejado así citando "el mockup" sin verificar contra el archivo correcto.
  - Las insignias de estado llevan ícono (nodos 2001:3206/3224/3242/3263).
  - El pie de la tabla ("Mostrando N transacciones sincronizadas con Core Asegurador" / "Total
    procesado: $X", nodo 2001:3290) no existía.
  - El bloque "Control de dispersión y reintentos automáticos" (nodo 2001:3298-3306) SÍ está en el
    archivo correcto, con texto legal real sobre máximo de reintentos y registro de auditoría — se
    había quitado por error creyendo que no pertenecía a este prototipo.
  - El botón "Reintentar cobro" del componente compartido (`Boton.vue`, variante secundaria: borde y
    texto `primario` #1e4680) SÍ coincide con la instancia real de este nodo (antes se documentaba
    como una diferencia deliberada frente a un supuesto gris #999/#333 del mockup, pero ese gris
    pertenecía al archivo equivocado) — no hay ninguna desviación real en este punto.
  - "ID de transacción" / "N.º de póliza" usan una fuente monoespaciada (el mockup pide Liberation
    Mono; aquí se usa la pila monoespaciada del sistema vía la utilidad font-mono en vez de sumar
    una fuente nueva al proyecto — mismo efecto visual sin una dependencia más).
  - Las columnas "Cliente" e "ID de transacción" no estaban en el contrato original: se agregaron
    como cambio aditivo (Cobro.cliente, Cobro.idTransaccion) adelantado en el frontend — ver
    contrato/CHANGELOG.md — porque todavía falta el PR gemelo del backend (ADR-06 regla 2).
  - Al reintentar un cobro, aparece un toast "Cobro reenviado a la pasarela" que se oculta solo a
    los 3-4s (anotación del propio archivo de Figma).
  - `formatearFecha` (utils/formato.ts) se corrige para producir "12 sep 2026, 10:45 a. m." (con
    año y hora de 12h con meridiano en español) en vez de "05 sep, 09:14" (sin año, hora 24h): el
    formato anterior también estaba construido contra el archivo de Figma equivocado.

  Triage de la revisión de los 2 agentes (UX senior + QA senior) sobre el estado anterior:
  - [ALTA] Un reintento fallido (reintentarCobro) escribía en el mismo `estado.error` que usa
    `cargarCobros()`, así que el `v-else-if="estado.error"` de abajo reemplazaba toda la tabla
    (pestañas, pie, bloque legal incluidos) por el mensaje de error, aunque la lista de cobros ya
    cargada seguía siendo válida. Ahora `useConciliacion` tiene un campo separado
    `estado.errorReintento`, y aquí se muestra como una alerta no bloqueante (banner `role="alert"`)
    sin ocultar el resto de la pantalla — mismo patrón que `errorContacto` en ContactarAsesor.vue.
  - [BAJA] "en curso" (fechaDelIntento) estaba en mayúscula inicial ("En curso"); el texto literal
    del archivo correcto es minúscula.
  - [BAJA] El pie "Total procesado" no mostraba el sufijo " COP" que sí trae el texto literal del
    mockup (nodo 2001:3290) — `formatearMonto` (Intl.NumberFormat) no agrega sufijo de moneda, así
    que se agrega aquí de forma puntual, sin tocar `formatearMonto` (ningún otro monto de la app
    lleva ese sufijo en el Figma).
  - [MEDIA, gap conocido, no corregido en esta ronda] El `role="tablist"` de arriba marca
    `aria-selected` por pestaña, pero no implementa el patrón completo de WAI-ARIA APG para tablist
    (roving tabindex + flechas moviendo la selección, `aria-controls`/`role="tabpanel"` ligando cada
    pestaña con la tabla). Mismo gap aplica al `role="radiogroup"` de IngresoConRol.vue
    (feature/HU-W01-pantallas, ver su propio comentario de cabecera). Se documenta aquí en vez de
    implementarlo a medias bajo el alcance de esta ronda de arreglos.
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

// "Total procesado" del pie de tabla (nodo 2001:3297): suma de los montos de los cobros
// actualmente visibles (respeta la pestaña activa), no solo de los ya cobrados — así coincide con
// el ejemplo literal del Figma, donde la suma de los 5 cobros (incluidos Rechazado/Cobrando) da el
// total mostrado.
const totalProcesado = computed(() => {
  const moneda = cobrosFiltrados.value[0]?.monto.moneda ?? 'COP'
  const suma = cobrosFiltrados.value.reduce((acc, c) => acc + Number(c.monto.valor), 0)
  return formatearMonto({ valor: String(suma), moneda })
})

const INSIGNIA: Record<EstadoCobro, { etiqueta: string; texto: string; fondo: string; icono: 'check_circle' | 'sync' | 'cancel' | 'schedule' }> = {
  COBRADO: { etiqueta: 'Cobrado', texto: 'text-exito', fondo: 'bg-exito-fondo', icono: 'check_circle' },
  COBRANDO: { etiqueta: 'Cobrando', texto: 'text-info', fondo: 'bg-info-fondo', icono: 'sync' },
  RECHAZADO: { etiqueta: 'Rechazado', texto: 'text-error', fondo: 'bg-error-fondo', icono: 'cancel' },
  PENDIENTE: { etiqueta: 'Pendiente', texto: 'text-alerta', fondo: 'bg-alerta-fondo', icono: 'schedule' },
}

function fechaDelIntento(cobro: Cobro): string {
  return cobro.estado === 'COBRANDO' ? 'en curso' : formatearFecha(cobro.actualizadoEn)
}

// Toast "Cobro reenviado a la pasarela": temporal, se oculta solo a los 3-4s (anotación del
// propio Figma). Vive en la vista (no en el composable): es un efecto de UI de esta pantalla, no
// estado de negocio que otra pantalla necesite leer.
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

onUnmounted(() => clearTimeout(temporizadorToast))
onMounted(() => cargarCobros())
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
        <span class="flex items-center gap-1 rounded-sm border border-borde bg-white px-3 py-1.5 text-[11px] text-tinta-suave">
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
        <div v-if="estado.errorReintento" role="alert" class="w-full rounded-md border border-error bg-error-fondo px-4 py-3 text-[13px] text-error">
          {{ estado.errorReintento }}
        </div>

        <div role="tablist" aria-label="Filtros de estado de conciliación" class="flex w-full flex-wrap items-center gap-2">
          <button
            v-for="pestana in PESTANAS"
            :key="pestana.etiqueta"
            type="button"
            role="tab"
            :aria-selected="pestanaActiva === pestana.valor"
            class="flex h-11 items-center gap-1.5 rounded-xl px-[16px] text-[12px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
            :class="pestanaActiva === pestana.valor ? 'bg-primario text-white' : 'border border-borde bg-white text-tinta-suave hover:bg-fondo'"
            @click="pestanaActiva = pestana.valor"
          >
            {{ pestana.etiqueta }}
            <span v-if="!pestana.valor" class="rounded-xl bg-white/20 px-1.5 py-0.5 text-[11px]">{{ estado.cobros.length }}</span>
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
                  <td colspan="7" class="py-6 text-center text-[13px] text-tinta-suave">No hay cobros en este estado.</td>
                </tr>
                <tr v-for="cobro in cobrosFiltrados" :key="cobro.id" class="border-b border-borde last:border-b-0">
                  <td class="py-[24px] pl-4 pr-[14px] text-[13px] text-tinta">{{ cobro.cliente }}</td>
                  <td class="py-[24px] pr-[14px] font-mono text-[13px] text-tinta-suave">{{ cobro.polizaId }}</td>
                  <td class="py-[24px] pr-[14px] text-right text-[13px] text-tinta">{{ formatearMonto(cobro.monto) }}</td>
                  <td class="py-[18px] pr-[14px]">
                    <span
                      class="inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-semibold"
                      :class="[INSIGNIA[cobro.estado].fondo, INSIGNIA[cobro.estado].texto]"
                    >
                      <IconoMaterial :nombre="INSIGNIA[cobro.estado].icono" class="h-3.5 w-3.5" />
                      {{ INSIGNIA[cobro.estado].etiqueta }}
                    </span>
                  </td>
                  <td class="py-[24px] pr-[14px] text-[13px] text-tinta-suave" :class="{ italic: cobro.estado === 'COBRANDO' }">
                    {{ fechaDelIntento(cobro) }}
                  </td>
                  <td class="py-[24px] pr-[14px] font-mono text-[11px] text-tinta">{{ cobro.idTransaccion ?? '—' }}</td>
                  <td class="py-[16px] pr-4 text-center">
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
            <h2 class="text-[16px] font-semibold leading-[22px] text-tinta">Control de dispersión y reintentos automáticos</h2>
            <p class="text-[11px] leading-[18px] text-tinta-suave">
              Las pólizas en estado <em>Rechazado</em> permiten hasta un máximo de tres reintentos
              operativos antes de suspender la vigencia provisional según la Circular Básica Jurídica
              de la Superintendencia Financiera de Colombia. Todos los eventos de cobro generan
              registro inmutable de auditoría.
            </p>
          </div>
        </div>
      </template>
    </main>

    <FooterPantalla />
  </div>
</template>
