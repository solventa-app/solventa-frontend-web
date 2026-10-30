# contrato/

Copia **versionada** del contrato GraphQL del BFF. La fuente de verdad es
`solventa-backend/contracts/graphql/schema.graphql`: **aquí no se edita a mano**.

```bash
npm run contrato:verificar     # falla si la copia difiere del backend (lo corre el CI)
npm run contrato:sincronizar   # trae la versión del backend
npm run codegen --prefix apps/web   # regenera apps/web/src/graphql/tipos.ts
```

Origen del esquema del backend: repo hermano `../solventa-backend` (por defecto), `BACKEND_SCHEMA_PATH` (ruta) o
`BACKEND_SCHEMA_URL` (+ `BACKEND_SCHEMA_TOKEN` si el repo es privado). Detalle en `scripts/contrato.mjs`.

**API REST de socios (HU-W07, v0.22):** `socios-v1.json` es la copia de `solventa-backend/contracts/openapi/socios-v1.json`
(OpenAPI 3.1) y tampoco se edita a mano. `npm run contrato:sincronizar` la trae junto con el esquema GraphQL y deja otra
copia en `apps/web/src/contrato/socios-v1.json` para el Swagger de W07-03 (Vercel solo publica `apps/web`);
`contrato:verificar` comprueba las dos. `npm run codegen` genera `apps/web/src/api/tipos-socios.ts`.

## Reglas (ADR-06)

1. El backend solo hace cambios **aditivos**; retirar algo = deprecar un sprint antes. Si ves una ruptura, avísalo: es un defecto del backend.
2. Un cambio de contrato = **dos PRs**: el del backend y el gemelo aquí (sincronizar + codegen + ajustar mocks y pantallas). Se enlazan entre sí.
3. Los **mocks** (`apps/web/src/mocks/handlers.ts`) deben seguir el esquema: el typecheck lo comprueba, porque usan los tipos generados.
4. Hasta que el BFF real esté desplegado se trabaja con `npm run web:dev:mock`.

## Convenciones de los mocks (no son del backend real)

| Si el documento de identidad termina en… | El mock devuelve |
|---|---|
| `999` | Oferta **PRELIMINAR** (una fuente lenta, CA-W01-04) |
| `000` | **ErrorOferta** con reintento (CA-W01-05) |
| otro | Oferta **COMPLETA** |
