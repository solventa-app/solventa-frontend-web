<!--
  G-02b · Home del Operador de back-office (Figma yKWD8jrwERtJkuSj0mk0Gz "Solventa-web-Final", nodo
  2001:794). Mismo tratamiento que G-02/G-02a (franja "Cerrar sesión" en vez de Barra de navegación,
  SG-01: nunca las dos juntas en una pantalla "home").

  Re-verificada contra el archivo correcto (una ronda anterior la había construido contra
  2vfK0e8t62OvvDk4c7QnK5 "Solventa-web", el equivocado, aunque en los puntos más visibles —estructura
  general, copy de las tarjetas, nota de pie— ya coincidía por casualidad con el archivo correcto):
  - El título del header (nodo 2001:846) es "Home del Operador"; el H1 real y VISIBLE del cuerpo
    (nodo 2001:806) es un texto distinto, "Home / Dashboard — Operador" — antes ambos mostraban el
    mismo texto largo y el H1 estaba oculto (sr-only), duplicando contenido en vez de usar los dos
    textos reales del mockup (mismo patrón ya aplicado en G-02/G-02a: el header nombra el portal, el
    H1 es el texto visible del cuerpo).
  - "Cerrar sesión" (nodo 2001:801) es peso normal, no negrita (`font-bold` era incorrecto).
  - Las dos tarjetas de acceso llevan un ícono (nodos 2001:809/818) que antes no se mostraba; se usa
    el mismo tratamiento de insignia circular (`bg-info-fondo` + ícono `badge`) que ya usan las
    tarjetas de G-02/G-02a, para mantener consistencia visual entre los 3 homes del proyecto (el nodo
    de este frame específico muestra el ícono suelto de 24px sin círculo, pero se prioriza la
    consistencia entre pantallas hermanas sobre una fidelidad pixel-perfect de un detalle menor).
-->
<script setup lang="ts">
import { Divisor, FooterPantalla, HeaderPantalla, TituloPantalla } from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
</script>

<template>
  <div data-pantalla="G-02b" class="flex min-h-screen flex-col bg-fondo">
    <HeaderPantalla titulo="Home del Operador" />

    <main class="mx-auto flex w-full max-w-[880px] flex-1 flex-col gap-5 px-10 py-10">
      <RouterLink
        to="/login"
        class="flex w-full items-center justify-end gap-2 rounded-md bg-fondo px-[14px] py-[10px] text-[13px] font-normal text-enlace hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
      >
        Cerrar sesión
        <IconoMaterial nombre="logout" class="h-[18px] w-[18px]" />
      </RouterLink>

      <Divisor />

      <section class="flex w-full flex-col gap-5">
        <TituloPantalla>Home / Dashboard — Operador</TituloPantalla>

        <div class="flex flex-wrap items-stretch gap-4">
          <!--
            "Siniestros": HU-W04 (Siniestros asistidos y peritaje) existe en el prototipo completo
            pero no está en el alcance de este sprint (sin pantalla ni campo de contrato propio),
            así que la tarjeta se muestra fiel al mockup pero sin navegación real.
          -->
          <div
            class="flex w-[272px] gap-3 rounded-md border border-borde bg-white p-5"
            aria-disabled="true"
          >
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
            class="flex w-[272px] gap-3 rounded-md border border-borde bg-white p-5 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
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
  </div>
</template>
