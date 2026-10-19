<!--
  G-02b · Home del Operador de back-office (Figma "Solventa-web-Final", nodo 2001:794).

  A diferencia de G-02/G-02a, "Cerrar sesión" va dentro del contenido (así está en el prototipo, nodo
  2001:799). Las tarjetas usan la insignia circular de los otros homes por consistencia.
-->
<script setup lang="ts">
import { Divisor, FooterPantalla, HeaderPantalla, ModalCerrarSesion, TituloPantalla } from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
import { useCierreDeSesion } from '../composables/useCierreDeSesion'
import { useSesion } from '../composables/useSesion'

const { estado } = useSesion()
const { modalAbierto, pedirCierre, cancelarCierre, confirmarCierre } = useCierreDeSesion()
</script>

<template>
  <div data-pantalla="G-02b" class="flex h-screen flex-col overflow-hidden bg-fondo">
    <HeaderPantalla titulo="Home del Operador" />

    <main class="mx-auto flex w-full max-w-[880px] flex-1 flex-col gap-5 overflow-y-auto px-10 py-10 min-h-0">
      <button
        type="button"
        class="flex w-full items-center justify-end gap-2 rounded-md bg-fondo px-[14px] py-[10px] text-[13px] font-normal text-enlace hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
        @click="pedirCierre"
      >
        Cerrar sesión
        <IconoMaterial nombre="logout" class="h-[18px] w-[18px]" />
      </button>

      <Divisor />

      <section class="flex w-full flex-col gap-5">
        <TituloPantalla>Home / Dashboard — Operador</TituloPantalla>
        <p class="text-[16px] text-tinta" data-dato="saludo">Hola, {{ estado.nombre }}</p>

        <div class="flex flex-wrap items-stretch gap-5">
          <!--
            "Siniestros": HU-W04 (Siniestros asistidos y peritaje) existe en el prototipo completo
            pero no está en el alcance de este sprint (sin pantalla ni campo de contrato propio),
            así que la tarjeta se muestra fiel al mockup pero sin navegación real.
          -->
          <div class="flex w-full max-w-[272px] gap-3 rounded-md border border-borde bg-white p-5" aria-disabled="true">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] bg-info-fondo">
              <IconoMaterial nombre="assignment" class="h-6 w-6 text-primario" />
            </span>
            <span class="flex flex-col gap-1">
              <span class="text-[15px] font-bold text-tinta">Siniestros</span>
              <span class="text-[12px] text-tinta-suave">Bandeja de siniestros pendientes</span>
            </span>
          </div>

          <RouterLink
            to="/operador/conciliacion"
            class="flex w-full max-w-[272px] gap-3 rounded-md border border-borde bg-white p-5 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
          >
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] bg-info-fondo">
              <IconoMaterial nombre="assignment" class="h-6 w-6 text-primario" />
            </span>
            <span class="flex flex-col gap-1">
              <span class="text-[15px] font-bold text-tinta">Conciliación de pagos</span>
              <span class="text-[12px] text-tinta-suave">Ver estado de cobro de primas</span>
            </span>
          </RouterLink>
        </div>

        <p class="text-[11px] text-tinta-suave">
          Landing post-login para el rol Operador. No ve 'Nueva cotización' — cotizar pólizas no es su tarea.
        </p>
      </section>
    </main>

    <FooterPantalla />

    <ModalCerrarSesion :abierto="modalAbierto" @cancelar="cancelarCierre" @confirmar="confirmarCierre" />
  </div>
</template>
