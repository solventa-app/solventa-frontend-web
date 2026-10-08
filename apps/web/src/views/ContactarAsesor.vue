<!--
  W01-05 · Contactar a un asesor (Figma 2001:1568, CA-W01-07). El mockup abre con una tarjeta
  "Solicitud #SOL-24817 · Revisión pendiente · ID Operación: 8842-COL-BF": ninguno de esos campos
  existe en el contrato (`contactarAsesor` solo devuelve `{ canal, resumen }`, ver
  contrato/schema.graphql), así que se omite esa tarjeta por completo en vez de inventar un número de
  solicitud. La confirmación final sí es real: usa el `resumen` que devuelve la mutación.
  `contactarAsesor` exige un `ofertaId`, pero el único punto de entrada de esta pantalla en el plano
  v21 es W01-03c (fallo), donde nunca hubo oferta — ver la nota en `useCotizacion.contactarAsesor`
  para cómo se resuelve ese hueco del contrato.
  El selector de franja horaria de "Agendar llamada" es decorativo: el contrato no tiene un campo
  para la hora, así que no se envía a la mutación (solo se envía `canal`).
-->
<script setup lang="ts">
import { ref } from 'vue'
import { FooterPantalla, HeaderPantalla } from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
import { useCotizacion } from '../composables/useCotizacion'
import type { CanalContacto } from '../graphql/tipos'

const { estado, contactarAsesor } = useCotizacion()
const enviando = ref<CanalContacto | null>(null)
const franjaHoraria = ref('Hoy, 2:00 p. m. - 3:00 p. m.')

async function elegirCanal(canal: CanalContacto) {
  enviando.value = canal
  try {
    await contactarAsesor(canal)
  } finally {
    enviando.value = null
  }
}
</script>

<template>
  <div class="pantalla flex min-h-screen flex-col" data-pantalla="W01-05">
    <HeaderPantalla titulo="Contactar a un asesor" />
    <nav aria-label="Ruta de navegación" class="flex w-full items-center justify-between border-b border-borde bg-white px-10 py-2">
      <div class="flex items-center gap-1 text-[11px] leading-[14px]">
        <RouterLink to="/inicio" class="flex items-center gap-1 text-tinta-suave hover:underline">
          <IconoMaterial nombre="home" class="h-3.5 w-3.5" />
          Inicio
        </RouterLink>
        <span class="text-borde" aria-hidden="true">/</span>
        <span class="text-tinta">Hablar con un asesor</span>
      </div>
      <div class="flex items-center gap-1 rounded-full bg-info-fondo px-2.5 py-1 text-[13px] font-semibold text-enlace">
        <IconoMaterial nombre="shield" class="h-3.5 w-3.5" />
        Radicación segura
      </div>
    </nav>
    <main class="flex flex-1 flex-col items-center bg-fondo px-10 py-6">
      <div class="flex w-full max-w-[880px] flex-col gap-5">
        <div class="flex flex-col overflow-hidden rounded-lg border border-borde bg-white">
          <article class="flex items-center justify-between gap-4 border-b border-borde p-4">
            <div class="flex items-center gap-4">
              <IconoMaterial nombre="call" class="h-6 w-6 text-primario" />
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
              Llamar
            </button>
          </article>
          <article class="flex items-center justify-between gap-4 border-b border-borde p-4">
            <div class="flex items-center gap-4">
              <IconoMaterial nombre="chat" class="h-6 w-6 text-primario" />
              <div>
                <h2 class="flex items-center gap-2 text-[16px] font-semibold leading-[22px] text-tinta">
                  Chat en vivo
                  <span class="flex items-center gap-1 text-[11px] font-normal text-exito">
                    <span class="h-2 w-2 rounded-full bg-exito" />En línea
                  </span>
                </h2>
                <p class="text-[13px] leading-[18px] text-tinta-suave">Tiempo de espera aprox. 2 min</p>
              </div>
            </div>
            <button
              type="button"
              class="flex items-center gap-2 rounded-[4px] bg-primario px-5 py-2.5 text-[13px] font-semibold text-white enabled:hover:opacity-90 disabled:opacity-60"
              :disabled="enviando !== null"
              @click="elegirCanal('CHAT')"
            >
              Iniciar chat
            </button>
          </article>
          <article class="flex items-center justify-between gap-4 p-4">
            <div class="flex items-center gap-4">
              <IconoMaterial nombre="event" class="h-6 w-6 text-primario" />
              <div>
                <h2 class="text-[16px] font-semibold leading-[22px] text-tinta">Agendar llamada</h2>
                <p class="text-[13px] leading-[18px] text-tinta-suave">Programa una comunicación telefónica personalizada</p>
              </div>
            </div>
            <div class="flex items-end gap-2">
              <div class="flex flex-col gap-1">
                <label for="franja-horaria" class="text-[11px] text-tinta-suave">Franja horaria disponible (COT)</label>
                <select
                  id="franja-horaria"
                  v-model="franjaHoraria"
                  class="h-10 w-[256px] rounded-[4px] border border-borde px-3 text-[13px] text-tinta outline-none"
                >
                  <option>Hoy, 2:00 p. m. - 3:00 p. m.</option>
                  <option>Mañana, 9:00 a. m. - 10:00 a. m.</option>
                  <option>Mañana, 3:00 p. m. - 4:00 p. m.</option>
                </select>
              </div>
              <button
                type="button"
                class="flex items-center gap-2 rounded-[4px] bg-primario px-5 py-2.5 text-[13px] font-semibold text-white enabled:hover:opacity-90 disabled:opacity-60"
                :disabled="enviando !== null"
                @click="elegirCanal('AGENDAR')"
              >
                Agendar
              </button>
            </div>
          </article>
        </div>

        <div v-if="estado.contacto" class="flex items-center justify-between gap-4 rounded-lg border border-borde bg-exito-fondo p-4" role="status">
          <div class="flex items-start gap-4">
            <IconoMaterial nombre="check_circle" class="mt-0.5 h-6 w-6 shrink-0 text-exito" />
            <div>
              <h3 class="text-[16px] font-semibold leading-[22px] text-tinta">Un asesor te contactará en breve</h3>
              <p class="text-[13px] leading-[18px] text-tinta-suave">{{ estado.contacto.resumen }}</p>
            </div>
          </div>
          <RouterLink to="/inicio" class="flex items-center gap-1 rounded-[4px] border border-borde bg-white px-5 py-2.5 text-[13px] font-semibold text-tinta hover:bg-fondo">
            Volver al inicio
          </RouterLink>
        </div>
      </div>
    </main>
    <FooterPantalla />
  </div>
</template>
