# Integración contra el stack real

Estos specs usan el backend de verdad: el CI no los corre.

1. En `solventa-backend`: `docker compose --profile servicios up -d --build --wait`.
2. En `apps/web`: `VITE_USE_MOCKS=false VITE_BFF_URL=http://localhost:8080 npx vite --port 5173`.
3. Crear un ASESOR y un CLIENTE con documento, y exportar `CYPRESS_USUARIO_ROL` y `CYPRESS_CLAVE_ROL` de cada rol.
4. Debe existir una póliza cuyo cobro recurrente ya se haya cobrado.
5. En `e2e`: `npx cypress run --config-file cypress.integracion.config.ts`. Desde la terminal de VS Code, antes
   `unset ELECTRON_RUN_AS_NODE`.
