# Plan para completar HU-W01 · Frontend

> Plan del **front web** (`solventa-frontend-web`). El del backend vive en
> `../solventa-backend/docs/plan-completar-hu-w01.md` y tiene la tabla completa de decisiones; los números de bloque y
> de decisión coinciden en los dos. Las decisiones están **cerradas** (felipe, 2026-10-17 y 2026-10-18): si algo de
> este repo las contradice, gana el plan y se corrige el documento en el mismo PR.

## Decisiones que tocan al front

| # | Tema | Qué significa para el front |
|---|---|---|
| 3 | Dónde se mide | Los E2E de W01 que sirven de evidencia corren **contra staging** (Vercel + BFF desplegado), no contra el compose. Los mocks siguen para desarrollo y Vitest. |
| 7 | Seguridad en CI | `npm audit --audit-level=high` **informativo** en `ci-web.yml`. |
| 10 | Guardar la oferta | **No se guarda en W01**: si el cliente vuelve, se recalcula. Guardar la oferta aceptada va con HU-W03 (Sprint 2). |
| 16 | API Gateway | El BFF deja de ser público: Vercel y el entorno local hablan con el **gateway**, que corta a 700 ms. |
| 19 | Sonar | **SonarCloud**: el job `sonar` de `ci-web.yml` ya existe; se activa con los secretos. |
| 20 | Consentimiento ligado al titular | **Sin pantalla nueva**: el mismo checkbox de W01-01; se mandan campos extra. |
| 21 | Revocar el consentimiento | El prototipo no tiene esa pantalla: **no se construye en el Sprint 1** (regla 3). El backend lo soporta y lo prueba. |
| 23 | Vencimiento del consentimiento | Vence a los 30 días (`Consentimiento.venceEn`). Vencido o revocado: se vuelve a pedir el checkbox. |
| — | Sesión | El JWT vive en `sessionStorage` (`solventa.token`) para sobrevivir a una recarga (felipe, 2026-10-17). |

## Plan de cambios (front)

Cada bloque es un PR hacia `develop` con rama `feat|fix|chore/KAN-N-…` y título `tipo(web|e2e|contrato|docs|ci): KAN-N …`.
Un cambio de contrato = dos PR enlazados (primero el backend).

### Bloque 4 · Consentimiento ligado al titular y vencimiento

| Dónde | Cambio |
|---|---|
| `contrato/` | Sincronizar la copia del esquema cuando el backend publique `ConsentimientoInput` con `documentoIdentidad`, `tipoDato`, `fuenteDatos`, `canal` y `Consentimiento.estado` / `venceEn`. Regenerar `src/graphql/tipos.ts`. |
| `useCotizacion.ts` | Al registrar el consentimiento manda el documento del formulario y los campos fijos (`tipoDato`, `fuenteDatos`, `canal = WEB`). |
| `useCotizacion.ts` | Si el BFF responde que el consentimiento está **vencido o revocado**, descarta el `consentimientoId` guardado y vuelve a W01-01 con el checkbox desmarcado y un mensaje de "autoriza de nuevo" (regla 5: nunca un error técnico). |
| `src/mocks/handlers.ts` | Mocks con los campos nuevos y un caso de consentimiento vencido. Vitest de los dos casos. |

### Bloque 6 · Seguridad en CI

| Dónde | Cambio |
|---|---|
| `.github/workflows/ci-web.yml`, job `web` | Paso `npm audit --audit-level=high` con `continue-on-error` (no entra en el check obligatorio hasta resolver los hallazgos). |
| Job `sonar` | Ya existe; corre solo cuando estén `SONAR_TOKEN` y `SONAR_HOST_URL`. |

### Bloque 7 · Pruebas de W01 (FC-01)

| Dónde | Cambio |
|---|---|
| `e2e/` | Cypress de **valores límite** en W01-01: documento de 6 dígitos, plazo 1 y 360, valor 0, dirección vacía. |
| `.github/workflows/e2e-staging.yml` | Pasar las credenciales de staging a Cypress (`CYPRESS_USUARIO_CLIENTE`, `CYPRESS_CLAVE_CLIENTE` y las de ASESOR y BACKOFFICE) desde secretos del repo. Hoy el workflow no las pasa y usaría los usuarios demo, que no existen en staging. Subir el video o reporte como artefacto siempre, no solo si falla. |
| `docs/evidencias/` (o el README de `e2e/`) | Evidencia de FC-01: fecha, URL probada, specs que pasaron y enlace al artefacto. |

