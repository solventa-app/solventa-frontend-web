# Plan: Sentry en la web (paso a paso)

Guía para quien implemente el reporte de errores en `solventa-frontend-web` (Vue) y en `solventa-frontend-mobile` (Flutter). La decisión y los conceptos están en [`observabilidad.md`](observabilidad.md). Orden sugerido: primero web, después mobile, cada uno en su PR (`feat(web): KAN-N …` y `feat(mobile): KAN-N …`).

## Estado y entrega

Sentry **ya está implementado en código** en ambos repos (`solventa-frontend-web` y `solventa-frontend-mobile`) bajo la organización `uniandes-xm` (`run code: b78bb726f4`): SDK, `limpiar`, logger (`log.ts` / `SolLog`), código de soporte con botón de copiar, pantallas enmascaradas (`sentry-block` / `SentryMask`) y subida de source maps / símbolos en el deploy. Esta guía es la entrega para quien lo implemente, y está escrita sobre el código actual de los dos repos (rutas y nombres verificados).

| Ya está listo | Dónde |
|---|---|
| Flavors `dev`/`prod` con `config/<flavor>.json` leído por `AppConfig` | `lib/core/config/app_config.dart` |
| Build de prod ofuscado con `--split-debug-info=build-symbols`, más el `mapping.txt` de R8 en `dist/` | `tool/build-prod.sh` |
| Versión del APK fijada desde el tag (`versionName+versionCode`) | `tool/version.sh`, `.github/workflows/cd.yml` |
| Fallas tipadas: lo que no se espera termina en `Inesperada` | `lib/core/errors/guardar_fallas.dart` |
| Web: `/graphql` relativo, reescrito por Vercel al gateway | `apps/web/vercel.json` |

| Falta (esta guía) | Repo |
|---|---|
| Cuenta, proyectos, scrubbing y alertas en Sentry | Ambos (paso 0) |
| SDK, logger, código de soporte, pantallas enmascaradas | Web (paso 2) y mobile (paso 3) |
| Source maps (web) y símbolos (mobile) en el deploy | Web (2.7) y mobile (3.8) |

Reglas que no se negocian:

- **Sin datos personales** en eventos, breadcrumbs, capturas ni videos: nada de documento, nombre, correo, teléfono, montos de una persona, datos de pago, tokens ni ubicación exacta.
- El usuario nunca ve un error técnico: ve un mensaje amable y su **código de soporte**.
- El video (Session Replay) se guarda **solo cuando hay un error** y va **enmascarado**.
- El encabezado `traceparent` va **solo a nuestro gateway**, nunca a terceros.

## Antes de empezar

- **Web:** `git pull` de `develop` en `solventa-frontend-web`, `npm install` y `npm run dev` para confirmar que corre.
- **Mobile:** `git pull` de `develop` en `solventa-frontend-mobile` y abrir el repo en el devcontainer (VS Code → Dev Containers: Reopen in Container; ver `docs/entorno-local.md`). Todo lo de la sección 3 (`flutter pub add`, pruebas, `tool/verificar.sh`) se corre en la terminal del contenedor, no con un Flutter instalado en la máquina.
- Pide a quien administra Vercel y GitHub que cree los secretos de la sección 1; tú no necesitas el token en local.

## 0. Cuenta y proyectos (una vez, 20 minutos)

