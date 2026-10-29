// Los E2E de HU-W04 corren contra el backend real local (`npm run dev` sin mocks y el compose de solventa-backend
// con la semilla de siniestros): 10 siniestros, los mismos ids, radicados y estados que tenía el dummy.
// Antes de cada prueba se vuelve a la semilla con el endpoint de demo de CLAIMS (solo local, DEMO_REINICIAR=true).
// Otra URL: CYPRESS_CLAIMS_URL.

export function reiniciarSiniestros(): void {
  cy.env(['CLAIMS_URL']).then((vars) => {
    cy.request('POST', `${vars.CLAIMS_URL ?? 'http://localhost:8012'}/_demo/reiniciar`)
  })
}
