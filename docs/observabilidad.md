# Logs y reporte de errores

Cómo se registra lo que pasa en la app mientras se desarrolla, qué pasa cuando un usuario tiene un error en producción y cómo se reproduce, con captura o video de lo que falló. Está **implementado** tanto en mobile (`lib/core/log/sol_log.dart`, `lib/core/log/limpiar.dart`, `SentryMask` y subida de símbolos en CD) como en web (`apps/web/src/log.ts`, `apps/web/src/observabilidad/limpiar.ts`, `sentry-block` y plugin de Vite) con la organización `uniandes-xm` (`run code: b78bb726f4`). El detalle paso a paso está en [`plan-sentry.md`](plan-sentry.md).

Reglas que no cambian:

- **Sin datos personales** en logs, breadcrumbs, capturas, videos ni reportes: nada de documento, nombre, correo, teléfono, montos asociados a una persona, datos de pago, tokens ni ubicación exacta. Se registran identificadores opacos (id de póliza, id de siniestro) y la pantalla.
- Ningún error técnico se muestra al usuario: ve un mensaje amable y un **código de soporte**.
- `print` está prohibido (`avoid_print` de `flutter_lints` ya lo marca y el CI falla).

## Conceptos

| Término | Qué es |
|---|---|
| Servicio de reporte de errores | Un servicio en la nube que recibe automáticamente cada error de la app de los usuarios, con el detalle técnico, el dispositivo y lo que el usuario hizo antes. Lo agrupa y avisa por correo |
| Sentry | El servicio de reporte de errores más usado. Tiene SDK para Flutter y para Vue, y además graba **capturas y video (Session Replay)** de lo que pasó antes del error |
| GlitchTip | Alternativa open source a Sentry, compatible con su SDK. Más simple: no tiene Session Replay |
| Firebase Crashlytics | El reporte de errores de Firebase, solo para apps móviles. Gratis y sin cuota, pero **no** guarda capturas ni video |
| Breadcrumbs | Los últimos pasos antes del error (pantallas, toques, peticiones), como migas de pan |
| `traceparent` | Un encabezado estándar (W3C) que la app agrega a cada petición al backend con un id único de esa operación. El backend ya usa OpenTelemetry y escribe ese id en todos sus logs de Cloud Logging, así que con el id se ve qué hizo cada servicio en esa operación |
| Código de soporte | Los primeros 8 caracteres de ese id, mostrados en la pantalla de error. El usuario lo dicta o lo copia, y con él se encuentra su reporte en Sentry y la traza del backend |

## Decisión: Sentry en mobile y en web

**Decidido el 25 de octubre de 2026** (felipe) e **implementado en mobile y web** (organización `uniandes-xm`). Un solo servicio para los dos canales, con capturas y video en ambos, en vez de Crashlytics en mobile (sin video) y otro servicio en web. Comparación que llevó a la decisión:

| | Sentry (mobile y web) | Crashlytics (mobile) + Sentry (web) |
|---|---|---|
| Captura del error y breadcrumbs | Sí | Sí |
| Captura de pantalla al fallar | Sí (`attachScreenshot` en Flutter) | Solo en web |
| Video de lo que pasó antes (Session Replay) | Sí, en Flutter (Android) y en web | Solo en web |
| Un solo lugar para buscar por código de soporte | Sí | No: dos consolas |
| `traceparent` hacia el backend | Lo agrega el SDK solo | Hay que agregarlo a mano en mobile |
| Costo | Plan gratuito con cuotas mensuales de errores y de replays, y pocos usuarios del equipo. Verificar los límites vigentes al crear la cuenta; si el plan gratis no alcanza, el GitHub Student Developer Pack ha incluido Sentry con más cuota (verificar) | Crashlytics sin límite; Sentry web con las mismas cuotas |

Para no gastar la cuota de replays, el video se guarda solo cuando hay un error (`onErrorSampleRate: 1.0`, `sessionSampleRate: 0`), no de cada sesión.

### Capturas y video sin datos sensibles

