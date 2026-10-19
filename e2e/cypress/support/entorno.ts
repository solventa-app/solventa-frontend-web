// Contra qué corre Cypress: la web local con los mocks de MSW (`npm run web:dev:mock`) o staging (Vercel
// + BFF real). Los specs de W05 que cuentan filas concretas (los 4 cobros del mock) solo valen contra los
// mocks; los de staging solo contra datos reales (sembrados con `scripts/sembrar_cobros.py` del backend).

export function contraMocks(): boolean {
  const base = Cypress.config('baseUrl') ?? ''
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(base)
}

/** `describe` que solo corre contra los mocks. */
export const describeConMocks = contraMocks() ? describe : describe.skip

/** `describe` que solo corre contra staging. */
export const describeEnStaging = contraMocks() ? describe.skip : describe
