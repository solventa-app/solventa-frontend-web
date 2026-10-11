<!--
  G-02a · Home del Asesor comercial (Figma yKWD8jrwERtJkuSj0mk0Gz "Solventa-web-Final", nodo
  2001:732). Mismo tratamiento que G-02 (HomeCliente.vue, esta misma rama) y G-02b
  (HomeOperador.vue, construida en feature/HU-W05-conciliacion, fuera del alcance de archivos de
  esta rama): franja "Cerrar sesión" de ancho completo en vez de Barra de navegación (SG-01: nunca
  las dos juntas en una pantalla "home").

  Re-verificada contra el archivo correcto (la ronda anterior la había citado y "corregido" contra
  2vfK0e8t62OvvDk4c7QnK5 "Solventa-web", el equivocado): el mockup real muestra 3 tarjetas de acceso
  (Nueva cotización para un cliente, Pólizas emitidas, Fuentes consultadas), no 1 — "Fuentes
  consultadas" ya tenía pantalla construida en esta rama (W01-04, /cotizacion/fuentes) pero no había
  ningún camino de clic hacia ella desde el home; "Pólizas emitidas" no tiene pantalla en este
  sprint, así que enlaza a /polizas (PantallaPendiente, ver router/pantallas.ts) en vez de a un
  enlace roto o a ningún lado. El "Hola, {{ nombre }}" es el H1 real y visible de la pantalla (antes
  estaba oculto sr-only y llevaba un sufijo "(Asesor comercial)" que no existe en Figma).

  [MEDIA, hallazgo de UX] "Portal Asesor Comercial" llevaba un ícono de 24px a la izquierda que esta
  pantalla no mostraba (solo texto) — mismo caso que "Portal Cliente" en HomeCliente.vue (ver su
  comentario de cabecera para el detalle del criterio usado al elegir `badge`).
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
    <HeaderPantalla titulo="Home del Asesor comercial" />

    <div class="flex w-full items-center justify-between border-b border-borde bg-fondo px-4 py-2 text-[11px]">
      <span class="flex items-center gap-1 text-tinta-suave">
        <IconoMaterial nombre="badge" class="h-5 w-5" />
        Portal Asesor Comercial
      </span>
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
          class="flex w-[253px] gap-3 rounded-md border border-borde bg-white p-5 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
        >
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] bg-info-fondo">
            <IconoMaterial nombre="badge" class="h-6 w-6 text-primario" />
          </span>
          <span class="flex flex-col gap-1">
            <span class="text-[16px] font-semibold text-tinta">Nueva cotización para un cliente</span>
            <span class="text-[13px] text-tinta-suave">Cotiza en nombre de un tercero</span>
          </span>
        </RouterLink>
        <RouterLink
          to="/polizas"
          class="flex w-[253px] gap-3 rounded-md border border-borde bg-white p-5 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
        >
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] bg-info-fondo">
            <IconoMaterial nombre="badge" class="h-6 w-6 text-primario" />
          </span>
          <span class="flex flex-col gap-1">
            <span class="text-[16px] font-semibold text-tinta">Pólizas emitidas</span>
            <span class="text-[13px] text-tinta-suave">Consulta la póliza vigente del cliente y su documento</span>
          </span>
        </RouterLink>
        <RouterLink
          to="/cotizacion/fuentes"
          class="flex w-[253px] gap-3 rounded-md border border-borde bg-white p-5 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
        >
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] bg-info-fondo">
            <IconoMaterial nombre="badge" class="h-6 w-6 text-primario" />
          </span>
          <span class="flex flex-col gap-1">
            <span class="text-[16px] font-semibold text-tinta">Fuentes consultadas</span>
            <span class="text-[13px] text-tinta-suave">Revisa qué fuentes se usaron para perfilar al cliente</span>
          </span>
        </RouterLink>
      </div>

      <p class="text-[11px] text-tinta-suave">El asesor actúa en nombre de un cliente, no cotizando para sí mismo.</p>
    </main>

    <FooterPantalla />
  </div>
</template>
