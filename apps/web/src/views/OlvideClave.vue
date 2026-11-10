<!--
  G-07 · Olvidé mi contraseña (KAN-26, contrato v0.43). Pide solo el correo. La respuesta es siempre la misma exista o
  no la cuenta (el BFF no lo revela), así que aquí tampoco se dice nada distinto: «Si hay una cuenta con ese correo…».
  Misma estructura de tarjeta que G-01 (ingreso).
-->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { Boton, CampoFormulario, Divisor, FooterPantalla, HeaderPantalla, TituloPantalla } from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
import { solicitarRestablecimiento } from '../composables/useRestablecerClave'
import { t } from '../i18n'

const correo = ref('')
const enviando = ref(false)
const enviado = ref(false)
const error = ref<string | null>(null)

const correoValido = computed(() => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo.value.trim()))

async function enviar() {
  if (!correoValido.value || enviando.value) return
  enviando.value = true
  error.value = await solicitarRestablecimiento(correo.value.trim())
  enviando.value = false
  enviado.value = error.value === null
}
</script>

<template>
  <div data-pantalla="G-07" class="flex h-screen flex-col overflow-hidden">
    <HeaderPantalla :titulo="t('olvide.titulo')" sin-perfil />
    <main class="flex min-h-0 flex-1 flex-col items-center overflow-y-auto bg-fondo px-10 py-8">
      <div class="flex w-full max-w-[464px] flex-col gap-5">
        <Divisor />
        <div class="w-full rounded-[8px] border border-borde bg-white p-[17px]">
          <TituloPantalla class="mb-6">{{ t('olvide.titulo') }}</TituloPantalla>

          <div v-if="enviado" role="status" data-testid="olvide-enviado" class="flex flex-col gap-4">
            <p class="flex items-start gap-2 text-[13px] text-tinta">
              <IconoMaterial nombre="mail" class="h-5 w-5 shrink-0 text-info" />
              <span>
                <strong class="block">{{ t('olvide.enviadoTitulo') }}</strong>
                {{ t('olvide.enviadoTexto') }}
              </span>
            </p>
            <RouterLink to="/login" class="text-[13px] text-enlace hover:underline">
              {{ t('olvide.volver') }}
            </RouterLink>
          </div>

          <form v-else class="flex w-full flex-col gap-5" novalidate @submit.prevent="enviar">
            <p class="text-[13px] text-tinta-suave">{{ t('olvide.texto') }}</p>
            <CampoFormulario
              v-model="correo"
              type="email"
              :label="t('olvide.correo')"
              :placeholder="t('olvide.correoEjemplo')"
              icono="mail"
              required
            />
            <p v-if="error" role="alert" class="text-[13px] text-error">{{ error }}</p>
            <Boton :disabled="!correoValido || enviando" :aria-busy="enviando" class="w-full" @click="enviar">
              {{ enviando ? t('olvide.enviando') : t('olvide.enviar') }}
            </Boton>
            <RouterLink to="/login" class="text-[13px] text-enlace hover:underline">
              {{ t('olvide.volver') }}
            </RouterLink>
          </form>
        </div>
      </div>
    </main>
    <FooterPantalla />
  </div>
</template>
