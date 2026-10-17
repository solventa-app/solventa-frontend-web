<!--
  G-02a · Home del Asesor comercial (Figma "Solventa-web-Final", nodo 2001:732). CA-W01-11.

  Mismo tratamiento que G-02 (HomeCliente.vue). "Pólizas emitidas" lleva a /polizas, aún pendiente.
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
  <div data-pantalla="G-02a" class="flex h-screen flex-col overflow-hidden bg-fondo">
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

    <main class="mx-auto flex w-full max-w-[880px] flex-1 flex-col gap-5 overflow-y-auto px-10 py-10 min-h-0">
      <TituloPantalla>Hola, {{ estado.nombre }}</TituloPantalla>

      <div class="flex flex-wrap items-stretch gap-5">
        <RouterLink
          to="/cotizacion"
          class="flex w-full max-w-[253px] gap-3 rounded-md border border-borde bg-white p-5 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
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
          class="flex w-full max-w-[253px] gap-3 rounded-md border border-borde bg-white p-5 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
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
          class="flex w-full max-w-[253px] gap-3 rounded-md border border-borde bg-white p-5 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
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
