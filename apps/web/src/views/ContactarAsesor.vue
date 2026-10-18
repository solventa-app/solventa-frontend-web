<!--
  W01-05 · Contactar a un asesor (Figma "Solventa-web-Final", nodo 2001:1568). CA-W01-07.

  Desviaciones del prototipo, porque el contrato no trae esos datos:
  - La franja horaria de "Agendar" es texto estático: `contactarAsesor` no recibe franja.
  - La tarjeta de solicitud omite el número, el ID de operación y la hora del fallo.
  - `contactarAsesor` exige `ofertaId`, pero se llega desde W01-03c, donde no hubo oferta (ver
    useCotizacion.contactarAsesor).
  Si `contactarAsesor` falla, se muestra un mensaje seguro (regla 5).
-->
<script setup lang="ts">
import { ref } from 'vue'
import { FooterPantalla, HeaderPantalla, MigasDePan, TituloPantalla } from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
import { useCotizacion } from '../composables/useCotizacion'
import { useSesion } from '../composables/useSesion'
import type { CanalContacto } from '../graphql/tipos'

const { estado, contactarAsesor } = useCotizacion()
const { rutaInicio } = useSesion()
const enviando = ref<CanalContacto | null>(null)
const errorContacto = ref<string | null>(null)

async function elegirCanal(canal: CanalContacto) {
  enviando.value = canal
  errorContacto.value = null
  try {
    await contactarAsesor(canal)
  } catch {
    // Nunca el error técnico crudo (regla 5).
    errorContacto.value = 'No pudimos registrar tu solicitud de contacto. Intenta de nuevo en un momento.'
  } finally {
    enviando.value = null
  }
}
</script>

