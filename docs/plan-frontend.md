# Plan del frontend por sprint

Fuente: *Plan de Trabajo y Historias de Usuario del Sprint 1* (v1.1.0, semana 7) y `PlanningV1.2.xlsx` (documentos del curso, fuera de este repo). Prototipo: Figma, plano v21 (52 pantallas: 26 web y 26 móvil). Si el plan cambia, se actualiza este archivo en el mismo cambio.

- **Fechas (tentativas):** Sprint 1 del 12 al 25 de oct. de 2026; Sprint 2 del 26 de oct. al 8 de nov.; Sprint 3 del 9 al 29 de nov.
- **Regla de recorte:** si el Sprint 1 rinde < 22 pts se recorta desde el final (HU-M06, luego HU-M02, luego HU-M04). Las HU de prioridad HH no se recortan.

## Sprint 1 — web (HU-W01 y HU-W05): 12 pantallas

Catálogo en `apps/web/src/router/pantallas.ts` (fuente de verdad de rutas; una prueba comprueba que son exactamente estas 12).

| Pantalla | Ruta | Qué se construye | Criterios |
|---|---|---|---|
| G-01 | `/login` | Correo/contraseña, selector de rol (cliente / asesor comercial / operador), enlace al portal de socios API | — |
| G-02 | `/inicio` | Tarjeta "Nueva cotización" y cerrar sesión | — |
| G-02a | `/asesor` | Tarjeta "Nueva cotización para un cliente" (mismo formulario y flujo que el cliente) | CA-W01-11 |
| G-02b | `/operador` | Tarjetas "Siniestros" y "Conciliación de pagos" | CA-W05-01 |
| W01-01 | `/cotizacion` | Documento de identidad, datos del crédito, dirección del inmueble, checkbox Habeas Data / Open Finance-Open Data; **botón deshabilitado hasta consentir**. Envía titular (`documentoIdentidad`), `tipoDato`, `fuenteDatos` y `canal = WEB`; el consentimiento vence a los 30 días (`venceEn`) y, si está vencido o revocado (`CONSENTIMIENTO_NO_VIGENTE`), vuelve aquí con el checkbox desmarcado y aviso de re-autorización | CA-W01-01/02/08 |
| W01-02 | `/cotizacion/consulta` | Spinner y barra indeterminada mientras se consultan las fuentes | CA-W01-02 |
| W01-03a | `/cotizacion/oferta` | Prima, cobertura, desglose del score; continuar a suscripción o ver fuentes | CA-W01-03 |
| W01-03b | `/cotizacion/oferta-preliminar` | Banner "oferta preliminar", prima estimada (rango) | CA-W01-04 |
| W01-03c | `/cotizacion/error` | Mensaje de error, reintentar y hablar con un asesor. **Nunca un error 5xx crudo** (incluidos `502`/`503`/`504` del API Gateway, que se muestran como error reintentable) | CA-W01-05 |
| W01-04 | `/cotizacion/fuentes` | 5 filas (2 Open Finance + 3 Open Data) con badge de estado y fecha si es de caché | CA-W01-06 |
| W01-05 | `/cotizacion/asesor` | 3 canales (llamar / chatear / agendar) y confirmación con resumen del trámite | CA-W01-07 |
| W05-01 | `/operador/conciliacion` | Tabla por póliza (cobrando / cobrado / rechazado / pendiente), reintentar cobro con aviso; se recarga sola cada 30 s (sin botón nuevo: el prototipo no lo tiene) | CA-W05-01/02/05 |

Actividades de web del plan (equipo, horas): formulario de captura 2 h (T-W01-1), pantalla de consulta 1 h (T-W01-2), pantalla de resultado 3 h (T-W01-3), tabla de entidades externas 1 h (T-W01-5), back-office de cobros 2 h (T-W05-1) e integración con la pasarela de pago 3 h (T-W05-2). Total 12 h, la carga completa de la persona de web en el sprint.

Observaciones:

- Las pantallas globales (G-01, G-02, G-02a, G-02b) **no tienen actividad estimada** en el plan (riesgo R4: trabajo no estimado en la historia pivote). Se construyen con la holgura de 3 h del sprint o se recorta el detalle.
- La web depende del BFF, que aún no existe: se trabaja con **mocks** (`npm run web:dev:mock`) y se cambian por el BFF real cuando esté desplegado.
- W01-04 depende de W01-02; la oferta (W01-03a/b/c) depende de `solicitarOferta` del contrato.
- El desarrollador móvil no tiene pantallas en el Sprint 1: el plan le asigna tareas de backend (endpoint de datos de usuario, integración con Open Data, pruebas de contrato).
- **D-F1 (cerrada):** sin librería de componentes de terceros. Los componentes propios viven en `src/components/ui/` (contra la librería de Figma) y el estilo usa Twind (utilidades de Tailwind en tiempo de ejecución, tokens en `src/styles/twind.ts`).

