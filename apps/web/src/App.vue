<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import ModalInactividad from './components/ui/ModalInactividad.vue'
import { useInactividad } from './composables/useInactividad'
import { useSesion } from './composables/useSesion'

// G-04b: con sesión abierta se vigila la inactividad; sin ella no hay nada que vigilar.
const { estado, terminarSesion } = useSesion()
const inactividad = useInactividad()
const router = useRouter()
const conSesion = computed(() => !!estado.token)

watch(conSesion, (abierta) => (abierta ? inactividad.iniciar() : inactividad.detener()), { immediate: true })

async function cerrarYa(): Promise<void> {
  inactividad.detener()
  await terminarSesion()
  void router.push('/login')
}
</script>

<template>
  <RouterView />
  <ModalInactividad
    :abierto="inactividad.estado.avisando && conSesion"
    :segundos="inactividad.segundosRestantes.value"
    @seguir="inactividad.seguirConectado"
    @cerrar="cerrarYa"
  />
</template>
