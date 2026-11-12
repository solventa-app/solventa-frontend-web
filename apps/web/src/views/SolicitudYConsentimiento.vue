<!--
  W01-01 · Solicitud y consentimiento (Figma "Solventa-web-Final", nodo 2001:1016). CA-W01-01/02/08.

  - "Consultar oferta" queda deshabilitado hasta marcar el consentimiento de Habeas Data (regla 6).
  - `validar()` muestra los errores con el estado "Error" del campo (nodo 2001:1057) solo después de
    un intento de envío. El formulario lleva `novalidate` para que mouse y Enter validen igual.
  - "Inicio" vuelve al home del rol de la sesión: Cliente y Asesor comparten esta pantalla.
  - Solo un ASESOR ve "Nombre completo del cliente" y "Correo del cliente" (W01-A1, sin Figma): viven en
    memoria y cotizar no los envía; se usan al aceptar la oferta (W03-01). Un CLIENTE no los ve porque su
    contacto ya está en AUTH. En cambio el CLIENTE ve su nombre y su correo bloqueados, junto con su cédula (T24).
  - KAN-290: arriba se elige el producto. Vida hipotecario pide el crédito y el inmueble; auto todo riesgo pide la
    placa, el kilometraje anual, la ciudad, el uso y el deducible. Cambiar de producto pide un consentimiento nuevo,
    porque su finalidad es otra.
-->
<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Boton,
  Chip,
  CampoDireccion,
  CampoFormulario,
  CampoSeleccion,
  FooterPantalla,
  HeaderPantalla,
  MigasDePan,
  TituloPantalla,
} from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
import { ejecutar } from '../graphql/cliente'
import { correoClienteValido, esErrorOferta, nombreClienteValido, useCotizacion } from '../composables/useCotizacion'
import { useLimitesPlazo } from '../composables/useLimitesPlazo'
import { useSesion } from '../composables/useSesion'
import { idioma, t, type Clave } from '../i18n'
import { cambiarPais, pais, tipoDocumento } from '../composables/usePais'
import { documentoCumpleFormato, nombrePais, PAISES, tiposDocumento } from '../utils/documentos'

const router = useRouter()
const { estado, captura } = useCotizacion()
const { estado: sesion, rutaInicio } = useSesion()
const esAsesor = computed(() => sesion.rol === 'ASESOR')
// T20 (v0.38): el asesor elige país y tipo de documento; ambos viajan con el documento al consentimiento y la cotización.
const opcionesPais = computed(() => PAISES.map((c) => ({ valor: c, texto: nombrePais(c, idioma.value) })))
const opcionesTipo = computed(() =>
  tiposDocumento(pais.value, idioma.value).map((x) => ({ valor: x.codigo, texto: x.etiqueta })),
)
function elegirPais(v: string) {
  void cambiarPais(v)
  void revisarPaisDeLaDireccion()
}

// T19: al elegir una sugerencia, el `placeId` viaja a la cotización (el BFF normaliza la dirección). Si el lugar está en
// otro país que el elegido se avisa, sin bloquear: el BFF rechaza solo un país no soportado.
const paisDeLaDireccion = ref<string | null>(null)
const avisoPaisDistinto = computed(() =>
  paisDeLaDireccion.value && paisDeLaDireccion.value !== pais.value
    ? t('solicitud.paisDistinto', {
        paisDireccion: nombrePais(paisDeLaDireccion.value, idioma.value),
        pais: nombrePais(pais.value, idioma.value),
      })
    : null,
)
let consultaLugar = 0
async function revisarPaisDeLaDireccion() {
  const placeId = captura.placeId
  const esta = ++consultaLugar
  if (!placeId) {
    paisDeLaDireccion.value = null
    return
  }
  try {
    const datos = await ejecutar<{ validarDireccion: { verificado: boolean; pais?: string | null } }>(
      'query validarDireccion($placeId: String!) { validarDireccion(placeId: $placeId) { verificado pais } }',
      { placeId },
    )
    if (esta !== consultaLugar) return
    paisDeLaDireccion.value = datos.validarDireccion.verificado ? (datos.validarDireccion.pais ?? null) : null
  } catch {
    if (esta === consultaLugar) paisDeLaDireccion.value = null // sin Places no se avisa nada
  }
}
function elegirLugar(placeId: string | null) {
  captura.placeId = placeId
  void revisarPaisDeLaDireccion()
}
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
    captura.documentoDeCuenta = documentoDeCuenta.value !== null
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

