import { HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { cargarLimitesPlazo, limitesDe, useLimitesPlazo } from '../src/composables/useLimitesPlazo'
import { servidor } from '../src/mocks/node'

const fetchPrueba: typeof fetch = (url, init) => fetch(new URL(String(url), 'http://localhost'), init)

describe('useLimitesPlazo (T18)', () => {
  beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }))
  afterEach(() => servidor.resetHandlers())
  afterAll(() => servidor.close())

  it('parte del catálogo del contrato: 6 a 200', () => {
    expect(useLimitesPlazo().limites).toEqual({ min: 6, max: 200 })
  })

  it('el rango cubre a todos los países', () => {
    expect(
      limitesDe([
        { plazo_min: 6, plazo_max: 60 },
        { plazo_min: 12, plazo_max: 120 },
      ]),
    ).toEqual({ min: 6, max: 120 })
  })

  it('toma los límites de la consulta jurisdicciones del BFF', async () => {
    servidor.use(
      graphql
        .link('*')
        .query('jurisdicciones', () =>
          HttpResponse.json({ data: { jurisdicciones: [{ codigo: 'CO', plazoMin: 12, plazoMax: 180 }] } }),
        ),
    )
    await cargarLimitesPlazo(fetchPrueba)
    expect(useLimitesPlazo().limites).toEqual({ min: 12, max: 180 })
  })

  it('si la consulta falla conserva los últimos límites', async () => {
    servidor.use(graphql.link('*').query('jurisdicciones', () => HttpResponse.error()))
    await cargarLimitesPlazo(fetchPrueba)
    expect(useLimitesPlazo().limites).toEqual({ min: 12, max: 180 })
  })
})