## Sprint 2 (26 oct – 8 nov)

- **Web:** HU-W03 (oferta, contrato/firma, resultado del pago, notificación de firma, emisión de póliza, documento de póliza; el plano v21 **no tiene** la pantalla de resultado del pago, hay que crearla en Figma o ajustar la fila); HU-W07 (portal técnico del socio: login, panel de API key y cuota, documentación) y E2E de W01 a W03 con Cypress.
  - Revisado el 2026-10-17 en Figma `Solventa-web-Final`: W03-02b dice que la prima "se facturará junto con la cuota de tu crédito hipotecario" y que al confirmar la firma "se activa el cobro de la prima". Después vienen W03-03 Firma confirmada, W03-04 Póliza emitida y W03-05 Documento de póliza: **no hay pantalla de resultado del cobro ni se pide tarjeta**.
  - Antes de construir W03 hay que decidir (D-03): si el primer cobro va antes de emitir; qué pasa si sale rechazado o pendiente (¿se emite igual?); y diseñar la pantalla de resultado (cobrado, en proceso, rechazado). Detalle y preguntas en `solventa-backend/docs/cobros-conciliacion.md`, sección 10.
- **Móvil (arranca aquí):** esqueleto de la app Flutter (3 h) y home `G-03`; HU-M02 biometría nativa (lectura biométrica, no reconocida, ingreso con PIN, acceso concedido).

## Sprint 3 (9 – 29 nov)

- **Web:** HU-W04 (bandeja y detalle de siniestros, asignar perito, confirmaciones con motivo de rechazo) **ya construida en la web** (adelantada, ver "HU-W04" abajo) contra el dummy `stub-siniestros` del backend, solo en local; falta el servicio real y staging. Bienvenida/autorización de datos (M01-01 y M01-02).
- **Móvil:** HU-M01 (captura de documento, prueba de vida, verificación y resultado, activación de biometría) y HU-M04 (siniestro paramétrico: notificación push y pantalla de celebración). HU-M06 (geolocalización, 8 pantallas) es condicional.
- Regresión E2E web y móvil, documentación final, video y entrega.

## Decisiones del backend que afectan al frontend

| ID | Decisión | Efecto en el frontend |
|---|---|---|
| D-02 | Read-your-writes RISK → RATING | Ninguno directo: el backend garantiza que la oferta usa el perfil recién escrito |
| D-03 | Cobro antes o después de emitir (Sprint 2) | Decide si existe la pantalla de resultado del pago antes de emitir (W03) |

## HU-W04 — mesa de siniestros (KAN-27): 6 pantallas y un modal

Construida contra Figma `Solventa-web-Final` (sección HU-W04) y el dummy `stub-siniestros` del backend; desde KAN-247 la
consume del BFF real (`/v1/graphql/web` con token de BACKOFFICE, servicio CLAIMS). Plan y desvíos: [`plan-ejecucion-hu-w04-siniestros.md`](plan-ejecucion-hu-w04-siniestros.md). Rol: `BACKOFFICE`.

| Pantalla | Ruta | Qué se construye | Criterios |
|---|---|---|---|
| W04-01 | `/operador/siniestros` | Bandeja: tabla (cliente y radicado, fecha, estado con insignia, "Abrir"), chips Todos + 4 estados, total en cola de abiertos, pie "Mostrando X de Y", estados de carga, error con reintento y vacío | CA-W04-01 a 07 |
| W04-02 | `/operador/siniestros/:id` | Detalle: galería de evidencia (con degradado si una imagen no carga), datos del asegurado y del crédito, verificaciones SFC, plazo restante, acciones según el estado (aprobar, rechazar, derivar; perito asignado si está en revisión; solo lectura si está resuelto) y no encontrado | CA-W04-08 a 16 |
| Modal de rechazo | (dentro de W04-02) | Motivo obligatorio y comentario opcional con contador; accesible (foco atrapado, Escape, foco de regreso). No existe en Figma: especificación del diseñador | CA-W04-24 a 26 |
| W04-02b | `/operador/siniestros/:id/derivar` | Elegir perito (sin preselección), tiempo estimado, instrucciones con contador, confirmar/cancelar; sin formulario si ya está derivado o resuelto | CA-W04-17 a 22 |
| W04-03a | `/operador/siniestros/:id/aprobado` | Confirmación de aprobación: indemnización en es-CO, método y plazo; estado vacío por URL directa | CA-W04-28, 29 |
| W04-03b | `/operador/siniestros/:id/rechazado` | Confirmación de rechazo: motivo, comentario, fecha y vía de recurso; estado vacío por URL directa | CA-W04-27, 29 |
| W04-03c | `/operador/siniestros/:id/derivado` | Confirmación de derivación: radicado, perito con ciudad, tiempo con fecha límite y notificación; estado vacío por URL directa | CA-W04-23, 29 |

