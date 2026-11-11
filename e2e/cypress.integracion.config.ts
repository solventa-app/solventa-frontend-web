import { execFileSync } from 'node:child_process'
import { defineConfig } from 'cypress'

// Contra el stack real: ver cypress/integracion/README.md. `psql` entra por el contenedor de Postgres del compose.
interface SubidaBinaria {
  url: string
  metodo: string
  encabezados: { nombre: string; valor: string }[]
  base64: string
}

const BACKEND = process.env.BACKEND_DIR ?? '../../solventa-backend'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    specPattern: 'cypress/integracion/**/*.cy.ts',
    supportFile: false,
    video: false,
    setupNodeEvents(on) {
      on('task', {
        // HU-W08: sube un archivo binario a una URL firmada. Desde el navegador `cy.request` no manda un Buffer como
        // binario (el archivo llega corrupto), así que la subida la hace Node.
        async subirArchivo({ url, metodo, encabezados, base64 }: SubidaBinaria) {
          const r = await fetch(url, {
            method: metodo,
            headers: Object.fromEntries(encabezados.map((e) => [e.nombre, e.valor])),
            body: Buffer.from(base64, 'base64'),
          })
          return r.status
        },
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
