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
        // T6: lo que de verdad hay en el bucket de `fake-gcs` para los documentos firmados: el tipo de contenido, los
        // primeros bytes y si el PDF aparece en claro. Debe ser solo el contenedor cifrado (`SOLVENC1`).
        async objetosCifrados({ prefijos }: { prefijos: string[] }) {
          const base = 'http://localhost:4443/storage/v1/b/solventa-archivos-local/o'
          const resultado: { tipoContenido: string; inicio: string; pdfEnClaro: boolean }[] = []
          for (const prefijo of prefijos) {
            const lista = (await (await fetch(`${base}?prefix=${prefijo}&maxResults=3`)).json()) as {
              items?: { name: string; contentType: string }[]
            }
            for (const objeto of lista.items ?? []) {
              const bytes = Buffer.from(
                await (await fetch(`${base}/${encodeURIComponent(objeto.name)}?alt=media`)).arrayBuffer(),
              )
              resultado.push({
                tipoContenido: objeto.contentType,
                inicio: bytes.subarray(0, 8).toString('latin1'),
                pdfEnClaro: bytes.includes('%PDF'),
              })
            }
          }
          return resultado
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
