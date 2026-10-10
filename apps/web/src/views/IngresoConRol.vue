<!--
  G-01 · Ingreso con selector de rol (Figma 2vfK0e8t62OvvDk4c7QnK5 "Solventa-web", nodo 46:2).
  Punto de entrada que antes no existía en esta rama (quedaba como PantallaPendiente): sin esta
  pantalla no había ningún camino de clic real hacia /cotizacion, /inicio, /asesor ni /operador.

  El contrato (contrato/schema.graphql) no modela login ni roles: no hay mutación de autenticación
  que llamar. "Ingresar" es, por eso, navegación pura del lado del cliente (useSesion.ts) — correo y
  contraseña solo se exigen no vacíos (no hay backend contra el cual validarlos todavía). El enlace
  "portal de socios" apunta a HU-W07 (Sprint 2, fuera de alcance de este sprint): se muestra fiel al
  mockup pero sin navegación real, igual criterio que "Continuar a suscripción" en OfertaCompleta.vue.

  Chip "Operador": en router/pantallas.ts, G-02b (home del Operador, /operador) todavía no tiene
  `componente` EN ESTA RAMA — HomeOperador.vue vive en feature/HU-W05-conciliacion y no se trajo
  aquí para no mezclar historias. Elegir "Operador" e ingresar navega a /operador y cae en
  PantallaPendiente (ver views/PantallaPendiente.vue), que muestra honestamente "pendiente de
  construir" en vez de una pantalla rota o en blanco — es un hueco de aislamiento entre ramas, no un
  bug de producto: al integrar ambas ramas, G-02b queda resuelto sin tocar este archivo.
-->
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Boton, CampoFormulario, Divisor, FooterPantalla, HeaderPantalla, TituloPantalla } from '../components/ui'
import { RUTA_INICIO, useSesion, type Rol } from '../composables/useSesion'

const router = useRouter()
const { iniciarSesion } = useSesion()

const correo = ref('')
const contrasena = ref('')
const rol = ref<Rol>('CLIENTE')

const CHIPS: { rol: Rol; etiqueta: string }[] = [
  { rol: 'CLIENTE', etiqueta: 'Cliente' },
  { rol: 'ASESOR', etiqueta: 'Asesor comercial' },
  { rol: 'OPERADOR', etiqueta: 'Operador' },
]

function ingresar() {
  if (!correo.value.trim() || !contrasena.value.trim()) return
  iniciarSesion(rol.value)
  router.push(RUTA_INICIO[rol.value])
}
</script>

<template>
  <div data-pantalla="G-01" class="flex min-h-screen flex-col">
    <HeaderPantalla titulo="Iniciar sesión" />
    <TituloPantalla class="sr-only">Iniciar sesión</TituloPantalla>
    <Divisor />
    <main class="flex flex-1 flex-col bg-fondo px-10 py-8">
      <form class="flex w-full max-w-[400px] flex-col gap-5" @submit.prevent="ingresar">
        <CampoFormulario v-model="correo" label="Correo electrónico" placeholder="nombre@correo.com" required />
        <CampoFormulario
          v-model="contrasena"
          type="password"
          label="Contraseña"
          placeholder="••••••••"
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
              class="rounded-xl px-[12px] py-[6px] text-[12px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
              :class="rol === chip.rol ? 'bg-tinta text-white' : 'bg-fondo text-tinta-suave hover:bg-borde/40'"
              @click="rol = chip.rol"
            >
              {{ chip.etiqueta }}
            </button>
          </div>
        </div>

        <Boton :disabled="!correo.trim() || !contrasena.trim()" @click="ingresar">Ingresar</Boton>

        <p class="text-[11px] leading-[14px] text-tinta-suave">
          Los 3 roles tienen su propio home — Cliente y Asesor comercial llegan al mismo formulario de
          cotización (W01-01), con distinto encabezado según quién entra.
        </p>

        <p class="text-[13px] font-bold text-tinta-suave">
          ¿Eres un socio de distribución? Ingresa al portal de socios API →
          <span class="block text-[11px] font-normal italic text-tinta-suave">(HU-W07, fuera de este sprint)</span>
        </p>
      </form>
    </main>
    <FooterPantalla />
  </div>
</template>
