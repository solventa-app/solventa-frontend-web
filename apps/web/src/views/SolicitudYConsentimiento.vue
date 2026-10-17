<!--
  W01-01 · Solicitud y consentimiento (Figma yKWD8jrwERtJkuSj0mk0Gz "Solventa-web-Final", nodo
  2001:1016). Documento de identidad, datos del crédito, dirección del inmueble y el checkbox de
  Habeas Data / Open Finance-Open Data (CA-W01-01/02/08): el botón "Consultar oferta" queda
  deshabilitado hasta que se marque el consentimiento (nota explícita del prototipo). Los dos
  enlaces de pie de formulario son los disparadores de demo documentados en `src/mocks/handlers.ts`
  (documento terminado en 999 → oferta preliminar, en 000 → error).

  Validación funcional (antes no existía ninguna): el botón es `type="button"` (ver Boton.vue, lo usan
  las ~20 pantallas de la librería), así que nunca dispara la validación nativa del `<form>` ni los
  `required` de los campos — con el consentimiento marcado se podía enviar documento/crédito/plazo/
  dirección vacíos sin que nada lo impidiera. Se agrega `validar()` con el prop `error` que
  `CampoFormulario` ya soporta (coincide con el estado "Estado=Error" que Figma documenta
  explícitamente para este mismo campo, nodo 2001:1057 "EN ESTADO DE ERROR"). Los errores solo se
  muestran después de un intento de envío (no al cargar la pantalla en blanco).

  Barra de navegación: usa la API nueva de MigasDePan (seccion + aInicio), con aInicio según el rol
  de la sesión activa (useSesion.ts) — Cliente y Asesor comercial comparten esta misma pantalla pero
  "Inicio" debe volver a su propio home (G-02 o G-02a).

  Re-verificada contra el archivo correcto (la ronda anterior había citado y "corregido" contra
  2vfK0e8t62OvvDk4c7QnK5 "Solventa-web", el equivocado), con varias regresiones de fidelidad real:
  - Título del header: "Solicitud y consentimiento" (nodo 2001:1025), no "Solicitud + consentimiento".
  - El H1 real y VISIBLE (nodo 2001:1055, centrado) es "Solicitud de seguro de vida hipotecario" —
    antes estaba oculto sr-only mientras se mostraba en su lugar un encabezado de cuerpo inventado
    ("Datos del crédito hipotecario a originar") que no existe en ningún nodo de Figma.
  - Label del segundo campo (nodo 2001:1074): "Monto del crédito hipotecario", no "Monto del crédito".
  - Texto del consentimiento (nodo 2001:1108), corregido carácter por carácter: "Autorizo el
    tratamiento de mis datos (Ley 1581 de 2012, Habeas Data) y el acceso consentido a mis fuentes de
    Open Finance y Open Data." — el texto anterior decía "datos personales" (Figma no incluye
    "personales") y agregaba una cláusula final inventada ("para calcular mi perfil de riesgo y
    oferta") que no está en el nodo. El checkbox lleva junto al texto el ícono verified_user (nodo
    2001:1105) que antes no se mostraba.
  - Nota informativa de Open Finance / Open Data (nodo 2001:1110), corregida a la literal: "Open
    Finance y Open Data son fuentes que ya existen sobre ti (comportamiento de pago, datos públicos
    del inmueble). Consultarlas evita pedirte ingresos, empleador ni historial." — el texto anterior
    tenía una redacción propia, distinta de la del prototipo.
  - Los dos enlaces de disparo de demo (nodos 2001:1120 y 2001:1122) NO llevan flecha "→" final en el
    archivo correcto — la ronda anterior la había agregado citando nodos del archivo equivocado
    (148:431/433, que no existen en Solventa-web-Final).
  - Los campos "Documento de identidad", "Monto del crédito hipotecario" y "Dirección del inmueble a
    asegurar" llevan un ícono final (badge/payments/home respectivamente, nodos 2001:1064/1079/1097);
    "Plazo (meses)" no lleva ícono en Figma.

  DESVIACIÓN DOCUMENTADA (requiere confirmación del equipo, se mantiene de la ronda anterior): el
  campo de plazo se deja como "Plazo (meses)", que sí coincide con el label literal de Figma (nodo
  2001:1084, "Plazo (meses)" — no "Plazo (años)" como se había anotado antes por error de lectura de
  un nodo del archivo equivocado). Ya no hay desviación real en este punto: el label corregido
  coincide con el comportamiento funcional (`plazoMeses: Int!`, ver contrato/schema.graphql).

  Triage de la revisión de los 2 agentes (UX senior + QA senior):
  - [BAJA] El mensaje de error "Ingresa un número de documento válido." llevaba un punto final que
    el nodo 2001:1070 no tiene.
  - [MEDIA] El `<form>` no tenía `novalidate`: el botón "Consultar oferta" es `type="button"` (así
    que un clic siempre corre `validar()`), pero sin `novalidate` presionar Enter dentro de un campo
    sí disparaba la validación nativa del navegador antes que la lógica de Vue, dando dos
    comportamientos distintos para mouse y teclado.
