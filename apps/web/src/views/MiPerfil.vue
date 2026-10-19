<!--
  G-05 · Mi perfil (Figma "Solventa-web-Final", nodo 2001:518). Para los tres roles, con datos reales de
  `yo` (BFF): nombre, alias, rol, estado de la cuenta y fecha de registro.
  Desviación: el prototipo muestra documento, correo, celular, dirección, entidad financiera y la
  verificación biométrica; el backend todavía no guarda esos datos de los usuarios (solo alias, nombre y
  rol), así que no se inventan: se muestra lo que existe y una nota. Solo lectura, como en Figma.
  Responsive: las tarjetas se apilan y los datos pasan a una columna en pantallas angostas.
-->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Divisor, FooterPantalla, HeaderPantalla, ModalCerrarSesion, TituloPantalla } from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
import { ejecutar } from '../graphql/cliente'
import type { Usuario } from '../graphql/tipos'
import { useCierreDeSesion } from '../composables/useCierreDeSesion'
import { ETIQUETA_ROL, useSesion } from '../composables/useSesion'
import { formatearFecha } from '../utils/formato'

const props = withDefaults(defineProps<{ fetchFn?: typeof fetch }>(), { fetchFn: undefined })

const { estado, rutaInicio } = useSesion()
const { modalAbierto, pedirCierre, cancelarCierre, confirmarCierre } = useCierreDeSesion()

const CONSULTA_YO = `
  query yo {
    yo { id usuario nombre rol estado creadoEn }
  }
`

const perfil = ref<Usuario | null>(null)
const cargando = ref(true)
const error = ref<string | null>(null)

const PORTAL: Record<string, string> = {
  CLIENTE: 'Portal Cliente',
  ASESOR: 'Portal Asesor',
  BACKOFFICE: 'Portal Operativo',
}

const nombre = computed(() => perfil.value?.nombre?.trim() || perfil.value?.usuario || estado.nombre)
const iniciales = computed(() =>
  nombre.value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join(''),
)
const rol = computed(() => (perfil.value ? ETIQUETA_ROL[perfil.value.rol] : estado.rol ? ETIQUETA_ROL[estado.rol] : ''))
const activo = computed(() => perfil.value?.estado === 'ACTIVO')

onMounted(async () => {
  try {
    const datos = await ejecutar<{ yo: Usuario | null }>(CONSULTA_YO, {}, props.fetchFn ?? fetch)
    perfil.value = datos.yo
    if (!datos.yo) error.value = 'No pudimos cargar tu perfil en este momento.'
  } catch {
    // Nunca un error técnico (regla 5).
    error.value = 'No pudimos cargar tu perfil en este momento.'
  } finally {
    cargando.value = false
  }
})
</script>

