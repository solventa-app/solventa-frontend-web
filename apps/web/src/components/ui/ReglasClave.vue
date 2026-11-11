<!--
  Indicadores de la contraseña (KAN-26): cada regla pasa de círculo gris a check verde mientras se escribe. Mismo
  conjunto de reglas que exige el backend (`utils/reglasClave.ts`); el estado va en texto y en ícono, no solo en color.
  Con `confirmacion` agrega la fila «Las dos contraseñas coinciden».
-->
<script setup lang="ts">
import { computed } from 'vue'
import IconoMaterial from './IconoMaterial.vue'
import { t } from '../../i18n'
import { evaluarClave } from '../../utils/reglasClave'

const props = defineProps<{ clave: string; confirmacion?: string }>()

const reglas = computed(() => {
  const r = evaluarClave(props.clave)
  const filas = [
    { id: 'longitud', texto: t('reglasClave.longitud'), ok: r.longitud },
    { id: 'mayuscula', texto: t('reglasClave.mayuscula'), ok: r.mayuscula },
    { id: 'minuscula', texto: t('reglasClave.minuscula'), ok: r.minuscula },
    { id: 'especial', texto: t('reglasClave.especial'), ok: r.especial },
  ]
  if (props.confirmacion !== undefined) {
    filas.push({
      id: 'coincide',
      texto: t('reglasClave.coincide'),
      ok: props.clave !== '' && props.clave === props.confirmacion,
    })
  }
  return filas
})
</script>

<template>
  <div data-testid="reglas-clave" class="flex flex-col gap-1">
    <span class="text-[13px] text-tinta">{{ t('reglasClave.titulo') }}</span>
    <ul class="flex flex-col gap-1">
      <li
        v-for="regla in reglas"
        :key="regla.id"
        :data-regla="regla.id"
        :data-cumple="regla.ok"
        class="flex items-center gap-2 text-[13px]"
        :class="regla.ok ? 'text-exito' : 'text-tinta-suave'"
      >
        <IconoMaterial :nombre="regla.ok ? 'check_circle' : 'cancel'" class="h-4 w-4 shrink-0" />
        <span>{{ regla.texto }}</span>
      </li>
    </ul>
  </div>
</template>
