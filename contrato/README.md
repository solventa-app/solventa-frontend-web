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

**Borrador local de HU-W07:** `borrador-socios-v1.yaml` (OpenAPI de la API de socios) **no es una copia del backend**:
lo escribe el front mientras el backend no publique `contracts/openapi/socios-v1.yaml` (`docs/plan-hu-w07-front.md`).
`npm run codegen` genera `apps/web/src/api/tipos-socios.ts` y `npm run contrato:sincronizar` deja una copia en
`apps/web/src/contrato/socios-v1.yaml` para el Swagger de W07-03. Al publicarse el real, se borra y se copia el del backend.

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
