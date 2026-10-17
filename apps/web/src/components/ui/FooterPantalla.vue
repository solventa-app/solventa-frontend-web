<!--
  Footer de pantalla · librería de componentes (Figma 2006:60). Pie de página común a todas las
  pantallas: aviso legal a la izquierda, sello de seguridad y vigilancia a la derecha.

  KAN-203: se agrega flex-wrap (en el footer y en el grupo de la derecha) porque el aviso legal y
  el sello de seguridad/vigilancia, sin esto, no cabían en una sola línea en pantallas angostas.
-->
<script setup lang="ts">
import IconoMaterial from './IconoMaterial.vue'

const anio = new Date().getFullYear()
</script>

<template>
  <footer class="flex w-full flex-wrap items-center justify-between gap-2 border-t border-borde bg-white px-10 pb-5 pt-[21px] text-[11px] leading-[18px] text-tinta-suave">
    <p>© {{ anio }} Solventa Tecnologías S.A.S. Todos los derechos reservados.</p>
    <p class="flex flex-wrap items-center gap-2">
      <span class="flex items-center gap-1">
        <IconoMaterial nombre="lock" class="h-[14px] w-[14px]" />
        Conexión segura TLS 1.3
      </span>
      <span aria-hidden="true">•</span>
      <span>Vigilado por la Superintendencia Financiera de Colombia</span>
    </p>
  </footer>
</template>
