# e2e/

Pruebas de extremo a extremo con **Cypress** (web). Tiene su propio `package.json` para no obligar a descargar el binario de Cypress (~500 MB) a quien solo trabaja en la web.

```bash
cd e2e && npm install
npm run abrir          # modo interactivo
npm run correr         # sin interfaz (CI)
```

- **Local:** levanta la web con `npm run web:dev:mock` y corre contra `http://localhost:5173`.
- **Staging:** `CYPRESS_BASE_URL=https://<staging> npm run correr`. Staging se despliega desde el `main` de `solventa-backend`; el E2E de W01 → W03 depende de que esté estable.
- El móvil (Flutter) no usa Cypress: sus pruebas viven en `apps/mobile` (`flutter_test`, `integration_test`, Firebase Test Lab).

## Dos niveles de E2E (Jira KAN-203)

Cada pantalla lleva `data-pantalla="<id>"` en su raíz (Vitest y Cypress la usan para localizarla); en Cypress se localiza siempre por `[data-pantalla="<id>"]` y por roles/etiquetas accesibles — nunca por clases CSS.

1. **Por historia** (`cypress/e2e/<historia>.cy.ts`, p. ej. `w01-oferta.cy.ts`, `w05-conciliacion.cy.ts`): el flujo completo tal como lo recorre una persona real, cruzando varias pantallas (login → home → cotización → oferta → detalle de fuentes, etc.). Es la convención original de este README.
2. **Por pantalla individual, aislada** (`cypress/e2e/pantallas/<id>.cy.ts`, uno por `data-pantalla`, p. ej. `w01-04.cy.ts`): visita **una sola ruta** directamente y solo hace aserciones dentro de esa pantalla. Si una acción navega a otra pantalla, se verifica únicamente la ruta resultante (`cy.location`), nunca el contenido de la pantalla de destino (eso ya lo cubre el E2E de su historia). Para las pantallas que normalmente dependen de un estado previo en memoria (p. ej. W01-03a/b/c, W01-04: solo tienen una oferta/error real si se llegó ahí navegando desde W01-01), la prueba aislada cubre el guard/estado vacío real que ve cualquiera que entre por URL directa o refresque la página — el camino feliz con datos reales ya lo cubre el E2E por historia.

Este segundo nivel es **adicional** al primero, no lo reemplaza: ambos se mantienen y se ejecutan juntos (`npm run correr` corre todos los specs de `cypress/e2e/**`).

> Estado: los specs existen (14 en total: 2 por historia + 12 por pantalla, cubriendo las 12 pantallas con `componente` propio de `router/pantallas.ts` — G-01, G-02, G-02a, G-02b, W01-01 a W01-05, W01-04 y W05-01) y pasan `tsc --noEmit` (`e2e/tsconfig.json`), pero **no se han podido ejecutar de verdad contra un navegador real en esta sesión**: el allowlist de red del entorno bloquea la descarga del binario de Cypress (`download.cypress.io` responde 403 a través del proxy). Antes de confiar en ellos hay que correrlos una vez en una máquina con acceso normal a internet (`cd e2e && npm install && npm run web:dev:mock` en otra terminal, luego `npm run correr`) y ajustar lo que la ejecución real revele (timings, selectores que Cypress no resuelva igual que Vitest/jsdom).
