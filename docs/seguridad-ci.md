# Pipeline de seguridad (`seguridad.yml`)

Reporte consolidado de cómo está la web en seguridad. Usa el mismo estilo que el `seguridad.yml` del móvil y el del
backend. Es **informativo**: no bloquea merges.

## Cuándo corre

| Evento | Qué corre |
|---|---|
| Cada PR | secretos, dependencias, SAST, workflows y headers de la web desplegada |
| Push a `develop`, cada lunes 7:00 (Bogotá) y a mano | todo lo anterior + ZAP contra la web desplegada |

Para correrlo a mano: **Actions → Seguridad → Run workflow** (elige la rama).

## Qué revisa

| Escaneo | Herramienta | Sobre qué |
|---|---|---|
| Secretos | gitleaks | todo el historial de git |
| Dependencias (SCA) | osv-scanner | `apps/web/package-lock.json` y `e2e/package-lock.json` |
| Código (SAST) | Semgrep (`p/javascript`, `p/typescript`) | `apps/web/src` |
| Workflows | actionlint + revisión de acciones sin fijar por SHA | `.github/workflows` |
| Headers de seguridad | `scripts/reporte_seguridad.py headers` | CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy y Permissions-Policy de la web en Vercel |
| Aplicación desplegada (DAST) | OWASP ZAP baseline (pasivo) | la web en Vercel |

La URL de la web se toma de la variable del repo `WEB_URL` o, si no existe, de `https://solventa-frontend-pink.vercel.app`.
Los headers y ZAP revisan lo **desplegado**, no el cambio del PR: los headers se configuran en `apps/web/vercel.json`.

## El reporte

El job **Reporte consolidado** (`scripts/reporte_seguridad.py`, el mismo script del backend) junta los resultados y
deja:

- en el **resumen del run**: calificación, semáforo 🟢🟡🔴, tabla por herramienta (críticos, altos, medios, bajos) y los hallazgos
  principales de cada una;
- el artefacto **`reporte-seguridad`**, con `reporte-seguridad.pdf`, `.md` y `.json` (todos los hallazgos
  normalizados, para depurarlos).

**Calificación (como la de MobSF en el móvil):** un puntaje de 0 a 100 y una letra, en total y por escaneo. Parte de
100 y resta por severidad, con un tope para que una sola herramienta ruidosa no lo deje en cero:

| Severidad | Resta por hallazgo | Tope |
|---|---:|---:|
| Crítica | 15 | 40 |
| Alta | 4 | 30 |
| Media | 0,5 | 20 |
| Baja | 0,1 | 10 |

Letra: A ≥ 90, B ≥ 75, C ≥ 60, D ≥ 40 y F por debajo. Es orientativa: sirve para ver la tendencia entre runs, no
reemplaza revisar los hallazgos.

El semáforo queda en 🔴 si hay algún hallazgo crítico o alto, en 🟡 si solo hay medios y en 🟢 en otro caso. Los
resultados crudos de cada herramienta quedan en los artefactos `seguridad-*`.

## Depurar hallazgos

- **Secreto falso (datos de demo o de pruebas):** se agrega una excepción acotada (ruta y patrón) en `.gitleaks.toml`,
  con su motivo. Hoy hay una: las claves de socio de demo de W07 (`sk_live_…`/`sk_test_…`) en mocks y pruebas.
- **Dependencia vulnerable:** se sube la versión (Dependabot ya abre muchos de estos PR).
- **Header faltante:** se agrega en `headers` de `apps/web/vercel.json`. Ya están X-Frame-Options (`SAMEORIGIN`, por
  los PDF en iframe), X-Content-Type-Options, Referrer-Policy y Permissions-Policy; HSTS lo pone Vercel. La CSP va
  primero en modo reporte (`Content-Security-Policy-Report-Only`): cuando la consola del navegador no muestre
  violaciones en los flujos principales (Sentry, Google Places, subidas a Storage, PDF, Swagger), se renombra a
  `Content-Security-Policy`. Los headers llegan a la web cuando `vercel.json` llega a `main` (solo `main` despliega).

Cuando los hallazgos reales estén resueltos, un escaneo puede volverse bloqueante: basta con hacer fallar su job cuando
haya hallazgos y exigirlo en el ruleset.
