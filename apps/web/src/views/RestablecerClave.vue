<!--
  G-08 · Nueva contraseña (KAN-26, contrato v0.43). Se abre desde el enlace del correo (`/restablecer-clave#t=…`):
  el token se lee del fragmento, se quita de la barra de direcciones y vive solo en memoria. Antes de pedir la clave se
  comprueba el enlace; si venció o ya se usó, un mensaje genérico con la salida de pedir otro (nunca dice por qué).
  La clave nueva y su confirmación usan los mismos indicadores y reglas que el backend (`ReglasClave`). Al guardar, el
  BFF cierra todas las sesiones de la cuenta y se vuelve a G-01 con el aviso.
-->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Boton, CampoFormulario, Divisor, FooterPantalla, HeaderPantalla, TituloPantalla } from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
import ReglasClave from '../components/ui/ReglasClave.vue'
import {
  comprobarEnlace,
  restablecerClave,
  tomarTokenDelEnlace,
  type EstadoEnlace,
} from '../composables/useRestablecerClave'
import { t } from '../i18n'
import { evaluarClave } from '../utils/reglasClave'

const router = useRouter()

const estadoEnlace = ref<EstadoEnlace | 'verificando'>('verificando')
const clave = ref('')
const confirmacion = ref('')
const guardando = ref(false)
const error = ref<string | null>(null)

const reglas = computed(() => evaluarClave(clave.value))
const noCoincide = computed(() => confirmacion.value !== '' && confirmacion.value !== clave.value)
const puedeGuardar = computed(() => reglas.value.cumple && clave.value === confirmacion.value && !guardando.value)

async function verificar() {
  estadoEnlace.value = 'verificando'
  tomarTokenDelEnlace()
  estadoEnlace.value = await comprobarEnlace()
}

async function guardar() {
  if (!puedeGuardar.value) return
  guardando.value = true
  error.value = null
  const resultado = await restablecerClave(clave.value)
  guardando.value = false
  if (resultado.ok) {
    await router.push({ path: '/login', query: { clave: 'cambiada' } })
    return
  }
  if (resultado.codigo === 'ENLACE_INVALIDO') {
    estadoEnlace.value = 'invalido'
    return
  }
  error.value = resultado.mensaje
}

onMounted(verificar)
</script>

<template>
  <div data-pantalla="G-08" class="flex h-screen flex-col overflow-hidden">
    <HeaderPantalla :titulo="t('restablecer.titulo')" sin-perfil />
    <main class="flex min-h-0 flex-1 flex-col items-center overflow-y-auto bg-fondo px-10 py-8">
      <div class="flex w-full max-w-[464px] flex-col gap-5">
        <Divisor />
        <div class="w-full rounded-[8px] border border-borde bg-white p-[17px]">
          <TituloPantalla class="mb-6">{{ t('restablecer.titulo') }}</TituloPantalla>

          <p v-if="estadoEnlace === 'verificando'" role="status" class="text-[13px] text-tinta-suave">
            {{ t('restablecer.verificando') }}
          </p>

          <div v-else-if="estadoEnlace === 'invalido'" data-testid="enlace-invalido" class="flex flex-col gap-4">
            <p role="alert" class="flex items-start gap-2 text-[13px] text-tinta">
              <IconoMaterial nombre="link_off" class="h-5 w-5 shrink-0 text-error" />
              <span>
                <strong class="block">{{ t('restablecer.enlaceInvalidoTitulo') }}</strong>
                {{ t('restablecer.enlaceInvalido') }}
              </span>
            </p>
            <RouterLink to="/olvide-clave" class="text-[13px] text-enlace hover:underline">
              {{ t('restablecer.pedirOtro') }}
            </RouterLink>
          </div>

          <div v-else-if="estadoEnlace === 'error'" class="flex flex-col gap-4">
            <p role="alert" class="text-[13px] text-error">{{ t('restablecer.falla') }}</p>
            <Boton variante="secundario" @click="verificar">{{ t('restablecer.reintentar') }}</Boton>
          </div>

          <form v-else class="flex w-full flex-col gap-5" novalidate @submit.prevent="guardar">
            <p class="text-[13px] text-tinta-suave">{{ t('restablecer.texto') }}</p>
            <CampoFormulario
              v-model="clave"
              type="password"
              :label="t('restablecer.clave')"
              placeholder="••••••••"
              icono="lock"
              required
            />
            <CampoFormulario
              v-model="confirmacion"
              type="password"
              :label="t('restablecer.confirmar')"
              placeholder="••••••••"
              icono="lock"
              :error="noCoincide ? t('restablecer.noCoincide') : undefined"
              required
            />
            <ReglasClave :clave="clave" :confirmacion="confirmacion" />
            <p v-if="error" role="alert" class="text-[13px] text-error">{{ error }}</p>
            <Boton :disabled="!puedeGuardar" :aria-busy="guardando" class="w-full" @click="guardar">
              {{ guardando ? t('restablecer.guardando') : t('restablecer.guardar') }}
            </Boton>
          </form>
        </div>
      </div>
    </main>
    <FooterPantalla />
  </div>
</template>
