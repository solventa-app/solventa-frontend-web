<!--
  Catálogo visual de la librería de componentes (D-F1), solo en desarrollo — igual que
  IndicePantallas.vue. Sirve para verificarlos en el navegador (regla de web-builder.md: "una
  pantalla no está lista solo porque compile") y como referencia para quien construya pantallas.
-->
<script setup lang="ts">
import { ref } from 'vue'
import {
  AvatarPerfil,
  Boton,
  CampoFormulario,
  Divisor,
  FooterPantalla,
  HeaderPantalla,
  MigasDePan,
  SelectorIdioma,
  SelectorMoneda,
  TituloPantalla,
} from '../components/ui'

const documento = ref('')
const idioma = ref<'ES' | 'EN'>('ES')
const moneda = ref('COP')
</script>

<template>
  <main class="pantalla" style="max-width: 56rem">
    <h1>Librería de componentes (D-F1)</h1>
    <p class="pendiente">Referencia viva, tomada de "Librería de componentes · alta fidelidad" y "SG-01 · Guía de estilos" en Figma.</p>

    <section style="margin-top: 2rem">
      <h2>Header de pantalla</h2>
      <HeaderPantalla titulo="Home del Cliente" v-model:idioma="idioma" v-model:moneda="moneda" />
    </section>

    <section style="margin-top: 1.5rem">
      <h2>Migas de pan</h2>
      <MigasDePan :items="[{ etiqueta: 'Inicio', to: '/_pantallas' }, { etiqueta: 'Nueva cotización' }]" />
    </section>

    <section style="margin-top: 1.5rem; display: flex; gap: 1rem; flex-wrap: wrap; align-items: center">
      <h2 style="width: 100%">Botones</h2>
      <Boton variante="primario">Continuar a suscripción</Boton>
      <Boton variante="secundario">Volver</Boton>
      <Boton variante="destructivo">Regenerar API key</Boton>
      <Boton disabled>Continuar</Boton>
    </section>

    <section style="margin-top: 1.5rem; max-width: 26.875rem">
      <h2>Campo de formulario</h2>
      <CampoFormulario v-model="documento" label="Número de documento" placeholder="1.024.578.113" />
      <div style="height: 0.75rem"></div>
      <CampoFormulario model-value="1.024.578.11" label="Número de documento" error="El documento no coincide con el titular" />
    </section>

    <section style="margin-top: 1.5rem; display: flex; gap: 1rem; align-items: center">
      <h2 style="width: 100%">Idioma, moneda y avatar</h2>
      <SelectorIdioma v-model="idioma" />
      <SelectorMoneda v-model="moneda" />
      <AvatarPerfil />
    </section>

    <section style="margin-top: 1.5rem">
      <h2>Título de pantalla (H1)</h2>
      <TituloPantalla>Iniciar sesión</TituloPantalla>
    </section>

    <section style="margin-top: 1.5rem">
      <h2>Divisor</h2>
      <Divisor />
    </section>

    <section style="margin-top: 1.5rem">
      <h2>Footer de pantalla</h2>
      <FooterPantalla />
    </section>
  </main>
</template>
