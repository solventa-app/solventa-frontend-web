<!--
  W01-01 · Solicitud y consentimiento (Figma 2001:1016). Documento de identidad, datos del crédito,
  dirección del inmueble y el checkbox de Habeas Data / Open Finance-Open Data (CA-W01-01/02/08): el
  botón "Consultar oferta" queda deshabilitado hasta que se marque el consentimiento (nota explícita
  del prototipo). Los dos enlaces de pie de formulario son los disparadores de demo documentados en
  `src/mocks/handlers.ts` (documento terminado en 999 → oferta preliminar, en 000 → error).
-->
<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Boton, CampoFormulario, FooterPantalla, HeaderPantalla, MigasDePan, TituloPantalla } from '../components/ui'
import { useCotizacion } from '../composables/useCotizacion'

const router = useRouter()
const { captura } = useCotizacion()

function irAConsultar() {
  router.push('/cotizacion/consulta')
}

function enviar() {
  if (!captura.consentimiento) return
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
    <HeaderPantalla titulo="Solicitud y consentimiento" />
    <MigasDePan :items="[{ etiqueta: 'Inicio', to: '/inicio' }, { etiqueta: 'Nueva cotización' }]" />
    <main class="flex flex-1 flex-col items-center bg-fondo px-10 py-8">
      <div class="flex w-full max-w-[880px] flex-col items-center gap-6">
        <TituloPantalla class="text-center">Solicitud de seguro de vida hipotecario</TituloPantalla>
        <form class="flex w-full max-w-[400px] flex-col gap-5" @submit.prevent="enviar">
          <CampoFormulario
            v-model="captura.documentoIdentidad"
            label="Documento de identidad"
            placeholder="Ej: 1020304050"
            required
          />
          <CampoFormulario
            v-model="captura.valorCredito"
            label="Monto del crédito hipotecario"
            placeholder="Ej: 185000000"
            hint="Valor en pesos colombianos, sin puntos ni símbolo."
            required
          />
          <CampoFormulario
            v-model="captura.plazoMeses"
            label="Plazo (meses)"
            type="number"
            placeholder="Ej: 180"
            required
          />
          <CampoFormulario
            v-model="captura.direccionInmueble"
            label="Dirección del inmueble a asegurar"
            placeholder="Ej: Cra 45 # 22-18, Bogotá D.C."
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
                Autorizo el tratamiento de mis datos (Ley 1581 de 2012, Habeas Data) y el acceso
                consentido a mis fuentes de Open Finance y Open Data.
              </span>
            </label>
            <p class="pl-7 text-[11px] leading-[18px] text-tinta-suave">
              Open Finance y Open Data son fuentes que ya existen sobre ti (comportamiento de pago,
              datos públicos del inmueble). Consultarlas evita pedirte ingresos, empleador ni historial.
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