-->
<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Boton, CampoFormulario, FooterPantalla, HeaderPantalla, MigasDePan, TituloPantalla } from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
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
    nuevosErrores.documentoIdentidad = 'Ingresa un número de documento válido'
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
  <div class="flex h-screen flex-col overflow-hidden" data-pantalla="W01-01">
    <HeaderPantalla titulo="Solicitud y consentimiento" />
    <MigasDePan seccion="Nueva cotización" :a-inicio="RUTA_INICIO[sesion.rol]" />
    <main class="flex min-h-0 flex-1 flex-col items-center overflow-y-auto bg-fondo px-10 py-8">
      <div class="flex w-full max-w-[880px] flex-col items-center gap-6">
        <TituloPantalla class="text-center">Solicitud de seguro de vida hipotecario</TituloPantalla>
        <form class="flex w-full max-w-[400px] flex-col gap-5" novalidate @submit.prevent="enviar">
          <CampoFormulario
            v-model="captura.documentoIdentidad"
            label="Documento de identidad"
            placeholder="Ej: 1020304050"
            icono="badge"
            :error="intentoEnvio ? errores.documentoIdentidad : undefined"
            required
          />
          <CampoFormulario
            v-model="captura.valorCredito"
            label="Monto del crédito hipotecario"
            placeholder="Ej: 185000000"
            icono="payments"
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
            icono="home"
            :error="intentoEnvio ? errores.direccionInmueble : undefined"
            required
          />

          <div class="flex flex-col gap-2 pt-2">
            <label class="flex items-start gap-2">
              <input
                v-model="captura.consentimiento"
                type="checkbox"
                class="mt-[2px] h-4 w-4 shrink-0 rounded-[2.5px] border-[#767676] text-primario accent-primario"
              />
              <IconoMaterial nombre="verified_user" class="mt-[2px] h-4 w-4 shrink-0 text-primario" />
              <span class="text-[13px] leading-[18px] text-tinta">
                Autorizo el tratamiento de mis datos (Ley 1581 de 2012, Habeas Data) y el acceso
                consentido a mis fuentes de Open Finance y Open Data.
              </span>
            </label>
            <p class="pl-7 text-[11px] leading-[18px] text-tinta-suave">
              Open Finance y Open Data son fuentes que ya existen sobre ti (comportamiento de pago,
              datos públicos del inmueble). Consultarlas evita pedirte ingresos, empleador ni
              historial.
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
              Simular oferta degradada: timeout de fuentes con valor en caché
            </button>
            <button type="button" class="text-left text-[11px] leading-[16.5px] text-tinta-suave underline" @click="simular('000')">
              Simular fallo total de la consulta de fuentes
            </button>
          </div>
        </form>
      </div>
    </main>
    <FooterPantalla />
  </div>
</template>
