# contrato/CHANGELOG.md

Bitácora de las sincronizaciones de `contrato/schema.graphql` con `solventa-backend/contracts/graphql/schema.graphql`
(la bitácora completa de cada versión vive en el backend: `contracts/CHANGELOG.md`).

## 2026-10-17 · sincronizado con el contrato v0.6 del backend

- Se descarta el adelanto local de HU-W05 (`Cobro.cliente: String!`): el backend lo resolvió como
  `cliente: ClienteCobro { id nombre }` (el nombre lo guarda AUTH cifrado). `idTransaccion` sí quedó en el backend
  (la referencia de la pasarela).
- Llegan del backend: usuarios y sesión (`iniciarSesion`, `yo`, `Usuario`, `RolUsuario`…), `Cobro.motivo`,
  `Cobro.intentos`, `Cobro.reintentosRestantes`, `crearCobro` y el filtro `cobros(polizaId)`.
- PR gemelo del backend: `feat/KAN-28-reintento-rechazados` (contrato v0.6). Hay que integrarlo antes que este.
