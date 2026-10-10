<!--
  W01-01 · Solicitud y consentimiento (Figma 2001:1016). Documento de identidad, datos del crédito,
  dirección del inmueble y el checkbox de Habeas Data / Open Finance-Open Data (CA-W01-01/02/08): el
  botón "Consultar oferta" queda deshabilitado hasta que se marque el consentimiento (nota explícita
  del prototipo). Los dos enlaces de pie de formulario son los disparadores de demo documentados en
  `src/mocks/handlers.ts` (documento terminado en 999 → oferta preliminar, en 000 → error).

  Validación funcional (antes no existía ninguna): el botón es `type="button"` (ver Boton.vue, lo usan
  las ~20 pantallas de la librería), así que nunca dispara la validación nativa del `<form>` ni los
  `required` de los campos — con el consentimiento marcado se podía enviar documento/crédito/plazo/
  dirección vacíos sin que nada lo impidiera. Se agrega `validar()` con el prop `error` que
  `CampoFormulario` ya soporta (coincide con el estado "Estado=Error" que el Figma nuevo documenta
  explícitamente para este mismo campo, nodo 87:425 de la librería de componentes). Los errores solo
  se muestran después de un intento de envío (no al cargar la pantalla en blanco).

  Barra de navegación: usa la API nueva de MigasDePan (seccion + aInicio), con aInicio según el rol
  de la sesión activa (useSesion.ts) — Cliente y Asesor comercial comparten esta misma pantalla pero
  "Inicio" debe volver a su propio home (G-02 o G-02a).

  Título visible vs. H1: el H1 real ("Solicitud + consentimiento") coincide con el título del
  header, así que se deja oculto (sr-only) para no repetirlo dos veces en voz alta a un lector de
  pantalla; el encabezado visible del cuerpo es el texto real del Figma (nodo 11:2), "Datos del
  crédito hipotecario a originar" — antes la pantalla mostraba un título inventado ("Solicitud de
  seguro de vida hipotecario") que no está en ningún nodo del prototipo.

  Texto de consentimiento y de ayuda (nodos 11:14 y 89:423): se corrigen para calzar carácter por
  carácter con el Figma — el texto anterior tenía "Ley 1581 de 2012" (el Figma no incluye "de 2012")
  y le faltaba la cláusula final "para calcular mi perfil de riesgo y oferta"; el párrafo de ayuda
  tenía una redacción distinta a la literal del prototipo. Los dos enlaces de disparo de demo llevan
  la flecha "→" final porque así están en el Figma (nodos 148:431 y 148:433).

  DESVIACIÓN DOCUMENTADA (requiere confirmación del equipo): el campo de plazo se deja como
  "Plazo (meses)" en vez de copiar literalmente "Plazo (años)" (Figma, nodo I57:132;56:50). Copiar
  "años" tal cual crearía una UX internamente inconsistente y confusa: el contrato exige
  `plazoMeses: Int!` (ver contrato/schema.graphql), el placeholder de ejemplo ya es "180" (meses,
  no "15" años), y todas las pantallas de resultado (W01-03a/b) ya muestran "{{ captura.plazoMeses }}
  meses". Si se cambiara solo la etiqueta a "años" sin tocar el resto, el usuario escribiría
  pensando en años y vería "meses" más adelante sin que el número cambie de unidad — un bug de UX
  peor que la discrepancia textual con el mockup. Se documenta aquí en vez de aplicarse en silencio,
  por ser la única pantalla de esta ronda donde una fidelidad literal al texto del Figma entra en
  conflicto directo con la instrucción de no cambiar comportamiento funcional ya correcto.
-->
<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Boton, CampoFormulario, FooterPantalla, HeaderPantalla, MigasDePan, TituloPantalla } from '../components/ui'
import { useCotizacion } from '../composables/useCotizacion'
import { RUTA_INICIO, useSesion } from '../composables/useSesion'

const router = useRouter()
const { captura } = useCotizacion()
const { estado: sesion } = useSesion()

const errores = reactive<Record<string, string>>({})
const intentoEnvio = ref(false)

function validar(): boolean {
  const nuevosErrores: Record<string, string> = {}
  if (!captura.documentoIdentidad.trim()) {
    nuevosErrores.documentoIdentidad = 'Ingresa tu documento de identidad.'
  } else if (captura.documentoIdentidad.replace(/\D/g, '').length < 6) {
    // Chequeo de formato liviano (antes solo se exigía no-vacío): un documento de identidad
    // colombiano (CC/CE) tiene varios dígitos; esto no es una validación de dígito de verificación
    // completa (el contrato no la exige), solo descarta valores claramente incompletos como "12".
    nuevosErrores.documentoIdentidad = 'Ingresa un número de documento válido.'
  }
  const credito = Number(captura.valorCredito)
  if (!captura.valorCredito.trim() || Number.isNaN(credito) || credito <= 0) {
    nuevosErrores.valorCredito = 'Ingresa un monto válido, mayor a cero.'
  }
  const plazo = Number(captura.plazoMeses)
  if (!captura.plazoMeses.trim() || !Number.isInteger(plazo) || plazo <= 0) {
    nuevosErrores.plazoMeses = 'Ingresa un plazo válido en meses, mayor a cero.'
  }
  if (!captura.direccionInmueble.trim()) {
    nuevosErrores.direccionInmueble = 'Ingresa la dirección del inmueble a asegurar.'
  }
  for (const clave of Object.keys(errores)) delete errores[clave]
  Object.assign(errores, nuevosErrores)
  return Object.keys(nuevosErrores).length === 0
}

