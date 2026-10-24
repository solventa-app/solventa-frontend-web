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
import { t } from '../i18n'

const { estado } = useSesion()
const { modalAbierto, pedirCierre, cancelarCierre, confirmarCierre } = useCierreDeSesion()
</script>

<template>
  <div data-pantalla="G-02b" class="flex h-screen flex-col overflow-hidden bg-fondo">
    <HeaderPantalla :titulo="t('homeOperador.titulo')" />

    <main class="mx-auto flex w-full max-w-[880px] flex-1 flex-col gap-5 overflow-y-auto px-10 py-10 min-h-0">
      <button
        type="button"
        class="flex w-full items-center justify-end gap-2 rounded-md bg-fondo px-[14px] py-[10px] text-[13px] font-normal text-enlace hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
        @click="pedirCierre"
      >
        {{ t('sesion.cerrar') }}
        <IconoMaterial nombre="logout" class="h-[18px] w-[18px]" />
      </button>

      <Divisor />

      <section class="flex w-full flex-col gap-5">
        <TituloPantalla>{{ t('homeOperador.dashboard') }}</TituloPantalla>
        <p class="text-[16px] text-tinta" data-dato="saludo">{{ t('home.hola', { nombre: estado.nombre }) }}</p>

        <div class="flex flex-wrap items-stretch gap-5">
          <RouterLink
            to="/operador/siniestros"
            class="flex w-full max-w-[272px] gap-3 rounded-md border border-borde bg-white p-5 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
          >
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] bg-info-fondo">
              <IconoMaterial nombre="assignment" class="h-6 w-6 text-primario" />
            </span>
            <span class="flex flex-col gap-1">
              <span class="text-[15px] font-bold text-tinta">{{ t('homeOperador.siniestros') }}</span>
              <span class="text-[12px] text-tinta-suave">{{ t('homeOperador.siniestrosTexto') }}</span>
            </span>
          </RouterLink>

          <RouterLink
            to="/operador/conciliacion"
            class="flex w-full max-w-[272px] gap-3 rounded-md border border-borde bg-white p-5 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
          >
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] bg-info-fondo">
              <IconoMaterial nombre="assignment" class="h-6 w-6 text-primario" />
            </span>
            <span class="flex flex-col gap-1">
              <span class="text-[15px] font-bold text-tinta">{{ t('homeOperador.conciliacion') }}</span>
              <span class="text-[12px] text-tinta-suave">{{ t('homeOperador.conciliacionTexto') }}</span>
            </span>
          </RouterLink>
        </div>

        <p class="text-[11px] text-tinta-suave">
          {{ t('homeOperador.nota') }}
        </p>
      </section>
    </main>

    <FooterPantalla />

    <ModalCerrarSesion :abierto="modalAbierto" @cancelar="cancelarCierre" @confirmar="confirmarCierre" />
  </div>
</template>