| Medida | Cómo |
|---|---|
| Enmascarar todo por defecto | Session Replay de Sentry tapa por defecto todo el texto y las imágenes (`maskAllText`, `maskAllImages`). Se deja así: en el video se ven las pantallas, los botones y los toques, no los datos |
| Pantallas sin captura ni video | Formularios de pago, documento de identidad, cámara de evidencia y billetera: se excluyen del replay y de `attachScreenshot` |
| Campos de texto | Nunca se registra lo que el usuario escribe, solo que tocó el campo |
| Prueba | Antes de activarlo en prod, una sesión de la exploratoria revisa un replay de dev para confirmar que no se ve ningún dato |

## Logs mientras se desarrolla

| Qué | Cómo |
|---|---|
| Librería | `package:logging` (oficial de Dart, liviana) envuelta en una clase `SolLog` en `lib/core/log/` |
| Niveles | `fine` (detalle), `info` (pasos del flujo), `warning` (algo raro pero recuperable), `severe` (error) |
| En dev (`flutter run`, flavor dev) | Todos los niveles a la consola de VS Code / `flutter logs`, con hora, pantalla y nivel |
| En prod | Nada a la consola. `info` y `warning` quedan como breadcrumbs en Sentry; `severe` se envía como error |
| Datos personales | `SolLog` recibe solo campos permitidos; un test verifica que no pasan documento, correo ni token |

## Errores en producción (mobile)

| Pieza | Cómo |
|---|---|
| Captura | `SentryFlutter.init` en `main.dart` captura errores de widgets, errores asíncronos no manejados y cierres nativos de Android |
| Por ambiente | `environment: dev` o `prod` según el flavor; en dev se puede apagar el envío |
| Contexto de cada reporte | Versión y build, pantalla actual, `traceId`. Usuario: un id opaco, nunca el documento |
| Código ofuscado | El CD sube los símbolos de `--split-debug-info` a Sentry (`sentry_dart_plugin`), así los stack traces de prod se leen |
| Alertas | Correo cuando aparece un error nuevo o uno se dispara |

## Cómo se reproduce un error de un usuario

1. El usuario ve la pantalla de error con su código de soporte (por ejemplo `4bf92f35`).
2. En Sentry se busca por ese código: aparece el error, el dispositivo, la versión, los breadcrumbs, la captura y el video enmascarado de los segundos anteriores.
3. En Cloud Logging / Cloud Trace se busca la misma traza: qué servicio del backend falló y por qué.
4. Se reproduce en el emulador con la misma versión (el Release guarda el APK) siguiendo el video y los breadcrumbs.
5. El arreglo agrega una prueba que cubre ese caso.

## Alineado con el web (propuesta para `solventa-frontend-web`)

| Pieza | Mobile | Web |
|---|---|---|
| Logs en desarrollo | `SolLog` sobre `package:logging` | Un `log.ts` con niveles; `console` solo en desarrollo y regla `no-console` de ESLint |
| Captura global | SDK de Sentry para Flutter | SDK de Sentry para Vue (`app.config.errorHandler`, `window.onerror`, `unhandledrejection`) |
| Captura y video | `attachScreenshot` + Session Replay | Session Replay |
| Correlación con el backend | `traceparent` y código de soporte | Lo mismo |
| Datos personales | Enmascarado total, pantallas sensibles excluidas | Lo mismo, más `sendDefaultPii: false` y `beforeSend` que limpia campos |
| Proyectos en Sentry | `solventa-mobile` | `solventa-web` (misma organización) |

## Cómo encaja con la estrategia y la arquitectura

- Estrategia de Pruebas v4: cumple la trazabilidad y la gestión de evidencias (un error de producción queda con fecha, dispositivo, pasos y captura), y alimenta los hallazgos de cada sprint.
- Arquitectura: el backend sigue en Cloud Logging, Cloud Trace y Cloud Monitoring; el `traceparent` une los canales con esas trazas. Sentry solo cubre lo que pasa dentro de la app y del navegador.
- No reemplaza la sesión exploratoria ni las pruebas: sirve para lo que se escapa a producción.

## Lo que hay que configurar a mano

- Crear la organización en Sentry (revisar si aplica el GitHub Student Developer Pack) con los proyectos `solventa-mobile` y `solventa-web`.
- Guardar como secretos: el DSN de cada proyecto (no es secreto, pero va por ambiente) y el token para subir símbolos y source maps (`SENTRY_AUTH_TOKEN`).
- Alternativa sin video: Crashlytics en mobile (gratis, sin cuota) y GlitchTip o Sentry en web. Se documenta por si el plan gratis de Sentry no alcanza.
