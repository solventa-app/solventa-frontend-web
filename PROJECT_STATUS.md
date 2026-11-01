# Estado del proyecto: Solventa Frontend

Corte: **2026-10-31**, `develop` en `450adbc`. Resumen para arrancar sesiones con poco contexto; el detalle vive en los
documentos enlazados y las reglas en [`CLAUDE.md`](CLAUDE.md). Si esto y el código difieren, gana el código. El estado
del backend está en `../solventa-backend/PROJECT_STATUS.md`.

## Propósito y stack

Web de Solventa (Vue 3, Vite, TypeScript), en `apps/web`. El móvil vive en `solventa-frontend-mobile`. Consume el BFF por
`/graphql/web`, con `contrato/` como copia del contrato. Pruebas: Vitest con MSW y Cypress en `e2e/`. `dev:mock` usa mocks.

## Estado

- Construidas: W01, W03 (enlace de firma y pago), W04 (mesa de siniestros, contra el BFF real), W05-01 y portal de socios W07.
- Contrato usado: **v0.22**.
- W07 sigue con integración pendiente contra el backend.

## Ajustes en curso (acordados el 2026-10-31)

Plan aprobado con Felipe: validar W01 y W05 contra sus objetivos y lo ya construido en W03, W04, W07 y M01.

- **W01:** los cambios de RISK no tocan contrato ni pantallas. Queda correr Cypress contra el backend real.
- **W05:** `useAvisos.ts` (F-F5) no existía. W05-01 pasa de refrescar cada 30 s a SSE, sin botón «Actualizar», con
  `origen` y `medio` reales. Rama `feat/KAN-28-ajustes-w05-sse`.
- **Cobro recurrente:** el disparo de demo es un endpoint interno del backend, sin botón ni contrato nuevo. Se cobra hasta
  `vigencia_hasta`.

- **Sentry (observabilidad web y móvil, organización `uniandes-xm`, 2026-10-31):** implementado en `apps/web`
  (`@sentry/vue`, `@sentry/vite-plugin`, `src/observabilidad/limpiar.ts`, `src/log.ts`, `no-console: error` en ESLint,
  código de soporte con botón de copiado en `OfertaError.vue`, `sentry-block` en `SolicitudYConsentimiento.vue` y
  `ConciliacionDePagos.vue`, guía en `docs/observabilidad.md` y `docs/plan-sentry.md`). En `solventa-frontend-mobile`
  implementado en paralelo con `sentry_flutter`, `SolLog`, `limpiar.dart` y `SentryMask`.

## Decisiones de la sesión

- Por ahora **solo se valida por código**: nada de staging, workflows ni infraestructura. La validación local y remota
  viene en una fase posterior.
- Commits y push a la rama remota sin pedir aprobación, **sin coautoría**.
- Mantener bajo el consumo de contexto: leer este archivo y `CLAUDE.md`, y solo los fuentes de la tarea.

## Pendiente y deuda

- Cypress de W01 y W05 contra el backend real; evidencias en vivo.
- `Cobro.polizaId` trae el id de la propuesta: W05-01 no muestra el número de póliza.
- `contactarAsesor` del BFF sigue siendo un mock que solo confirma.
- Renovar la URL firmada vencida de las evidencias de siniestros (ajuste 10).

## Próximos pasos

Punto de retoma (2026-10-31): los ajustes de W01 y W05 están integrados y verificados con el stack local. W05-01 trae todas
las páginas de cobros. Nada de esto se ha probado en staging.

1. Liberar y desplegar cuando se decida: ver `../solventa-backend/PROJECT_STATUS.md`.
2. Correr `e2e/cypress/e2e/w05-staging.cy.ts` contra staging. Su encabezado «ID de transacción» no existe en W05-01: revisarlo.

**Cypress contra el stack real:** `e2e/cypress/integracion/README.md`. Desde VS Code, antes `unset ELECTRON_RUN_AS_NODE`.

**Límite conocido de W05-01:** el stream se cierra tras 15 min sin eventos y se reabre al volver a la pestaña; no hay
recarga periódica de respaldo.

**Antes de un PR:** `npm run formato:verificar`. Título: `tipo(alcance): KAN-N descripción`; `gh pr edit` falla por
Projects classic, usar `gh api -X PATCH`.
