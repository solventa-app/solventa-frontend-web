import { sentryVitePlugin } from '@sentry/vite-plugin'
import vue from '@vitejs/plugin-vue'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    define: {
      'import.meta.env.VITE_RELEASE': JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA ?? 'local'),
      'import.meta.env.VITE_AMBIENTE': JSON.stringify(process.env.VERCEL_ENV ?? 'local'),
    },
    build: {
      sourcemap: 'hidden',
    },
    plugins: [
      vue(),
      process.env.SENTRY_AUTH_TOKEN
        ? sentryVitePlugin({
            org: process.env.SENTRY_ORG ?? 'uniandes-xm',
            project: 'solventa-web',
            authToken: process.env.SENTRY_AUTH_TOKEN,
            release: { name: process.env.VERCEL_GIT_COMMIT_SHA },
            sourcemaps: { filesToDeleteAfterUpload: ['dist/**/*.map'] },
          })
        : null,
    ],
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
