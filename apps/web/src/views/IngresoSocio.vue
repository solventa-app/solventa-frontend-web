<!--
  W07-01 · Ingreso al portal de socios (Figma "Solventa-web-Final", nodo 2001:3340; plan-hu-w07-front.md 5.2).

  Copia la plantilla del login ya construido (G-01, IngresoConRol.vue): la misma tarjeta, los mismos campos con el ojo
  de la clave, el botón gris hasta ser válido y los errores. Del prototipo toma el contenido y el tono técnico.
  Desviaciones del prototipo (decididas en el plan):
  - Tarjeta de G-01 (~464 px) en vez de la angosta de ~320 px, con los íconos a la derecha como en todos los campos.
  - Título «Portal de socios» y ayuda «Tu clave de producción» (W07-3) en vez de «Token corporativo»: la clave no es
    el token.
  - «¿Problemas con tu clave…?» es solo texto (decidido: sin enlace de soporte).
  - Si la sesión técnica anterior venció, se avisa arriba de la tarjeta.
-->
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Boton, CampoFormulario, Divisor, FooterPantalla, HeaderPantalla } from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
import { useSesionSocio } from '../composables/useSesionSocio'
import { t } from '../i18n'

const router = useRouter()
const { estado, iniciarSesion } = useSesionSocio()

const socioId = ref('')
const clave = ref('')
const error = ref<string | null>(null)
const ingresando = ref(false)

async function ingresar() {
  if (!socioId.value.trim() || !clave.value || ingresando.value) return
  ingresando.value = true
  error.value = await iniciarSesion(socioId.value, clave.value)
  ingresando.value = false
  if (error.value) {
    clave.value = ''
    return
  }
  router.push('/socios/panel')
}
</script>

<template>
  <div data-pantalla="W07-01" class="flex h-screen flex-col overflow-hidden">
    <HeaderPantalla :titulo="t('socios.ingreso.titulo')" sin-perfil />
    <main class="flex min-h-0 flex-1 flex-col items-center overflow-y-auto bg-fondo px-4 py-8 sm:px-10">
      <div class="flex w-full max-w-[464px] flex-col gap-5">
        <Divisor />
        <p
          v-if="estado.aviso === 'vencida'"
          role="status"
          class="flex items-start gap-2 rounded-[8px] border border-info bg-info-fondo p-3 text-[13px] text-tinta"
        >
          <IconoMaterial nombre="timer" class="h-5 w-5 shrink-0 text-info" />
          {{ t('socios.sesion.vencida') }}
        </p>

        <div class="w-full rounded-[8px] border border-borde bg-white p-[17px]">
          <div class="mb-5 flex flex-col">
            <p
              class="flex items-center gap-1 pb-1 text-[11px] font-semibold uppercase tracking-[0.55px] text-tinta-suave"
            >
              <IconoMaterial nombre="shield" class="h-6 w-6 text-primario" />
              {{ t('socios.ingreso.etiqueta') }}
            </p>
            <h2 class="text-[16px] font-semibold leading-[22px] tracking-[-0.4px] text-tinta">
              {{ t('socios.ingreso.tarjetaTitulo') }}
            </h2>
            <p class="pt-1 text-[11px] leading-[14px] text-tinta-suave">{{ t('socios.ingreso.subtitulo') }}</p>
          </div>

          <form class="flex w-full flex-col gap-5" novalidate @submit.prevent="ingresar">
            <CampoFormulario
              v-model="socioId"
              :label="t('socios.ingreso.socioId')"
              :placeholder="t('socios.ingreso.socioIdEjemplo')"
              icono="badge"
              required
            />
            <CampoFormulario
              v-model="clave"
              type="password"
              :label="t('socios.ingreso.clave')"
              :hint="t('socios.ingreso.claveAyuda')"
              placeholder="••••••••••••"
              required
            />

            <p v-if="error" role="alert" class="text-[13px] text-error">{{ error }}</p>

            <Boton
              :disabled="!socioId.trim() || !clave || ingresando"
              :aria-busy="ingresando"
              class="mt-2 w-full"
              @click="ingresar"
            >
              {{ ingresando ? t('socios.ingreso.ingresando') : t('socios.ingreso.ingresar') }}
              <IconoMaterial v-if="!ingresando" nombre="arrow_forward" class="h-6 w-6" />
            </Boton>
          </form>

          <div class="mt-5 flex flex-col gap-2 border-t border-borde pt-[17px]">
            <p class="text-[11px] leading-[14px] text-tinta-suave">{{ t('socios.ingreso.problemas') }}</p>
            <p class="flex items-center gap-1 text-[11px] leading-[14px] text-tinta-suave">
              <IconoMaterial nombre="lock" class="h-6 w-6 shrink-0" />
              {{ t('socios.ingreso.cifrado') }}
            </p>
            <RouterLink to="/login" class="text-center text-[13px] text-enlace hover:underline">
              {{ t('socios.ingreso.volver') }}
            </RouterLink>
          </div>
        </div>

        <p class="px-1 text-center text-[11px] leading-[14px] text-tinta-suave">{{ t('socios.ingreso.auditoria') }}</p>
      </div>
    </main>
    <FooterPantalla />
  </div>
</template>
