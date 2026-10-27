<!--
  W03-03 · Firma confirmada (Figma "Solventa-web-Final", nodo 2001:1969). CA-W03-03 y CA-W03-13.

  - Sin perfil ni migas (W03-31). Se quitan «Validación biométrica aprobada», «en segundo plano» y el avance
    automático del prototipo: ahora el cliente paga aquí mismo.
  - «Ir al inicio» pasa a «Pagar»: abre una sesión en la pasarela (`iniciarPago`) y lleva a su página, fuera de
    Solventa. Antes de salir se deja el puente del token (useEnlaceFirma, D-3).
-->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Boton } from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
import TarjetaEnlace from '../components/TarjetaEnlace.vue'
import { esErrorPago, irAPasarela, useEnlaceFirma, type PasoEnlace } from '../composables/useEnlaceFirma'
import type { ErrorPago } from '../graphql/tipos-borrador'
import { t } from '../i18n'
import { formatearFecha } from '../utils/formato'

const router = useRouter()
const { estado, entrar, iniciarPago } = useEnlaceFirma()

const paso = ref<PasoEnlace | null | 'cargando'>('cargando')
const errorPago = ref<ErrorPago | null>(null)
const firma = computed(() => estado.enlace?.firma ?? null)

onMounted(async () => {
  paso.value = await entrar(router, ['pagar'])
})

async function pagar() {
  errorPago.value = null
  const resultado = await iniciarPago()
  if (!resultado) return
  if (esErrorPago(resultado)) {
    if (resultado.motivo === 'ENLACE_VENCIDO') router.replace('/firma')
    else errorPago.value = resultado
    return
  }
  irAPasarela(router, resultado.urlPago)
}
</script>

<template>
  <TarjetaEnlace
    v-if="paso === 'cargando'"
    pantalla="W03-03"
    :titulo-header="t('firmaConfirmada.header')"
    :titulo="t('firma.cargando')"
    icono="progress_activity"
  />
  <TarjetaEnlace
    v-else-if="paso === 'vencido'"
    pantalla="W03-03"
    :titulo-header="t('firmaConfirmada.header')"
    :titulo="t('firma.vencido.titulo')"
    :texto="t('firma.vencido.texto')"
    icono="link_off"
    clase-mosaico="bg-fondo text-tinta-suave"
  />
  <TarjetaEnlace
    v-else
    pantalla="W03-03"
    :titulo-header="t('firmaConfirmada.header')"
    :titulo="t('firmaConfirmada.titulo')"
    :texto="t('firmaConfirmada.texto')"
    icono="check_circle"
    clase-mosaico="bg-exito-fondo text-exito"
  >
    <dl
      v-if="firma"
      class="flex w-full flex-col gap-2 rounded-md border border-borde bg-fondo p-4 text-left text-[13px]"
      data-prueba="evidencia-firma"
    >
      <div class="flex flex-wrap justify-between gap-2">
        <dt class="text-tinta-suave">{{ t('firmaConfirmada.radicado') }}</dt>
        <dd class="font-mono text-tinta">{{ firma.referencia }}</dd>
      </div>
      <div class="flex flex-wrap justify-between gap-2">
        <dt class="text-tinta-suave">{{ t('firmaConfirmada.estampa') }}</dt>
        <dd class="text-tinta">{{ formatearFecha(firma.firmadaEn) }}</dd>
      </div>
      <div class="flex flex-wrap justify-between gap-2">
        <dt class="text-tinta-suave">{{ t('firmaConfirmada.estado') }}</dt>
        <dd class="text-exito">● {{ t('firmaConfirmada.firmado') }}</dd>
      </div>
    </dl>

    <div
      v-if="errorPago || estado.error || paso === null"
      role="alert"
      class="w-full rounded border border-error bg-error-fondo px-4 py-3 text-[13px] text-error"
    >
      {{ errorPago?.mensaje ?? estado.error ?? t('firma.errorTecnico') }}
    </div>

    <Boton class="w-full max-w-[280px]" data-prueba="pagar" :disabled="estado.cargando" @click="pagar">
      <template #icono>
        <IconoMaterial
          :nombre="estado.cargando ? 'progress_activity' : 'credit_card'"
          class="h-5 w-5"
          :class="{ 'animate-spin': estado.cargando }"
        />
      </template>
      {{ estado.cargando ? t('firmaConfirmada.abriendo') : t('firmaConfirmada.pagar') }}
    </Boton>
    <p class="text-[11px] text-tinta-suave">{{ t('firmaConfirmada.notaPasarela') }}</p>
  </TarjetaEnlace>
</template>
