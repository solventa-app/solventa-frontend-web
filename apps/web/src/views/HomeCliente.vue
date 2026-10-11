<!--
  G-02 · Home del Cliente (Figma yKWD8jrwERtJkuSj0mk0Gz "Solventa-web-Final", nodo 2001:679). Mismo
  tratamiento que G-02a (HomeAsesor.vue, esta misma rama) y G-02b (HomeOperador.vue, construida en
  la rama feature/HU-W05-conciliacion, fuera del alcance de archivos de esta rama): franja "Cerrar
  sesión" de ancho completo en vez de Barra de navegación (SG-01: nunca las dos juntas en una
  pantalla "home").

  Re-verificada contra el archivo correcto (la ronda anterior la había citado y "corregido" contra
  2vfK0e8t62OvvDk4c7QnK5 "Solventa-web", el equivocado): el mockup real muestra 3 tarjetas de acceso
  (Nueva cotización, Mis pólizas, Fuentes consultadas), no 1 — "Fuentes consultadas" ya tenía
  pantalla construida en esta rama (W01-04, /cotizacion/fuentes) pero no había ningún camino de clic
  hacia ella desde el home; "Mis pólizas" no tiene pantalla en este sprint, así que enlaza a /polizas
  (PantallaPendiente, ver router/pantallas.ts) en vez de a un enlace roto o a ningún lado. El "Hola,
  {{ nombre }}" es el H1 real y visible de la pantalla (antes estaba como texto gris pequeño,
  duplicando "Home del Cliente" como H1 oculto en su lugar).
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
    <HeaderPantalla titulo="Home del Cliente" />

    <div class="flex w-full items-center justify-between border-b border-borde bg-fondo px-4 py-2 text-[11px]">
      <span class="text-tinta-suave">Portal Cliente</span>
      <button
        type="button"
        class="flex items-center gap-1 rounded-sm px-1 py-0.5 text-[13px] font-medium text-enlace hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
        @click="alCerrarSesion"
      >
        Cerrar sesión
        <IconoMaterial nombre="logout" class="h-5 w-5" />
      </button>
    </div>

    <Divisor />

    <main class="mx-auto flex w-full max-w-[880px] flex-1 flex-col gap-5 px-10 py-10">
      <TituloPantalla>Hola, {{ estado.nombre }}</TituloPantalla>

      <div class="flex flex-wrap items-stretch gap-5">
        <RouterLink
          to="/cotizacion"
          class="flex w-[272px] gap-3 rounded-md border border-borde bg-white p-5 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
        >
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] bg-info-fondo">
            <IconoMaterial nombre="badge" class="h-6 w-6 text-primario" />
          </span>
          <span class="flex flex-col gap-1">
            <span class="text-[16px] font-semibold text-tinta">Nueva cotización</span>
            <span class="text-[13px] text-tinta-suave">Cotiza tu seguro de vida hipotecario</span>
          </span>
        </RouterLink>
        <RouterLink
          to="/polizas"
          class="flex w-[272px] gap-3 rounded-md border border-borde bg-white p-5 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
        >
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] bg-info-fondo">
            <IconoMaterial nombre="badge" class="h-6 w-6 text-primario" />
          </span>
          <span class="flex flex-col gap-1">
            <span class="text-[16px] font-semibold text-tinta">Mis pólizas</span>
            <span class="text-[13px] text-tinta-suave">Consulta tu póliza vigente y descarga el documento</span>
          </span>
        </RouterLink>
        <RouterLink
          to="/cotizacion/fuentes"
          class="flex w-[272px] gap-3 rounded-md border border-borde bg-white p-5 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
        >
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] bg-info-fondo">
            <IconoMaterial nombre="badge" class="h-6 w-6 text-primario" />
          </span>
          <span class="flex flex-col gap-1">
            <span class="text-[16px] font-semibold text-tinta">Fuentes consultadas</span>
            <span class="text-[13px] text-tinta-suave">Revisa qué datos de Open Finance y Open Data se usaron</span>
          </span>
        </RouterLink>
      </div>

      <p class="text-[11px] text-tinta-suave">Landing post-login para el rol Cliente.</p>
    </main>

    <FooterPantalla />
  </div>
</template>
