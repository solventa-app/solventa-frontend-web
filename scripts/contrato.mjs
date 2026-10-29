#!/usr/bin/env node
// Mantiene al día la copia versionada del contrato GraphQL del backend (contrato/schema.graphql).
//
//   node scripts/contrato.mjs verificar     falla (exit 1) si la copia difiere del backend
//   node scripts/contrato.mjs sincronizar   sobrescribe la copia con la del backend
//
// Origen del esquema del backend, en este orden:
//   1. BACKEND_SCHEMA_PATH  (ruta local; el CI usa un checkout de solventa-backend)
//   2. BACKEND_SCHEMA_URL   (URL "raw" del archivo; para repos privados agregar BACKEND_SCHEMA_TOKEN)
//   3. ../solventa-backend/contracts/graphql/schema.graphql  (repo hermano en tu máquina)

import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const aqui = dirname(fileURLToPath(import.meta.url))
const copia = resolve(aqui, '../contrato/schema.graphql')
const hermano = resolve(aqui, '../../solventa-backend/contracts/graphql/schema.graphql')
const copiaJur = resolve(aqui, '../contrato/jurisdicciones.json')
const copiaJurWeb = resolve(aqui, '../apps/web/src/contrato/jurisdicciones.json')
// Borrador del contrato REST de socios (HU-W07): la web lo sirve al Swagger de W07-03, así que lleva su propia copia.
const borradorSocios = resolve(aqui, '../contrato/borrador-socios-v1.yaml')
const copiaSociosWeb = resolve(aqui, '../apps/web/src/contrato/socios-v1.yaml')

const normalizar = (texto) => texto.replace(/\r\n/g, '\n').trimEnd() + '\n'

async function leerOrigen() {
  if (process.env.BACKEND_SCHEMA_PATH) {
    return { texto: await readFile(process.env.BACKEND_SCHEMA_PATH, 'utf8'), origen: process.env.BACKEND_SCHEMA_PATH }
  }
  if (process.env.BACKEND_SCHEMA_URL) {
    const cabeceras = process.env.BACKEND_SCHEMA_TOKEN
      ? { Authorization: `Bearer ${process.env.BACKEND_SCHEMA_TOKEN}` }
      : {}
    const r = await fetch(process.env.BACKEND_SCHEMA_URL, { headers: cabeceras })
    if (!r.ok) throw new Error(`No se pudo leer el esquema (${r.status}) en ${process.env.BACKEND_SCHEMA_URL}`)
    return { texto: await r.text(), origen: process.env.BACKEND_SCHEMA_URL }
  }
  return { texto: await readFile(hermano, 'utf8'), origen: hermano }
}

const modo = process.argv[2]
if (!['verificar', 'sincronizar'].includes(modo)) {
  console.error('Uso: node scripts/contrato.mjs <verificar|sincronizar>')
  process.exit(2)
}

const { texto, origen } = await leerOrigen()
const esperado = normalizar(texto)

if (modo === 'sincronizar') {
  await writeFile(copia, esperado, 'utf8')
  // El despliegue de Vercel solo sube apps/web: la web importa su propia copia del catálogo.
  await writeFile(copiaJurWeb, normalizar(await readFile(copiaJur, 'utf8')), 'utf8')
  await writeFile(copiaSociosWeb, normalizar(await readFile(borradorSocios, 'utf8')), 'utf8')
  console.log(`Contrato sincronizado desde ${origen}.\nAhora corre: npm run codegen --prefix apps/web`)
} else {
  const actual = normalizar(await readFile(copia, 'utf8'))
  if (actual !== esperado) {
    console.error(`El contrato local difiere del backend (${origen}).\nCorre: npm run contrato:sincronizar`)
    process.exit(1)
  }
  const jurRaiz = normalizar(await readFile(copiaJur, 'utf8'))
  const jurWeb = await readFile(copiaJurWeb, 'utf8').then(normalizar, () => null)
  if (jurRaiz !== jurWeb) {
    console.error('El catálogo de jurisdicciones de apps/web falta o difiere del de la raíz.\nCorre: npm run contrato:sincronizar')
    process.exit(1)
  }
  const sociosRaiz = normalizar(await readFile(borradorSocios, 'utf8'))
  const sociosWeb = await readFile(copiaSociosWeb, 'utf8').then(normalizar, () => null)
  if (sociosRaiz !== sociosWeb) {
    console.error('La copia del contrato de socios de apps/web falta o difiere del borrador.\nCorre: npm run contrato:sincronizar')
    process.exit(1)
  }
  console.log(`Contrato al día con ${origen}.`)
}
