<!--
  /dev/pasarela/:sesion · Pasarela de pagos simulada (SOLO `dev:mock`, decisión D-5). Hace el papel de la página del
  stub del backend (stubs/pasarela, puerto 8103), que en real está FUERA de Solventa: por eso no lleva la marca ni el
  header de la web. Captura la tarjeta solo en este componente (nunca la guarda ni la registra), «cobra» con
  `pagarSesionSimulada` y vuelve con «Regresar al comercio» a `/pago/retorno?sesion=…`. El resultado NO viaja en la URL.
  Textos de herramienta de desarrollo: no van al catálogo de i18n.
-->
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { TARJETAS_DE_PRUEBA, pagarSesionSimulada, sesionSimulada } from '../../mocks/suscripcion'
import { formatearMonto } from '../../utils/formato'

const route = useRoute()
const router = useRouter()
const sesionId = String(route.params.sesion)
const datos = sesionSimulada(sesionId)

const tipo = ref<'CREDITO' | 'DEBITO'>('CREDITO')
const numero = ref('')
const titular = ref('')
const vencimiento = ref('')
const cvv = ref('')
const intento = ref(false)
const fase = ref<'formulario' | 'pagando' | 'resultado'>('formulario')
const resultado = ref<'APROBADA' | 'RECHAZADA' | 'FALLA' | null>(null)
const restante = ref(0)
let reloj: ReturnType<typeof setInterval> | undefined

function luhn(digitos: string): boolean {
  let suma = 0
  for (let i = 0; i < digitos.length; i++) {
    let d = Number(digitos[digitos.length - 1 - i])
    if (i % 2 === 1) d = d * 2 > 9 ? d * 2 - 9 : d * 2
    suma += d
  }
  return digitos.length >= 13 && suma % 10 === 0
}

const errores = computed(() => {
  const lista: string[] = []
  if (!luhn(numero.value.replace(/\D/g, ''))) lista.push('El número de la tarjeta no es válido.')
  if (titular.value.trim().length < 2) lista.push('Escribe el nombre como aparece en la tarjeta.')
  const [mes, anio] = vencimiento.value.split('/').map(Number)
  const venceEn = mes && anio ? new Date(2000 + anio, mes, 0) : null
  if (!venceEn || mes > 12 || venceEn < new Date()) lista.push('El vencimiento debe ser una fecha futura (MM/AA).')
  if (!/^\d{3,4}$/.test(cvv.value)) lista.push('El CVV tiene 3 o 4 dígitos.')
  return lista
})

const vencida = computed(() => restante.value <= 0)

onMounted(() => {
  const actualizar = () => (restante.value = datos ? Math.max(0, Math.round((datos.venceEn - Date.now()) / 1000)) : 0)
  actualizar()
  reloj = setInterval(actualizar, 1000)
})
onUnmounted(() => clearInterval(reloj))

function pagar() {
  intento.value = true
  if (errores.value.length || vencida.value) return
  fase.value = 'pagando'
  const numeroTarjeta = numero.value
  numero.value = ''
  cvv.value = ''
  setTimeout(() => {
    resultado.value = pagarSesionSimulada(sesionId, numeroTarjeta)
    fase.value = 'resultado'
  }, 2000)
}

function regresar() {
  router.push({ path: '/pago/retorno', query: { sesion: sesionId } })
}
</script>

