# Convenciones del repo

Mismo flujo que `solventa-backend` (ver su `docs/convenciones.md` y ADR-06, ADR-08): este repo adoptó
**git-flow** el 2026-10-11, reemplazando el trunk-based original para quedar igual al backend (antes cada repo
tenía su propio esquema; divergían porque este se escribió el 2026-10-03/04, antes de ADR-08).

## Ramas y flujo (git-flow, ADR-08)

- **`main`** guarda lo liberado; **`develop`** integra y es la rama predeterminada del repo (también donde
  apuntan los PR de Dependabot). El trabajo vive en ramas `feat|fix|chore/KAN-N-descripcion` que salen de y
  vuelven a `develop`.
- Cierre de sprint con **`release/sprint-N`** (solo correcciones) → `main` con tag `sprint-N` → reintegración
  `main` → `develop`. Correcciones urgentes con **`hotfix/KAN-N-descripcion`** desde `main`.
- **Squash** para ramas de trabajo hacia `develop` (1 PR = 1 historia = 1 commit); **merge commit** para
  `release`, `hotfix` y la reintegración, porque squashear ramas de larga vida rompe el vínculo con `develop`.
- Ambas ramas están protegidas por ruleset (`.github/rulesets/main.json`, `develop.json`): PR obligatorio, 1
  aprobación (se descarta si hay push nuevo), hilos de revisión resueltos, checks `web`, `mobile`, `Título del
  PR` y `Nombre de rama` en verde, historial lineal (solo `main`) y sin force-push ni borrado. Sin excepciones
  de bypass. `main` solo acepta merge commit (`allowed_merge_methods: ["merge"]`); `develop`, squash o merge.
- **Ramas con el patrón `tipo/KAN-N-descripcion`** (tipo `feat`, `fix` o `chore`) hacia `develop`; `fix|chore`
  hacia un `release/sprint-N`; `release/sprint-N` o `hotfix/KAN-N-descripcion` hacia `main`. Lo valida el check
  `Nombre de rama` (`pr-rama.yml`), que también exige la pareja origen→destino correcta: bloquea el merge, no
  la creación de la rama (GitHub no aplica reglas de nombre de rama en los rulesets de este plan). Las ramas de
  Dependabot (`dependabot/**`) están exentas. GitHub las borra al hacer merge.
- **Dependabot:** apunta a `develop` (`target-branch` en `.github/dependabot.yml`), así sus PR no llegan a
  `main` fuera de un release. Los patch y minor se aprueban y se integran solos cuando los checks pasan
  (`dependabot-auto-merge.yml`); los major los revisa una persona.
- **El repo es público**, que es lo que hace gratuitos los rulesets: no se versionan secretos ni datos
  personales. *Secret scanning* y *push protection* están activos.
- `CI web` y `CI mobile` corren en **todo** PR (sin filtro de rutas) para que `web` y `mobile` se puedan exigir
  como checks en `main` y `develop` — un check filtrado por ruta nunca reportaría en los PR que no la tocan; en
  `push` a `main`/`develop` siguen filtrados por ruta.
- Los rulesets son código. Si hay que recrearlos: `gh api -X POST repos/solventa-app/solventa-frontend-web/rulesets --input .github/rulesets/<archivo>.json`
  (`main.json`, `develop.json`, `tags.json`). **Cuidado con el orden:** un check solo puede exigirse una vez
  que su workflow existe en la rama protegida; exigirlo antes de que el primer PR que lo agrega se integre deja
  a todos los demás PR bloqueados esperando un check que nunca va a reportar (nos pasó con `mobile`, `Título
  del PR` y `Nombre de rama` al aplicar el ruleset de `main` en el mismo PR que los creaba: KAN-175).

## Versionamiento

- **Tag por sprint al cerrarlo:** `sprint-1`, `sprint-2`, `sprint-3`… (el mismo nombre que en
  `solventa-backend`, sobre el `main` de ambos repos a la vez). Los `sprint-*` están protegidos: no se pueden
  mover ni borrar (`.github/rulesets/tags.json`).
- **`package.json` (raíz, `apps/web`, `e2e`) con SemVer**, hoy `0.1.0` en los tres. Se sube la versión menor al
  cerrar cada sprint, en el mismo commit de `release/sprint-N` que crea el tag — no hay automatización todavía
  (`npm version` manual antes de abrir el PR del release).
- **Móvil:** cuando exista `apps/mobile/pubspec.yaml` (Sprint 2), su `version:` sigue la misma cadencia por
  sprint que la web.
