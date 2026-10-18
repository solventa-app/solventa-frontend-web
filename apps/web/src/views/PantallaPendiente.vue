<script setup lang="ts">
import { useRoute } from 'vue-router'

const pantalla = useRoute().meta.pantalla
</script>

<template>
  <main v-if="pantalla" class="pantalla" :data-pantalla="pantalla.id">
    <h1>{{ pantalla.id }} · {{ pantalla.nombre }}</h1>
    <p class="pendiente">Pantalla pendiente de construir ({{ pantalla.historia }}, Sprint {{ pantalla.sprint }}).</p>
    <p v-if="pantalla.criterios.length" class="pendiente">Criterios: {{ pantalla.criterios.join(', ') }}</p>
  </main>
</template>