<template>
  <main class="min-h-screen bg-[#eef1f6] p-6 font-sans text-[#1f2937]" data-pantalla="DEV-pasarela">
    <div class="mx-auto flex max-w-[460px] flex-col gap-4">
      <p class="rounded border border-[#b45309] bg-[#fef3c7] px-3 py-2 text-[12px] text-[#92400e]">
        Pasarela simulada (solo desarrollo). No es Solventa: en real es la página del proveedor de pagos.
      </p>
      <section class="flex flex-col gap-4 rounded-xl bg-white p-6 shadow">
        <header class="flex items-center justify-between">
          <strong class="text-[18px]">PagoSeguro</strong>
          <span class="text-[12px] text-[#6b7280]" data-prueba="tiempo">
            {{
              vencida
                ? 'Sesión vencida'
                : `Vence en ${Math.floor(restante / 60)}:${String(restante % 60).padStart(2, '0')}`
            }}
          </span>
        </header>
        <div v-if="datos" class="rounded-lg bg-[#f9fafb] p-3 text-[13px]">
          <div>Comercio: <strong>Solventa</strong></div>
          <div>Primera prima del seguro de vida deudores</div>
          <div class="text-[20px] font-bold">{{ formatearMonto(datos.monto) }}</div>
        </div>
        <p v-else class="text-[13px]">La sesión de pago no existe.</p>

        <template v-if="fase === 'formulario' && datos && !vencida">
          <div class="flex gap-2" role="radiogroup" aria-label="Tipo de tarjeta">
            <label
              v-for="opcion in ['CREDITO', 'DEBITO'] as const"
              :key="opcion"
              class="flex items-center gap-1 text-[13px]"
            >
              <input v-model="tipo" type="radio" :value="opcion" />
              {{ opcion === 'CREDITO' ? 'Crédito' : 'Débito' }}
            </label>
          </div>
          <label class="flex flex-col gap-1 text-[12px]">
            Número de la tarjeta
            <input
              v-model="numero"
              inputmode="numeric"
              autocomplete="off"
              data-prueba="numero"
              class="rounded border px-3 py-2 text-[14px]"
            />
          </label>
          <label class="flex flex-col gap-1 text-[12px]">
            Nombre en la tarjeta
            <input
              v-model="titular"
              autocomplete="off"
              data-prueba="titular"
              class="rounded border px-3 py-2 text-[14px]"
            />
          </label>
          <div class="flex gap-3">
            <label class="flex flex-1 flex-col gap-1 text-[12px]">
              Vencimiento (MM/AA)
              <input
                v-model="vencimiento"
                placeholder="12/30"
                autocomplete="off"
                data-prueba="vencimiento"
                class="rounded border px-3 py-2 text-[14px]"
              />
            </label>
            <label class="flex w-[100px] flex-col gap-1 text-[12px]">
              CVV
              <input
                v-model="cvv"
                inputmode="numeric"
                autocomplete="off"
                data-prueba="cvv"
                class="rounded border px-3 py-2 text-[14px]"
              />
            </label>
          </div>
          <ul v-if="intento && errores.length" role="alert" class="list-disc pl-5 text-[12px] text-[#b91c1c]">
            <li v-for="error in errores" :key="error">{{ error }}</li>
          </ul>
          <button
            type="button"
            class="rounded-lg bg-[#111827] py-3 text-[14px] font-semibold text-white"
            data-prueba="pagar-pasarela"
            @click="pagar"
          >
            Pagar
          </button>
          <table class="text-[11px] text-[#6b7280]">
            <caption class="text-left font-semibold">
              Tarjetas de prueba (cualquier nombre, vencimiento futuro y CVV)
            </caption>
            <thead>
              <tr>
                <th scope="col" class="text-left">Número</th>
                <th scope="col" class="text-left">Tipo</th>
                <th scope="col" class="text-left">Resultado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tarjeta in TARJETAS_DE_PRUEBA" :key="tarjeta.numero">
                <td class="font-mono">{{ tarjeta.numero.replace(/(\d{4})(?=\d)/g, '$1 ') }}</td>
                <td>{{ tarjeta.tipo === 'CREDITO' ? 'Crédito' : 'Débito' }}</td>
                <td>{{ tarjeta.resultado }}</td>
              </tr>
            </tbody>
          </table>
        </template>

        <div v-else-if="fase === 'pagando'" class="flex flex-col items-center gap-3 py-6" role="status">
          <span class="h-10 w-10 animate-spin rounded-full border-4 border-[#d1d5db] border-t-[#111827]" />
          Pagando…
        </div>

        <div
          v-else-if="fase === 'resultado'"
          class="flex flex-col gap-2 text-center"
          role="status"
          data-prueba="resultado-pasarela"
        >
          <strong class="text-[16px]">
            {{
              resultado === 'APROBADA'
                ? 'Pago aprobado'
                : resultado === 'RECHAZADA'
                  ? 'Pago rechazado'
                  : 'No pudimos procesar el pago'
            }}
          </strong>
          <span class="text-[13px] text-[#6b7280]">Regresa al comercio para continuar.</span>
        </div>

        <button
          v-if="fase !== 'pagando'"
          type="button"
          class="rounded-lg border border-[#111827] py-2 text-[13px] font-semibold"
          data-prueba="regresar-comercio"
          @click="regresar"
        >
          Regresar al comercio
        </button>
      </section>
    </div>
  </main>
</template>
