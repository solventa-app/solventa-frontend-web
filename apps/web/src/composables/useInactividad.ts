// Inactividad de la sesión (G-04b). Si la persona no toca la pantalla durante `LIMITE_MS` la sesión se cierra sola;
// `AVISO_MS` antes se muestra un aviso con la cuenta regresiva para que pueda seguir conectada. La actividad solo
// se mide en la pestaña (no se guarda nada). El token se renueva aparte (useSesion): esto no depende de él.
import { computed, reactive } from 'vue'
import { cerrarPorInactividad, useSesion } from './useSesion'

export const LIMITE_MS = 15 * 60_000
export const AVISO_MS = 60_000

const EVENTOS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const

const estado = reactive({ ultima: Date.now(), restanteMs: 0, avisando: false })
let reloj: ReturnType<typeof setInterval> | undefined
let escuchando = false
let limite = LIMITE_MS
let aviso = AVISO_MS

function alActividad(): void {
  // Con el aviso abierto la actividad suelta no cuenta: hay que elegir «Seguir conectado».
  if (!estado.avisando) estado.ultima = Date.now()
}

function revisar(): void {
  const { sesionActiva } = useSesion()
  if (!sesionActiva()) return detener()
  const transcurrido = Date.now() - estado.ultima
  estado.restanteMs = Math.max(limite - transcurrido, 0)
  estado.avisando = transcurrido >= limite - aviso
  if (transcurrido >= limite) {
    detener()
    void cerrarPorInactividad()
  }
}

export function iniciarInactividad(opciones: { limiteMs?: number; avisoMs?: number } = {}): void {
  limite = opciones.limiteMs ?? LIMITE_MS
  aviso = opciones.avisoMs ?? AVISO_MS
  estado.ultima = Date.now()
  estado.avisando = false
  if (!escuchando) {
    for (const e of EVENTOS) window.addEventListener(e, alActividad, { passive: true })
    escuchando = true
  }
  clearInterval(reloj)
  reloj = setInterval(revisar, 1000)
}

export function detener(): void {
  clearInterval(reloj)
  reloj = undefined
  if (escuchando) {
    for (const e of EVENTOS) window.removeEventListener(e, alActividad)
    escuchando = false
  }
  estado.avisando = false
}

/** «Seguir conectado»: cuenta como actividad y cierra el aviso. */
export function seguirConectado(): void {
  estado.avisando = false
  estado.ultima = Date.now()
}

export function useInactividad() {
  return {
    estado,
    segundosRestantes: computed(() => Math.ceil(estado.restanteMs / 1000)),
    iniciar: iniciarInactividad,
    detener,
    seguirConectado,
  }
}
