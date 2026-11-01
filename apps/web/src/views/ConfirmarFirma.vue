<!--
  W03-02b · Confirmar firma y autorización de cobro (Figma "Solventa-web-Final", nodo 2020:32). CA-W03-02, 03 y 05.

  - Sin perfil ni migas (W03-31). Textos corregidos: el cobro va a la tarjeta que el cliente elige al pagar (no «junto
    con la cuota del crédito») y la póliza se emite al confirmarse el pago, no al firmar.
  - «Sí, firmar y autorizar el cobro» llama a `firmarPorEnlace` con la firma capturada en W03-02. Sin firma en memoria
    (p. ej. tras recargar), vuelve a W03-02.
  - Errores de la firma: contrato actualizado → vuelve a W03-02; servicio de firma caído → «Reintentar» (nunca un 5xx,
    CA-W03-05); propuesta en otro paso → la retoma.
-->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Boton } from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
import TarjetaEnlace from '../components/TarjetaEnlace.vue'
import { esErrorFirma, hayAcceso, rutaDe, usarPropuestaDeSesion, useEnlaceFirma } from '../composables/useEnlaceFirma'
import type { ErrorFirma } from '../graphql/tipos'
import { t } from '../i18n'
import { formatearMonto } from '../utils/formato'

const router = useRouter()
const { estado, firmar } = useEnlaceFirma()

const documento = computed(() => estado.enlace?.documento ?? null)
const errorFirma = ref<ErrorFirma | null>(null)
// En el recorrido del cliente (`/propuestas/:propuestaId/firma/confirmar`) la sesión autoriza; en el del enlace, el token.
const propuestaDeLaRuta = router.currentRoute.value.params.propuestaId
if (typeof propuestaDeLaRuta === 'string') usarPropuestaDeSesion(propuestaDeLaRuta)
const sinEnlace = !hayAcceso()

onMounted(() => {
  // Sin firma en memoria (p. ej. tras recargar) se vuelve a W03-02; sin token, estado vacío aquí mismo.
  if (!sinEnlace && (!documento.value || !estado.firmaCapturada)) router.replace(rutaDe(''))
})

async function confirmar() {
  errorFirma.value = null
  const resultado = await firmar()
  if (!resultado) return // falla técnica: estado.error se muestra con reintento
  if (!esErrorFirma(resultado)) {
    router.push(rutaDe('/confirmada'))
    return
  }
  if (resultado.motivo === 'VERSION_DOCUMENTO_DESACTUALIZADA' || resultado.motivo === 'PROPUESTA_NO_FIRMABLE') {
    router.replace(rutaDe(''))
    return
  }
  errorFirma.value = resultado
}
</script>

<template>
  <TarjetaEnlace
    v-if="sinEnlace"
    pantalla="W03-02b"
    :titulo-header="t('confirmarFirma.header')"
    :titulo="t('firma.vencido.titulo')"
    :texto="t('firma.vencido.texto')"
    icono="link_off"
    clase-mosaico="bg-fondo text-tinta-suave"
  />
  <TarjetaEnlace
    v-else
    pantalla="W03-02b"
    :titulo-header="t('confirmarFirma.header')"
    :titulo="t('confirmarFirma.titulo')"
    ancho="ancha"
  >
    <template v-if="documento">
      <div class="flex w-full flex-col gap-2 rounded-lg border border-alerta bg-alerta-fondo p-5">
        <span class="text-[15px] font-semibold text-alerta">{{ t('confirmarFirma.autorizas') }}</span>
        <span class="text-[28px] font-bold text-tinta" data-prueba="monto-mensual">
          {{ t('comun.porMes', { monto: formatearMonto(documento.montoMensual) }) }}
        </span>
        <p class="text-[13px] text-tinta">{{ t('confirmarFirma.cobro', { meses: documento.meses }) }}</p>
      </div>

      <h2 class="text-[15px] font-semibold text-tinta">{{ t('confirmarFirma.queOcurre') }}</h2>
      <ul class="flex list-disc flex-col gap-1 pl-5 text-[13px] text-tinta-suave">
        <li>{{ t('confirmarFirma.paso1') }}</li>
        <li>{{ t('confirmarFirma.paso2') }}</li>
        <li>{{ t('confirmarFirma.paso3') }}</li>
      </ul>

      <div
        v-if="errorFirma || estado.error"
        role="alert"
        data-prueba="error-firma"
        class="w-full rounded border border-error bg-error-fondo px-4 py-3 text-[13px] text-error"
      >
        {{ errorFirma?.mensaje ?? estado.error }}
      </div>

      <div class="flex flex-col gap-3 sm:flex-row">
        <Boton data-prueba="confirmar-firma" :disabled="estado.cargando" @click="confirmar">
          <template v-if="estado.cargando || errorFirma?.puedeReintentar || estado.error" #icono>
            <IconoMaterial
              :nombre="estado.cargando ? 'progress_activity' : 'refresh'"
              class="h-4 w-4"
              :class="{ 'animate-spin': estado.cargando }"
            />
          </template>
          {{
            estado.cargando
              ? t('confirmarFirma.firmando')
              : errorFirma?.puedeReintentar || estado.error
                ? t('firma.reintentar')
                : t('confirmarFirma.confirmar')
          }}
        </Boton>
        <Boton variante="secundario" :disabled="estado.cargando" @click="router.push(rutaDe(''))">
          {{ t('confirmarFirma.volver') }}
        </Boton>
      </div>
    </template>
  </TarjetaEnlace>
</template>
