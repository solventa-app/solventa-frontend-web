<!--
  G-02a · Home del Asesor comercial (Figma 2vfK0e8t62OvvDk4c7QnK5 "Solventa-web", nodo 53:3).
  Mismo tratamiento que G-02/G-02b: franja "Cerrar sesión" de ancho completo. Lleva al mismo
  formulario y flujo que el rol Cliente (W01-01 a W01-05, CA-W01-11): el copy de la tarjeta deja
  claro que el asesor cotiza en nombre de un cliente, pero la ruta es la misma /cotizacion.
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
  <div data-pantalla="G-02a" class="flex min-h-screen flex-col bg-fondo">
    <HeaderPantalla titulo="Home / Dashboard — Asesor comercial" />
    <TituloPantalla class="sr-only">Home / Dashboard — Asesor comercial</TituloPantalla>

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
        <p class="text-[13px] text-tinta-suave">Hola, {{ estado.nombre }} (Asesor comercial)</p>

        <div class="flex flex-wrap items-stretch gap-4">
          <RouterLink
            to="/cotizacion"
            class="flex w-[272px] flex-col gap-2 rounded-md border border-borde bg-white p-5 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
          >
            <p class="text-[15px] font-bold text-tinta">Nueva cotización para un cliente</p>
            <p class="text-[12px] text-tinta-suave">Iniciar el formulario de perfilamiento en nombre de un cliente</p>
          </RouterLink>
        </div>

        <p class="text-[11px] text-tinta-suave">
          Landing post-login para el rol Asesor comercial. Mismo formulario y destino que el rol
          Cliente (W01-01) — cambia el copy para dejar claro que cotiza en nombre de un cliente.
        </p>
      </section>
    </main>

    <FooterPantalla />
  </div>
</template>
