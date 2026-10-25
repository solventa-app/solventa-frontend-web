# Solventa — Frontend

Frontend de **Solventa**, aseguradora digital sobre Open Finance y Open Data (MISW4501 · Proyecto Final 2):
**web** en Vue 3 + Vite y **móvil** en Flutter (desde el Sprint 2).

> Remoto: https://github.com/solventa-app/solventa-frontend
>
> Parte de una estrategia de 3 repos (ADR-06 en `solventa-backend/docs/adr/`):
> **`solventa-frontend`** (este), **`solventa-backend`** (servicios, contratos, infra) y
> **`solventa-arquitectura`** (experimentos, congelado como evidencia).

## Mapa del repo

| Ruta | Contenido |
|---|---|
| `apps/web/` | SPA Vue 3 + TypeScript + Vite. Sprint 1: 12 pantallas (HU-W01 y HU-W05) |
| `apps/mobile/` | App Flutter. **Sin código todavía**: arranca en el Sprint 2 |
| `contrato/` | Copia versionada del esquema GraphQL del backend (no se edita a mano) |
| `e2e/` | Cypress (web), con su propio `package.json` |
| `scripts/` | `contrato.mjs`: verifica y sincroniza el contrato con el backend |
| `docs/` | Plan por sprint, convenciones |
| `.claude/` | Agentes y permisos de Claude Code para este repo |

## Arranque rápido (web)

```bash
cd apps/web
npm install
npm run dev:mock      # con mocks del BFF (MSW): lo normal mientras el backend no esté desplegado
npm run dev           # contra el backend real (proxy a VITE_BFF_URL, por defecto http://localhost:8080 — gateway Envoy local)
npm test              # Vitest
npm run lint          # ESLint
npm run formato       # Prettier (formatea); el CI corre formato:verificar
npm run build         # vue-tsc + vite build
```

Requisitos: **Node 22.12 o superior** (`.nvmrc`), que es el mínimo de Vite 8. Los comandos se corren desde `apps/web`, no
desde la raíz.

**Problemas comunes al arrancar en local:**

- `Cannot find module @rolldown/binding-…` u otro error de binarios nativos (frecuente en Mac con Apple Silicon): Vite 8
  empaqueta con Rolldown, que trae un binario por plataforma. Reinstala desde cero con `rm -rf node_modules && npm ci`.
  Si persiste, revisa que Node corra nativo y no bajo Rosetta: `node -p process.arch` debe decir `arm64`.
- `Port 5173 is in use`: quedó corriendo un Vite anterior. Ciérralo con `lsof -ti :5173 | xargs kill`.

**Sesión:** la web inicia sesión contra el BFF (`iniciarSesion`) y guarda el JWT en `sessionStorage` (`solventa.token`) para sobrevivir a una recarga de pestaña. Con `dev:mock` cualquier clave sirve y el rol sale del usuario: `asesor…` → Asesor, `admin…` u `operador…` →
Operador y cualquier otro → Cliente (por ejemplo, `cliente.demo`). Con `clave-erronea` el login falla.

**Contra el backend en local:** levanta `solventa-backend` (`docker compose --profile servicios up -d --build`), crea los usuarios (ver `solventa-backend/docs/autenticacion-usuarios.md`), copia
`apps/web/.env.example` a `apps/web/.env.local` (`VITE_USE_MOCKS=false`, `VITE_BFF_URL=http://localhost:8080` apuntando al gateway Envoy local; `:8000` sigue sirviendo para depurar directo contra el BFF) y corre
`npm run dev`. Las convenciones de los mocks (documento terminado en `999`, `998` o `000`) no existen en el backend: para ver
una oferta preliminar, pon el stub de Open Finance en modo lento
(`curl -X POST localhost:8101/control/modo -H 'Content-Type: application/json' -d '{"modo":"lento"}'`); con un
documento que no se haya consultado antes, el historial crediticio no llega y sale la pantalla de error.

**HU-W04 (siniestros) en local:** las pantallas de siniestros no usan MSW sino el dummy `stub-siniestros` del backend.
Desde `solventa-backend`: `docker compose --profile servicios up stub-siniestros --build --wait` (queda en el puerto 8107).
Luego, en `apps/web`, `npm run dev:mock`: Vite reenvía `/graphql/siniestros` al dummy (otra URL con `VITE_SINIESTROS_URL`).
Entra con el usuario `admin.solventa` (cualquier clave, rol Operador) y abre la tarjeta "Siniestros". Para volver a los
datos iniciales: `curl -X POST localhost:8107/control/reiniciar` (o `/graphql/siniestros/control/reiniciar` por el proxy de Vite).

