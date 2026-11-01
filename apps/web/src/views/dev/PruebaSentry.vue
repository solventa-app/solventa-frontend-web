<!-- T22 · Solo no productiva: lanza un error de prueba para comprobar que Sentry lo recibe. -->
<script setup lang="ts">
import { log } from '../../log'

function provocar() {
  log.error('prueba-sentry', new Error('Error de prueba de Sentry'))
}
</script>

<template>
  <main class="p-6">
    <button type="button" class="rounded border border-borde px-4 py-2" @click="provocar">
      Enviar error de prueba
    </button>
  </main>
</template>
