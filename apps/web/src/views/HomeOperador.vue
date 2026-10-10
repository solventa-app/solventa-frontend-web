<!--
  G-02b · Home del Operador de back-office. Reconstruida para ser fiel al prototipo de alta
  fidelidad (Figma 2vfK0e8t62OvvDk4c7QnK5 "Solventa-web", frame G-02b = nodo 51:4), que reemplaza
  al archivo "Solventa-web-Final" usado en la primera versión de esta pantalla.

  Cambios de fidelidad frente a la primera versión:
  - El título único de la pantalla es "Home / Dashboard — Operador" (antes había dos textos
    distintos: uno corto en el header y uno largo en el cuerpo). Aquí se usa ese único texto en
    HeaderPantalla y se agrega un <h1> oculto (sr-only) con el mismo texto: la convención del
    proyecto exige un <h1> por pantalla (ver TituloPantalla.vue) pero el mockup no repite el
    título visualmente.
  - "Cerrar sesión" ahora es una franja de ancho completo (mismo tratamiento que la barra de
    navegación de las pantallas de contenido), no un enlace suelto alineado a la derecha.
-->
<script setup lang="ts">
import { Divisor, FooterPantalla, HeaderPantalla, TituloPantalla } from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
</script>

<template>
  <div data-pantalla="G-02b" class="flex min-h-screen flex-col bg-fondo">
    <HeaderPantalla titulo="Home / Dashboard — Operador" />
    <TituloPantalla class="sr-only">Home / Dashboard — Operador</TituloPantalla>

    <main class="mx-auto flex w-full max-w-[880px] flex-1 flex-col gap-5 px-10 py-10">
      <RouterLink
        to="/login"
        class="flex w-full items-center justify-end gap-2 rounded-md bg-fondo px-[14px] py-[10px] text-[13px] font-bold text-enlace hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
      >
        Cerrar sesión
        <IconoMaterial nombre="logout" class="h-[18px] w-[18px]" />
      </RouterLink>

      <Divisor />

      <section class="flex w-full flex-col gap-5">
        <div class="flex flex-wrap items-stretch gap-4">
          <!--
            "Siniestros": HU-W04 (Siniestros asistidos y peritaje) existe en el prototipo completo
            pero no está en el alcance de este sprint (sin pantalla ni campo de contrato propio),
            así que la tarjeta se muestra fiel al mockup pero sin navegación real.
          -->
          <div
            class="flex w-[272px] flex-col gap-2 rounded-md border border-borde bg-white p-5"
            aria-disabled="true"
          >
            <p class="text-[15px] font-bold text-tinta">Siniestros</p>
            <p class="text-[12px] text-tinta-suave">Bandeja de siniestros pendientes</p>
          </div>

          <RouterLink
            to="/operador/conciliacion"
            class="flex w-[272px] flex-col gap-2 rounded-md border border-borde bg-white p-5 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
          >
            <p class="text-[15px] font-bold text-tinta">Conciliación de pagos</p>
            <p class="text-[12px] text-tinta-suave">Ver estado de cobro de primas</p>
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
