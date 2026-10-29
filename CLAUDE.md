# Solventa — Frontend (contexto de trabajo)

Frontend de Solventa (aseguradora digital sobre Open Finance y Open Data), Proyecto Final 2 de MISW4501. Este repo construye la **web** (Vue 3); el móvil (Flutter) vive en otro repositorio. El backend, el contrato y la infraestructura viven en `../solventa-backend`; la evidencia de los experimentos en `../solventa-arquitectura` (congelado). Estrategia de repos: ADR-06 en `../solventa-backend/docs/adr/`.

Mapa: [`README.md`](README.md). Plan: [`docs/plan-frontend.md`](docs/plan-frontend.md). Convenciones: [`docs/convenciones.md`](docs/convenciones.md).

## Estado (2026-10-27)

- Sprint 1 (12–25 de octubre de 2026): las 12 pantallas de HU-W01 y HU-W05 están construidas (`src/views/`),
  integradas con el BFF/gateway real y sincronizadas con el **contrato v0.8** (KAN-24). Siguen funcionando con mocks (`dev:mock`).
- **Bloque 4 (consentimiento ligado al titular y vencimiento):** `useCotizacion.ts` envía `documentoIdentidad`,
  `tipoDato = FINANCIEROS_Y_ABIERTOS`, `fuenteDatos = OPEN_FINANCE_OPEN_DATA` y `canal = WEB` en `registrarConsentimiento`,
  y pide `venceEn` / `estado`. Si `solicitarOferta` responde `ErrorOferta` con `motivo = CONSENTIMIENTO_NO_VIGENTE`,
  descarta `consentimientoId`, desmarca el checkbox y `W01-02` regresa a `W01-01` (`/cotizacion`) mostrando el aviso
  de re-autorización.
- **Bloque 6 (seguridad en CI):** `.github/workflows/ci-web.yml` ejecuta `npm audit --audit-level=high` informativo
  (`continue-on-error: true`) en el job `web` y análisis con SonarCloud en el job `sonar`.
- **Bloque 7 (pruebas FC-01 de W01):** `e2e/cypress/e2e/w01-oferta.cy.ts` incluye pruebas de valores límite en W01-01
  (documento `<6` y `=6` dígitos, plazo `0/1/360/361`, monto `0`, dirección vacía); `.github/workflows/e2e-staging.yml`
  inyecta las credenciales de staging por rol desde secretos y sube siempre el artefacto `cypress-evidencia`
  (`if: always()`). Evidencia documentada en `docs/evidencias/FC-01-2026-10-18.md`.
- **Bloque 10 (API Gateway delante del BFF):** `src/graphql/cliente.ts` traduce HTTP `502`, `503` y `504` del gateway
  en `ErrorGraphQL` reintentable con mensaje amigable (`'El servicio tardó más de lo esperado. Intenta nuevamente.'`),
  sin exponer códigos 5xx en `useCotizacion`, `useConciliacion` ni `useSesion`. `apps/web/.env.example`, `vite.config.ts`
  y `README.md` apuntan por defecto al gateway Envoy local (`http://localhost:8080`) y `apps/web/vercel.json` reescribe
  `/graphql/:path*` al gateway de staging.
- **HU-W05 (plan de HU-W05, KAN-28):** W05-01 se **recarga sola cada 30 s** mientras está abierta y al volver a la
  pestaña (`useConciliacion.cargarCobros(…, { silencioso: true })`: sin «Cargando…», conserva la tabla si falla y descarta
  la respuesta que se cruce con un reintento), para ver un pendiente que Cloud Tasks ya cobró. Contra staging corre
  `e2e/cypress/e2e/w05-staging.cy.ts`; los specs de mocks de W05 se saltan solos ahí (`e2e/cypress/support/entorno.ts`).
  Sin captura de tarjeta ni pantallas de indemnizaciones (Sprint 3). La evidencia de FC-10 desde la web es una
  plantilla sin ejecutar (`docs/evidencias/FC-10-web-plantilla.md`).
- **HU-W04 (mesa de siniestros, KAN-27):** construidas W04-01, W04-02 (con el modal de rechazo), W04-02b, W04-03a,
  W04-03b y W04-03c (`docs/plan-ejecucion-hu-w04-siniestros.md`). Consumen el **BFF real** por `/v1/graphql/web` con el
  JWT de BACKOFFICE (servicio CLAIMS; proxy de Vite `/v1` y rewrite de Vercel), con los tipos del contrato principal **v0.21** (`tipos.ts`). En
  `dev:mock` responden los mocks de MSW; los E2E de W04 corren contra el backend local (`e2e/cypress/support/siniestros.ts`). Criterios CA-W04-01 a 29 **propuestos** en `docs/plan-frontend.md`. Pruebas: Cypress de W04 39 (7 specs por pantalla y
  responsive más `w04-siniestros.cy.ts`), con el backend local y la semilla de siniestros.