function irAConsultar() {
  router.push('/cotizacion/consulta')
}

function enviar() {
  intentoEnvio.value = true
  if (!captura.consentimiento) return
  if (!validar()) return
  irAConsultar()
}

/** Disparadores de demo (ver nota de los mocks): completan datos válidos y fuerzan el sufijo del documento. */
function simular(sufijo: '999' | '000') {
  captura.documentoIdentidad = `CC10203040${sufijo === '999' ? '999' : '000'}`
  captura.valorCredito = captura.valorCredito || '185000000'
  captura.plazoMeses = captura.plazoMeses || '180'
  captura.direccionInmueble = captura.direccionInmueble || 'Cra 45 # 22-18, Bogotá D.C.'
  captura.consentimiento = true
  irAConsultar()
}
</script>

<template>
  <div class="pantalla flex min-h-screen flex-col" data-pantalla="W01-01">
    <HeaderPantalla titulo="Solicitud + consentimiento" />
    <MigasDePan seccion="Nueva cotización" :a-inicio="RUTA_INICIO[sesion.rol]" />
    <main class="flex flex-1 flex-col items-center bg-fondo px-10 py-8">
      <div class="flex w-full max-w-[880px] flex-col items-center gap-6">
        <TituloPantalla class="sr-only">Solicitud + consentimiento</TituloPantalla>
        <form class="flex w-full max-w-[400px] flex-col gap-5" @submit.prevent="enviar">
          <h2 class="text-[15px] font-bold leading-normal text-tinta">Datos del crédito hipotecario a originar</h2>
          <CampoFormulario
            v-model="captura.documentoIdentidad"
            label="Documento de identidad"
            placeholder="Ej: 1020304050"
            :error="intentoEnvio ? errores.documentoIdentidad : undefined"
            required
          />
          <CampoFormulario
            v-model="captura.valorCredito"
            label="Monto del crédito"
            placeholder="Ej: 185000000"
            :hint="intentoEnvio && errores.valorCredito ? undefined : 'Valor en pesos colombianos, sin puntos ni símbolo.'"
            :error="intentoEnvio ? errores.valorCredito : undefined"
            required
          />
          <CampoFormulario
            v-model="captura.plazoMeses"
            label="Plazo (meses)"
            type="number"
            placeholder="Ej: 180"
            :error="intentoEnvio ? errores.plazoMeses : undefined"
            required
          />
          <CampoFormulario
            v-model="captura.direccionInmueble"
            label="Dirección del inmueble a asegurar"
            placeholder="Ej: Cra 45 # 22-18, Bogotá D.C."
            :error="intentoEnvio ? errores.direccionInmueble : undefined"
            required
          />

          <div class="flex flex-col gap-2 pt-2">
            <label class="flex items-start gap-3">
              <input
                v-model="captura.consentimiento"
                type="checkbox"
                class="mt-[2px] h-4 w-4 shrink-0 rounded-[2.5px] border-[#767676] text-primario accent-primario"
              />
              <span class="text-[13px] leading-[18px] text-tinta">
                Autorizo el tratamiento de mis datos personales (Ley 1581 Habeas Data) y el acceso
                consentido a mis fuentes de Open Finance y Open Data para calcular mi perfil de
                riesgo y oferta.
              </span>
            </label>
            <p class="pl-7 text-[11px] leading-[18px] text-tinta-suave">
              Open Finance / Open Data: tus datos financieros de otras entidades y datos públicos que
              compartes con tu autorización, usados para calcular tu perfil de riesgo.
            </p>
          </div>

          <div class="flex items-center gap-3 pt-2">
            <Boton :disabled="!captura.consentimiento" @click="enviar">Consultar oferta</Boton>
            <p v-if="!captura.consentimiento" class="text-[11px] italic leading-[16.5px] text-tinta-suave">
              (deshabilitado hasta marcar el consentimiento)
            </p>
          </div>

          <div class="flex flex-col items-start gap-1.5 border-t border-borde pt-4">
            <button type="button" class="text-left text-[11px] leading-[16.5px] text-tinta-suave underline" @click="simular('999')">
              Simular oferta degradada: timeout de fuentes con valor en caché →
            </button>
            <button type="button" class="text-left text-[11px] leading-[16.5px] text-tinta-suave underline" @click="simular('000')">
              Simular fallo total de la consulta de fuentes →
            </button>
          </div>
        </form>
      </div>
    </main>
    <FooterPantalla />
  </div>
</template>
