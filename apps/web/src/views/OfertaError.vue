<!--
  W01-03c · Oferta, fallo (Figma 2vfK0e8t62OvvDk4c7QnK5 "Solventa-web", nodo 10:30, CA-W01-05).
  Título "Oferta — fallo" (el archivo anterior tenía "Nueva cotización" aquí, que no es el título de
  esta pantalla en el prototipo correcto). Nunca se muestra un 5xx crudo: el texto que ve el usuario
  es siempre `ErrorOferta.mensaje`, el campo que sí existe en el contrato (contrato/schema.graphql),
  no un texto inventado — ahora también cubre las fallas técnicas/de red (ver la nota en
  useCotizacion.solicitarOferta), que antes dejaban esta pantalla inalcanzable. El mockup también
  incluye un "Código de evento: ERR-SOL-304" que `ErrorOferta` no tiene (no hay campo `evento`); se
  omite en vez de inventarlo, igual que la nota de G-05 en AvatarPerfil.vue. El pie "Validación
  segura B2B2C" del archivo anterior tampoco está en este prototipo: se quita. "Reintentar" solo se
  ofrece cuando `ErrorOferta.puedeReintentar` es verdadero.

  "Hablar con un asesor" se corrige a gris subrayado siempre (en vez de azul con subrayado solo al
  pasar el mouse): es un enlace secundario junto al botón primario "Reintentar", mismo tratamiento
  que ya usan los enlaces secundarios de esta misma HU (p. ej. los disparadores de demo en
  SolicitudYConsentimiento.vue).
-->
<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Boton, FooterPantalla, HeaderPantalla, MigasDePan } from '../components/ui'
import { esErrorOferta, useCotizacion } from '../composables/useCotizacion'
import { RUTA_INICIO, useSesion } from '../composables/useSesion'

const router = useRouter()
const { estado } = useCotizacion()
const { estado: sesion } = useSesion()
const error = computed(() => (esErrorOferta(estado.resultado) ? estado.resultado : null))

function reintentar() {
  router.push('/cotizacion/consulta')
}
</script>

<template>
  <div class="pantalla flex min-h-screen flex-col" data-pantalla="W01-03c">
    <HeaderPantalla titulo="Oferta — fallo" />
    <MigasDePan seccion="Nueva cotización" :a-inicio="RUTA_INICIO[sesion.rol]" />
    <main class="flex flex-1 flex-col items-center justify-center bg-fondo px-10 py-16">
      <div class="flex w-full max-w-[560px] flex-col items-center gap-4 rounded-lg border border-borde bg-white p-6">
        <div class="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-error bg-error-fondo text-error">
          <svg viewBox="0 -960 960 960" fill="currentColor" class="h-8 w-8" aria-hidden="true">
            <path d="M503.5-289.48q9.5-9.48 9.5-23.5t-9.48-23.52q-9.48-9.5-23.5-9.5t-23.52 9.48q-9.5 9.48-9.5 23.5t9.48 23.52q9.48 9.5 23.5 9.5t23.52-9.48ZM453-433h60v-253h-60v253Zm27.27 353q-82.74 0-155.5-31.5Q252-143 197.5-197.5t-86-127.34Q80-397.68 80-480.5t31.5-155.66Q143-709 197.5-763t127.34-85.5Q397.68-880 480.5-880t155.66 31.5Q709-817 763-763t85.5 127Q880-563 880-480.27q0 82.74-31.5 155.5Q817-252 763-197.68q-54 54.31-127 86Q563-80 480.27-80Zm.23-60Q622-140 721-239.5t99-241Q820-622 721.19-721T480-820q-141 0-240.5 98.81T140-480q0 141 99.5 240.5t241 99.5Zm-.5-340Z" />
          </svg>
        </div>
        <h1 class="text-center text-[22px] font-bold leading-[28px] text-tinta">No pudimos completar tu consulta</h1>
        <p class="max-w-[448px] text-center text-[13px] leading-[18px] text-tinta-suave">
          {{ error?.mensaje ?? 'Intenta nuevamente o habla con un asesor.' }}
        </p>
        <div class="flex flex-col items-center gap-4">
          <Boton v-if="error?.puedeReintentar ?? true" class="w-[340px]" @click="reintentar">Reintentar</Boton>
          <RouterLink to="/cotizacion/asesor" class="flex items-center gap-1 text-[13px] font-semibold leading-[18px] text-tinta-suave underline">
            Hablar con un asesor
          </RouterLink>
        </div>
      </div>
    </main>
    <FooterPantalla />
  </div>
</template>
