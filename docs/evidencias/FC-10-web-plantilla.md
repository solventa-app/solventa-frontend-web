# Evidencia FC-10 desde la web — Conciliación de pagos (HU-W05) — PLANTILLA SIN EJECUTAR

> Esta plantilla **no tiene resultados**. Se llena al correr el E2E contra staging, con los datos reales de esa corrida.
> Si un dato no salió de una corrida, no va aquí. Copiar como `FC-10-web-<fecha>.md` al llenarla.
> La evidencia del lado del backend (Newman, k6) está en `solventa-backend/docs/evidencias/FC-10-plantilla.md`.

- **Fecha de la corrida:** _(pendiente)_
- **URL probada (Vercel) y gateway:** _(pendiente)_
- **Workflow:** *Actions → E2E staging → Run workflow* · **Artefacto `cypress-evidencia`:** _(enlace pendiente)_
- **Antes:** staging encendido y cobros sembrados (`python3 scripts/sembrar_cobros.py` del backend); credenciales del operador en
  los secretos `CYPRESS_USUARIO_BACKOFFICE` y `CYPRESS_CLAVE_BACKOFFICE`.

| Spec | Qué verifica | Resultado |
|---|---|---|
| `w05-staging.cy.ts` · tabla | Columnas, al menos una fila, sin error técnico | _(pendiente)_ |
| `w05-staging.cy.ts` · filtro | La pestaña «Cobrado» no muestra rechazados ni pendientes | _(pendiente)_ |
| `w05-staging.cy.ts` · reintento | Aviso de reenvío o explicación del BFF, nunca un error técnico (se salta si no hay rechazado con reintentos) | _(pendiente)_ |
| Recarga automática (manual) | Con la pantalla abierta, un cobro pendiente pasa a cobrado sin recargar la página (≤ 30 s después de que Cloud Tasks lo cobre) | _(pendiente)_ |

Límites: el piso, con la pasarela simulada (stub) en staging. Los specs de mocks (`w05-conciliacion`, `pantallas/w05-01`) no corren contra staging.