<template>
  <div class="flex h-screen flex-col overflow-hidden" data-pantalla="W01-05">
    <HeaderPantalla titulo="Contactar a un asesor" />
    <TituloPantalla class="sr-only">Contactar a un asesor</TituloPantalla>
    <MigasDePan seccion="Hablar con un asesor" :a-inicio="rutaInicio()" />
    <div class="flex w-full justify-end px-10 py-1.5">
      <span
        class="flex items-center gap-1 rounded-full bg-info-fondo px-2.5 py-1 text-[13px] font-semibold text-primario"
      >
        <IconoMaterial nombre="shield" class="h-4 w-4" />
        Radicación Segura
      </span>
    </div>
    <main class="flex min-h-0 flex-1 flex-col items-center overflow-y-auto bg-fondo px-10 py-6">
      <div class="flex w-full max-w-[880px] flex-col gap-5">
        <div
          v-if="errorContacto"
          role="alert"
          class="rounded-md border border-error bg-error-fondo px-4 py-3 text-[13px] text-error"
        >
          {{ errorContacto }}
        </div>

        <div class="flex items-start gap-4 rounded-lg border border-borde bg-white p-4">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-info-fondo">
            <IconoMaterial nombre="badge" class="h-5 w-5 text-primario" />
          </span>
          <div class="flex flex-col gap-1">
            <div class="flex items-center gap-2">
              <h2 class="text-[16px] font-semibold leading-[22px] text-tinta">Solicitud</h2>
              <span class="rounded-full bg-alerta-fondo px-2 py-0.5 text-[11px] font-semibold text-alerta"
                >Revisión pendiente</span
              >
            </div>
            <p class="text-[11px] leading-[14px] text-tinta-suave">
              Este registro le permite al asesor retomar tu caso de forma inmediata, sin necesidad de que vuelvas a
              explicar tu información.
            </p>
          </div>
        </div>

        <div class="flex flex-col overflow-hidden rounded-lg border border-borde bg-white">
          <article class="flex items-center justify-between gap-4 border-b border-borde p-4">
            <div class="flex items-center gap-4">
              <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-info-fondo">
                <IconoMaterial nombre="call" class="h-5 w-5 text-primario" />
              </span>
              <div>
                <h2 class="text-[16px] font-semibold leading-[22px] text-tinta">Teléfono</h2>
                <p class="text-[13px] leading-[18px] text-tinta-suave">01 8000 123 456 · Línea gratuita nacional</p>
              </div>
            </div>
            <button
              type="button"
              class="flex items-center gap-2 rounded-[4px] bg-primario px-5 py-2.5 text-[13px] font-semibold text-white enabled:hover:opacity-90 disabled:opacity-60"
              :disabled="enviando !== null"
              @click="elegirCanal('LLAMAR')"
            >
              <IconoMaterial nombre="call" class="h-[18px] w-[18px]" />
              Llamar
            </button>
          </article>
          <article class="flex items-center justify-between gap-4 border-b border-borde p-4">
            <div class="flex items-center gap-4">
              <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-info-fondo">
                <IconoMaterial nombre="chat" class="h-5 w-5 text-primario" />
              </span>
              <div>
                <div class="flex items-center gap-1.5">
                  <h2 class="text-[16px] font-semibold leading-[22px] text-tinta">Chat en vivo</h2>
                  <span class="flex items-center gap-1 text-[11px] text-exito">
                    <span class="h-2 w-2 rounded-full bg-exito" />
                    En línea
                  </span>
                </div>
                <p class="text-[13px] leading-[18px] text-tinta-suave">Tiempo de espera aprox. 2 min</p>
              </div>
            </div>
            <button
              type="button"
              class="flex items-center gap-2 rounded-[4px] bg-primario px-5 py-2.5 text-[13px] font-semibold text-white enabled:hover:opacity-90 disabled:opacity-60"
              :disabled="enviando !== null"
              @click="elegirCanal('CHAT')"
            >
              <IconoMaterial nombre="chat" class="h-5 w-5" />
              Iniciar chat
            </button>
          </article>
          <article class="flex flex-wrap items-center justify-between gap-4 p-4">
            <div class="flex items-center gap-4">
              <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-info-fondo">
                <IconoMaterial nombre="event" class="h-5 w-5 text-primario" />
              </span>
              <div>
                <h2 class="text-[16px] font-semibold leading-[22px] text-tinta">Agendar llamada</h2>
                <p class="text-[13px] leading-[18px] text-tinta-suave">
                  Programa una comunicación telefónica personalizada
                </p>
              </div>
            </div>
            <div class="flex flex-wrap items-end gap-2">
              <div class="flex flex-col gap-1">
                <span class="text-[11px] text-tinta-suave">Franja horaria disponible (COT)</span>
                <span
                  class="flex h-10 items-center rounded-[4px] border border-borde bg-white px-3 text-[13px] text-tinta"
                >
                  Hoy, 2:00 p. m. - 3:00 p. m.
                </span>
              </div>
              <button
                type="button"
                class="flex h-10 items-center gap-2 rounded-[4px] bg-primario px-5 text-[13px] font-semibold text-white enabled:hover:opacity-90 disabled:opacity-60"
                :disabled="enviando !== null"
                @click="elegirCanal('AGENDAR')"
              >
                <IconoMaterial nombre="event" class="h-[18px] w-[18px]" />
                Agendar
              </button>
            </div>
          </article>
        </div>

        <div
          v-if="estado.contacto"
          class="flex items-center justify-between gap-4 rounded-lg border border-borde bg-exito-fondo p-4"
          role="status"
        >
          <div class="flex items-start gap-4">
            <IconoMaterial nombre="check_circle" class="mt-0.5 h-6 w-6 shrink-0 text-exito" />
            <div>
              <h3 class="text-[16px] font-semibold leading-[22px] text-tinta">Un asesor te contactará en breve</h3>
              <p class="text-[13px] leading-[18px] text-tinta-suave">{{ estado.contacto.resumen }}</p>
            </div>
          </div>
          <RouterLink
            :to="rutaInicio()"
            class="flex items-center gap-1.5 rounded-[4px] border border-borde bg-white px-5 py-2.5 text-[13px] font-semibold text-tinta hover:bg-fondo"
          >
            <IconoMaterial nombre="arrow_back" class="h-4 w-4" />
            Volver al inicio
          </RouterLink>
        </div>
      </div>
    </main>
    <FooterPantalla />
  </div>
</template>
