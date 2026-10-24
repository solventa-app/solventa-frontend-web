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
      // '/graphql/siniestros' va antes que '/graphql': el dummy de siniestros (HU-W04) es otro servicio (:8107).
      proxy: {
        '/graphql/siniestros': { target: env.VITE_SINIESTROS_URL || 'http://localhost:8107', changeOrigin: true },
        '/graphql': { target: env.VITE_BFF_URL || 'http://localhost:8080', changeOrigin: true },
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
