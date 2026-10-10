<!--
  W01-05 · Contactar a un asesor (Figma 2vfK0e8t62OvvDk4c7QnK5 "Solventa-web", nodo 41:2, CA-W01-07).
  Reconstruida contra el prototipo de alta fidelidad correcto (el archivo anterior, "Solventa-web-
  Final", tenía un título distinto y un selector de franja horaria que ya no existe en este mockup):
  - El título de la pantalla es "Hablemos de tu solicitud" (antes "Contactar a un asesor").
  - Usa la Barra de navegación compartida (MigasDePan) en vez de un <nav> hecho a mano con una
    insignia "Radicación segura" que no está en este archivo.
  - "Agendar llamada" ya no tiene un selector de franja horaria: el botón "Agendar" es una acción
    directa, igual que "Llamar" e "Iniciar chat".
  El mockup abre con "Solicitud #7734 · Falló la consulta automática de fuentes el 13 sep 2026,
  09:14 a. m.": ni el número de solicitud ni el timestamp del fallo existen en el contrato
  (`contactarAsesor` solo devuelve `{ canal, resumen }`, ver contrato/schema.graphql), así que se
  omite esa línea en vez de inventar un número de solicitud, mismo criterio que en las demás
  pantallas de esta HU.
  `contactarAsesor` exige un `ofertaId`, pero el único punto de entrada de esta pantalla en el plano
  v21 es W01-03c (fallo), donde nunca hubo oferta — ver la nota en `useCotizacion.contactarAsesor`
  para cómo se resuelve ese hueco del contrato.
  Manejo de error (antes no existía): si `contactarAsesor` falla, se muestra un mensaje seguro en vez
  de dejar al usuario sin ningún feedback (CLAUDE.md regla 5: nunca un error técnico crudo).

  Fidelidad de botones (nodo 41:2, confirmado con captura): los tres botones de canal ("Llamar",
  "Iniciar chat", "Agendar") son blancos con borde gris y texto oscuro en el Figma, no azules — se
  corrige de `bg-primario text-white` a `border border-borde bg-white text-tinta`, mismo patrón que
  ya usa "Volver al inicio" en esta misma pantalla. Los íconos también van dentro de una insignia
  circular blanca con borde (antes sueltos sobre el fondo).

  H1 oculto (sr-only, "Hablemos de tu solicitud") agregado: antes la pantalla no tenía ningún <h1>.
-->
<script setup lang="ts">
import { ref } from 'vue'
import { FooterPantalla, HeaderPantalla, MigasDePan, TituloPantalla } from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
import { useCotizacion } from '../composables/useCotizacion'
import { RUTA_INICIO, useSesion } from '../composables/useSesion'
import type { CanalContacto } from '../graphql/tipos'

const { estado, contactarAsesor } = useCotizacion()
const { estado: sesion } = useSesion()
const enviando = ref<CanalContacto | null>(null)
const errorContacto = ref<string | null>(null)

async function elegirCanal(canal: CanalContacto) {
  enviando.value = canal
  errorContacto.value = null
  try {
    await contactarAsesor(canal)
  } catch {
    // Nunca se muestra el error técnico crudo (CLAUDE.md regla 5): antes esta función no tenía
    // ningún catch, así que una falla del BFF dejaba al usuario sin ningún mensaje (solo se
    // reactivaban los botones en el `finally`, sin ninguna pista de qué pasó).
    errorContacto.value = 'No pudimos registrar tu solicitud de contacto. Intenta de nuevo en un momento.'
  } finally {
    enviando.value = null
  }
}
</script>

<template>
  <div class="pantalla flex min-h-screen flex-col" data-pantalla="W01-05">
    <HeaderPantalla titulo="Hablemos de tu solicitud" />
    <TituloPantalla class="sr-only">Hablemos de tu solicitud</TituloPantalla>
    <MigasDePan seccion="Nueva cotización" :a-inicio="RUTA_INICIO[sesion.rol]" />
    <main class="flex flex-1 flex-col items-center bg-fondo px-10 py-6">
      <div class="flex w-full max-w-[880px] flex-col gap-4">
        <div v-if="errorContacto" role="alert" class="rounded-md border border-error bg-error-fondo px-4 py-3 text-[13px] text-error">
          {{ errorContacto }}
        </div>

        <div class="flex flex-col overflow-hidden rounded-lg border border-borde bg-white">
          <article class="flex items-center justify-between gap-4 border-b border-borde p-4">
            <div class="flex items-center gap-4">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-borde bg-white">
                <IconoMaterial nombre="call" class="h-5 w-5 text-tinta" />
              </span>
              <div>
                <h2 class="text-[16px] font-semibold leading-[22px] text-tinta">Teléfono</h2>
                <p class="text-[13px] leading-[18px] text-tinta-suave">01 8000 123 456 · Lun-Vie 8am-6pm</p>
              </div>
            </div>
            <button
              type="button"
              class="flex items-center gap-2 rounded-[4px] border border-borde bg-white px-5 py-2.5 text-[13px] font-semibold text-tinta enabled:hover:bg-fondo disabled:opacity-60"
              :disabled="enviando !== null"
              @click="elegirCanal('LLAMAR')"
            >
              Llamar
            </button>
          </article>
          <article class="flex items-center justify-between gap-4 border-b border-borde p-4">
            <div class="flex items-center gap-4">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-borde bg-white">
                <IconoMaterial nombre="chat" class="h-5 w-5 text-tinta" />
              </span>
              <div>
                <h2 class="text-[16px] font-semibold leading-[22px] text-tinta">Chat en vivo</h2>
                <p class="text-[13px] leading-[18px] text-tinta-suave">Respuesta en menos de 2 minutos</p>
              </div>
            </div>
            <button
              type="button"
              class="flex items-center gap-2 rounded-[4px] border border-borde bg-white px-5 py-2.5 text-[13px] font-semibold text-tinta enabled:hover:bg-fondo disabled:opacity-60"
              :disabled="enviando !== null"
              @click="elegirCanal('CHAT')"
            >
              Iniciar chat
            </button>
          </article>
          <article class="flex items-center justify-between gap-4 p-4">
            <div class="flex items-center gap-4">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-borde bg-white">
                <IconoMaterial nombre="event" class="h-5 w-5 text-tinta" />
              </span>
              <div>
                <h2 class="text-[16px] font-semibold leading-[22px] text-tinta">Agendar llamada</h2>
                <p class="text-[13px] leading-[18px] text-tinta-suave">Elige una franja horaria disponible</p>
              </div>
            </div>
            <button
              type="button"
              class="flex items-center gap-2 rounded-[4px] border border-borde bg-white px-5 py-2.5 text-[13px] font-semibold text-tinta enabled:hover:bg-fondo disabled:opacity-60"
              :disabled="enviando !== null"
              @click="elegirCanal('AGENDAR')"
            >
              Agendar
            </button>
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
          <RouterLink :to="RUTA_INICIO[sesion.rol]" class="flex items-center gap-1 rounded-[4px] border border-borde bg-white px-5 py-2.5 text-[13px] font-semibold text-tinta hover:bg-fondo">
            Volver al inicio
          </RouterLink>
        </div>
      </div>
    </main>
    <FooterPantalla />
  </div>
</template>
