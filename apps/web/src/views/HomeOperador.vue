<!--
  G-02b · Home del Operador de back-office (Figma 2001:794). Landing post-login del rol Operador:
  no breadcrumbs (MigasDePan no se usa aquí): la anotación de Figma (nodo 2032:118) es explícita en
  que las pantallas de inicio (G-02/G-02a/G-02b) llevan una barra de cerrar sesión y NO migas de
  pan — SG-01 dice que solo una de las dos barras aparece por pantalla, nunca ambas. La barra de
  "Cerrar sesión" se deja en línea en vez de extraerla a la librería de componentes: hoy solo la usa
  esta pantalla (G-02 y G-02a, que también la llevan, no están en el alcance de HU-W05); se puede
  promover a componente compartido si se construyen esas pantallas más adelante.
-->
<script setup lang="ts">
import { Divisor, FooterPantalla, HeaderPantalla, TituloPantalla } from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
</script>

<template>
  <div data-pantalla="G-02b" class="flex min-h-screen flex-col bg-fondo">
    <HeaderPantalla titulo="Home del Operador" />

    <main class="mx-auto flex w-full max-w-[880px] flex-1 flex-col gap-5 px-10 py-10">
      <div class="flex w-full justify-end">
        <RouterLink
          to="/login"
          class="inline-flex min-h-[44px] items-center gap-1 py-[10px] text-[13px] text-enlace hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
        >
          Cerrar sesión
          <IconoMaterial nombre="logout" class="h-[18px] w-[18px]" />
        </RouterLink>
      </div>

      <Divisor />

      <section class="flex w-full flex-col gap-5">
        <TituloPantalla>Home / Dashboard — Operador</TituloPantalla>

        <div class="flex flex-wrap items-center gap-5">
          <!--
            "Siniestros": el plano del Sprint 1 (router/pantallas.ts) no tiene una pantalla ni un
            criterio de aceptación para la bandeja de siniestros — tampoco existe en el contrato
            GraphQL. Se muestra fiel al mockup (está en 18/28 pantallas del prototipo) pero sin
            navegación real, en vez de inventar una ruta o un mock que el contrato no respalda.
          -->
          <div
            class="flex min-h-[81px] w-[272px] items-center gap-4 rounded-lg border border-borde bg-white p-[17px]"
            aria-disabled="true"
          >
            <IconoMaterial nombre="assignment" class="h-6 w-6 shrink-0 text-tinta-suave" />
            <div class="flex flex-col">
              <p class="text-[16px] font-semibold text-tinta">Siniestros</p>
              <p class="text-[13px] text-tinta-suave">Bandeja de siniestros pendientes</p>
            </div>
          </div>

          <RouterLink
            to="/operador/conciliacion"
            class="flex min-h-[81px] w-[272px] items-center gap-4 rounded-lg border border-borde bg-white p-[17px] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
          >
            <IconoMaterial nombre="payments" class="h-6 w-6 shrink-0 text-primario" />
            <div class="flex flex-col">
              <p class="text-[16px] font-semibold text-tinta">Conciliación de pagos</p>
              <p class="text-[13px] text-tinta-suave">Ver estado de cobro de primas</p>
            </div>
          </RouterLink>
        </div>

        <p class="text-[11px] text-tinta-suave">
          Landing post-login para el rol Operador. No ve &quot;Nueva cotización&quot; — cotizar pólizas no es su tarea.
        </p>
      </section>
    </main>

    <FooterPantalla />
  </div>
</template>
