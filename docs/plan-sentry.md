# Plan: Sentry en web y mobile (paso a paso)

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

## 3. Mobile (Flutter)

### 3.1 Instalar

```bash
flutter pub add sentry_flutter sentry_dio logging
flutter pub add --dev sentry_dart_plugin
```

`sentry_dio` es necesario porque la app habla con el gateway por Dio (`lib/core/network/network_providers.dart`): sin él no hay `traceparent` ni breadcrumbs de red. Revisar que `flutter analyze` siga limpio (el repo usa análisis estricto).

### 3.2 Configuración por flavor

Agregar `"SENTRY_DSN"` a los cuatro `config/*.json` (vacío en `mock.json` y `local.json`) y leerlo en `AppConfig`:

```dart
/// DSN de `solventa-mobile`. Vacío = Sentry no envía nada (pruebas, mock, local).
static const String sentryDsn = String.fromEnvironment('SENTRY_DSN');
```

### 3.3 Iniciar en `lib/main.dart`

Se conserva lo que `main` hace hoy (`SolLocalizations.init()`, edge-to-edge) y se envuelve con Sentry. `ProviderScope` queda dentro de `SentryWidget`:

```dart
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SolLocalizations.init();
  // … SystemChrome igual que hoy …
  await SentryFlutter.init(
    (o) {
      o.dsn = AppConfig.sentryDsn; // vacío = no envía
      o.environment = AppConfig.flavor;
      o.sendDefaultPii = false;
      o.maxRequestBodySize = MaxRequestBodySize.never; // las variables de GraphQL llevan datos personales
      o.attachScreenshot = true;
      o.screenshotQuality = SentryScreenshotQuality.low;
      o.tracesSampleRate = 0.1;
      // El default es '.*' (todos los hosts). API_BASE_URL aún está vacío en
      // dev y prod: sin gateway no se propaga a nadie.
      o.tracePropagationTargets
        ..clear()
        ..addAll([if (AppConfig.apiBaseUrl.isNotEmpty) AppConfig.apiBaseUrl]);
      o.replay.sessionSampleRate = 0;  // no grabar sesiones normales
      o.replay.onErrorSampleRate = 1.0; // sí grabar cuando hay un error
      o.privacy.maskAllText = true;
      o.privacy.maskAllImages = true;
      o.beforeSend = limpiar;
      o.beforeBreadcrumb = (b, _) => b?.category == 'ui.input' ? null : b;
    },
    appRunner: () =>
        runApp(SentryWidget(child: const ProviderScope(child: SolventaApp()))),
  );
}
```

Además:

- `lib/app/router.dart`: `crearRouter()` agrega `observers: [SentryNavigatorObserver()]` al `GoRouter`, para que los breadcrumbs digan en qué pantalla estaba el usuario (el nombre de ruta es el id de Figma, p. ej. `m01-03`).
- `lib/core/network/network_providers.dart`: en `dioProvider`, `dio.addSentry()` después de crear el `Dio`.
- `lib/core/errors/guardar_fallas.dart`: donde se crea `Inesperada(e)`, llamar `SolLog.severe(...)` con el error (sin la respuesta del servidor) para que llegue a Sentry. Las demás fallas (`SinConexion`, `SesionVencida`…) son esperadas y quedan solo como breadcrumb.
- `limpiar` (en `lib/core/log/limpiar.dart`) hace lo mismo que en web y lleva su prueba.

Versión del release: el SDK la toma del APK (`com.solventa.solventa_mobile@versionName+versionCode`; en dev el id termina en `.dev`), que el CD fija desde el tag (`tool/version.sh`).

### 3.4 Pantallas sin captura ni video

Envolver en `SentryMask` y excluir de `attachScreenshot` con `o.beforeScreenshot` las pantallas de documento y cámara de HU-M01 (`m01_03_documento_frente_page.dart`, `m01_04_documento_reverso_page.dart`, `m01_05_prueba_vida_page.dart`) y, cuando existan, las de pago y billetera. Prueba de widget que verifica que esas pantallas están marcadas.

### 3.5 Logger `SolLog`

`lib/core/log/sol_log.dart` sobre `package:logging`:

- en dev, todos los niveles a la consola (`debugPrint` con hora, pantalla y nivel);
- en prod nada a la consola: `info`/`warning` como `Sentry.addBreadcrumb`, `severe` como `Sentry.captureException`;
- recibe solo campos permitidos (id opaco, pantalla, código de error). Prueba que verifica que no pasan documento, correo ni token.

### 3.6 Código de soporte

En la pantalla de error común (hoy no existe: la crea esta tarea, con el design system, y la usan los estados de error de cada pantalla, empezando por `m01_07_resultado_page.dart`):

```dart
final traceId = Sentry.getSpan()?.context.traceId.toString() ?? Sentry.lastEventId.toString();
final codigo = traceId.substring(0, 8);
Sentry.configureScope((s) => s.setTag('codigo_soporte', codigo));
```

Mostrar el código con botón de copiar, igual que en web. Los textos van en `lib/core/l10n/arb/app_es.arb`.

### 3.7 Desarrollo en el devcontainer

Nada extra: `flutter test` corre sin `--dart-define-from-file`, así que `SENTRY_DSN` queda vacío y no se envía nada. Para probar envíos reales, poner un DSN de prueba en `config/dev.json` **sin hacer commit** y compilar con `tool/build-dev.sh`.

### 3.8 Símbolos de la ofuscación en el CD

El build de prod ya sale con `--obfuscate --split-debug-info=build-symbols` (`tool/build-prod.sh`). Agregar al final de `pubspec.yaml`:

```yaml
sentry:
  project: solventa-mobile
  org: solventa
  upload_debug_symbols: true
  upload_source_maps: false
  symbols_path: build-symbols
  ignore_missing: true
```

Los símbolos de Dart se emparejan por *debug id*, no por versión, así que no hace falta pasar el release al plugin.

En `.github/workflows/cd.yml`, agregar `SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}` al `env:` del job `prod` y, después de "Build de prod", un paso que corre dentro del devcontainer solo si existe el token:

```yaml
- name: Subir símbolos a Sentry
  if: env.PUBLICAR == 'true' && env.SENTRY_AUTH_TOKEN != ''
  uses: ./.github/actions/devcontainer
  with:
    env: SENTRY_AUTH_TOKEN
    run: dart run sentry_dart_plugin
```

Hacer lo mismo en `rollback.yml`. El `mapping.txt` de R8 (lado Java/Kotlin) queda en `dist/` y en el Release de GitHub; subirlo a Sentry es opcional y requiere el plugin de Gradle de Sentry para que el APK lleve el UUID del mapping. No vale la pena mientras la app no tenga código nativo propio.

### 3.9 Verificar (definición de hecho)

- [ ] Con un DSN de prueba en `config/dev.json` local, un botón temporal que lanza una excepción aparece en Sentry con dispositivo, versión, breadcrumbs (con la ruta de go_router), captura y replay.
- [ ] En la captura y el replay no se lee ningún texto, y las pantallas de documento y prueba de vida no tienen captura.
- [ ] Un build de prod ofuscado (CD manual desde la rama) muestra en Sentry el stack trace con nombres reales.
- [ ] Con `API_BASE_URL` configurado, la petición al gateway lleva `traceparent` y la traza aparece en Cloud Logging; con `API_BASE_URL` vacío no se envía `traceparent` a nadie.
- [ ] El código de soporte encuentra el evento. La exploratoria del sprint revisa un replay de dev (punto de la checklist).
- [ ] `tool/verificar.sh --apk` pasa en el devcontainer. Quitar el botón de prueba.

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