- **HU-W03 (suscripción, firma y pago con el asesor, KAN-26) — solo front, con mocks** (`docs/plan-front-w03-y-ajustes-w01-w05.md`):
  W03-01 (solo ASESOR) con el modal del asesor (código por correo, «Emitir», reenviar enlace), y las páginas públicas del
  enlace `/firma#t=…`: W03-02 (contrato en PDF y firma en tres modos), W03-02b, W03-03 («Pagar»), el retorno de la
  pasarela (`/pago/retorno`, id `W03-R`) y W03-04. W03-05 no se construye. Usa el contrato **v0.21** (F-F1, en la v0.18: el borrador
  local de la v0.17 se borró y sus tipos salen de `src/graphql/tipos.ts`). La imagen de la firma (TRAZO e IMAGEN) **no viaja
  por GraphQL** (F-F2): `solicitarSubidaFirma` → PUT directo a la URL firmada con TODOS los encabezados →
  `firmarPorEnlace` con `imagenArchivoId`; NOMBRE manda `nombreFirma`. Mocks en `src/mocks/suscripcion.ts`; correo y pasarela simulados en `/dev/correo` y `/dev/pasarela/:sesion`, solo
  en `dev:mock` (no entran al build). W01-01 pide nombre y correo del cliente solo al ASESOR (W01-A1) y W05-01 muestra el
  medio de pago y el origen (W05-A5; esos campos solo se piden con mocks hasta la v0.17). Pruebas: Vitest 349 (toda la web) y Cypress
  `w03-suscripcion.cy.ts` (6). Fallan 3 pruebas de Cypress que ya fallaban en `develop` (`w05-01.cy.ts` y `w01-oferta.cy.ts`).
- **HU-W07 (portal de socios, KAN-30), en curso, solo front con mocks** (`docs/plan-hu-w07-front.md`, un PR por paso):
  hechas las piezas comunes (5.1): cliente REST `src/api/socios.ts`, sesión técnica `useSesionSocio.ts` (JWT de 15 min
  en `sessionStorage` `solventa.tokenSocio`, misma excepción de la regla 7), guardia `socio: true` y rutas W07-01 a 03; W07-01 (ingreso del socio, enlace
  desde G-01) y W07-02 (panel: credenciales, consumo, estado, consumo por API y ventas) construidas.
  Contrato: **borrador local** `contrato/borrador-socios-v1.yaml` → `src/api/tipos-socios.ts` (`openapi-typescript`,
  `npm run codegen`) hasta que el backend publique `socios-v1.yaml`. Mocks en `src/mocks/socios.ts`.
- **Sesión real:** G-01 llama a `iniciarSesion` del BFF; el JWT vive en `sessionStorage` y se restaura al recargar (`restaurarSesion()` en `useSesion.ts`) y viaja en
  `Authorization: Bearer`. El nombre del saludo no va en el JWT (contrato v0.7): sale de `Usuario.nombre` (`iniciarSesion`) o de `yo` al recargar, con el alias de respaldo. El router exige sesión y rol por pantalla (`roles` en `src/router/pantallas.ts`). Roles del
  backend: `CLIENTE`, `ASESOR` y `BACKOFFICE` (en pantalla, "Operador").
- **Idioma ES/EN (KAN-209):** el selector del header cambia el idioma de toda la web (`src/i18n`: `t('clave')`, catálogos
  `es.ts`/`en.ts` con las mismas claves, exigido por TypeScript). Se recuerda en `localStorage` (`solventa.idioma`, no es
  dato personal) y viaja al BFF como `Accept-Language`, que devuelve sus mensajes en ese idioma. Un texto nuevo de
  pantalla va al catálogo, nunca quemado en la plantilla.
- Calidad: typecheck, ESLint, Prettier, Vitest, `vite build` y `npm audit` informativo en el CI.
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

## Stack

- **Web:** Vue 3 (`<script setup lang="ts">`), TypeScript estricto, Vite 8 (Node ≥ 22.12), Vue Router, Twind. Pruebas: Vitest + `@vue/test-utils` (jsdom). Mocks: MSW. Tipos del contrato: `graphql-codegen`. E2E: Cypress. Lint: ESLint + Prettier.
- **CI:** GitHub Actions con filtro por ruta (la web no dispara el móvil, ni al revés), SonarQube Cloud y Dependabot.

## Reglas (no las reinterpretes)

1. **El contrato manda.** `contrato/schema.graphql` es una copia del backend: no se edita a mano. Si falta un campo, se pide el cambio al backend (aditivo) y se sincroniza. Los tipos salen de `src/graphql/tipos.ts` (generado). Un cambio de contrato = dos PRs enlazados.
2. **Trabajar con mocks hasta que el BFF esté desplegado.** Los mocks (`apps/web/src/mocks/handlers.ts`) siguen el esquema y sirven igual para Vitest y para `dev:mock`. Sus convenciones de demo (documento terminado en `999` → oferta preliminar, en `000` → error) **no son del backend real**.
3. **Fiel al prototipo.** Las 52 pantallas están en Figma (plano v21). Una pantalla se construye contra su frame de Figma y sus criterios de aceptación (`docs/plan-frontend.md`); no se inventa diseño.
4. **Una pantalla = un componente en `src/views/`**, registrado en `src/router/pantallas.ts` (campo `componente`) y con `data-pantalla="<id>"` en su raíz.
5. **Nunca mostrar un error técnico ni un 5xx.** Hay estados de carga, vacío, error y degradado (oferta preliminar, cobro pendiente) y todos se diseñan.
6. **Consentimiento explícito.** El checkbox de Habeas Data no viene marcado y el botón de enviar está deshabilitado hasta marcarlo (CA-W01-01). Nunca un valor por defecto.
7. **Sin datos personales** en `localStorage`, consola, URL ni logs. El JWT es la única excepción: vive en `sessionStorage` (`solventa.token`) para que la sesión sobreviva a una recarga y se borra al cerrar la pestaña o la sesión (decisión de felipe, 2026-10-17). El token del enlace de firma (HU-W03, D-3, 2026-10-27) vive en memoria y se quita de la URL al leerlo; toca `sessionStorage` (`solventa.enlaceFirma`) **solo** como puente del viaje a la pasarela: se escribe al salir, con vencimiento (≤ 15 min y ≤ el del enlace), y se lee una vez y se borra al volver (`useEnlaceFirma.ts`). Dinero: texto decimal + moneda del contrato, formateado con `Intl.NumberFormat`.
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