### Criterios CA-W04 (propuestos)

**Propuestos:** derivados de Figma y de lo construido; falta validarlos contra Jira (KAN-27).

- CA-W04-01: la bandeja lista los siniestros asignados a la mesa con cliente, radicado, fecha de notificación y estado.
- CA-W04-02: el estado se muestra con insignia (ícono y texto), nunca solo con color.
- CA-W04-03: los chips filtran por Todos, Pendiente, En revisión, Aprobado y Rechazado, y el chip activo se anuncia (`aria-pressed`).
- CA-W04-04: "Total en cola" cuenta solo los casos abiertos (pendientes y en revisión).
- CA-W04-05: el pie indica cuántos siniestros se muestran del total según el filtro.
- CA-W04-06: "Abrir" lleva al detalle del siniestro por su identificador.
- CA-W04-07: hay estados de carga, error con reintento (sin errores técnicos ni 5xx), vacío y vacío por filtro.
- CA-W04-08: el detalle muestra la galería de evidencia con su etiqueta y la marca "Geoetiquetada" cuando aplica.
- CA-W04-09: si una imagen no carga, se muestra un estado degradado en lugar de la imagen rota.
- CA-W04-10: el detalle muestra los datos del asegurado, del crédito y la suma asegurada en es-CO.
- CA-W04-11: el detalle muestra las verificaciones SFC con su resultado en texto e ícono ("Cumple" / "No cumple").
- CA-W04-12: el detalle muestra el tiempo restante del plazo de respuesta.
- CA-W04-13: un siniestro pendiente ofrece Aprobar (único botón primario), Rechazar y Derivar a perito.
- CA-W04-14: un siniestro en revisión derivado muestra el perito asignado.
- CA-W04-15: un siniestro resuelto (aprobado o rechazado) se muestra en solo lectura con su resolución.
- CA-W04-16: un identificador inexistente muestra "no encontrado" con regreso a la bandeja.
- CA-W04-17: derivar exige elegir un perito; no hay preselección y Confirmar está deshabilitado hasta elegirlo.
- CA-W04-18: al elegir perito se muestra su tiempo estimado de respuesta.
- CA-W04-19: las instrucciones al perito son opcionales, con contador de caracteres (máximo 500).
- CA-W04-20: Cancelar vuelve al detalle sin cambios.
- CA-W04-21: un siniestro ya derivado o resuelto no admite una nueva derivación (sin formulario, con explicación).
- CA-W04-22: los peritos tienen estados de carga, vacío y error.
- CA-W04-23: tras derivar se confirma con radicado, perito y ciudad, tiempo con fecha límite y notificación; el caso queda en revisión.
- CA-W04-24: Rechazar abre un modal que exige el motivo; el botón de confirmar está deshabilitado sin motivo.
- CA-W04-25: el modal admite un comentario opcional con contador de caracteres.
- CA-W04-26: el modal es accesible por teclado (foco inicial, trampa de foco, Escape) y devuelve el foco a Rechazar al cerrarse.
- CA-W04-27: tras rechazar se confirma con el motivo, el comentario, la fecha y la vía de recurso; el caso queda rechazado.
- CA-W04-28: tras aprobar se confirma con la indemnización en es-CO, el método de transferencia y el plazo; el caso queda aprobado.
- CA-W04-29: las confirmaciones solo existen tras la acción en la misma sesión; por URL directa muestran un estado vacío con "Volver a la bandeja".

## HU-W07 — portal de socios (KAN-30): 3 pantallas más el estado del sistema

