<!--
  W01-01 · Solicitud y consentimiento (Figma "Solventa-web-Final", nodo 2001:1016). CA-W01-01/02/08.

  - "Consultar oferta" queda deshabilitado hasta marcar el consentimiento de Habeas Data (regla 6).
  - `validar()` muestra los errores con el estado "Error" del campo (nodo 2001:1057) solo después de
    un intento de envío. El formulario lleva `novalidate` para que mouse y Enter validen igual.
  - "Inicio" vuelve al home del rol de la sesión: Cliente y Asesor comparten esta pantalla.
  - Solo un ASESOR ve "Nombre completo del cliente" y "Correo del cliente" (W01-A1, sin Figma): viven en
    memoria y cotizar no los envía; se usan al aceptar la oferta (W03-01). Un CLIENTE no los ve porque su
    contacto ya está en AUTH. En cambio el CLIENTE ve su nombre y su correo bloqueados, junto con su cédula (T24).
-->
<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Boton, CampoFormulario, FooterPantalla, HeaderPantalla, MigasDePan, TituloPantalla } from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
import { ejecutar } from '../graphql/cliente'
import { correoClienteValido, esErrorOferta, nombreClienteValido, useCotizacion } from '../composables/useCotizacion'
import { useLimitesPlazo } from '../composables/useLimitesPlazo'
import { useSesion } from '../composables/useSesion'
import { t, type Clave } from '../i18n'

const router = useRouter()
const { estado, captura } = useCotizacion()
const { estado: sesion, rutaInicio } = useSesion()
const esAsesor = computed(() => sesion.rol === 'ASESOR')
// T18: los límites del plazo salen del contrato (jurisdicciones), no de la pantalla.
const { limites, cargarLimitesPlazo } = useLimitesPlazo()
onMounted(() => void cargarLimitesPlazo())

// T6 (W03-34): el CLIENTE ya tiene su documento en la cuenta. Se muestra enmascarado y de solo lectura, y a la
// cotización viaja `null` para que el BFF use el de la cuenta. Solo vive en esta pantalla (nunca en el navegador).
// Sin documento en la cuenta (o si la consulta falla) el campo sigue editable como siempre.
const documentoDeCuenta = ref<string | null>(null)
// T24: nombre y correo de la cuenta, solo para verlos (candado). Nunca entran a `captura` ni al navegador.
const SIN_DATO = '—'
const nombreDeCuenta = ref<string | null>(null)
const correoDeCuenta = ref<string | null>(null)
onMounted(async () => {
  if (sesion.rol !== 'CLIENTE') return
  try {
    const datos = await ejecutar<{
      yo: { documentoEnmascarado?: string | null; nombre?: string | null; correo?: string | null } | null
    }>('query yoDocumento { yo { documentoEnmascarado nombre correo } }')
    if (datos.yo) {
      nombreDeCuenta.value = datos.yo.nombre?.trim() || SIN_DATO
      correoDeCuenta.value = datos.yo.correo?.trim() || SIN_DATO
    }
    documentoDeCuenta.value = datos.yo?.documentoEnmascarado?.trim() || null
    if (documentoDeCuenta.value) captura.documentoIdentidad = ''
  } catch {
    /* se queda editable */
  }
})

const avisoConsentimiento = computed(() =>
  esErrorOferta(estado.resultado) && estado.resultado.motivo === 'CONSENTIMIENTO_NO_VIGENTE'
    ? estado.resultado.mensaje
    : null,
)

// Guarda la clave del texto, no el texto: así el error cambia de idioma junto con el resto de la pantalla.
const errores = reactive<Record<string, Clave>>({})
const intentoEnvio = ref(false)

