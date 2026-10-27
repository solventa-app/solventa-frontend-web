<!--
  /dev/correo · Buzón simulado del cliente (SOLO `dev:mock`, decisión D-5). No es una pantalla de Solventa ni entra al
  build de producción: muestra lo que el mock de HU-W03 «envió» al correo del cliente (códigos de verificación y
  enlaces de firma) para hacer la demo y el Cypress del flujo completo sin un servidor de correo.
  Textos de herramienta de desarrollo, como IndicePantallas: no van al catálogo de i18n.
-->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { buzonSimulado, type CorreoSimulado } from '../../mocks/suscripcion'

const router = useRouter()
const correos = ref<readonly CorreoSimulado[]>([])
const refrescar = () => (correos.value = [...buzonSimulado()])
let temporizador: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  refrescar()
  temporizador = setInterval(refrescar, 1000)
})
onUnmounted(() => clearInterval(temporizador))

const vacio = computed(() => correos.value.length === 0)

function abrirEnlace(token: string) {
  router.push({ path: '/firma', hash: `#t=${token}` })
}
</script>

<template>
  <main class="min-h-screen bg-fondo p-6 font-sans text-tinta" data-pantalla="DEV-correo">
    <div class="mx-auto flex max-w-[640px] flex-col gap-4">
      <p class="rounded border border-alerta bg-alerta-fondo px-3 py-2 text-[12px] text-alerta">
        Buzón simulado (solo desarrollo con mocks). En producción el cliente recibe un correo real.
      </p>
      <h1 class="text-[22px] font-bold">Correo del cliente</h1>
      <p v-if="vacio" class="text-[13px] text-tinta-suave">
        Todavía no hay correos. Desde W03-01, como asesor, envía un código o emite la propuesta.
      </p>
      <article
        v-for="correo in correos"
        :key="correo.enviadoEn + correo.valor"
        class="flex flex-col gap-2 rounded-lg border border-borde bg-white p-4"
        :data-prueba="`correo-${correo.tipo}`"
      >
        <span class="text-[11px] text-tinta-suave">Para {{ correo.para }} · {{ correo.enviadoEn }}</span>
        <template v-if="correo.tipo === 'codigo'">
          <strong class="text-[14px]">Tu código de verificación de Solventa</strong>
          <span class="font-mono text-[24px] tracking-[6px]" data-prueba="codigo">{{ correo.valor }}</span>
          <span class="text-[12px] text-tinta-suave">Díctaselo a tu asesor. Vence en 10 minutos.</span>
        </template>
        <template v-else>
          <strong class="text-[14px]">Firma y paga tu póliza</strong>
          <span class="text-[12px] text-tinta-suave">El enlace es de un solo uso y vence en 30 minutos.</span>
          <button
            type="button"
            class="self-start rounded bg-primario px-4 py-2 text-[13px] font-semibold text-white"
            data-prueba="abrir-enlace"
            @click="abrirEnlace(correo.valor)"
          >
            Abrir enlace
          </button>
        </template>
      </article>
    </div>
  </main>
</template>