- **Contrato:** `contrato/schema.graphql` es una copia de solo lectura de `contracts/graphql/schema.graphql`
  del backend, sincronizada con `npm run contrato:sincronizar`. Hoy se lee del `main` del backend (ADR-06, pt.
  2) — con ADR-08 eso significa **lo liberado**, no lo que está en curso en `develop` del backend. Si una
  pantalla del sprint necesita un campo que el backend aún no liberó, se coordina con ese equipo si conviene
  leer de su `develop` en vez de esperar al release (decisión pendiente de confirmar entre los dos repos, igual
  que señala la ADR-08 del backend).

## Moneda en pantalla

Regla única de la web (KAN-209), definida en `solventa-backend/docs/plan-revision-qa-2026-10-31.md`:

- **Lo que se consulta se convierte:** ofertas, siniestros, conciliación, pólizas y ventas. Usa `montoVisible` de
  `useMoneda.ts`, nunca `formatearMonto` directo.
- **Lo que se firma, cobra o captura sigue en su moneda original:** contrato, autorización de cobro, pago, póliza emitida
  y monto del crédito. Usa `formatearMonto` y `monedaFija` en `HeaderPantalla`, que deshabilita el selector.
- Las tasas son de referencia: si la conversión falla, se muestra el valor original y el header lo avisa.

## Commits y PR

- **Conventional Commits** con alcance y clave de Jira: `feat(web): KAN-24 formulario de captura con consentimiento`.
  Alcances: `web`, `mobile`, `e2e`, `contrato`, `docs`, `ci`.
- Un PR cuenta una sola historia. Si cambia el contrato, enlaza el PR gemelo de `solventa-backend`.

## Definición de hecho (propuesta del equipo)

- Código integrado a `develop` por PR con revisión de al menos otro integrante.
- Pruebas unitarias del código nuevo en verde en el pipeline (Vitest en web, `flutter_test` en móvil).
- Quality gate de SonarCloud aprobado y Dependabot sin vulnerabilidades críticas abiertas. En `ci-web.yml` corre además `npm audit --audit-level=high` en modo **informativo** (`continue-on-error: true`): no bloquea el check `web` mientras queden avisos en dependencias transitivas de desarrollo, y pasa a ser obligatorio (quitando `continue-on-error`) una vez resueltos esos hallazgos.
- Flujo E2E de la historia en verde en staging (Cypress en web, `integration_test` en móvil).
- Sin datos personales en logs ni en la consola.
- Pantalla fiel al prototipo de Figma y accesible por teclado; estados de carga, vacío y error cubiertos.
- Documentación y tablero de Jira actualizados; historia demostrada en la revisión del sprint.

## Código web (`apps/web`)

- Vue 3 con `<script setup lang="ts">`, TypeScript estricto (`vue-tsc` en el CI), Vite, Vue Router. Pinia se agrega cuando haya estado compartido real (hoy no hace falta).
- **Una pantalla = un componente en `src/views/`** y se registra quitando el `PantallaPendiente` de su fila en `src/router/pantallas.ts` (campo `componente`). Cada pantalla lleva `data-pantalla="<id>"` en su raíz: lo usan Vitest y Cypress.
- **Nunca se escriben a mano los tipos del contrato:** vienen de `src/graphql/tipos.ts` (generado, versionado). Ver `contrato/README.md`.
- Las llamadas al BFF pasan por `src/graphql/cliente.ts`; los componentes no usan `fetch` directo.
- **Errores:** el BFF no devuelve 5xx crudos por falla de proveedor (oferta preliminar o `ErrorOferta`). La interfaz tampoco muestra errores técnicos al usuario.
- **Datos personales:** no se guardan en `localStorage`, no van a la consola ni a la URL. El consentimiento es un acto explícito del usuario, nunca un valor por defecto.
- Dinero: el contrato lo entrega como texto decimal + moneda; se formatea con `Intl.NumberFormat`, nunca con `parseFloat` para operar.
- Pruebas en `tests/*.test.ts`; los mocks de MSW son la misma fuente para Vitest y para `dev:mock`.
- Convenciones de demo de los mocks de HU-W03 (`src/mocks/suscripcion.ts`, **no son del backend real**): el código de
  verificación `000000` es válido y `999999` está vencido; un correo del cliente en `@revision.test` manda a revisión y en
  `@rechazo.test` no emite; los tokens fijos del enlace son `demo`, `vencido`, `firmado` y `emitido` (`/firma#t=demo`); las
  tarjetas de la pasarela simulada son las del stub del backend (`4242…` aprobada, `…0002` fondos insuficientes, `…0069`
  vencida, `…0119` falla de la pasarela). El buzón y la pasarela simulados viven en `/dev/correo` y `/dev/pasarela/:sesion`,
  solo con `dev:mock`.

## Documentos

- Idioma: español. Decisiones de arquitectura: ADR en `solventa-backend/docs/adr/` (ADR-06 es la estrategia de repositorios).