Con `npm run dev` o `dev:mock`, abre `http://localhost:5173/_pantallas` para ver el índice de las 12 pantallas del prototipo (solo en desarrollo).

## Contrato con el backend

```bash
npm run contrato:verificar     # ¿la copia coincide con ../solventa-backend?
npm run contrato:sincronizar   # traer la versión del backend
cd apps/web && npm run codegen # regenerar src/graphql/tipos.ts
```

## Despliegue (Vercel)

`.github/workflows/deploy-web.yml` despliega `apps/web` a **producción** en cada push a `main` que toque la web
(con git-flow: un `release/sprint-N` o un `hotfix`; nada se publica desde `develop`). Corre typecheck y pruebas primero.
El build lo hace Vercel con `apps/web/vercel.json` (que también reescribe todas las rutas a `index.html`, porque el
router usa history).

**Para probarlo sin tocar producción:** Actions → *Deploy web* → *Run workflow* y elige una rama que no sea `main`
(p. ej. `develop`): hace una **vista previa**, no producción. El botón solo aparece cuando el workflow ya está en
`develop` (la rama predeterminada). La URL sale en el resumen del job; si Vercel pide login, es *Deployment Protection*.

1. El proyecto de Vercel (IDs en el workflow) debe tener **Root Directory vacío** y no estar conectado al repo por la
   integración de Git (si no, cada push desplegaría dos veces). Se revisa en Vercel → Settings → General y → Git.
2. Crea un token en https://vercel.com/account/tokens y guárdalo como secreto `VERCEL_TOKEN` del repo (tabla de abajo).
3. **Con mocks o con el BFF real.** `VITE_USE_MOCKS=true` hace que la web desplegada responda con los mocks de MSW
   (cualquier clave sirve); con `false` (o sin la variable) llama al BFF real a través del gateway. Es una variable de **construcción**: cambiarla
   no afecta a lo ya desplegado, solo al siguiente despliegue.
4. `apps/web/vercel.json` reescribe `/graphql/*` al **API Gateway** de staging en Cloud Run
   (`https://solventa-gateway-btxoyawl.uc.gateway.dev`, que corta a 700 ms delante del BFF), antes del rewrite a `index.html`: el cliente llama a `/graphql/web` en el mismo
   origen y Vercel hace de proxy (sin CORS). Si el gateway cambia de URL tras un despliegue del backend, se actualiza ahí. El proxy de Vite solo existe en desarrollo.

## Documentación

- [`CLAUDE.md`](CLAUDE.md) — contexto de trabajo, reglas y agentes (léelo antes de tocar código).
- [`docs/plan-frontend.md`](docs/plan-frontend.md) — pantallas, actividades y decisiones por sprint.
- [`docs/convenciones.md`](docs/convenciones.md) — ramas, commits, PR, definición de hecho y reglas de código.
- [`contrato/README.md`](contrato/README.md) — cómo se mantiene el contrato y qué hacen los mocks.

## Configuración pendiente en GitHub (una vez creado el primer push)

| Dónde | Qué | Para qué |
|---|---|---|
| Settings → Variables → Actions | `BACKEND_REPO` = `solventa-app/solventa-backend` | Activa el job `contrato` del CI (compara con el `main` del backend) |
| Settings → Secrets → Actions | `BACKEND_READ_TOKEN` (solo si `solventa-backend` es privado) | Permite al CI leer el backend |
| Settings → Secrets → Actions | `SONAR_TOKEN` | Activa `sonar.yml`: análisis en SonarQube Cloud (organización `global-spark`, proyecto `global-spark_solventa-frontend`) con la cobertura de Vitest, en cada push a `develop` que toque la web o a mano desde Actions |
| Settings → Secrets → Actions | `VERCEL_TOKEN` | Activa el despliegue a Vercel (`deploy-web.yml`) |
| Settings → Secrets → Actions | `CYPRESS_USUARIO_CLIENTE`, `CYPRESS_CLAVE_CLIENTE`, `CYPRESS_USUARIO_ASESOR`, `CYPRESS_CLAVE_ASESOR`, `CYPRESS_USUARIO_BACKOFFICE`, `CYPRESS_CLAVE_BACKOFFICE` | Credenciales de usuarios de prueba en staging para `.github/workflows/e2e-staging.yml` |
| Settings → Variables → Actions | `VITE_USE_MOCKS` = `true` (opcional) | Despliega la web con los mocks de MSW mientras no haya BFF |
| `.github/CODEOWNERS` | Reemplazar los roles por usuarios reales | Revisores automáticos |

`main` y `develop` ya quedan protegidas por los rulesets versionados en `.github/rulesets/` (ver
`docs/convenciones.md`, sección "Ramas y flujo") — no es configuración manual pendiente.
