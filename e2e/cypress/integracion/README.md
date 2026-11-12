# Integración contra el stack real

Estos specs usan el backend de verdad: el CI no los corre.

1. En `solventa-backend`: `docker compose --profile servicios up -d --build --wait`.
2. En `apps/web`: `VITE_USE_MOCKS=false VITE_BFF_URL=http://localhost:8080 npx vite --port 5173`.
3. Crear un ASESOR y un CLIENTE con documento, y exportar `CYPRESS_USUARIO_ROL` y `CYPRESS_CLAVE_ROL` de cada rol.
4. Debe existir una póliza cuyo cobro recurrente ya se haya cobrado.
5. En `e2e`: `npx cypress run --config-file cypress.integracion.config.ts`. Desde la terminal de VS Code, antes
   `unset ELECTRON_RUN_AS_NODE`.

`operador-socio.cy.ts` necesita además el usuario `operador.demo` con clave `Operador-local-0001` (BACKOFFICE), los socios
demo y la semilla de siniestros.

`w08-auto.cy.ts` (HU-W08, KAN-290) necesita `stub-vehiculos`, el CLIENTE demo `cliente.siniestros` (clave `Cliente-local-1`, tarea
`crear-cliente-siniestros-demo`) con su póliza de auto (tarea `sembrar-polizas-demo`) y el BACKOFFICE local. Corre con
`CYPRESS_USUARIO_CLIENTE=cliente.siniestros@demo.solventa.co CYPRESS_CLAVE_CLIENTE=Cliente-local-1
CYPRESS_USUARIO_BACKOFFICE=admin.solventa CYPRESS_CLAVE_BACKOFFICE=Admin-local-solventa`. El login es por **correo** desde
KAN-26 (AUTH `a8e98c2`), así que el usuario del CLIENTE demo es su correo.

`w03-recorrido.cy.ts` (HU-W03, KAN-26, T6 del plan de revisión QA) recorre al CLIENTE de punta a punta: cotiza en el
navegador y llega a firmar; firma y paga **por la API** (la pasarela del compose, `:8103`; `cy.origin` falla con un error
interno de Cypress 16 al entrar a ella); abre la póliza y comprueba que el contrato firmado y la póliza quedaron
**guardados y cifrados**: filas en `documentos_firmados` (POLICY), objetos del bucket `fake-gcs` que empiezan por
`SOLVENC1` y sin `%PDF` en claro, y que el PDF que se entrega es siempre el mismo. Necesita el mismo CLIENTE demo de
`w08-auto.cy.ts` (sin la póliza de auto), `almacenamiento` encendido y el contenedor `docker` accesible desde la terminal
(la tarea `psql` entra a la base de POLICY). Corre con `--spec cypress/integracion/w03-recorrido.cy.ts` y las mismas
variables `CYPRESS_USUARIO_CLIENTE` y `CYPRESS_CLAVE_CLIENTE`.
