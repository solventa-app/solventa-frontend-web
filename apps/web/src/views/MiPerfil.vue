<!--
  G-05 · Mi perfil (Figma "Solventa-web-Final", nodo 2001:518). Para los tres roles, con datos reales de
  `yo` (BFF): nombre, cédula enmascarada, correo (solo el propio), rol, estado y fecha de registro. Sin alias (T10).
  Desviación: el prototipo muestra además celular, dirección, entidad financiera y la verificación biométrica;
  el backend no los entrega, así que no se inventan. Nada se edita: los campos llevan candado (T24).
  Responsive: las tarjetas se apilan y los datos pasan a una columna en pantallas angostas.
-->
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  CampoSeleccion,
  Divisor,
  FooterPantalla,
  HeaderPantalla,
  ModalCerrarSesion,
  SelectorIdioma,
  SelectorMoneda,
  TituloPantalla,
} from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
import { ejecutar } from '../graphql/cliente'
import type { Usuario } from '../graphql/tipos'
import { useCierreDeSesion } from '../composables/useCierreDeSesion'
import { etiquetaRol, useSesion } from '../composables/useSesion'
import { cambiarIdioma, idioma, t, type Clave } from '../i18n'
import { cambiarMoneda, moneda } from '../composables/useMoneda'
import { cambiarPais, pais } from '../composables/usePais'
import { nombrePais, PAISES } from '../utils/documentos'
import { formatearFecha } from '../utils/formato'

const props = withDefaults(defineProps<{ fetchFn?: typeof fetch }>(), { fetchFn: undefined })

const { estado, rutaInicio } = useSesion()
const { modalAbierto, pedirCierre, cancelarCierre, confirmarCierre } = useCierreDeSesion()

const CONSULTA_YO = `
  query yo {
    yo { id nombre documentoEnmascarado correo rol estado creadoEn }
  }
`

const perfil = ref<Usuario | null>(null)
const cargando = ref(true)
const error = ref<Clave | null>(null)

const opcionesPais = computed(() => PAISES.map((c) => ({ valor: c, texto: nombrePais(c, idioma.value) })))

const portal = computed(() => (estado.rol ? t(`perfil.portal.${estado.rol}` as Clave) : t('perfil.portal')))

// Sin alias de respaldo (T10): si la cuenta no tiene nombre se ve «—». Nombre, cédula y correo son de solo lectura (T24).
const SIN_DATO = '—'
const nombre = computed(() => perfil.value?.nombre?.trim() || SIN_DATO)
const documento = computed(() => perfil.value?.documentoEnmascarado?.trim() || SIN_DATO)
const correo = computed(() => perfil.value?.correo?.trim() || SIN_DATO)
const iniciales = computed(() =>
  (nombre.value === SIN_DATO ? '' : nombre.value)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join(''),
)
const rol = computed(() => (perfil.value ? etiquetaRol(perfil.value.rol) : estado.rol ? etiquetaRol(estado.rol) : ''))
const activo = computed(() => perfil.value?.estado === 'ACTIVO')

onMounted(async () => {
  try {
    const datos = await ejecutar<{ yo: Usuario | null }>(CONSULTA_YO, {}, props.fetchFn ?? fetch)
    perfil.value = datos.yo
    if (!datos.yo) error.value = 'perfil.error'
  } catch {
    // Nunca un error técnico (regla 5).
    error.value = 'perfil.error'
  } finally {
    cargando.value = false
  }
})
</script>

