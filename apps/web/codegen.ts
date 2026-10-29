import type { CodegenConfig } from '@graphql-codegen/cli'

// Genera los tipos TypeScript desde la copia versionada del contrato (../../contrato/schema.graphql).
// El archivo generado SÍ se versiona; el CI falla si `npm run codegen` deja diferencias.
// El dummy de siniestros (HU-W04) tiene su propio esquema: sus tipos van a un archivo aparte.
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
  },
}

export default config