1. Crear la cuenta en [sentry.io](https://sentry.io) con el correo del equipo. Antes de elegir plan, revisar los límites vigentes del plan gratuito (errores y replays por mes, miembros del equipo) y si aplica el GitHub Student Developer Pack, que ha incluido Sentry con más cuota.
2. Crear la organización `solventa` y elegir la región de datos (US o EU; anotar cuál, cambia la URL del API).
3. Crear dos proyectos:
   - `solventa-web`, plataforma **Vue**.
   - `solventa-mobile`, plataforma **Flutter**.
4. En cada proyecto, Settings → Client Keys (DSN): copiar el DSN. **El DSN no es secreto** (va dentro del bundle o del APK), pero se maneja por ambiente.
5. Settings → Security & Privacy de la organización:
   - activar **Data Scrubber** y **Use Default Scrubbers**;
   - en **Sensitive Fields**, agregar `documento, cedula, nombre, correo, email, telefono, celular, direccion, token, password, tarjeta, cvv, iban`;
   - activar **Prevent Storing of IP Addresses**.
6. Crear un **Auth Token** de organización (Settings → Auth Tokens) con permisos `project:releases` y `org:read`. Sirve para subir source maps (web) y símbolos (mobile). **Este sí es secreto.**
7. Alertas: en cada proyecto, Alerts → "A new issue is created" → correo al equipo. Una segunda regla para "issue frequency > 50 en 1 h".
8. Invitar al equipo (Settings → Members).

## 1. Secretos y variables

| Repo | Nombre | Tipo | Dónde |
|---|---|---|---|
| web | `SENTRY_AUTH_TOKEN` | Secreto | **Vercel** (Production y Preview, marcado *Sensitive*): el build lo hace Vercel, no GitHub Actions |
| web | `VITE_SENTRY_DSN` | Variable | Vercel (Production y Preview) y `.env.example` vacío |
| web | `SENTRY_ORG` = `solventa` | Variable | Vercel |
| mobile | `SENTRY_AUTH_TOKEN` | Secreto | GitHub, environment `production` |
| mobile | `SENTRY_DSN` | Clave en `config/*.json` | El DSN de `solventa-mobile` en `dev.json` y `prod.json`; vacío en `mock.json` y `local.json` |

En local nadie necesita el token. Con DSN vacío el SDK no envía nada.

## 2. Web (Vue 3 + Vite, `solventa-frontend-web/apps/web`)

### 2.1 Instalar

```bash
npm install --workspace apps/web @sentry/vue
npm install --workspace apps/web --save-dev @sentry/vite-plugin
```

### 2.2 Variables del build

Vite solo expone variables `VITE_*`, y Vercel da el SHA y el ambiente como `VERCEL_GIT_COMMIT_SHA` y `VERCEL_ENV`. En `vite.config.ts`:

```ts
define: {
  'import.meta.env.VITE_RELEASE': JSON.stringify(process.env.VERCEL_GIT_COMMIT_SHA ?? 'local'),
  'import.meta.env.VITE_AMBIENTE': JSON.stringify(process.env.VERCEL_ENV ?? 'local'), // production | preview
},
```

Agregar `VITE_SENTRY_DSN`, `VITE_RELEASE` y `VITE_AMBIENTE` a `ImportMetaEnv` en `src/env.d.ts`.

### 2.3 Iniciar en `src/main.ts`

Hoy `arrancar()` hace `createApp(App).use(crearRouter()).mount('#app')`. Hay que separar `app` y `router` para dárselos a Sentry antes de `mount`:

```ts
import * as Sentry from '@sentry/vue'
import { limpiar } from './observabilidad/limpiar'

async function arrancar() {
  if (import.meta.env.VITE_USE_MOCKS === 'true') { /* igual que hoy */ }

  const app = createApp(App)
  const router = crearRouter()
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (dsn) {
    Sentry.init({
      app,
      dsn,
      environment: import.meta.env.VITE_AMBIENTE,
      release: import.meta.env.VITE_RELEASE,
      sendDefaultPii: false,
      integrations: [
        Sentry.browserTracingIntegration({ router }),
        Sentry.replayIntegration({ maskAllText: true, maskAllInputs: true, blockAllMedia: true }),
      ],
      tracesSampleRate: 0.1,
      // /graphql es relativo (Vercel lo reescribe al gateway): traceparent solo ahí
      tracePropagationTargets: [/^\/graphql/],
      replaysSessionSampleRate: 0,   // no grabar sesiones normales
      replaysOnErrorSampleRate: 1.0, // sí grabar cuando hay un error
      beforeSend: limpiar,
      beforeBreadcrumb: (b) => (b.category === 'ui.input' ? null : b), // nunca lo que se escribe
    })
  }
  app.use(router).mount('#app')
}
```

`limpiar` (en `src/observabilidad/limpiar.ts`) borra de `event.request` (URL, query y cuerpo), `event.extra` y los breadcrumbs cualquier clave de la lista de campos sensibles del paso 0, y reemplaza números de 6 o más dígitos por `[número]`. Lleva prueba de Vitest con un evento que trae documento, correo y token, y verifica que salen limpios.

### 2.4 Pantallas que no se graban

En los formularios de pago, de documento y de la cámara de evidencia, agregar la clase `sentry-block` al contenedor (el replay lo muestra como un bloque gris). Hoy aplica a `SolicitudYConsentimiento.vue` y `ConciliacionDePagos.vue`; revisar las vistas nuevas en cada HU.

### 2.5 Logger

`src/log.ts` con `debug`, `info`, `warn`, `error`:

- en desarrollo (`import.meta.env.DEV`) escribe en la consola;
- en producción `info` y `warn` van como `Sentry.addBreadcrumb`, y `error` como `Sentry.captureException`.

Activar la regla `no-console` en `eslint.config.js` (excepto `src/mocks/` y `src/log.ts`).

### 2.6 Código de soporte

La vista de error (`OfertaError.vue` y el manejador de errores de GraphQL) muestra:

```ts
const traceId = Sentry.getActiveSpan()?.spanContext().traceId ?? Sentry.lastEventId()
const codigo = traceId?.slice(0, 8)
Sentry.setTag('codigo_soporte', codigo)
```

Texto: "Algo salió mal. Si escribes a soporte, comparte este código: **4bf92f35**" con botón de copiar.

### 2.7 Source maps en el deploy de Vercel

En `vite.config.ts`:

```ts
import { sentryVitePlugin } from '@sentry/vite-plugin'

build: { sourcemap: 'hidden' },
plugins: [
  vue(),
  process.env.SENTRY_AUTH_TOKEN && sentryVitePlugin({
    org: process.env.SENTRY_ORG,
    project: 'solventa-web',
    authToken: process.env.SENTRY_AUTH_TOKEN,
    release: { name: process.env.VERCEL_GIT_COMMIT_SHA },
    sourcemaps: { filesToDeleteAfterUpload: ['dist/**/*.map'] }, // no se publican en Vercel
  }),
]
```

### 2.8 Verificar (definición de hecho)

- [ ] Un botón temporal en preview que lanza `throw new Error('prueba sentry')` aparece en Sentry con stack trace legible (source maps), `environment: preview` y replay.
- [ ] En el replay no se lee ningún texto ni valor de campo.
- [ ] La petición a `/graphql` lleva el encabezado `traceparent`, y en Cloud Logging aparece la misma traza.
- [ ] El código de soporte de la pantalla encuentra el evento en Sentry (búsqueda `codigo_soporte:4bf92f35`).
- [ ] La prueba de `limpiar` pasa. Quitar el botón de prueba.

## 3. Mobile

La parte de Flutter vive en su propio repositorio: `solventa-frontend-mobile/docs/plan-sentry.md`.

## 4. Cómo se usa después

1. El usuario reporta un problema y dicta su código (`4bf92f35`).
2. Sentry → buscar `codigo_soporte:4bf92f35`: error, dispositivo o navegador, versión, breadcrumbs, captura y video enmascarado.
3. Cloud Logging / Cloud Trace → buscar la traza: qué servicio del backend falló.
4. Reproducir con la misma versión (Release de GitHub en mobile, preview en web) siguiendo el video.
5. El arreglo agrega una prueba que cubre ese caso.

## 5. Documentos a actualizar al terminar

- `docs/observabilidad.md` de cada repo: pasar de "plan" a "hoy".
- `docs/ci-cd.md` (mobile): fila de `SENTRY_AUTH_TOKEN` en "Secretos y variables" y el paso de símbolos en el CD.
- `README.md` de cada repo: cómo probar Sentry en local con un DSN de prueba.
- `CLAUDE.md` (mobile): quitar Sentry de "Pendiente" y apuntar a `SolLog`.
- Esta guía: marcar en "Estado y entrega" lo que ya quedó hecho.