// KAN-290: el producto. Al cambiarlo se olvida el consentimiento registrado: el de auto tiene otra finalidad.
const esAuto = computed(() => captura.producto === 'AUTO')
function elegirProducto(producto: 'VIDA_DEUDOR' | 'AUTO') {
  if (captura.producto === producto) return
  captura.producto = producto
  estado.consentimientoId = null
  estado.consentimiento = null
  intentoEnvio.value = false
}
const opcionesUso = computed(() => [
  { valor: 'PARTICULAR', texto: t('solicitud.usoParticular') },
  { valor: 'COMERCIAL', texto: t('solicitud.usoComercial') },
])
const opcionesDeducible = computed(() => [
  { valor: 'DIEZ_POR_CIENTO', texto: t('solicitud.deducibleDiez') },
  { valor: 'SIN_DEDUCIBLE', texto: t('solicitud.deducibleSin') },
])
const PLACA = /^[A-Z]{3}[0-9]{2}[A-Z0-9]$/

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
  } else if (!documentoCumpleFormato(pais.value, tipoDocumento.value, captura.documentoIdentidad)) {
    // T20: el mismo formato del catálogo con que valida el BFF (`documentoValido`).
    nuevosErrores.documentoIdentidad = 'solicitud.errorDocumento'
  }
  if (esAuto.value) {
    if (!PLACA.test(captura.placa.replace(/[\s-]/g, '').toUpperCase())) {
      nuevosErrores.placa = 'solicitud.errorPlaca'
    }
    const km = Number(captura.kilometrajeAnual)
    if (!captura.kilometrajeAnual.trim() || !Number.isInteger(km) || km < 0 || km > 200000) {
      nuevosErrores.kilometrajeAnual = 'solicitud.errorKilometraje'
    }
    if (captura.ciudadCirculacion.trim().length < 2) {
      nuevosErrores.ciudadCirculacion = 'solicitud.errorCiudad'
    }
  } else {
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
        <TituloPantalla class="text-center">
          {{ esAuto ? t('solicitud.tituloAuto') : t('solicitud.titulo') }}
        </TituloPantalla>
        <div
          role="radiogroup"
          :aria-label="t('solicitud.producto')"
          class="flex flex-wrap justify-center gap-2"
          data-prueba="producto"
        >
          <Chip
            tamano="filtro"
            role="radio"
            :aria-checked="!esAuto"
            :activo="!esAuto"
            data-prueba="producto-vida"
            @click="elegirProducto('VIDA_DEUDOR')"
          >
            <IconoMaterial nombre="home" class="mr-2 h-5 w-5" />{{ t('solicitud.productoVida') }}
          </Chip>
          <Chip
            tamano="filtro"
            role="radio"
            :aria-checked="esAuto"
            :activo="esAuto"
            data-prueba="producto-auto"
            @click="elegirProducto('AUTO')"
          >
            <IconoMaterial nombre="directions_car" class="mr-2 h-5 w-5" />{{ t('solicitud.productoAuto') }}
          </Chip>
        </div>
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
          <template v-else>
            <template v-if="esAsesor">
              <CampoSeleccion
                :model-value="pais"
                :label="t('solicitud.pais')"
                :opciones="opcionesPais"
                data-prueba="pais"
                @update:model-value="elegirPais"
              />
              <CampoSeleccion
                v-model="tipoDocumento"
                :label="t('solicitud.tipoDocumento')"
                :opciones="opcionesTipo"
                data-prueba="tipo-documento"
              />
            </template>
            <CampoFormulario
              v-model="captura.documentoIdentidad"
              :label="t('solicitud.documento')"
              :placeholder="t('solicitud.documentoEjemplo')"
              icono="badge"
              :error="intentoEnvio && errores.documentoIdentidad ? t(errores.documentoIdentidad) : undefined"
              required
            />
          </template>
          <template v-if="esAuto">
            <CampoFormulario
              v-model="captura.placa"
              :label="t('solicitud.placa')"
              :placeholder="t('solicitud.placaEjemplo')"
              icono="directions_car"
              data-prueba="placa"
              :hint="intentoEnvio && errores.placa ? undefined : t('solicitud.placaAyuda')"
              :error="intentoEnvio && errores.placa ? t(errores.placa) : undefined"
              required
            />
            <CampoFormulario
              v-model="captura.kilometrajeAnual"
              :label="t('solicitud.kilometraje')"
              type="number"
              :placeholder="t('solicitud.kilometrajeEjemplo')"
              data-prueba="kilometraje"
              :error="intentoEnvio && errores.kilometrajeAnual ? t(errores.kilometrajeAnual) : undefined"
              required
            />
            <CampoFormulario
              v-model="captura.ciudadCirculacion"
              :label="t('solicitud.ciudad')"
              :placeholder="t('solicitud.ciudadEjemplo')"
              icono="location_on"
              data-prueba="ciudad"
              :error="intentoEnvio && errores.ciudadCirculacion ? t(errores.ciudadCirculacion) : undefined"
              required
            />
            <CampoSeleccion
              v-model="captura.uso"
              :label="t('solicitud.uso')"
              :opciones="opcionesUso"
              data-prueba="uso"
            />
            <CampoSeleccion
              v-model="captura.deducible"
              :label="t('solicitud.deducible')"
              :opciones="opcionesDeducible"
              data-prueba="deducible"
            />
          </template>
          <template v-else>
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
            <CampoDireccion
              v-model="captura.direccionInmueble"
              :label="t('solicitud.direccion')"
              :placeholder="t('solicitud.direccionEjemplo')"
              :pais="pais"
              :error="intentoEnvio && errores.direccionInmueble ? t(errores.direccionInmueble) : undefined"
              @lugar="elegirLugar"
            />
          </template>
          <p
            v-if="!esAuto && avisoPaisDistinto"
            role="status"
            class="rounded-md border border-alerta bg-alerta-fondo px-3 py-2 text-[12px] leading-[16px] text-tinta"
            data-prueba="pais-distinto"
          >
            {{ avisoPaisDistinto }}
          </p>

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
                {{ esAuto ? t('solicitud.consentimientoAuto') : t('solicitud.consentimiento') }}
              </span>
            </label>
            <p class="pl-7 text-[11px] leading-[18px] text-tinta-suave">
              {{ esAuto ? t('solicitud.consentimientoNotaAuto') : t('solicitud.consentimientoNota') }}
            </p>
            <p
              v-if="!esAuto"
              class="pl-7 text-[11px] leading-[18px] text-tinta-suave"
              data-prueba="aviso-privacidad-direccion"
            >
              {{ t('solicitud.avisoPrivacidadDireccion') }}
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
