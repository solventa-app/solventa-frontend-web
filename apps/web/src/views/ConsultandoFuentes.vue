<!--
  W01-02 · Consultando fuentes (Figma 2001:1135). Pantalla de espera mientras se resuelve
  `solicitarOferta` (CA-W01-02): "avanza automáticamente según la respuesta del ACL — no tiene botón
  manual" (nota del prototipo), así que toda la lógica vive en `onMounted` y navega sola según el
  resultado (Oferta COMPLETA/PRELIMINAR o ErrorOferta). Si se llega aquí sin haber pasado por W01-01
  (sin documento capturado) se vuelve a la solicitud en vez de llamar al BFF con datos vacíos.

  H1 oculto (sr-only, "Consultando fuentes", igual al header, nodo 2001:1162). Nota de pie
  re-verificada contra el archivo correcto (yKWD8jrwERtJkuSj0mk0Gz "Solventa-web-Final", nodo
  2001:1188): el texto literal es "(avanza automáticamente según la respuesta del ACL — no tiene
  botón manual)" — una ronda anterior la había "corregido" citando un nodo del archivo equivocado
  (2vfK0e8t62OvvDk4c7QnK5, nodo 11:22) y había fabricado un detalle de timeout ("timeout duro
  700ms") que no está documentado en ningún nodo de Figma ni en el contrato.

  [MEDIA, hallazgo de QA] Cuando se llega aquí sin documento/consentimiento capturado, `onMounted`
  hacía un `return` silencioso: el spinner quedaba girando para siempre sin ningún mensaje ni salida,
  como si la pantalla estuviera "congelada". Ahora se muestra un estado alternativo (mismo patrón
  "no hay X en memoria, ir a la solicitud" que ya usan OfertaCompleta/OfertaPreliminar/OfertaError)
  dentro de la misma región `aria-live="polite"`.
-->
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { FooterPantalla, HeaderPantalla, MigasDePan, TituloPantalla } from '../components/ui'
import { esErrorOferta, esOferta, useCotizacion } from '../composables/useCotizacion'
import { RUTA_INICIO, useSesion } from '../composables/useSesion'

const router = useRouter()
const { estado, captura, solicitarOferta } = useCotizacion()
const { estado: sesion } = useSesion()

// true si se llegó a esta pantalla sin pasar por W01-01 (sin documento capturado o sin
// consentimiento): no hay nada que consultar, así que no se llama al BFF con datos vacíos ni se
// fuerza una navegación que el usuario no pidió — pero sí se le muestra algo en vez de dejar el
// spinner girando para siempre sin ninguna pista (ver comentario de cabecera).
const sinDatosCapturados = ref(false)

onMounted(async () => {
  if (!captura.documentoIdentidad || !captura.consentimiento) {
    sinDatosCapturados.value = true
    return
  }

  await solicitarOferta()
  const resultado = estado.resultado
  if (esErrorOferta(resultado)) {
    router.replace('/cotizacion/error')
  } else if (esOferta(resultado)) {
    router.replace(resultado.tipo === 'PRELIMINAR' ? '/cotizacion/oferta-preliminar' : '/cotizacion/oferta')
  }
})
</script>

<template>
  <div class="pantalla flex min-h-screen flex-col" data-pantalla="W01-02">
    <HeaderPantalla titulo="Consultando fuentes" />
    <TituloPantalla class="sr-only">Consultando fuentes</TituloPantalla>
    <MigasDePan seccion="Nueva cotización" :a-inicio="RUTA_INICIO[sesion.rol]" />
    <main v-if="!sinDatosCapturados" class="flex flex-1 flex-col items-center justify-center gap-5 bg-fondo px-10 py-16" role="status" aria-live="polite">
      <svg class="h-6 w-6 animate-spin text-primario" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
        <path class="opacity-80" d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
      </svg>
      <h2 class="text-center text-[16px] font-semibold leading-[22px] text-tinta">
        Verificando tus fuentes de Open Finance / Open Data
      </h2>
      <div class="h-[6px] w-[400px] max-w-full overflow-hidden rounded-full bg-info-fondo">
        <div class="h-full w-2/3 animate-pulse rounded-full bg-enlace" />
      </div>
      <p class="text-center text-[11px] leading-[14px] text-tinta-suave">
        (avanza automáticamente según la respuesta del ACL — no tiene botón manual)
      </p>
    </main>
    <main v-else class="flex flex-1 flex-col items-center justify-center gap-3 bg-fondo px-10 py-16 text-center" role="status" aria-live="polite">
      <p class="text-[13px] text-tinta-suave">No hay una solicitud en curso para consultar.</p>
      <RouterLink to="/cotizacion" class="text-[13px] font-semibold text-enlace hover:underline">Ir a la solicitud</RouterLink>
    </main>
    <FooterPantalla />
  </div>
</template>