### Bloque 10 · API Gateway delante del BFF

| Dónde | Cambio |
|---|---|
| `apps/web/vercel.json` | El rewrite de `/graphql/:path*` pasa de la URL del BFF (`https://bff-…run.app`) a la **`gateway_url`** que deja el despliegue del backend. Se hace **después** del release del backend que crea el gateway. |
| `src/graphql/cliente.ts` | Un 502, 503 o 504 (el gateway cortó a 700 ms o un servicio estaba frío) se muestra como error con reintento, igual que `ErrorOferta`, nunca como pantalla rota. Vitest del caso. |
| `apps/web/.env.example` y `README.md` | En local, `VITE_BFF_URL=http://localhost:8080` (el gateway Envoy del compose del backend). Ir directo a `:8000` sigue sirviendo para depurar. |

Lo que no cambia: las URL que usa el navegador (siempre `/graphql/web` a través de Vercel o de Vite) y el contrato.

### Contrato de otros bloques del backend

Los bloques 2 y 8 del backend agregan `PerfilRiesgo.nivelRiesgo` y `fechaVigencia` (aditivos). El prototipo no los
muestra: solo se sincroniza la copia de `contrato/` y los tipos, sin pantalla nueva.

## Cambios en despliegue y pipelines (front)

| Dónde | Cambio | Bloque |
|---|---|---|
| `apps/web/vercel.json` | Rewrite de `/graphql` al gateway en vez del BFF | 10 |
| `.github/workflows/ci-web.yml` | `npm audit` informativo | 6 |
| `.github/workflows/e2e-staging.yml` | Credenciales de staging desde secretos y artefacto siempre | 7 |
| Secretos del repo | `SONAR_TOKEN`, `SONAR_HOST_URL` y las credenciales de Cypress para staging | 6, 7 |

`deploy-web.yml` (Vercel), `ci-mobile.yml`, `pr-rama.yml` y `pr-titulo.yml` no cambian.

## Documentos que actualiza cada bloque (front)

| Bloque | Documentos |
|---|---|
| 4 | `contrato/CHANGELOG.md`, `docs/plan-frontend.md` (CA-W01-01/08) |
| 6 | `docs/convenciones.md` (escaneo informativo y cuándo pasa a obligatorio) |
| 7 | README de `e2e/` (cómo correr contra staging), evidencia de FC-01 |
| 10 | `README.md` (gateway local en `:8080`), `apps/web/.env.example`, `CLAUDE.md` |
| Al terminar | `CLAUDE.md` → sección **Estado** con la fecha nueva |

## Lo que hace felipe a mano (front)

| # | Cuándo | Qué haces | Dónde |
|---|---|---|---|
| 1 | Bloque 6 | Crear el proyecto `solventa-frontend` en SonarCloud y cargar `SONAR_TOKEN` y `SONAR_HOST_URL=https://sonarcloud.io` (un admin de `solventa-app`) | sonarcloud.io y GitHub → Settings → Secrets and variables → Actions |
| 2 | Bloque 7, una vez | Crear en staging los usuarios de prueba con `scripts/crear_usuarios.py` del backend (sus claves quedan en Secret Manager) y cargarlas como secretos del repo del front: `CYPRESS_USUARIO_CLIENTE`, `CYPRESS_CLAVE_CLIENTE`, y las de ASESOR y BACKOFFICE | Terminal en `solventa-backend` y GitHub del front |
| 3 | Bloque 7, con staging encendido | *Actions → E2E staging → Run workflow* con la URL de Vercel; guardar el enlace del artefacto como evidencia | GitHub → Actions |
| 4 | Bloque 10 | Cuando el backend tenga la `gateway_url`, aprobar el PR que cambia el rewrite de `vercel.json` y verificar en la web desplegada que una cotización funciona | GitHub y navegador |
| 5 | Sesión exploratoria de FC-01 | Es la misma del backend (paso 8 de su plan): se hace usando esta web contra staging | Navegador |

## Para el Sprint 2 (no se hace ahora)

- **Pantalla de revocar consentimiento**: cuando esté en Figma (el backend ya lo soporta).
- **Oferta aceptada** (HU-W03): la web la manda a guardar al aceptar.
- **JWT validado en el gateway**: no cambia nada en la web (sigue mandando `Authorization: Bearer`).
