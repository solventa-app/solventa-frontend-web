<!--
  G-01 · Ingreso (Figma "Solventa-web-Final", nodo 2001:431, que lo dibuja "con selector de rol").

  Inicia sesión contra el BFF (`iniciarSesion`, ver useSesion.ts); el rol lo decide el JWT que devuelve el
  backend y a él se va el usuario (`rutaInicio`): no se le pregunta.
  Desviaciones del prototipo:
  - El campo es "Usuario", no "Correo electrónico": el backend prohíbe que el alias sea un correo.
  - Sin los chips de rol del prototipo (cliente / asesor / operador): el backend ya manda el rol en el token,
    así que elegirlo a mano era redundante. El campo `rol` de `CredencialesInput` es opcional y no se envía.
  - Sin avatar de perfil en el header (todavía no hay sesión) y con botón para ver la contraseña.
  - "Portal de socios" lleva al ingreso del portal de socios (W07-01, HU-W07).
-->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Boton, CampoFormulario, Divisor, FooterPantalla, HeaderPantalla, TituloPantalla } from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
import { useSesion } from '../composables/useSesion'
import { t } from '../i18n'

const router = useRouter()
const route = useRoute()
const { estado, iniciarSesion, rutaInicio } = useSesion()

const usuario = ref('')
const clave = ref('')
const error = ref<string | null>(null)
const ingresando = ref(false)

const textoAviso = computed(() => {
  if (estado.aviso === 'vencida') return t('ingreso.sesionVencida')
  if (estado.aviso === 'inactividad') return t('ingreso.sesionInactividad')
  if (estado.aviso === 'sinSesion') return t('ingreso.sinSesion')
  if (route.query.clave === 'cambiada') return t('ingreso.claveCambiada')
  return null
})

/** A dónde volver tras ingresar: solo una ruta interna (nada de `//otro-sitio` ni `https://…`). */
function rutaDeRegreso(): string | null {
  const volver = route.query.volver
  return typeof volver === 'string' && /^\/(?!\/)/.test(volver) && !volver.startsWith('/login') ? volver : null
}

async function ingresar() {
  if (!usuario.value.trim() || !clave.value || ingresando.value) return
  ingresando.value = true
  error.value = await iniciarSesion(usuario.value.trim(), clave.value)
  ingresando.value = false
  if (error.value) return
  router.push(rutaDeRegreso() ?? rutaInicio())
}
</script>

<template>
  <div data-pantalla="G-01" class="flex h-screen flex-col overflow-hidden">
    <HeaderPantalla :titulo="t('ingreso.titulo')" sin-perfil />
    <main class="flex min-h-0 flex-1 flex-col items-center overflow-y-auto bg-fondo px-10 py-8">
      <div class="flex w-full max-w-[464px] flex-col gap-5">
        <Divisor />
        <p
          v-if="textoAviso"
          role="status"
          data-testid="aviso-sesion-vencida"
          class="flex items-start gap-2 rounded-[8px] border border-info bg-info-fondo p-3 text-[13px] text-tinta"
        >
          <IconoMaterial nombre="timer" class="h-5 w-5 shrink-0 text-info" />
          {{ textoAviso }}
        </p>
        <div class="w-full rounded-[8px] border border-borde bg-white p-[17px]">
          <TituloPantalla class="mb-6">{{ t('ingreso.titulo') }}</TituloPantalla>
          <form class="flex w-full flex-col gap-5" novalidate @submit.prevent="ingresar">
            <CampoFormulario
              v-model="usuario"
              :label="t('ingreso.usuario')"
              :placeholder="t('ingreso.usuarioEjemplo')"
              required
            />
            <CampoFormulario
              v-model="clave"
              type="password"
              :label="t('ingreso.clave')"
              placeholder="••••••••"
              icono="lock"
              required
            />

            <p v-if="error" role="alert" class="text-[13px] text-error">{{ error }}</p>

            <Boton
              :disabled="!usuario.trim() || !clave || ingresando"
              :aria-busy="ingresando"
              class="w-full"
              @click="ingresar"
            >
              {{ t('ingreso.ingresar') }}
            </Boton>

            <RouterLink to="/olvide-clave" class="text-[13px] text-enlace hover:underline">
              {{ t('ingreso.olvide') }}
            </RouterLink>

            <p class="text-[11px] leading-[14px] text-tinta-suave">
              {{ t('ingreso.nota') }}
            </p>

            <RouterLink to="/socios/ingreso" class="text-[13px] text-enlace hover:underline">
              {{ t('ingreso.socio') }}
            </RouterLink>
          </form>
        </div>
      </div>
    </main>
    <FooterPantalla />
  </div>
</template>
