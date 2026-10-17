<!--
  G-01 · Ingreso con selector de rol (Figma yKWD8jrwERtJkuSj0mk0Gz "Solventa-web-Final", nodo
  2001:431). Punto de entrada que antes no existía en esta rama (quedaba como PantallaPendiente): sin
  esta pantalla no había ningún camino de clic real hacia /cotizacion, /inicio, /asesor ni /operador.

  Re-verificada contra el archivo correcto (la ronda anterior la había citado y "corregido" contra
  2vfK0e8t62OvvDk4c7QnK5 "Solventa-web", que resultó ser el archivo equivocado): el chip de rol
  seleccionado usa el token de marca `primario` (no un gris genérico), el formulario va envuelto en
  la tarjeta blanca con borde que muestra el mockup, y el encabezado "Iniciar sesión" es un H1
  visible dentro de esa tarjeta, no un texto oculto para lectores de pantalla.

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

  Triage de la revisión de los 2 agentes (UX senior + QA senior):
  - [MEDIA] El `<form>` no tenía `novalidate` (mismo caso que SolicitudYConsentimiento.vue: el botón
    es `type="button"`, pero sin `novalidate` Enter en un campo sí dispara la validación nativa).
  - [BAJA] El campo de correo no pasaba `type="email"` a `CampoFormulario` (quedaba en el `text` por
    defecto): ya se agrega, sin cambiar ningún otro comportamiento del campo.
  - [BAJA] "¿Eres un socio de distribución?..." (nodo 2001:481, literalmente un "Link" en Figma, en
    azul `text-enlace`) se ve idéntico a un enlace real pero no navega a ningún lado (ver más
    arriba: HU-W07 está fuera de este sprint). Se deja el color fiel al nodo (no se simula un estilo
    "deshabilitado" que el mockup no tiene) y se agrega `aria-disabled` + `title` como señal pasiva,
    sin alterar la fidelidad visual. El ícono de 24px que sí lleva el nodo (2001:482) se omite a
    propósito: ningún ícono del set de esta rama encaja semánticamente con "socios"/API sin
    fabricar uno nuevo (mismo criterio de no inventar glifos usado en el resto de esta ronda).
  - [MEDIA, gap conocido, no corregido en esta ronda] El grupo de chips "Ingresas como"
    (`role="radiogroup"`) marca `aria-checked` por chip, pero no implementa el patrón completo de
    WAI-ARIA APG para radiogroup (roving tabindex: solo el chip seleccionado debería estar en el
    orden de tabulación, con flechas moviendo la selección entre chips) — hoy los 3 chips son
    alcanzables con Tab de a uno. Mismo gap aplica al `role="tablist"` de ConciliacionDePagos.vue
    (feature/HU-W05-conciliacion). Implementar el patrón completo es un cambio de comportamiento de
    teclado no trivial para las ~5 pantallas que ya usan grupos similares; se documenta aquí en vez
    de implementarlo a medias bajo el alcance de esta ronda de arreglos.
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
  <div data-pantalla="G-01" class="flex h-screen flex-col overflow-hidden">
    <HeaderPantalla titulo="Iniciar sesión" />
    <main class="flex min-h-0 flex-1 flex-col items-center overflow-y-auto bg-fondo px-10 py-8">
      <div class="flex w-full max-w-[464px] flex-col gap-5">
        <Divisor />
        <div class="w-full rounded-[8px] border border-borde bg-white p-[17px]">
          <TituloPantalla class="mb-6">Iniciar sesión</TituloPantalla>
          <form class="flex w-full flex-col gap-5" novalidate @submit.prevent="ingresar">
            <CampoFormulario v-model="correo" type="email" label="Correo electrónico" placeholder="nombre@correo.com" required />
            <CampoFormulario
              v-model="contrasena"
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
                  :class="rol === chip.rol ? 'bg-primario text-white' : 'border border-borde bg-white text-tinta-suave hover:bg-fondo'"
                  @click="rol = chip.rol"
                >
                  {{ chip.etiqueta }}
                </button>
              </div>
            </div>

            <Boton :disabled="!correo.trim() || !contrasena.trim()" class="w-full" @click="ingresar">Ingresar</Boton>

            <p class="text-[11px] leading-[14px] text-tinta-suave">
              Los 3 roles tienen su propio home — Cliente y Asesor comercial llegan al mismo formulario de
              cotización, con distinto encabezado según quién entra.
            </p>

            <p class="text-[13px] text-enlace" aria-disabled="true" title="Disponible próximamente (HU-W07, fuera de este sprint)">
              ¿Eres un socio de distribución? Ingresa al portal de socios API
            </p>
          </form>
        </div>
      </div>
    </main>
    <FooterPantalla />
  </div>
</template>
