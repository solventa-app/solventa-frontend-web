<!--
  Catálogo visual de la librería de componentes (D-F1), solo en desarrollo — igual que
  IndicePantallas.vue. Sirve para verificarlos en el navegador (regla de web-builder.md: "una
  pantalla no está lista solo porque compile") y como referencia para quien construya pantallas.
-->
<script setup lang="ts">
import { ref } from 'vue'
import {
  AvatarPerfil,
  Badge,
  BarraDeCerrarSesion,
  Boton,
  CampoAreaTexto,
  CampoFormulario,
  CampoSeleccion,
  Chip,
  Divisor,
  EstadoOperador,
  FooterPantalla,
  HeaderPantalla,
  MigasDePan,
  Pestanas,
  SelectorIdioma,
  SelectorMoneda,
  TituloPantalla,
} from '../components/ui'
import { idioma, t } from '../i18n'

const documento = ref('')
const moneda = ref('COP')
const filtroActivo = ref('Todos')
const pestanaActiva = ref('guia')
const perito = ref('')
const instrucciones = ref('')
const peritos = [
  { valor: 'per-01', texto: 'Peritajes Andes Ltda. · Bogotá' },
  { valor: 'per-02', texto: 'Avalúos del Caribe S.A.S. · Barranquilla' },
]
</script>

<template>
  <main class="pantalla" style="max-width: 56rem">
    <h1>Librería de componentes (D-F1)</h1>
    <p class="pendiente">
      Referencia viva, tomada de "Librería de componentes · alta fidelidad" y "SG-01 · Guía de estilos" en Figma.
    </p>

    <section style="margin-top: 2rem">
      <h2>Header de pantalla</h2>
      <HeaderPantalla titulo="Home del Cliente" />
    </section>

    <section style="margin-top: 1.5rem">
      <h2>Migas de pan</h2>
      <MigasDePan seccion="Nueva cotización" a-inicio="/_pantallas" />
      <div style="height: 0.75rem"></div>
      <MigasDePan
        a-inicio="/_pantallas"
        :niveles="[
          { texto: t('siniestros.migas.siniestros'), to: '/_pantallas' },
          { texto: t('siniestros.migas.detalle', { radicado: 'SIN-2026-0141' }) },
        ]"
      >
        <template #derecha><EstadoOperador /></template>
      </MigasDePan>
    </section>

    <section style="margin-top: 1.5rem">
      <h2>Pestañas (W07-03)</h2>
      <Pestanas
        v-model="pestanaActiva"
        etiqueta="Pestañas de ejemplo"
        :pestanas="[
          { id: 'guia', texto: 'Guía de integración', icono: 'menu_book' },
          { id: 'pruebas', texto: 'Pruebas (sandbox)', icono: 'science' },
          { id: 'produccion', texto: 'Producción', icono: 'rocket_launch' },
        ]"
      />
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
      <CampoFormulario
        model-value="1.024.578.11"
        label="Número de documento"
        error="El documento no coincide con el titular"
      />
      <div style="height: 0.75rem"></div>
      <CampoFormulario model-value="1.024.578.113" label="Número de documento" disabled />
    </section>

    <section style="margin-top: 1.5rem; max-width: 26.875rem">
      <h2>Campo de selección y área de texto (HU-W04)</h2>
      <CampoSeleccion
        v-model="perito"
        :label="t('siniestros.campo.perito')"
        :placeholder="t('siniestros.campo.peritoPlaceholder')"
        :hint="t('siniestros.campo.peritoHint')"
        :opciones="peritos"
        icono="engineering"
      />
      <div style="height: 0.75rem"></div>
      <CampoSeleccion
        model-value=""
        label="Motivo del rechazo"
        placeholder="Selecciona un motivo"
        :opciones="[]"
        error="Selecciona un motivo"
      />
      <div style="height: 0.75rem"></div>
      <CampoSeleccion model-value="per-01" :label="t('siniestros.campo.perito')" :opciones="peritos" disabled />
      <div style="height: 0.75rem"></div>
      <CampoAreaTexto
        v-model="instrucciones"
        :label="t('siniestros.campo.instrucciones')"
        :placeholder="t('siniestros.campo.instruccionesPlaceholder')"
      />
      <div style="height: 0.75rem"></div>
      <CampoAreaTexto :model-value="'x'.repeat(20)" :maxlength="20" label="Comentario (opcional)" />
      <div style="height: 0.75rem"></div>
      <CampoAreaTexto model-value="" label="Comentario (opcional)" disabled />
    </section>

    <section style="margin-top: 1.5rem">
      <h2>Estado del operador (HU-W04)</h2>
      <EstadoOperador />
    </section>

    <section style="margin-top: 1.5rem">
      <h2>Badges</h2>
      <div style="display: flex; gap: 0.75rem; flex-wrap: wrap">
        <Badge tipo="exito">Cobrado</Badge>
        <Badge tipo="alerta">Pendiente</Badge>
        <Badge tipo="error">Rechazado</Badge>
        <Badge tipo="enCurso">En revisión</Badge>
      </div>
      <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; margin-top: 0.5rem">
        <Badge tipo="alerta">{{ t('siniestros.estado.PENDIENTE') }}</Badge>
        <Badge tipo="enCurso">{{ t('siniestros.estado.EN_REVISION') }}</Badge>
        <Badge tipo="exito">{{ t('siniestros.estado.APROBADO') }}</Badge>
        <Badge tipo="error">{{ t('siniestros.estado.RECHAZADO') }}</Badge>
      </div>
    </section>

    <section style="margin-top: 1.5rem">
      <h2>Chips (filtro)</h2>
      <div style="display: flex; gap: 0.5rem">
        <Chip :activo="filtroActivo === 'Todos'" @click="filtroActivo = 'Todos'">Todos</Chip>
        <Chip :activo="filtroActivo === 'Pendiente'" @click="filtroActivo = 'Pendiente'">Pendiente</Chip>
      </div>
    </section>

    <section style="margin-top: 1.5rem">
      <h2>Barra de cerrar sesión</h2>
      <BarraDeCerrarSesion nombre="María Gutiérrez" rol="Cliente" />
    </section>

    <section style="margin-top: 1.5rem; display: flex; gap: 1rem; align-items: center">
      <h2 style="width: 100%">Idioma, moneda y avatar</h2>
      <SelectorIdioma v-model="idioma" />
      <SelectorMoneda v-model="moneda" />
      <SelectorMoneda model-value="USD" disabled />
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
