import type { CodegenConfig } from '@graphql-codegen/cli'

// Genera los tipos TypeScript desde la copia versionada del contrato (../../contrato/schema.graphql).
// El archivo generado SÍ se versiona; el CI falla si `npm run codegen` deja diferencias.
// El dummy de siniestros (HU-W04) tiene su propio esquema: sus tipos van a un archivo aparte.
// HU-W03 y W05-A5 usan un borrador local de la v0.17 sobre la v0.16 (contrato/borrador-v0.17.graphql): sus tipos
// van a tipos-borrador.ts, que se borra junto con el borrador cuando el backend publique la v0.17.
const configuracion = {
  plugins: ['typescript'],
  config: {
    enumsAsTypes: true,
    skipTypename: true,
    scalars: { DateTime: 'string' },
  },
}

const config: CodegenConfig = {
  generates: {
    'src/graphql/tipos.ts': { schema: '../../contrato/schema.graphql', ...configuracion },
    'src/graphql/tipos-siniestros.ts': { schema: '../../contrato/siniestros.graphql', ...configuracion },
    'src/graphql/tipos-borrador.ts': {
      schema: ['../../contrato/schema.graphql', '../../contrato/borrador-v0.17.graphql'],
      ...configuracion,
    },
  },
}

export default config
