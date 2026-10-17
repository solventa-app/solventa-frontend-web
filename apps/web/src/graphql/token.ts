// Token de la sesión (HU-M02/CA-W01-11): lo fija useSesion al iniciar sesión y lo lee `ejecutar()` para
// mandarlo en `Authorization: Bearer`. Vive aparte para que cliente.ts no importe useSesion (que a su vez
// usa `ejecutar`). Solo en memoria, nunca en localStorage (CLAUDE.md regla 7): al recargar se pierde.
let token: string | null = null

export function fijarToken(nuevo: string | null): void {
  token = nuevo
}

export function tokenActual(): string | null {
  return token
}
