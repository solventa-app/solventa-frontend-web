# Solventa — Frontend (contexto de trabajo)

Frontend de Solventa (aseguradora digital sobre Open Finance y Open Data), Proyecto Final 2 de MISW4501. Este repo construye la **web** (Vue 3); el móvil (Flutter) vive en otro repositorio. El backend, el contrato y la infraestructura viven en `../solventa-backend`; la evidencia de los experimentos en `../solventa-arquitectura` (congelado). Estrategia de repos: ADR-06 en `../solventa-backend/docs/adr/`.

Mapa: [`README.md`](README.md). Plan: [`docs/plan-frontend.md`](docs/plan-frontend.md). Convenciones: [`docs/convenciones.md`](docs/convenciones.md).

## Estado (2026-10-17)

- Sprint 1 (12–25 de octubre de 2026): las 12 pantallas de HU-W01 y HU-W05 están construidas (`src/views/`) e
  integradas con el BFF real (KAN-24). Siguen funcionando con mocks (`dev:mock`).
- **Sesión real:** G-01 llama a `iniciarSesion` del BFF; el JWT vive en `sessionStorage` y se restaura al recargar (`restaurarSesion()` en `useSesion.ts`) y viaja en
  `Authorization: Bearer`. El router exige sesión y rol por pantalla (`roles` en `src/router/pantallas.ts`). Roles del
  backend: `CLIENTE`, `ASESOR` y `BACKOFFICE` (en pantalla, "Operador").
- Pendiente con el backend (`contrato/CHANGELOG.md`): el claim `nombre` en el JWT (hoy se muestra el alias) y
  `Cobro.idTransaccion`.
- Calidad: typecheck, ESLint, Prettier, Vitest y `vite build` en el CI. Cypress (`e2e/`) tiene specs por historia y
  por pantalla, **todavía sin ejecutar** contra un navegador.
- D-F1 cerrada: componentes propios en `src/components/ui/` y Twind para los estilos (`docs/plan-frontend.md`).
- La app móvil se construye en otro repositorio.
- GitHub: organización `solventa-app` (`origin` = https://github.com/solventa-app/solventa-frontend.git).

## Plan y decisiones cerradas de HU-W01 (2026-10-18)

Plan del front: [`docs/plan-completar-hu-w01.md`](docs/plan-completar-hu-w01.md) (qué cambia por bloque, despliegue,
pipelines, documentos y pasos manuales). El del backend, con la tabla completa de decisiones:
[`../solventa-backend/docs/plan-completar-hu-w01.md`](../solventa-backend/docs/plan-completar-hu-w01.md).
Sus decisiones están **cerradas**: si algo de este repo las contradice, gana el plan y se corrige el documento en el
mismo PR. Al ejecutar un bloque, actualiza en ese PR los documentos que lista su tabla "Documentos que actualiza cada
bloque". Lo esencial:

- **API Gateway (bloque 10):** el rewrite de Vercel y el entorno local (`:8080`) van al gateway; un 502/503/504 se
  muestra como error con reintento.
- **Consentimiento:** sin pantalla nueva; se mandan campos extra; vence a los 30 días y, vencido o revocado, se vuelve a
  pedir el checkbox. La pantalla de revocar **no** se construye hasta que esté en Figma.
- **E2E de W01 contra staging** como evidencia de FC-01; `npm audit` informativo; Sonar es SonarCloud.
- **La oferta no se guarda en W01** (va con HU-W03, Sprint 2).

## Plan de HU-W05 (2026-10-18)

[`docs/plan-completar-hu-w05.md`](docs/plan-completar-hu-w05.md): la pantalla W05-01 ya está integrada; falta el E2E
contra staging (evidencia de FC-10) y un botón para actualizar la tabla. **No** se construye captura de tarjeta ni
pantallas de indemnizaciones (Sprint 3).

## Stack

- **Web:** Vue 3 (`<script setup lang="ts">`), TypeScript estricto, Vite 8 (Node ≥ 22.12), Vue Router, Twind. Pruebas: Vitest + `@vue/test-utils` (jsdom). Mocks: MSW. Tipos del contrato: `graphql-codegen`. E2E: Cypress. Lint: ESLint + Prettier.
- **CI:** GitHub Actions con filtro por ruta (la web no dispara el móvil, ni al revés), SonarQube Community y Dependabot.

## Reglas (no las reinterpretes)

1. **El contrato manda.** `contrato/schema.graphql` es una copia del backend: no se edita a mano. Si falta un campo, se pide el cambio al backend (aditivo) y se sincroniza. Los tipos salen de `src/graphql/tipos.ts` (generado). Un cambio de contrato = dos PRs enlazados.
2. **Trabajar con mocks hasta que el BFF esté desplegado.** Los mocks (`apps/web/src/mocks/handlers.ts`) siguen el esquema y sirven igual para Vitest y para `dev:mock`. Sus convenciones de demo (documento terminado en `999` → oferta preliminar, en `000` → error) **no son del backend real**.
3. **Fiel al prototipo.** Las 52 pantallas están en Figma (plano v21). Una pantalla se construye contra su frame de Figma y sus criterios de aceptación (`docs/plan-frontend.md`); no se inventa diseño.
4. **Una pantalla = un componente en `src/views/`**, registrado en `src/router/pantallas.ts` (campo `componente`) y con `data-pantalla="<id>"` en su raíz.
5. **Nunca mostrar un error técnico ni un 5xx.** Hay estados de carga, vacío, error y degradado (oferta preliminar, cobro pendiente) y todos se diseñan.
6. **Consentimiento explícito.** El checkbox de Habeas Data no viene marcado y el botón de enviar está deshabilitado hasta marcarlo (CA-W01-01). Nunca un valor por defecto.
7. **Sin datos personales** en `localStorage`, consola, URL ni logs. El JWT es la única excepción: vive en `sessionStorage` (`solventa.token`) para que la sesión sobreviva a una recarga y se borra al cerrar la pestaña o la sesión (decisión de felipe, 2026-10-17). Dinero: texto decimal + moneda del contrato, formateado con `Intl.NumberFormat`.
8. **No sobre-construir.** Cada tarea se traza a una pantalla o criterio de `docs/plan-frontend.md`. Sin librerías ni capas que una pantalla del sprint no pida (Pinia, un cliente GraphQL pesado y una librería de UI se agregan cuando haya una razón).

## Agentes de este repo (`.claude/agents/`)

- **`web-builder`** — construir pantallas y lógica de la web contra Figma, contrato y mocks.
- **`mobile-builder`** — la app Flutter (desde el Sprint 2).
- **`contract-consumer`** — sincronizar el contrato, regenerar tipos y actualizar mocks; detectar rupturas.
- **`frontend-quality`** — Vitest, Cypress/`integration_test`, accesibilidad y evidencia de la definición de hecho.

## Reglas de trabajo

- **Verifica antes de reportar éxito:** `npm run typecheck`, `npm run lint`, `npm run formato:verificar`, `npm test` y `npm run build` en `apps/web`, con la salida a la vista. Una pantalla no está lista hasta verla en el navegador (`dev:mock`).
- No hagas commit ni push sin que el usuario lo pida.
- Español en documentación, comentarios y commits (Conventional Commits con la clave de Jira).
