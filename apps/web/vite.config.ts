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
      proxy: {
        '/graphql': { target: env.VITE_BFF_URL || 'http://localhost:8080', changeOrigin: true },
      },
    },
    test: {
      environment: 'jsdom',
      include: ['tests/**/*.test.ts'],
    },
  }
})
