<!--
  G-01 · Ingreso con selector de rol (Figma "Solventa-web-Final", nodo 2001:431).

  Inicia sesión contra el BFF (`iniciarSesion`, ver useSesion.ts); el rol real lo decide el JWT.
  Desviaciones del prototipo:
  - El campo es "Usuario", no "Correo electrónico": el backend prohíbe que el alias sea un correo.
  - Los chips de rol se conservan, pero si el rol del token no coincide con el elegido se rechaza el
    ingreso con «Tu rol es X» y se preselecciona su rol, en vez de entrar con otro rol.
  - Sin avatar de perfil en el header (todavía no hay sesión) y con botón para ver la contraseña.
  - "Portal de socios" lleva al ingreso del portal de socios (W07-01, HU-W07).
  Pendiente: el `role="radiogroup"` no implementa el patrón completo de WAI-ARIA (roving tabindex).
-->
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Boton, CampoFormulario, Divisor, FooterPantalla, HeaderPantalla, TituloPantalla } from '../components/ui'
import { etiquetaRol, useSesion, type Rol } from '../composables/useSesion'
import { t } from '../i18n'

const router = useRouter()
const { estado, iniciarSesion, cerrarSesion, rutaInicio } = useSesion()

const usuario = ref('')
const clave = ref('')
const rol = ref<Rol>('CLIENTE')
const error = ref<string | null>(null)
const ingresando = ref(false)

const CHIPS: Rol[] = ['CLIENTE', 'ASESOR', 'BACKOFFICE']

async function ingresar() {
  if (!usuario.value.trim() || !clave.value || ingresando.value) return
  ingresando.value = true
  error.value = await iniciarSesion(usuario.value.trim(), clave.value)
  ingresando.value = false
  if (error.value) return
  if (estado.rol !== rol.value) {
    // La clave ya fue correcta, así que decirle su rol no revela nada a un tercero. Se preselecciona el
    // chip correcto para que vuelva a ingresar con un clic, y la sesión no queda abierta con otro rol.
    const rolReal = estado.rol
    cerrarSesion()
    const chip = CHIPS.find((c) => c === rolReal)
    error.value = chip ? t('ingreso.otroRol', { rol: etiquetaRol(chip) }) : t('ingreso.sinRol')
    if (chip) rol.value = chip
    clave.value = ''
    return
  }
  router.push(rutaInicio())
}
</script>

<template>
  <div data-pantalla="G-01" class="flex h-screen flex-col overflow-hidden">
    <HeaderPantalla :titulo="t('ingreso.titulo')" sin-perfil />
    <main class="flex min-h-0 flex-1 flex-col items-center overflow-y-auto bg-fondo px-10 py-8">
      <div class="flex w-full max-w-[464px] flex-col gap-5">
        <Divisor />
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

            <div class="flex flex-col gap-2">
              <span class="text-[13px] text-tinta">{{ t('ingreso.ingresasComo') }}</span>
              <div role="radiogroup" :aria-label="t('ingreso.ingresasComo')" class="flex flex-wrap items-center gap-2">
                <button
                  v-for="chip in CHIPS"
                  :key="chip"
                  type="button"
                  role="radio"
                  :aria-checked="rol === chip"
                  class="flex h-[44px] items-center justify-center rounded-xl px-4 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
                  :class="
                    rol === chip
                      ? 'bg-primario text-white'
                      : 'border border-borde bg-white text-tinta-suave hover:bg-fondo'
                  "
                  @click="rol = chip"
                >
                  {{ etiquetaRol(chip) }}
                </button>
              </div>
            </div>

            <p v-if="error" role="alert" class="text-[13px] text-error">{{ error }}</p>

            <Boton
              :disabled="!usuario.trim() || !clave || ingresando"
              :aria-busy="ingresando"
              class="w-full"
              @click="ingresar"
            >
              {{ t('ingreso.ingresar') }}
            </Boton>

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
