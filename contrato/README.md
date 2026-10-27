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

## Reglas (ADR-06)

1. El backend solo hace cambios **aditivos**; retirar algo = deprecar un sprint antes. Si ves una ruptura, avísalo: es un defecto del backend.
2. Un cambio de contrato = **dos PRs**: el del backend y el gemelo aquí (sincronizar + codegen + ajustar mocks y pantallas). Se enlazan entre sí.
3. Los **mocks** (`apps/web/src/mocks/handlers.ts`) deben seguir el esquema: el typecheck lo comprueba, porque usan los tipos generados.
4. Hasta que el BFF real esté desplegado se trabaja con `npm run web:dev:mock`.

## Borrador local de la v0.17 (temporal)

`borrador-v0.17.graphql` **no es una copia del backend**: extiende la v0.16 con lo que HU-W03 (bloque 9) y W05-A5
necesitan y el backend aún no publica, para construir el front con mocks (D-1 de
`docs/plan-front-w03-y-ajustes-w01-w05.md`). Sus tipos van a `apps/web/src/graphql/tipos-borrador.ts`. Cuando el backend
publique la v0.17: se borra el borrador y `tipos-borrador.ts`, se sincroniza, se regenera y se cambian los `import`.

## Convenciones de los mocks (no son del backend real)

| Si el documento de identidad termina en… | El mock devuelve |
|---|---|
| `999` | Oferta **PRELIMINAR** (una fuente lenta, CA-W01-04) |
| `000` | **ErrorOferta** con reintento (CA-W01-05) |
| otro | Oferta **COMPLETA** |