<template>
  <div data-pantalla="G-05" class="flex h-screen flex-col overflow-hidden bg-fondo">
    <HeaderPantalla titulo="Mi perfil" />

    <main class="mx-auto flex min-h-0 w-full max-w-[880px] flex-1 flex-col gap-5 overflow-y-auto px-4 py-6 sm:px-10">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-borde pb-2 text-[11px]">
        <span class="flex items-center gap-1 text-tinta-suave">
          <IconoMaterial nombre="badge" class="h-5 w-5" />
          {{ PORTAL[estado.rol ?? ''] ?? 'Portal' }}
        </span>
        <button
          type="button"
          class="flex items-center gap-1 rounded-sm px-1 py-0.5 text-[13px] font-medium text-enlace hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace"
          @click="pedirCierre"
        >
          Cerrar sesión
          <IconoMaterial nombre="logout" class="h-5 w-5" />
        </button>
      </div>

      <div class="flex flex-wrap items-end justify-between gap-2">
        <div>
          <TituloPantalla>Mi perfil</TituloPantalla>
          <p class="text-[13px] text-tinta-suave">Tu cuenta en Solventa</p>
        </div>
        <span class="flex items-center gap-1 text-[11px] text-tinta-suave">
          <IconoMaterial nombre="lock" class="h-4 w-4" />Solo lectura
        </span>
      </div>
      <Divisor />

      <p v-if="cargando" class="text-[13px] text-tinta-suave">Cargando tu perfil…</p>
      <p v-else-if="error" role="alert" class="text-[13px] text-error">{{ error }}</p>

      <template v-else-if="perfil">
        <section class="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-borde bg-white p-5">
          <div class="flex min-w-0 items-center gap-4">
            <span
              class="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-info-fondo text-[18px] font-bold text-primario"
              aria-hidden="true"
              >{{ iniciales }}</span
            >
            <div class="flex min-w-0 flex-col gap-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="truncate text-[16px] font-bold text-tinta" data-dato="nombre">{{ nombre }}</span>
                <span
                  class="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]"
                  :class="activo ? 'bg-exito-fondo text-exito' : 'bg-error-fondo text-error'"
                >
                  <IconoMaterial :nombre="activo ? 'check_circle' : 'cancel'" class="h-3 w-3" />
                  {{ activo ? 'Cuenta activa' : 'Cuenta suspendida' }}
                </span>
              </div>
              <span class="text-[13px] text-tinta-suave" data-dato="rol">{{ rol }}</span>
            </div>
          </div>
          <div class="flex flex-col items-start text-[11px] text-tinta-suave sm:items-end">
            <span>Fecha de registro</span>
            <span class="text-[13px] font-semibold text-tinta" data-dato="registro">{{
              formatearFecha(perfil.creadoEn)
            }}</span>
          </div>
        </section>

        <section class="flex flex-col gap-4 rounded-lg border border-borde bg-white p-5">
          <h2 class="flex items-center gap-2 border-b border-borde pb-3 text-[16px] font-bold text-tinta">
            <IconoMaterial nombre="badge" class="h-5 w-5 text-primario" />Datos de la cuenta
          </h2>
          <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="flex flex-col gap-1">
              <dt class="text-[11px] text-tinta-suave">Usuario</dt>
              <dd class="rounded border border-borde bg-fondo px-3 py-2 text-[13px] text-tinta" data-dato="usuario">
                {{ perfil.usuario }}
              </dd>
            </div>
            <div class="flex flex-col gap-1">
              <dt class="text-[11px] text-tinta-suave">Rol</dt>
              <dd class="rounded border border-borde bg-fondo px-3 py-2 text-[13px] text-tinta">{{ rol }}</dd>
            </div>
            <div class="flex flex-col gap-1">
              <dt class="text-[11px] text-tinta-suave">Nombre</dt>
              <dd class="rounded border border-borde bg-fondo px-3 py-2 text-[13px] text-tinta">{{ nombre }}</dd>
            </div>
            <div class="flex flex-col gap-1">
              <dt class="text-[11px] text-tinta-suave">Sesión iniciada</dt>
              <dd class="rounded border border-borde bg-fondo px-3 py-2 text-[13px] text-tinta">
                {{ estado.iniciadaEn ? formatearFecha(new Date(estado.iniciadaEn).toISOString()) : '—' }}
              </dd>
            </div>
          </dl>
        </section>

        <p class="flex items-start gap-2 rounded-lg border border-borde bg-white p-4 text-[11px] text-tinta-suave">
          <IconoMaterial nombre="info" class="h-4 w-4 shrink-0" />
          Esta información es de solo lectura. Tus datos personales se tratan conforme a la Ley 1581 de 2012 de Habeas
          Data.
        </p>
      </template>

      <RouterLink
        :to="rutaInicio()"
        class="mx-auto flex items-center gap-2 rounded-md border border-primario bg-white px-5 py-3 text-[13px] font-semibold text-primario hover:bg-fondo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace"
      >
        <IconoMaterial nombre="arrow_back" class="h-4 w-4" />Volver al inicio
      </RouterLink>
    </main>
    <FooterPantalla />

    <ModalCerrarSesion :abierto="modalAbierto" @cancelar="cancelarCierre" @confirmar="confirmarCierre" />
  </div>
</template>
