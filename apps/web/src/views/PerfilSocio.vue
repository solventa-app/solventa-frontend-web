<!--
  W07-05 · Perfil del socio (T21). Misma estructura que G-05 «Mi perfil»: datos de solo lectura y bloque «Preferencias»
  con idioma y moneda (el país no aplica al socio). Va dentro del marco fijo del portal (`PortalSocio`): encabezado,
  barra, pestañas y pie fijos, solo se desplaza el contenido.
  El socio entra con una sesión técnica, no con una cuenta de AUTH, así que no hay `actualizarPreferencias`: idioma y
  moneda son los globales de la web y se recuerdan en el navegador (`localStorage`), igual que los selectores del
  encabezado, con los que quedan sincronizados porque comparten el mismo estado.
  Desviación: la API de socios no entrega un estado de la cuenta; solo se muestran nombre, identificador y la sesión.
-->
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { convertirMontos } from '../api/socios'
import PortalSocio from '../components/socios/PortalSocio.vue'
import { SelectorIdioma, SelectorMoneda } from '../components/ui'
import IconoMaterial from '../components/ui/IconoMaterial.vue'
import { cambiarMoneda, moneda, usarConversor } from '../composables/useMoneda'
import { useSesionSocio } from '../composables/useSesionSocio'
import { cambiarIdioma, idioma, t } from '../i18n'
import { formatearFecha } from '../utils/formato'

const sesion = useSesionSocio()

const SIN_DATO = '—'
const nombre = computed(() => sesion.estado.nombre?.trim() || SIN_DATO)
const identificador = computed(() => sesion.estado.socioId || SIN_DATO)
const vence = computed(() =>
  sesion.estado.expiraEn ? formatearFecha(new Date(sesion.estado.expiraEn).toISOString()) : SIN_DATO,
)
const iniciales = computed(() =>
  (nombre.value === SIN_DATO ? '' : nombre.value)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join(''),
)

// El socio no tiene sesión de GraphQL: convierte con su API (igual que el panel).
onMounted(() => {
  if (!sesion.estado.nombre) void sesion.cargarNombre()
  usarConversor(async (montos, destino) => {
    const resultado = await convertirMontos(sesion.estado.token ?? '', montos, destino)
    return resultado.montos
  })
})
onBeforeUnmount(() => usarConversor(null))
</script>

<template>
  <PortalSocio pantalla="W07-05" :titulo="t('socios.perfil.titulo')" activa="perfil">
    <div class="mx-auto flex w-full max-w-[880px] flex-col gap-5 px-4 py-8 sm:px-10">
      <section class="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-borde bg-white p-5">
        <div class="flex min-w-0 items-center gap-4">
          <span
            class="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-info-fondo text-[18px] font-bold text-primario"
            aria-hidden="true"
            >{{ iniciales }}</span
          >
          <div class="flex min-w-0 flex-col gap-1">
            <span class="truncate text-[16px] font-bold text-tinta" data-dato="nombre">{{ nombre }}</span>
            <span class="text-[13px] text-tinta-suave" data-dato="rol">{{ t('socios.panel.rol') }}</span>
          </div>
        </div>
      </section>

      <section class="flex flex-col gap-4 rounded-lg border border-borde bg-white p-5">
        <h2 class="flex items-center justify-between gap-2 border-b border-borde pb-3 text-[16px] font-bold text-tinta">
          <span class="flex items-center gap-2">
            <IconoMaterial nombre="badge" class="h-5 w-5 text-primario" />{{ t('socios.perfil.datos') }}
          </span>
          <span class="flex items-center gap-1 text-[11px] font-normal text-tinta-suave">
            <IconoMaterial nombre="lock" class="h-4 w-4" />{{ t('socios.perfil.soloLectura') }}
          </span>
        </h2>
        <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-1">
            <dt class="text-[11px] text-tinta-suave">{{ t('socios.perfil.nombre') }}</dt>
            <dd class="rounded border border-borde bg-fondo px-3 py-2 text-[13px] text-tinta" data-dato="nombre-campo">
              {{ nombre }}
            </dd>
          </div>
          <div class="flex flex-col gap-1">
            <dt class="text-[11px] text-tinta-suave">{{ t('socios.perfil.id') }}</dt>
            <dd class="rounded border border-borde bg-fondo px-3 py-2 text-[13px] text-tinta" data-dato="id-campo">
              {{ identificador }}
            </dd>
          </div>
          <div class="flex flex-col gap-1">
            <dt class="text-[11px] text-tinta-suave">{{ t('socios.perfil.vence') }}</dt>
            <dd class="rounded border border-borde bg-fondo px-3 py-2 text-[13px] text-tinta" data-dato="vence-campo">
              {{ vence }}
            </dd>
          </div>
        </dl>
      </section>

      <section class="flex flex-col gap-4 rounded-lg border border-borde bg-white p-5" data-bloque="preferencias">
        <h2 class="flex items-center gap-2 border-b border-borde pb-3 text-[16px] font-bold text-tinta">
          <IconoMaterial nombre="person" class="h-5 w-5 text-primario" />{{ t('socios.perfil.preferencias') }}
        </h2>
        <div class="flex flex-wrap gap-6">
          <div class="flex flex-col gap-1">
            <span class="text-[11px] text-tinta-suave">{{ t('socios.perfil.idioma') }}</span>
            <SelectorIdioma :model-value="idioma" @update:model-value="cambiarIdioma" />
          </div>
          <div class="flex flex-col gap-1">
            <span class="text-[11px] text-tinta-suave">{{ t('socios.perfil.moneda') }}</span>
            <SelectorMoneda :model-value="moneda" @update:model-value="cambiarMoneda" />
          </div>
        </div>
        <p class="text-[11px] text-tinta-suave">{{ t('socios.perfil.nota') }}</p>
      </section>

      <p class="flex items-start gap-2 rounded-lg border border-borde bg-white p-4 text-[11px] text-tinta-suave">
        <IconoMaterial nombre="info" class="h-4 w-4 shrink-0" />{{ t('socios.perfil.aviso') }}
      </p>
    </div>
  </PortalSocio>
</template>
