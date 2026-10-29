import vue from '@vitejs/plugin-vue'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [vue()],
    server: {
      port: 5173,
      // El gateway Envoy local (:8080) y el BFF (:8000) exponen /graphql/web y /graphql/app: ver contrato/README.md.
      // '/v1' es la versión 1 de esas rutas (/v1/graphql/web); la mesa de siniestros (HU-W04) solo existe ahí.
      proxy: {
        '/graphql': { target: env.VITE_BFF_URL || 'http://localhost:8080', changeOrigin: true },
        '/v1': { target: env.VITE_BFF_URL || 'http://localhost:8080', changeOrigin: true },
      },
    },
    test: {
      environment: 'jsdom',
      include: ['tests/**/*.test.ts'],
      // Solo se mide con `npm run test:cobertura` (lo usa el análisis de Sonar). `include` hace que los
      // archivos que ninguna prueba carga aparezcan al 0 %, en vez de quedar fuera del porcentaje.
      coverage: {
        provider: 'v8',
        reporter: ['lcov', 'text-summary'],
        include: ['src/**/*.{ts,vue}'],
        exclude: ['src/graphql/tipos.ts', 'src/graphql/tipos-siniestros.ts', 'src/**/*.d.ts'],
      },
    },
  }
})
