# contrato/CHANGELOG.md

## 2026-10-17 · Sincronizado con `solventa-backend` (KAN-207)

- Llegan sesión y usuarios (HU-M02): `iniciarSesion`, `yo`, `Usuario`, `Sesion`, `RolUsuario`
  (`CLIENTE`, `ASESOR`, `BACKOFFICE`). La web inicia sesión con `iniciarSesion` y envía el JWT en
  `Authorization: Bearer`.
- **Ruptura para W05:** `Cobro.cliente` pasa de `String!` (la copia adelantada del frontend) a
  `ClienteCobro { id, nombre }`. `Cobro.idTransaccion` no existe en el backend. Las consultas de
  `useConciliacion.ts` y los mocks se ajustaron.
- Llegan además `crearCobro`, `Cobro.motivo` y `Cobro.intentos` y la gestión de usuarios, que la
  web todavía no usa.

## Pendiente de pedir al backend (cambios aditivos, ADR-06)

- **Claim `nombre` en el JWT** que emite AUTH (`services/auth/app/sesiones.py`): el saludo de G-02
  y G-02a debe mostrar el nombre del usuario autenticado. Mientras no llegue, la web muestra el
  alias (`usuario`). Ojo: el nombre es dato personal cifrado en AUTH, así que el equipo de backend
  decide si puede viajar en el token o si se expone en `yo`.
- **`Cobro.idTransaccion: String`** para la columna "ID de transacción" de W05-01. Hasta entonces
  la columna muestra "—".
