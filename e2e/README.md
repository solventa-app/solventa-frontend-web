# e2e/

Pruebas de extremo a extremo con **Cypress** (web). Tiene su propio `package.json` para no obligar a descargar el binario de Cypress (~500 MB) a quien solo trabaja en la web.

```bash
cd e2e && npm install
npm run abrir          # modo interactivo
npm run correr         # sin interfaz (CI)
```

- **Local:** levanta la web con `npm run web:dev:mock` y corre contra `http://localhost:5173`.
- **Staging:** `CYPRESS_BASE_URL=https://<staging> CYPRESS_USUARIO_CLIENTE=... CYPRESS_CLAVE_CLIENTE=... npm run correr` (o desde GitHub Actions: *Actions → E2E staging → Run workflow*, que inyecta los secretos `CYPRESS_USUARIO_*` y `CYPRESS_CLAVE_*` de los roles `CLIENTE`, `ASESOR` y `BACKOFFICE` y publica siempre el artefacto `cypress-evidencia` con capturas, videos y reportes). Staging se despliega desde el `main` de `solventa-backend` detrás del API Gateway.
- El móvil (Flutter) no usa Cypress: sus pruebas viven en `apps/mobile` (`flutter_test`, `integration_test`, Firebase Test Lab).

## Dos niveles de E2E (Jira KAN-203) y cobertura FC-01

Cada pantalla lleva `data-pantalla="<id>"` en su raíz (Vitest y Cypress la usan para localizarla); en Cypress se localiza siempre por `[data-pantalla="<id>"]` y por roles/etiquetas accesibles — nunca por clases CSS.

1. **Por historia** (`cypress/e2e/<historia>.cy.ts`, p. ej. `w01-oferta.cy.ts`, `w05-conciliacion.cy.ts`): el flujo completo tal como lo recorre una persona real, cruzando varias pantallas (login → home → cotización → oferta → detalle de fuentes, oferta preliminar, fallo total → contacto con asesor y validación de **valores límite** en W01-01: documento `<6` y `=6` dígitos, plazo `0 / 1 / 360 / 361`, monto `0` y dirección vacía).
2. **Por pantalla individual, aislada** (`cypress/e2e/pantallas/<id>.cy.ts`, uno por `data-pantalla`, p. ej. `w01-04.cy.ts`): visita **una sola ruta** directamente y solo hace aserciones dentro de esa pantalla. Si una acción navega a otra pantalla, se verifica únicamente la ruta resultante (`cy.location`), nunca el contenido de la pantalla de destino (eso ya lo cubre el E2E de su historia). Para las pantallas que normalmente dependen de un estado previo en memoria (p. ej. W01-03a/b/c, W01-04: solo tienen una oferta/error real si se llegó ahí navegando desde W01-01), la prueba aislada cubre el guard/estado vacío real que ve cualquiera que entre por URL directa o refresque la página — el camino feliz con datos reales ya lo cubre el E2E por historia.

Este segundo nivel es **adicional** al primero, no lo reemplaza: ambos se mantienen y se ejecutan juntos (`npm run correr` corre todos los specs de `cypress/e2e/**`).

**HU-W05 (conciliación de pagos).** Los specs `w05-conciliacion.cy.ts` y `pantallas/w05-01.cy.ts` cuentan los 4 cobros fijos de los mocks, así que **se saltan solos contra staging** (`support/entorno.ts` decide por la `baseUrl`: localhost = mocks). Contra staging corre `w05-staging.cy.ts`, que no cuenta filas ni nombres: entra como operador, comprueba la tabla, el filtro por estado y el reintento de un rechazado (confirmación o explicación del BFF, nunca un error técnico). Antes: staging encendido (*Costos staging → encender*) y cobros sembrados con `python3 scripts/sembrar_cobros.py` del backend. Reintentar gasta uno de los 3 reintentos reales de ese cobro. Evidencia: [`../docs/evidencias/FC-10-web-plantilla.md`](../docs/evidencias/FC-10-web-plantilla.md).

Registro de evidencia de FC-01 (HU-W01): ver [`../docs/evidencias/FC-01-2026-10-18.md`](../docs/evidencias/FC-01-2026-10-18.md).

**Si Cypress no arranca** con `bad option: --no-sandbox` (pasa al lanzarlo desde la terminal de VS Code o de otra app Electron), ejecuta `unset ELECTRON_RUN_AS_NODE` antes de `npm run correr`.