function validar(): boolean {
  const nuevosErrores: Record<string, Clave> = {}
  if (esAsesor.value) {
    if (!captura.nombreCliente.trim()) nuevosErrores.nombreCliente = 'solicitud.errorNombreClienteVacio'
    else if (!nombreClienteValido(captura.nombreCliente)) nuevosErrores.nombreCliente = 'solicitud.errorNombreCliente'
    if (!captura.correoCliente.trim()) nuevosErrores.correoCliente = 'solicitud.errorCorreoClienteVacio'
    else if (!correoClienteValido(captura.correoCliente)) nuevosErrores.correoCliente = 'solicitud.errorCorreoCliente'
  }
  if (documentoDeCuenta.value) {
    // El documento lo pone el BFF desde la cuenta.
  } else if (!captura.documentoIdentidad.trim()) {
    nuevosErrores.documentoIdentidad = 'solicitud.errorDocumentoVacio'
  } else if (captura.documentoIdentidad.replace(/\D/g, '').length < 6) {
    // Solo descarta valores claramente incompletos; el contrato no exige dígito de verificación.
    nuevosErrores.documentoIdentidad = 'solicitud.errorDocumento'
  }
  const credito = Number(captura.valorCredito)
  if (!captura.valorCredito.trim() || Number.isNaN(credito) || credito <= 0) {
    nuevosErrores.valorCredito = 'solicitud.errorMonto'
  }
  const plazo = Number(captura.plazoMeses)
  if (!captura.plazoMeses.trim() || !Number.isInteger(plazo) || plazo < limites.min || plazo > limites.max) {
    nuevosErrores.plazoMeses = 'solicitud.errorPlazo'
  }
  if (!captura.direccionInmueble.trim()) {
    nuevosErrores.direccionInmueble = 'solicitud.errorDireccion'
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
</script>

<template>
  <div class="sentry-block flex h-screen flex-col overflow-hidden" data-pantalla="W01-01">
    <HeaderPantalla :titulo="t('solicitud.header')" />
    <MigasDePan :seccion="t('comun.nuevaCotizacion')" :a-inicio="rutaInicio()" />
    <main class="flex min-h-0 flex-1 flex-col items-center overflow-y-auto bg-fondo px-10 py-8">
      <div class="flex w-full max-w-[880px] flex-col items-center gap-6">
        <TituloPantalla class="text-center">{{ t('solicitud.titulo') }}</TituloPantalla>
        <form class="flex w-full max-w-[400px] flex-col gap-5" novalidate @submit.prevent="enviar">
          <template v-if="esAsesor">
            <CampoFormulario
              v-model="captura.nombreCliente"
              :label="t('solicitud.nombreCliente')"
              :placeholder="t('solicitud.nombreClienteEjemplo')"
              icono="person"
              :error="intentoEnvio && errores.nombreCliente ? t(errores.nombreCliente) : undefined"
              required
            />
            <CampoFormulario
              v-model="captura.correoCliente"
              :label="t('solicitud.correoCliente')"
              type="email"
              :placeholder="t('solicitud.correoClienteEjemplo')"
              icono="mail"
              :error="intentoEnvio && errores.correoCliente ? t(errores.correoCliente) : undefined"
              required
            />
          </template>
          <template v-if="nombreDeCuenta !== null && correoDeCuenta !== null">
            <CampoFormulario
              :model-value="nombreDeCuenta"
              :label="t('solicitud.nombreCuenta')"
              :hint="t('solicitud.datoDeCuenta')"
              icono="person"
              data-prueba="nombre-de-cuenta"
              disabled
            />
            <CampoFormulario
              :model-value="correoDeCuenta"
              :label="t('solicitud.correoCuenta')"
              :hint="t('solicitud.datoDeCuenta')"
              icono="mail"
              data-prueba="correo-de-cuenta"
              disabled
            />
          </template>
          <CampoFormulario
            v-if="documentoDeCuenta"
            :model-value="documentoDeCuenta"
            :label="t('solicitud.documento')"
            :hint="t('solicitud.documentoDeCuenta')"
            icono="badge"
            data-prueba="documento-de-cuenta"
            disabled
          />
          <CampoFormulario
            v-else
            v-model="captura.documentoIdentidad"
            :label="t('solicitud.documento')"
            :placeholder="t('solicitud.documentoEjemplo')"
            icono="badge"
            :error="intentoEnvio && errores.documentoIdentidad ? t(errores.documentoIdentidad) : undefined"
            required
          />
          <CampoFormulario
            v-model="captura.valorCredito"
            :label="t('solicitud.monto')"
            :placeholder="t('solicitud.montoEjemplo')"
            icono="payments"
            :hint="intentoEnvio && errores.valorCredito ? undefined : t('solicitud.montoAyuda')"
            :error="intentoEnvio && errores.valorCredito ? t(errores.valorCredito) : undefined"
            required
          />
          <CampoFormulario
            v-model="captura.plazoMeses"
            :label="t('solicitud.plazo')"
            type="number"
            :placeholder="t('solicitud.plazoEjemplo')"
            :error="
              intentoEnvio && errores.plazoMeses
                ? t(errores.plazoMeses, { min: limites.min, max: limites.max })
                : undefined
            "
            required
          />
          <CampoFormulario
            v-model="captura.direccionInmueble"
            :label="t('solicitud.direccion')"
            :placeholder="t('solicitud.direccionEjemplo')"
            icono="home"
            :error="intentoEnvio && errores.direccionInmueble ? t(errores.direccionInmueble) : undefined"
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
                {{ t('solicitud.consentimiento') }}
              </span>
            </label>
            <p class="pl-7 text-[11px] leading-[18px] text-tinta-suave">
              {{ t('solicitud.consentimientoNota') }}
            </p>
          </div>

          <div class="flex items-center gap-3 pt-2">
            <Boton :disabled="!captura.consentimiento" @click="enviar">{{ t('solicitud.consultar') }}</Boton>
            <p v-if="!captura.consentimiento" class="text-[11px] italic leading-[16.5px] text-tinta-suave">
              {{ t('solicitud.deshabilitado') }}
            </p>
          </div>
        </form>
      </div>
    </main>
    <FooterPantalla />
  </div>
</template>
