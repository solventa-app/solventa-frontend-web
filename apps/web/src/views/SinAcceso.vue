<!--
  G-09 · Sin acceso. Se muestra cuando una persona con sesión abre una pantalla que su rol no puede ver (por ejemplo,
  un cliente que escribe la dirección de una pantalla del operador). No dice qué rol sí puede verla. El BFF aplica los
  mismos permisos: esto solo evita mostrar una pantalla que va a fallar.
-->
<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Boton, FooterPantalla, HeaderPantalla, TituloPantalla } from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
import { useSesion } from '../composables/useSesion'
import { t } from '../i18n'

const router = useRouter()
const { rutaInicio } = useSesion()
</script>

<template>
  <div data-pantalla="G-09" class="flex h-screen flex-col overflow-hidden">
    <HeaderPantalla :titulo="t('sinAcceso.titulo')" />
    <main class="flex min-h-0 flex-1 flex-col items-center overflow-y-auto bg-fondo px-4 py-8">
      <div
        class="flex w-full max-w-[464px] flex-col items-start gap-4 rounded-[8px] border border-borde bg-white p-[17px]"
      >
        <span class="flex h-12 w-12 items-center justify-center rounded-lg bg-alerta-fondo text-alerta">
          <IconoMaterial nombre="lock" class="h-6 w-6" />
        </span>
        <TituloPantalla>{{ t('sinAcceso.titulo') }}</TituloPantalla>
        <p class="text-[13px] text-tinta-suave">{{ t('sinAcceso.texto') }}</p>
        <Boton class="w-full" @click="router.push(rutaInicio())">{{ t('sinAcceso.volver') }}</Boton>
      </div>
    </main>
    <FooterPantalla />
  </div>
</template>
