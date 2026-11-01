import { execFileSync } from 'node:child_process'
import { defineConfig } from 'cypress'

// Contra el stack real: ver cypress/integracion/README.md. `psql` entra por el contenedor de Postgres del compose.
const BACKEND = process.env.BACKEND_DIR ?? '../../solventa-backend'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    specPattern: 'cypress/integracion/**/*.cy.ts',
    supportFile: false,
    video: false,
    setupNodeEvents(on) {
      on('task', {
        psql({ bd, sql }: { bd: string; sql: string }) {
          return execFileSync(
            'docker',
            ['compose', 'exec', '-T', 'postgres', 'psql', '-U', 'postgres', '-d', bd, '-Atc', sql],
            { cwd: BACKEND, encoding: 'utf8' },
          ).trim()
        },
      })
    },
  },
})
