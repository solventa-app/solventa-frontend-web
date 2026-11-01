// Cuenta regresiva común para reenviar un código (OTP) con espera (T23). Un solo comportamiento para todo lugar
// de la web que pida un código: botón deshabilitado «Reenviar código en 0:42» y habilitado al terminar.
// Hoy la espera es de 60 s fijos en el cliente; cuando el backend mande `segundosRestantes`
// (ESPERA_REQUERIDA), se pasa a `iniciar(segundos)` y manda el backend.
import { computed, onScopeDispose, ref } from 'vue'

export const ESPERA_REENVIO_SEGUNDOS = 60

/** Formatea segundos como `m:ss` (62 → «1:02»). */
export function formatearEspera(segundos: number): string {
  const s = Math.max(0, Math.ceil(segundos))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function useEsperaReenvio(duracion: number = ESPERA_REENVIO_SEGUNDOS) {
  const restantes = ref(0)
  let hasta = 0
  let reloj: ReturnType<typeof setInterval> | null = null

  function detener() {
    if (reloj) clearInterval(reloj)
    reloj = null
  }

  function tic() {
    restantes.value = Math.max(0, Math.ceil((hasta - Date.now()) / 1000))
    if (restantes.value === 0) detener()
  }

  /** Arranca (o reinicia) la cuenta tras un envío exitoso. */
  function iniciar(segundos: number = duracion) {
    detener()
    hasta = Date.now() + segundos * 1000
    tic()
    if (restantes.value > 0) reloj = setInterval(tic, 250)
  }

  function reiniciar() {
    detener()
    restantes.value = 0
  }

  onScopeDispose(detener)

  return {
    restantes,
    activa: computed(() => restantes.value > 0),
    texto: computed(() => formatearEspera(restantes.value)),
    iniciar,
    reiniciar,
  }
}