Plan, decisiones y estado: [`plan-hu-w07-front.md`](plan-hu-w07-front.md). Figma `Solventa-web-Final`: W07-01 `2001:3340`,
W07-02 `2001:3562`, W07-03 `2001:3434`; W07-04 no tiene frame (aprobado sin Figma). Contrato: borrador local
`contrato/borrador-socios-v1.yaml` hasta que el backend publique `socios-v1.yaml`. Los criterios CA-W07 se proponen con
cada pantalla.

| Pantalla | Ruta | Qué se construye | Acceso |
|---|---|---|---|
| W07-01 | `/socios/ingreso` | Login técnico con ID de socio y clave de producción (plantilla de G-01); CA-W07-01 a 04 | Público |
| W07-02 | `/socios/panel` | Credenciales, consumo y estado por entorno; consumo por API y ventas y comisiones; CA-W07-05 a 10 | Sesión del socio |
| W07-03 | `/socios/documentacion` | Guía en PDF y Swagger de pruebas y de producción, en pestañas; CA-W07-11 a 13 | Sesión del socio |
| W07-04 | `/operador/estado` | Estado del sistema por micro y por API externa; CA-W07-14 y 15 | `BACKOFFICE` |

**Criterios propuestos de HU-W07** (se validan contra Jira, KAN-30):

| Criterio | Pantalla | Qué se cumple |
|---|---|---|
| CA-W07-01 | W07-01 | «Ingresar» queda deshabilitado hasta llenar el ID de socio y la clave; con la clave de producción entra al panel |
| CA-W07-02 | W07-01 | Con credenciales incorrectas se ve un mensaje genérico (no dice cuál falló) y se limpia la clave; el bloqueo por intentos muestra su propio mensaje |
| CA-W07-03 | W07-01 | Con la clave de pruebas no se entra al portal y se explica que se usa la de producción (W07-3) |
| CA-W07-04 | W07-01 | Si la sesión técnica vence, el portal vuelve al ingreso con el aviso «Tu sesión técnica venció»; el token se borra al cerrar sesión |
| CA-W07-05 | W07-02 | Las credenciales son las del entorno elegido: el ID de socio y la clave enmascarada, con «Mostrar» y «Copiar» |
| CA-W07-06 | W07-02 | «Regenerar» pide confirmación con el aviso de que la clave actual deja de funcionar; al confirmar, la clave nueva se muestra con «Copiar» |
| CA-W07-07 | W07-02 | «Generar token» muestra el token de 15 minutos con su cuenta regresiva y, al vencer, pide generar otro |
| CA-W07-08 | W07-02 | El consumo muestra las cotizaciones contra el presupuesto (usadas, % y disponibles) y «Lo recarga Solventa»; agotado, la tarjeta pasa a alerta con el 429 |
| CA-W07-09 | W07-02 | El estado muestra «Operativo», «Degradado» o «Con fallas» con ícono y texto, la salud general, la latencia y la disponibilidad (o «Sin tráfico en la ventana»), Cotización y Emisión, sin nombres de micros internos, y cambia con la ventana |
| CA-W07-10 | W07-02 | El consumo por API (gráfico de cotizaciones por día y tabla) y las ventas y comisiones (indicadores y tabla por mes, montos en pesos) siguen al entorno; en pruebas se marcan como «Datos simulados». Una sección que falla muestra su error con reintento sin ocultar las demás; un 401 vuelve al ingreso con el aviso |
| CA-W07-11 | W07-03 | La documentación abre en «Guía de integración» (no en la que cuesta) con el PDF en el idioma activo, «Abrir en otra pestaña» y «Descargar»; si el PDF no está o el navegador no lo muestra, se dice; la pestaña activa va en la URL |
| CA-W07-12 | W07-03 | «Pruebas (sandbox)» muestra el Swagger del contrato con el token de pruebas, el distintivo «Entorno: Sandbox» y los documentos de prueba con el código 000000 |
| CA-W07-13 | W07-03 | «Producción» muestra el Swagger con el token de producción, el distintivo en alerta y el aviso fijo de que probar cotizaciones descuenta presupuesto real |
| CA-W07-14 | W07-04 | El operador llega desde la tarjeta «Estado del sistema» de G-02b y ve la caja de estado con la ventana, la tabla por servicio (peso, salud, disponibilidad o «sin tráfico», latencia media, p95 y si responde `/health`) y las APIs externas con su circuito, siempre con texto y no solo color |
| CA-W07-15 | W07-04 | La pantalla se recarga sola cada 30 s sin «Cargando…»; si una recarga falla conserva los datos, y si falla al entrar muestra el error con reintento, nunca un 5xx |
