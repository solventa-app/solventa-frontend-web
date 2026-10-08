import { createApp } from 'vue'
import App from './App.vue'
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
    await worker.start({ onUnhandledRequest: 'bypass' })
  }
  createApp(App).use(crearRouter()).mount('#app')
}

arrancar()
