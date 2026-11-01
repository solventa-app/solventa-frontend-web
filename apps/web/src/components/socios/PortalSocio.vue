<!--
  Marco común del portal de socios (W07-02 y W07-03). Sin Figma: decisión D-7 de la revisión QA, que se ajusta a medida
  que se construye. Encabezado, barra del socio, navegación y pie quedan fijos; solo se desplaza `main`. La barra lleva a
  todas las secciones, así que siempre hay una forma visible de volver y sobran las migas.
  Expone por el slot los ids de la pestaña y del panel activos, para el `role="tabpanel"` de quien lo use.
-->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSesionSocio } from '../../composables/useSesionSocio'
import { t } from '../../i18n'
import { BarraDeCerrarSesion, FooterPantalla, HeaderPantalla, Pestanas, type Pestana } from '../ui'

export type SeccionPortal = 'panel' | 'guia' | 'pruebas' | 'produccion'

const props = defineProps<{ pantalla: string; titulo: string; activa: SeccionPortal }>()

const router = useRouter()
const sesion = useSesionSocio()
const barra = ref<InstanceType<typeof Pestanas> | null>(null)
const nombre = computed(() => sesion.estado.nombre || sesion.estado.socioId)

const secciones = computed<Pestana[]>(() => [
  { id: 'panel', texto: t('socios.portal.panel'), icono: 'home' },
  { id: 'guia', texto: t('socios.docs.pestana.guia'), icono: 'menu_book' },
  { id: 'pruebas', texto: t('socios.portal.apiPruebas'), icono: 'science' },
  { id: 'produccion', texto: t('socios.portal.apiProduccion'), icono: 'rocket_launch' },
])

function ir(id: string) {
  if (id === props.activa) return
  router.push(id === 'panel' ? '/socios/panel' : { path: '/socios/documentacion', query: { pestana: id } })
}

function cerrarSesion() {
  sesion.cerrarSesion()
  router.push('/socios/ingreso')
}
</script>

<template>
  <div :data-pantalla="pantalla" class="flex h-screen flex-col overflow-hidden">
    <HeaderPantalla :titulo="titulo" sin-perfil />
    <BarraDeCerrarSesion :nombre="nombre" :rol="t('socios.panel.rol')" @cerrar-sesion="cerrarSesion" />
    <Pestanas
      ref="barra"
      prefijo="portal"
      :pestanas="secciones"
      :model-value="activa"
      :etiqueta="t('socios.portal.navegacion')"
      @update:model-value="ir"
    />
    <main class="relative min-h-0 flex-1 overflow-y-auto bg-fondo">
      <slot :id-panel="barra?.idPanel(activa)" :id-pestana="barra?.idPestana(activa)" />
    </main>
    <FooterPantalla />
  </div>
</template>
