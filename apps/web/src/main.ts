import * as Sentry from '@sentry/vue'
import { createApp } from 'vue'
import App from './App.vue'
import { alSesionVencida } from './composables/useSesion'
import { limpiar } from './observabilidad/limpiar'
import { crearRouter } from './router'
import './styles/twind'
import './styles/base.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'

async function arrancar() {
  // Hasta que el BFF real esté desplegado se trabaja con mocks (`npm run dev:mock`).
  if (import.meta.env.VITE_USE_MOCKS === 'true') {
    const { worker } = await import('./mocks/browser')
    await worker.start({ onUnhandledFrame: 'bypass' })
  }
  const app = createApp(App)
  const router = crearRouter()
  // T22: si el refresh venció o falló, la persona vuelve al ingreso (G-01 muestra el aviso).
  alSesionVencida(() => void router.push('/login'))
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (dsn) {
    Sentry.init({
      app,
      dsn,
      environment: import.meta.env.VITE_AMBIENTE,
      release: import.meta.env.VITE_RELEASE,
      integrations: [
        Sentry.browserTracingIntegration({ router }),
        Sentry.replayIntegration({ maskAllText: true, maskAllInputs: true, blockAllMedia: true }),
      ],
      tracesSampleRate: 0.1,
      // /graphql es relativo (Vercel lo reescribe al gateway): traceparent solo ahí
      tracePropagationTargets: [/^\/graphql/, /^\/v1\/graphql/],
      replaysSessionSampleRate: 0, // no grabar sesiones normales
      replaysOnErrorSampleRate: 1.0, // sí grabar cuando hay un error
      beforeSend: limpiar,
      beforeBreadcrumb: (b) => (b.category === 'ui.input' ? null : b),
    })
  }
  app.use(router).mount('#app')
}

void arrancar()
