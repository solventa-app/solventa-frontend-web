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

- **Web:** HU-W04 (bandeja y detalle de siniestros, asignar perito, confirmaciones con motivo de rechazo) y bienvenida/autorización de datos (M01-01 y M01-02).
- **Móvil:** HU-M01 (captura de documento, prueba de vida, verificación y resultado, activación de biometría) y HU-M04 (siniestro paramétrico: notificación push y pantalla de celebración). HU-M06 (geolocalización, 8 pantallas) es condicional.
- Regresión E2E web y móvil, documentación final, video y entrega.

## Decisiones del backend que afectan al frontend

| ID | Decisión | Efecto en el frontend |
|---|---|---|
| D-02 | Read-your-writes RISK → RATING | Ninguno directo: el backend garantiza que la oferta usa el perfil recién escrito |
| D-03 | Cobro antes o después de emitir (Sprint 2) | Decide si existe la pantalla de resultado del pago antes de emitir (W03) |
