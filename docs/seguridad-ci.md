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

- en el **resumen del run**: semáforo 🟢🟡🔴, tabla por herramienta (críticos, altos, medios, bajos) y los hallazgos
  principales de cada una;
- el artefacto **`reporte-seguridad`**, con `reporte-seguridad.pdf`, `.md` y `.json` (todos los hallazgos
  normalizados, para depurarlos).

El semáforo queda en 🔴 si hay algún hallazgo crítico o alto, en 🟡 si solo hay medios y en 🟢 en otro caso. Los
resultados crudos de cada herramienta quedan en los artefactos `seguridad-*`.

## Depurar hallazgos

- **Secreto falso (datos de demo o de pruebas):** se agrega su huella (`Fingerprint` del JSON de gitleaks) a
  `.gitleaksignore`, o se cambia el valor de ejemplo por uno que no parezca una llave real.
- **Dependencia vulnerable:** se sube la versión (Dependabot ya abre muchos de estos PR).
- **Header faltante:** se agrega en `headers` de `apps/web/vercel.json`. Prueba la CSP primero con
  `Content-Security-Policy-Report-Only`, para no romper Sentry, el gateway ni los mapas.

Cuando los hallazgos reales estén resueltos, un escaneo puede volverse bloqueante: basta con hacer fallar su job cuando
haya hallazgos y exigirlo en el ruleset.