<template>
  <div data-pantalla="G-05" class="flex h-screen flex-col overflow-hidden bg-fondo">
    <HeaderPantalla :titulo="t('perfil.titulo')" />

    <main class="mx-auto flex min-h-0 w-full max-w-[880px] flex-1 flex-col gap-5 overflow-y-auto px-4 py-6 sm:px-10">
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-borde pb-2 text-[11px]">
        <span class="flex items-center gap-1 text-tinta-suave">
          <IconoMaterial nombre="badge" class="h-5 w-5" />
          {{ portal }}
        </span>
        <button
          type="button"
          class="flex items-center gap-1 rounded-sm px-1 py-0.5 text-[13px] font-medium text-enlace hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace"
          @click="pedirCierre"
        >
          {{ t('sesion.cerrar') }}
          <IconoMaterial nombre="logout" class="h-5 w-5" />
        </button>
      </div>

      <div class="flex flex-wrap items-end justify-between gap-2">
        <div>
          <TituloPantalla>{{ t('perfil.titulo') }}</TituloPantalla>
          <p class="text-[13px] text-tinta-suave">{{ t('perfil.subtitulo') }}</p>
        </div>
        <span class="flex items-center gap-1 text-[11px] text-tinta-suave">
          <IconoMaterial nombre="lock" class="h-4 w-4" />{{ t('perfil.soloLectura') }}
        </span>
      </div>
      <Divisor />

      <p v-if="cargando" class="text-[13px] text-tinta-suave">{{ t('perfil.cargando') }}</p>
      <p v-else-if="error" role="alert" class="text-[13px] text-error">{{ t(error) }}</p>

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
                  {{ activo ? t('perfil.activa') : t('perfil.suspendida') }}
                </span>
              </div>
              <span class="text-[13px] text-tinta-suave" data-dato="rol">{{ rol }}</span>
            </div>
          </div>
          <div class="flex flex-col items-start text-[11px] text-tinta-suave sm:items-end">
            <span>{{ t('perfil.registro') }}</span>
            <span class="text-[13px] font-semibold text-tinta" data-dato="registro">{{
              formatearFecha(perfil.creadoEn)
            }}</span>
          </div>
        </section>

        <section class="flex flex-col gap-4 rounded-lg border border-borde bg-white p-5">
          <h2 class="flex items-center gap-2 border-b border-borde pb-3 text-[16px] font-bold text-tinta">
            <IconoMaterial nombre="badge" class="h-5 w-5 text-primario" />{{ t('perfil.datos') }}
          </h2>
          <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="flex flex-col gap-1">
              <dt class="flex items-center gap-1 text-[11px] text-tinta-suave">
                {{ t('perfil.nombre') }}<IconoMaterial nombre="lock" class="h-3 w-3" />
              </dt>
              <dd
                class="rounded border border-borde bg-fondo px-3 py-2 text-[13px] text-tinta"
                data-dato="nombre-campo"
              >
                {{ nombre }}
              </dd>
            </div>
            <div class="flex flex-col gap-1">
              <dt class="flex items-center gap-1 text-[11px] text-tinta-suave">
                {{ t('perfil.documento') }}<IconoMaterial nombre="lock" class="h-3 w-3" />
              </dt>
              <dd
                class="rounded border border-borde bg-fondo px-3 py-2 text-[13px] text-tinta"
                data-dato="documento-campo"
              >
                {{ documento }}
              </dd>
            </div>
            <div class="flex flex-col gap-1">
              <dt class="flex items-center gap-1 text-[11px] text-tinta-suave">
                {{ t('perfil.correo') }}<IconoMaterial nombre="lock" class="h-3 w-3" />
              </dt>
              <dd
                class="rounded border border-borde bg-fondo px-3 py-2 text-[13px] text-tinta"
                data-dato="correo-campo"
              >
                {{ correo }}
              </dd>
            </div>
            <div class="flex flex-col gap-1">
              <dt class="text-[11px] text-tinta-suave">{{ t('perfil.sesionIniciada') }}</dt>
              <dd class="rounded border border-borde bg-fondo px-3 py-2 text-[13px] text-tinta">
                {{ estado.iniciadaEn ? formatearFecha(new Date(estado.iniciadaEn).toISOString()) : '—' }}
              </dd>
            </div>
          </dl>
        </section>

        <section class="flex flex-col gap-4 rounded-lg border border-borde bg-white p-5" data-dato="preferencias">
          <h2 class="flex items-center gap-2 border-b border-borde pb-3 text-[16px] font-bold text-tinta">
            <IconoMaterial nombre="badge" class="h-5 w-5 text-primario" />{{ t('perfil.preferencias') }}
          </h2>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div class="flex flex-col gap-1">
              <span class="text-[11px] text-tinta-suave">{{ t('perfil.prefIdioma') }}</span>
              <SelectorIdioma :model-value="idioma" @update:model-value="cambiarIdioma" />
            </div>
            <div class="flex flex-col gap-1">
              <span class="text-[11px] text-tinta-suave">{{ t('perfil.prefMoneda') }}</span>
              <SelectorMoneda :model-value="moneda" @update:model-value="(v: string) => cambiarMoneda(v)" />
            </div>
            <CampoSeleccion
              :model-value="pais"
              :label="t('perfil.prefPais')"
              :opciones="opcionesPais"
              data-prueba="pref-pais"
              @update:model-value="cambiarPais"
            />
          </div>
        </section>

        <p class="flex items-start gap-2 rounded-lg border border-borde bg-white p-4 text-[11px] text-tinta-suave">
          <IconoMaterial nombre="info" class="h-4 w-4 shrink-0" />
          {{ t('perfil.nota') }}
        </p>
      </template>

      <RouterLink
        :to="rutaInicio()"
        class="mx-auto flex items-center gap-2 rounded-md border border-primario bg-white px-5 py-3 text-[13px] font-semibold text-primario hover:bg-fondo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace"
      >
        <IconoMaterial nombre="arrow_back" class="h-4 w-4" />{{ t('comun.volverInicio') }}
      </RouterLink>
    </main>
    <FooterPantalla />

    <ModalCerrarSesion :abierto="modalAbierto" @cancelar="cancelarCierre" @confirmar="confirmarCierre" />
  </div>
</template>
