<!--
  Barra de navegación (migas de pan) · librería de componentes (Figma 2006:22).

  "Inicio" siempre es enlace. Dos formas de uso, excluyentes:
  - `seccion` + `aInicio`: "Inicio › Sección" (G-01, W01, W05; así se usaba desde el Sprint 1).
  - `niveles` + `aInicio`: varios niveles después de "Inicio" (HU-W04, p. ej. "Inicio › Siniestros › Detalle").
    Los niveles con `to` son enlaces; el último es la página actual (`aria-current="page"`).
  El slot `#derecha` va al otro extremo de la franja (p. ej. la pastilla EstadoOperador); en móvil baja a una
  segunda línea. Sigue la instancia de alta fidelidad 2006:22. No se combina con BarraDeCerrarSesion.
-->
<script setup lang="ts">
import { computed } from 'vue'
import { t } from '../../i18n'

export interface NivelMiga {
  texto: string
  /** Ruta del nivel. Se ignora en el último (la página actual nunca es enlace). */
  to?: string
}

const props = defineProps<{
  /** Ruta de "Inicio" (home del rol/flujo de esta pantalla). */
  aInicio: string
  /** Texto de la sección actual (un solo nivel), p. ej. "Nueva cotización". */
  seccion?: string
  /** Niveles después de "Inicio". Si llegan `seccion` y `niveles`, gana `niveles`. */
  niveles?: NivelMiga[]
}>()

const niveles = computed<NivelMiga[]>(() => props.niveles ?? [{ texto: props.seccion ?? '' }])
</script>

<template>
  <nav :aria-label="t('migas.navegacion')" class="w-full border-b border-borde bg-white">
    <div class="mx-auto flex max-w-[880px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2">
      <ol class="flex min-w-0 flex-wrap items-center gap-2 text-[13px] leading-[19.5px]">
        <li>
          <RouterLink
            :to="aInicio"
            class="text-tinta-suave hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
          >
            {{ t('migas.inicio') }}
          </RouterLink>
        </li>
        <template v-for="(nivel, i) in niveles" :key="i">
          <li class="text-tinta-suave" aria-hidden="true">›</li>
          <li v-if="i === niveles.length - 1" class="min-w-0 truncate font-semibold text-tinta" aria-current="page">
            {{ nivel.texto }}
          </li>
          <li v-else-if="nivel.to">
            <RouterLink
              :to="nivel.to"
              class="text-tinta-suave hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-enlace focus-visible:ring-offset-2"
            >
              {{ nivel.texto }}
            </RouterLink>
          </li>
          <li v-else class="text-tinta-suave">{{ nivel.texto }}</li>
        </template>
      </ol>
      <slot name="derecha" />
    </div>
  </nav>
</template>
