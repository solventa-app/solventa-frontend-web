<!--
  G-02 · Home del Cliente (Figma 2vfK0e8t62OvvDk4c7QnK5 "Solventa-web", nodo 46:27). Mismo
  tratamiento que G-02a (HomeAsesor.vue, esta misma rama) y G-02b (HomeOperador.vue, construida en
  la rama feature/HU-W05-conciliacion, fuera del alcance de archivos de esta rama): franja "Cerrar
  sesión" de ancho completo en vez de Barra de navegación (SG-01: nunca las dos juntas en una
  pantalla "home").

  Antes de esta pantalla no había ningún camino de clic real hacia /cotizacion: quedaba como
  PantallaPendiente. Una sola tarjeta, a propósito (fiel al mockup y a la nota del propio Figma): no
  hay otra historia de web en alcance de este sprint para el rol Cliente.
-->
<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Divisor, FooterPantalla, HeaderPantalla, TituloPantalla } from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
import { useSesion } from '../composables/useSesion'

const router = useRouter()
const { estado, cerrarSesion } = useSesion()

function alCerrarSesion() {
  cerrarSesion()
  router.push('/login')
}
</script>

<template>
  <div data-pantalla="G-02" class="flex min-h-screen flex-col bg-fondo">
    <HeaderPantalla titulo="Home / Dashboard — Cliente" />
    <TituloPantalla class="sr-only">Home / Dashboard — Cliente</TituloPantalla>

    <main class="mx-auto flex w-full max-w-[880px] flex-1 flex-col gap-5 px-10 py-10">
      <button
        type="button"
        class="flex w-full items-center justify-end gap-2 rounded-md bg-fondo px-[14px] py-[10px] text-[13px] font-bold text-enlace hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
        @click="alCerrarSesion"
      >
        Cerrar sesión
        <IconoMaterial nombre="logout" class="h-[18px] w-[18px]" />
      </button>

      <Divisor />

      <section class="flex w-full flex-col gap-5">
        <p class="text-[13px] text-tinta-suave">Hola, {{ estado.nombre }}</p>

        <div class="flex flex-wrap items-stretch gap-4">
          <RouterLink
            to="/cotizacion"
            class="flex w-[272px] flex-col gap-2 rounded-md border border-borde bg-white p-5 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
          >
            <p class="text-[15px] font-bold text-tinta">Nueva cotización</p>
            <p class="text-[12px] text-tinta-suave">Perfilar y ofertar un seguro de vida hipotecario</p>
          </RouterLink>
        </div>

        <p class="text-[11px] text-tinta-suave">
          Landing post-login para el rol Cliente. Una sola tarjeta a propósito: no hay otra HU de web
          en alcance para este rol.
        </p>
      </section>
    </main>

    <FooterPantalla />
  </div>
</template>
