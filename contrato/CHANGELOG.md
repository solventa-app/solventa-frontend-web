# contrato/CHANGELOG.md

## Pendiente de sincronizar (frontend adelantado, falta el PR gemelo del backend)

- `Cobro.cliente: String!` y `Cobro.idTransaccion: String` — agregados para HU-W05
  (pantalla W05-01, Conciliacion de pagos: el prototipo de alta fidelidad trae columnas
  "Cliente" e "ID de transaccion" que el contrato no tenia). Cambio aditivo (ADR-06 regla 1),
  no rompe nada existente.
- Estado: PR del frontend (este repo, rama feature/HU-W05-conciliacion) hecho. Falta el PR
  gemelo en `solventa-backend` (ADR-06 regla 2) que exponga estos dos campos de verdad; hasta
  entonces `npm run contrato:sincronizar` sobreescribiria este cambio con el schema real del
  backend (que todavia no los tiene). No correr `contrato:sincronizar` en esta rama hasta que
  ese PR exista y estos dos campos ya esten en el schema real.
