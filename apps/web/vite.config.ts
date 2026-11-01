import { sentryVitePlugin } from '@sentry/vite-plugin'
import vue from '@vitejs/plugin-vue'
import { appendFileSync, mkdirSync } from 'node:fs'
import { loadEnv, type Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

// T22 · Solo en desarrollo: el navegador manda sus logs a /__log y se anexan a logs/web-local.log (ignorado por git).
function logsLocales(): Plugin {
  return {
    name: 'logs-web-local',
    apply: 'serve',
    configureServer(server) {
      mkdirSync('logs', { recursive: true })
      server.middlewares.use('/__log', (req, res) => {
        let cuerpo = ''
        req.on('data', (c) => (cuerpo += c))
        req.on('end', () => {
          appendFileSync('logs/web-local.log', `${new Date().toISOString()} ${cuerpo.slice(0, 2000)}\n`)
          res.statusCode = 204
          res.end()
        })
      })
    },
  }
}

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
      logsLocales(),
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
      // '/v1' es la versión 1 de esas rutas (/v1/graphql/web); la mesa de siniestros (HU-W04) solo existe ahí.
      proxy: {
        '/graphql': { target: env.VITE_BFF_URL || 'http://localhost:8080', changeOrigin: true },
        '/v1': { target: env.VITE_BFF_URL || 'http://localhost:8080', changeOrigin: true },
        // Los PDF que entrega el BFF (contrato a firmar y póliza emitida) son rutas REST, no GraphQL.
        '^/propuestas/[^/]+/contrato\\.pdf$': {
          target: env.VITE_BFF_URL || 'http://localhost:8080',
          changeOrigin: true,
        },
        '^/polizas/[^/]+/documento$': { target: env.VITE_BFF_URL || 'http://localhost:8080', changeOrigin: true },
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
        exclude: ['src/graphql/tipos.ts', 'src/api/tipos-socios.ts', 'src/**/*.d.ts'],
      },
    },
  }
})
