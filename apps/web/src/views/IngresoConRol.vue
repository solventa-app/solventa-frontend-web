<!--
  G-01 · Ingreso con selector de rol (Figma "Solventa-web-Final", nodo 2001:431).

  Inicia sesión contra el BFF (`iniciarSesion`, ver useSesion.ts); el rol real lo decide el JWT.
  Desviaciones del prototipo:
  - El campo es "Usuario", no "Correo electrónico": el backend prohíbe que el alias sea un correo.
  - Los chips de rol se conservan, pero si el rol del token no coincide con el elegido se rechaza el
    ingreso con un mensaje, en vez de entrar con un rol distinto al que la persona escogió.
  - "Portal de socios" apunta a HU-W07 (Sprint 2): se muestra sin navegación.
  Pendiente: el `role="radiogroup"` no implementa el patrón completo de WAI-ARIA (roving tabindex).
-->
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Boton, CampoFormulario, Divisor, FooterPantalla, HeaderPantalla, TituloPantalla } from '../components/ui'
import { useSesion, type Rol } from '../composables/useSesion'

const router = useRouter()
const { estado, iniciarSesion, cerrarSesion, rutaInicio } = useSesion()

const usuario = ref('')
const clave = ref('')
const rol = ref<Rol>('CLIENTE')
const error = ref<string | null>(null)
const ingresando = ref(false)

const CHIPS: { rol: Rol; etiqueta: string }[] = [
  { rol: 'CLIENTE', etiqueta: 'Cliente' },
  { rol: 'ASESOR', etiqueta: 'Asesor comercial' },
  { rol: 'BACKOFFICE', etiqueta: 'Operador' },
]

async function ingresar() {
  if (!usuario.value.trim() || !clave.value || ingresando.value) return
  ingresando.value = true
  error.value = await iniciarSesion(usuario.value.trim(), clave.value)
  ingresando.value = false
  if (error.value) return
  if (estado.rol !== rol.value) {
    cerrarSesion()
    error.value = 'Tu usuario no corresponde al rol seleccionado.'
    return
  }
  router.push(rutaInicio())
}
</script>

<template>
  <div data-pantalla="G-01" class="flex h-screen flex-col overflow-hidden">
    <HeaderPantalla titulo="Iniciar sesión" />
    <main class="flex min-h-0 flex-1 flex-col items-center overflow-y-auto bg-fondo px-10 py-8">
      <div class="flex w-full max-w-[464px] flex-col gap-5">
        <Divisor />
        <div class="w-full rounded-[8px] border border-borde bg-white p-[17px]">
          <TituloPantalla class="mb-6">Iniciar sesión</TituloPantalla>
          <form class="flex w-full flex-col gap-5" novalidate @submit.prevent="ingresar">
            <CampoFormulario v-model="usuario" label="Usuario" placeholder="tu.usuario" required />
            <CampoFormulario
              v-model="clave"
              type="password"
              label="Contraseña"
              placeholder="••••••••"
              icono="lock"
              required
            />

            <div class="flex flex-col gap-2">
              <span class="text-[13px] text-tinta">Ingresas como</span>
              <div role="radiogroup" aria-label="Ingresas como" class="flex flex-wrap items-center gap-2">
                <button
                  v-for="chip in CHIPS"
                  :key="chip.rol"
                  type="button"
                  role="radio"
                  :aria-checked="rol === chip.rol"
                  class="flex h-[44px] items-center justify-center rounded-xl px-4 text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
                  :class="
                    rol === chip.rol
                      ? 'bg-primario text-white'
                      : 'border border-borde bg-white text-tinta-suave hover:bg-fondo'
                  "
                  @click="rol = chip.rol"
                >
                  {{ chip.etiqueta }}
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
              Ingresar
            </Boton>

            <p class="text-[11px] leading-[14px] text-tinta-suave">
              Los 3 roles tienen su propio home — Cliente y Asesor comercial llegan al mismo formulario de cotización,
              con distinto encabezado según quién entra.
            </p>

            <p
              class="text-[13px] text-enlace"
              aria-disabled="true"
              title="Disponible próximamente (HU-W07, fuera de este sprint)"
            >
              ¿Eres un socio de distribución? Ingresa al portal de socios API
            </p>
          </form>
        </div>
      </div>
    </main>
    <FooterPantalla />
  </div>
</template>
