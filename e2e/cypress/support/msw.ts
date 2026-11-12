// Cambiar lo que responde el BFF simulado (MSW) desde Cypress. Las peticiones las atiende el service worker de MSW, así
// que `cy.intercept` no las ve: la web expone `window.__msw` solo con mocks (`npm run dev:mock`, ver main.ts).

type Resolver = (variables: Record<string, unknown>) => unknown

type Msw = {
  worker: { use: (...handlers: unknown[]) => void }
  graphql: {
    link: (url: string) => {
      query: (nombre: string, resolver: (info: { variables: Record<string, unknown> }) => unknown) => unknown
    }
  }
  HttpResponse: { json: (cuerpo: unknown) => unknown }
}

/** Responde las consultas GraphQL por nombre, con el cuerpo `{ data }` o `{ errors }` que devuelva cada resolver. */
export function responderBff(win: Window, consultas: Record<string, Resolver>): void {
  const { worker, graphql, HttpResponse } = (win as unknown as { __msw: Msw }).__msw
  const bff = graphql.link('*')
  worker.use(
    ...Object.entries(consultas).map(([nombre, resolver]) =>
      bff.query(nombre, ({ variables }) => HttpResponse.json(resolver(variables))),
    ),
  )
}

/** Abre una ruta de la SPA sin recargar la página (pushState + popstate, que es lo que escucha vue-router). */
export function irARuta(win: Window, ruta: string): void {
  win.history.pushState(null, '', ruta)
  win.dispatchEvent(new PopStateEvent('popstate'))
}
