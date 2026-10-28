<script setup lang="ts">
import { pantallas } from '../router/pantallas'
</script>

<template>
  <main class="pantalla">
    <h1>Pantallas del prototipo</h1>
    <p class="pendiente">Solo en desarrollo. Cada fila es una pantalla del plano v21.</p>
    <ul>
      <li v-for="p in pantallas" :key="p.id">
        <RouterLink :to="p.rutaEjemplo ?? p.ruta">{{ p.id }} · {{ p.nombre }}</RouterLink>
        <span class="pendiente"> ({{ p.historia }})</span>
      </li>
    </ul>
  </main>
</template>
