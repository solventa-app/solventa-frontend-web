<!--
  W01-01 · Solicitud y consentimiento (Figma "Solventa-web-Final", nodo 2001:1016). CA-W01-01/02/08.

  - "Consultar oferta" queda deshabilitado hasta marcar el consentimiento de Habeas Data (regla 6).
  - `validar()` muestra los errores con el estado "Error" del campo (nodo 2001:1057) solo después de
    un intento de envío. El formulario lleva `novalidate` para que mouse y Enter validen igual.
  - Los dos enlaces del pie son los disparadores de demo de los mocks (documento terminado en 999 →
    oferta preliminar, en 000 → error).
  - "Inicio" vuelve al home del rol de la sesión: Cliente y Asesor comparten esta pantalla.
-->
<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Boton, CampoFormulario, FooterPantalla, HeaderPantalla, MigasDePan, TituloPantalla } from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
import { esErrorOferta, useCotizacion } from '../composables/useCotizacion'
import { useSesion } from '../composables/useSesion'

const router = useRouter()
const { estado, captura } = useCotizacion()
const { rutaInicio } = useSesion()

const avisoConsentimiento = computed(() =>
  esErrorOferta(estado.resultado) && estado.resultado.motivo === 'CONSENTIMIENTO_NO_VIGENTE'
    ? estado.resultado.mensaje
    : null,
)

const errores = reactive<Record<string, string>>({})
const intentoEnvio = ref(false)

function validar(): boolean {
  const nuevosErrores: Record<string, string> = {}
  if (!captura.documentoIdentidad.trim()) {
    nuevosErrores.documentoIdentidad = 'Ingresa tu documento de identidad.'
  } else if (captura.documentoIdentidad.replace(/\D/g, '').length < 6) {
    // Solo descarta valores claramente incompletos; el contrato no exige dígito de verificación.
    nuevosErrores.documentoIdentidad = 'Ingresa un número de documento válido'
  }
  const credito = Number(captura.valorCredito)
  if (!captura.valorCredito.trim() || Number.isNaN(credito) || credito <= 0) {
    nuevosErrores.valorCredito = 'Ingresa un monto válido, mayor a cero.'
  }
  const plazo = Number(captura.plazoMeses)
  if (!captura.plazoMeses.trim() || !Number.isInteger(plazo) || plazo < 1 || plazo > 360) {
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
    <MigasDePan seccion="Nueva cotización" :a-inicio="rutaInicio()" />
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
            :hint="
              intentoEnvio && errores.valorCredito ? undefined : 'Valor en pesos colombianos, sin puntos ni símbolo.'
            "
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
            <p
              v-if="avisoConsentimiento"
              role="alert"
              class="rounded-md border border-error bg-error-fondo px-3 py-2 text-[12px] leading-[16px] text-error"
            >
              {{ avisoConsentimiento }}
            </p>
            <label class="flex items-start gap-2">
              <input
                v-model="captura.consentimiento"
                type="checkbox"
                class="mt-[2px] h-4 w-4 shrink-0 rounded-[2.5px] border-[#767676] text-primario accent-primario"
              />
              <IconoMaterial nombre="verified_user" class="mt-[2px] h-4 w-4 shrink-0 text-primario" />
              <span class="text-[13px] leading-[18px] text-tinta">
                Autorizo el tratamiento de mis datos (Ley 1581 de 2012, Habeas Data) y el acceso consentido a mis
                fuentes de Open Finance y Open Data.
              </span>
            </label>
            <p class="pl-7 text-[11px] leading-[18px] text-tinta-suave">
              Open Finance y Open Data son fuentes que ya existen sobre ti (comportamiento de pago, datos públicos del
              inmueble). Consultarlas evita pedirte ingresos, empleador ni historial.
            </p>
          </div>

          <div class="flex items-center gap-3 pt-2">
            <Boton :disabled="!captura.consentimiento" @click="enviar">Consultar oferta</Boton>
            <p v-if="!captura.consentimiento" class="text-[11px] italic leading-[16.5px] text-tinta-suave">
              (deshabilitado hasta marcar el consentimiento)
            </p>
          </div>

          <div class="flex flex-col items-start gap-1.5 border-t border-borde pt-4">
            <button
              type="button"
              class="text-left text-[11px] leading-[16.5px] text-tinta-suave underline"
              @click="simular('999')"
            >
              Simular oferta degradada: timeout de fuentes con valor en caché
            </button>
            <button
              type="button"
              class="text-left text-[11px] leading-[16.5px] text-tinta-suave underline"
              @click="simular('000')"
            >
              Simular fallo total de la consulta de fuentes
            </button>
          </div>
        </form>
      </div>
    </main>
    <FooterPantalla />
  </div>
</template>
