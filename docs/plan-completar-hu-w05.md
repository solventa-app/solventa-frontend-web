# Plan para completar HU-W05 · Frontend

> Plan del **front web** (`solventa-frontend-web`) para HU-W05 (KAN-28). El del backend, con las decisiones y las
> historias de arquitectura, vive en `../solventa-backend/docs/plan-completar-hu-w05.md`. Comparte reglas con el plan
> de W01 del front (`docs/plan-completar-hu-w01.md`).

## Estado hoy (revisado en `develop`, 2026-10-18)

La pantalla del prototipo para W05 es una sola: **W05-01 Conciliación de pagos** (back-office). Ya está hecha e
integrada con el BFF real (PR #45 y #47):

- Tabla con las 7 columnas del prototipo (cliente, póliza, prima, estado, fecha, ID de transacción y acciones).
- Botón **Reintentar** solo en `RECHAZADO` con `reintentosRestantes > 0`, como dice la nota del prototipo.
- Sesión real con rol BACKOFFICE, que sobrevive a una recarga.
- Si un reintento falla, ya muestra el mensaje del BFF (p. ej. "Se agotaron los 3 reintentos") y nunca un error técnico.
- Cypress `w05-conciliacion.cy.ts` y `pantallas/w05-01.cy.ts` con mocks.

## Decisiones que tocan al front

| # | Tema | Qué significa para el front |
|---|---|---|
| W05-2 | Captura de tarjeta | **No se construye** pantalla ni componente de tarjeta: el prototipo no la tiene y la prima se factura con la cuota del crédito. |
| W05-3 | Indemnizaciones | Sin pantalla en el Sprint 1: llegan en el Sprint 3, con siniestros. |
| W05-7 | Reintento automático | Si se confirma Cloud Tasks, un `PENDIENTE` pasa solo a `COBRADO` en staging. La tabla no cambia, pero conviene un botón de **actualizar** para verlo sin recargar la página. |
| 16 (W01) | API Gateway | Las operaciones de cobros también pasan por el gateway; el manejo de 502/503/504 del bloque 10 de W01 cubre esta pantalla. |

## Plan de cambios (front)

### Bloque A · Pruebas de W05 contra staging (FC-10, evidencia de flujo)

| Dónde | Cambio |
|---|---|
| `e2e/` | Un spec de W05 que corre contra staging: entra como BACKOFFICE, ve los cobros sembrados, reintenta un `RECHAZADO` y comprueba que baja `reintentosRestantes`. Usa las credenciales del bloque 7 de W01 (`CYPRESS_USUARIO_BACKOFFICE`, `CYPRESS_CLAVE_BACKOFFICE`). |
| `docs/evidencias/` (o README de `e2e/`) | Evidencia de FC-10 desde la web: fecha, URL, specs y artefacto del workflow `e2e-staging.yml`. |

### Bloque B · Actualizar la tabla de W05-01

| Dónde | Cambio |
|---|---|
| `ConciliacionDePagos.vue` | Botón o acción de **actualizar la tabla** (vuelve a pedir `cobros`), para ver un pendiente que el sistema ya cobró. Si el prototipo no tiene un control así, se usa el mismo estilo del botón de reintentar y se avisa a diseño. |
| Vitest | Caso del botón de actualizar. |

Lo compartido con W01 (no se repite aquí): `npm audit` informativo y SonarCloud (bloque 6), rewrite de Vercel al
gateway y manejo de 502/503/504 (bloque 10), credenciales de Cypress para staging (bloque 7).

## Cambios en despliegue y pipelines (front)

Ninguno propio de W05: los de W01 (rewrite de Vercel, `npm audit`, `e2e-staging.yml` con credenciales) ya cubren esta
pantalla.

## Documentos que actualiza cada bloque (front)

| Bloque | Documentos |
|---|---|
| A | README de `e2e/` (spec de W05 contra staging), evidencia de FC-10 |
| B | `docs/plan-frontend.md` (W05-01) |
| Al terminar | `CLAUDE.md` → **Estado** |

## Lo que hace felipe a mano (front)

| # | Cuándo | Qué haces | Dónde |
|---|---|---|---|
| 1 | Antes de correr el E2E | Que en staging haya cobros sembrados (paso 3 del plan del backend de W05) | Tu terminal |
| 2 | Bloque A | *Actions → E2E staging → Run workflow* con la URL de Vercel y guardar el enlace del artefacto | GitHub → Actions |

## Para después

- **Sprint 2:** cobro al aceptar la oferta y primer cobro al firmar (con HU-W03).
- **Sprint 3:** pantallas de orden de pago de indemnización y balance de la póliza (con siniestros).
