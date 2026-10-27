<!--
  Retorno de la pasarela · `/pago/retorno?sesion=…` (HU-W03, bloque 9; sin Figma, aprobado en el plan principal 5.2).
  CA-W03-04, 05, 06, 07 y 13. Usa la tarjeta de W03-03.

  - El estado del pago NO viaja en la URL: Solventa lo confirma con la pasarela (`confirmarPago`, servidor a servidor).
    El id de sesión no es un dato personal.
  - El token del enlace se toma del puente de sessionStorage UNA vez y se borra (useEnlaceFirma, D-3).
  - Cobrado → W03-04. Falla de la pasarela → «Reintentar» (concilia antes de cobrar); al 3.er fallo seguido o con un
    rechazo → «Pagar con otra tarjeta» (sesión nueva, sin perder la firma). Sesión vencida → «Volver a abrir el pago».
-->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Boton } from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
import TarjetaEnlace from '../components/TarjetaEnlace.vue'
import { esErrorPago, hayToken, irAPasarela, tomarTokenDelPuente, useEnlaceFirma } from '../composables/useEnlaceFirma'
import type { ErrorPago } from '../graphql/tipos-borrador'
import { t } from '../i18n'

const route = useRoute()
const router = useRouter()
const { estado, confirmarPago, iniciarPago } = useEnlaceFirma()

type Vista = 'confirmando' | 'error' | 'sinEnlace' | 'falla'
const vista = ref<Vista>('confirmando')
const errorPago = ref<ErrorPago | null>(null)
const sesion = computed(() => {
  const valor = route.query.sesion
  return typeof valor === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(valor) ? valor : null
})

const titulo = computed(() => {
  const motivo = errorPago.value?.motivo
  if (motivo === 'PASARELA_NO_DISPONIBLE') return t('retornoPago.titulo.falla')
  if (motivo === 'REQUIERE_OTRA_TARJETA') return t('retornoPago.titulo.otraTarjeta')
  if (motivo === 'SESION_VENCIDA') return t('retornoPago.titulo.sesionVencida')
  if (motivo === 'FONDOS_INSUFICIENTES' || motivo === 'TARJETA_VENCIDA' || motivo === 'PAGO_RECHAZADO') {
    return t('retornoPago.titulo.rechazo')
  }
  return t('retornoPago.titulo.sinPagar')
})
const puedeReintentar = computed(() => !!errorPago.value?.puedeReintentar)

async function confirmar() {
  vista.value = 'confirmando'
  errorPago.value = null
  if (!sesion.value) {
    vista.value = 'sinEnlace'
    return
  }
  const resultado = await confirmarPago(sesion.value)
  if (!resultado) {
    vista.value = 'falla'
    return
  }
  if (!esErrorPago(resultado)) {
    router.replace('/firma/poliza')
    return
  }
  if (resultado.motivo === 'ENLACE_VENCIDO') {
    router.replace('/firma')
    return
  }
  errorPago.value = resultado
  vista.value = 'error'
}

async function pagarDeNuevo() {
  const resultado = await iniciarPago()
  if (!resultado) {
    vista.value = 'falla'
    return
  }
  if (esErrorPago(resultado)) {
    if (resultado.motivo === 'ENLACE_VENCIDO') router.replace('/firma')
    else errorPago.value = resultado
    return
  }
  irAPasarela(router, resultado.urlPago)
}

onMounted(() => {
  if (!hayToken() && !tomarTokenDelPuente()) {
    vista.value = 'sinEnlace'
    return
  }
  confirmar()
})
</script>

<template>
  <TarjetaEnlace
    v-if="vista === 'confirmando'"
    pantalla="W03-R"
    :titulo-header="t('retornoPago.header')"
    :titulo="t('retornoPago.confirmando')"
    icono="progress_activity"
  />
  <TarjetaEnlace
    v-else-if="vista === 'sinEnlace'"
    pantalla="W03-R"
    :titulo-header="t('retornoPago.header')"
    :titulo="t('retornoPago.sinEnlace.titulo')"
    :texto="t('retornoPago.sinEnlace.texto')"
    icono="link_off"
    clase-mosaico="bg-fondo text-tinta-suave"
  />
  <TarjetaEnlace
    v-else-if="vista === 'falla'"
    pantalla="W03-R"
    :titulo-header="t('retornoPago.header')"
    :titulo="t('retornoPago.titulo.falla')"
    :texto="estado.error ?? t('firma.errorTecnico')"
    icono="warning"
    clase-mosaico="bg-alerta-fondo text-alerta"
  >
    <Boton :disabled="estado.cargando" @click="confirmar">
      <template #icono><IconoMaterial nombre="refresh" class="h-4 w-4" /></template>
      {{ t('firma.reintentar') }}
    </Boton>
  </TarjetaEnlace>
  <TarjetaEnlace
    v-else
    pantalla="W03-R"
    :titulo-header="t('retornoPago.header')"
    :titulo="titulo"
    :texto="errorPago?.mensaje"
    :icono="puedeReintentar ? 'warning' : 'credit_card'"
    :clase-mosaico="puedeReintentar ? 'bg-alerta-fondo text-alerta' : 'bg-error-fondo text-error'"
  >
    <p v-if="errorPago?.fallosSeguidos" class="text-[12px] text-tinta-suave" data-prueba="fallos">
      {{ t('retornoPago.fallos', { fallos: errorPago.fallosSeguidos }) }}
    </p>
    <p class="text-[12px] text-tinta-suave">{{ t('retornoPago.firmaSeConserva') }}</p>
    <Boton v-if="puedeReintentar" data-prueba="reintentar-pago" :disabled="estado.cargando" @click="confirmar">
      <template #icono><IconoMaterial nombre="refresh" class="h-4 w-4" /></template>
      {{ t('firma.reintentar') }}
    </Boton>
    <Boton v-else data-prueba="otra-tarjeta" :disabled="estado.cargando" @click="pagarDeNuevo">
      <template #icono><IconoMaterial nombre="credit_card" class="h-4 w-4" /></template>
      {{
        errorPago?.motivo === 'SESION_VENCIDA'
          ? t('retornoPago.reabrir')
          : errorPago?.motivo
            ? t('retornoPago.otraTarjeta')
            : t('retornoPago.volverAPagar')
      }}
    </Boton>
  </TarjetaEnlace>
</template>
