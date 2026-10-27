# Plan del front: HU-W03 completa y ajustes de W01-01 y W05-01 (solo front, con mocks)

> **Estado (2026-10-27): pasos 1 a 11 construidos con mocks en `feat/KAN-26-w03-front-mocks`, sin commit.** D-1 y D-3
> aprobadas (D-3 con la condición de minimizar el almacenamiento del token: memoria primero y `sessionStorage` solo como
> puente de la pasarela, ver `useEnlaceFirma.ts`). Verificado: typecheck, lint, Vitest 343, build y Cypress
> `w03-suscripcion.cy.ts` (6/6). Desviaciones frente a este plan: la evidencia `docs/evidencias/HU-W03-web-<fecha>.md` del
> paso 10 no se escribió; el token se quita del fragmento al leerlo (más estricto que «conservar el hash»), así que al
> recargar el cliente vuelve a abrir el enlace; W05-01 no suma filas al mock (los 4 cobros llevan origen y medio) para no
> romper las pruebas atadas a «4 cobros». Cubre las tareas de frontend asignadas a f.taboada en Jira y los
> ajustes del front que salieron de la revisión de HU-W07. **HU-W07 (portal de socios) queda fuera**: está asignada a
> Daniel Urrego (KAN-121 a 123, KAN-222) y su plan es `docs/plan-w01-w05-w07-front.md`.
>
> **Pedido:** «front solito, sin consumir APIs». Todo se construye y se prueba con **MSW** (`dev:mock` y Vitest), con
> las operaciones y los nombres que fija el backend. Conectar el BFF real queda para cuando el backend publique la v0.17
> y la despliegue; no forma parte de este plan.
>
> Fuentes y orden de precedencia (si chocan, ganan las primeras y se corrige este documento):
> 1. Bloque 9 de `../solventa-backend/docs/plan-completar-hu-w03.md` (decisiones W03-19 a W03-31 y los CA propuestos).
> 2. `../solventa-backend/docs/plan-hu-w07-y-ajustes.md`, secciones 1 y 5.2 (rama `chore/KAN-30-plan-w07-y-ajustes`).
> 3. `docs/plan-w01-w05-w07-front.md`, secciones 1, 3 y 4 (rama `chore/KAN-30-plan-w03-w07-front`).
> 4. Figma `Solventa-web-Final` (`yKWD8jrwERtJkuSj0mk0Gz`), revisado el 2026-10-27.

**Base de trabajo:** `origin/develop` (W04 ya mezclado). **No** `main` ni la rama `hotfix/KAN-28-…`, que están atrás.

---

## 0. Qué cubre (mapa con Jira)

| Clave | Tarea en Jira | Qué cubre este plan | Paso |
|---|---|---|---|
| KAN-209 | S2-W03-1 · Aceptar la oferta COMPLETA (W03-01) | W03-01, aceptar con contacto, D-11 (preliminar → recalcular) | 3 |
| KAN-152 | W03-01 · Revisar oferta aceptada | Pantalla W03-01 | 3 |
| — (nueva) | Modal del asesor | Código por correo, «Emitir», «Reenviar enlace», resultado de UNDER | 4 |
| KAN-210 / KAN-153 | Firma electrónica (W03-02a) | Página del enlace: contrato en PDF, términos, firma en 3 modos, estado vacío | 5 |
| KAN-210 / KAN-172 | W03-02b · Confirmar firma y autorización de cobro | Textos corregidos, sin migas ni perfil | 6 |
| KAN-214 / KAN-154 | W03-03 · Firma confirmada | «Ir al inicio» → «Pagar» | 7 |
| — (nueva) | Retorno de la pasarela | `/pago/retorno`: confirmar, reintentar, otra tarjeta, reabrir | 8 |
| KAN-214 / KAN-155 | W03-04 · Póliza emitida | PDF en pestaña nueva con el token del enlace | 9 |
| KAN-157 | W03-05 · Documento de póliza | **No se construye** (W03-31). Cerrar en Jira con esa nota | — |
| KAN-240 | S2-W03-9 · Brechas | Parte de front: preliminar → recalcular (paso 3), firma sin 5xx (`ErrorFirma` con reintento, paso 6) | 3, 6 |
| KAN-241 | S2-W03-10 · Aviso con PDF | Parte de front: texto de W03-04 «también te llega al correo» (paso 9). Lo demás es backend | 9 |
| KAN-216 | S2-W03-8 · Pruebas (Cypress de W01 a W03) | Solo la parte web: Cypress con mocks. k6 y Newman son del backend | 10 |
| KAN-24 (nueva tarea) | W01-01 · campos del ASESOR | Nombre y correo del cliente solo para ASESOR | 2 |
| KAN-28 (nueva tarea) | W05-01 · medio de pago | Columna «Medio de pago» y acciones por origen | 11 |
| — | Registro de CLIENTE con cédula y correo | **No se construye aquí**: no hay pantalla de alta de usuarios en la web ni frame en Figma (regla 3). Ver D-7 | — |

---

## 1. Pantallas de Figma y lo que se toma de cada una

Revisadas con capturas el 2026-10-27. Regla del plan del front: **lo implementado manda sobre el prototipo** en los
patrones (`*`, ejemplos, botón gris hasta ser válido, estados de carga/vacío/error); las decisiones de W03-31 mandan
sobre los textos.

| Pantalla | Nodo | Qué se conserva | Qué cambia (decisión) |
|---|---|---|---|
| **W03-01** Revisar oferta aceptada | `2001:1704` | Encabezado, migas «Inicio › Suscripción», tarjeta con ícono de documento + «Tipo de producto», distintivo verde «Oferta aprobada y lista para firma», caja beige con prima mensual (grande, `primario`) y cobertura (a la derecha, con «100% amparo saldo insoluto»), filas con ícono: plazo, score (`perfilRiesgo.score` / 850), fecha de cotización, caja de alerta con la Ley 527, botón primario «Aceptar y continuar →», enlace «Ver detalle de fuentes consultadas» (W01-04) | **«Entidad beneficiaria onerosa»** se quita: el contrato no tiene ese dato (no se inventa). «Fecha de cotización» sale de `perfilRiesgo.fechaVigencia` si el backend confirma que es la misma; si no, se quita. «Aceptar y continuar» acepta y abre el **modal del asesor** |
| **Modal del asesor** | *sin Figma* | Patrón de `ModalCerrarSesion` (G-04) y `ModalRechazo` (W04): `role="dialog"`, trampa de foco, Escape, velo | Pasos y textos en el paso 4. Aprobado sin Figma por el plan principal (5.2) |
| **W03-02** Firma electrónica | `2001:1832` | Título «Firma tu póliza» y subtítulo, distintivo arriba a la derecha, tarjeta del contrato (ícono, título, radicado, fecha), caja beige «Cláusula de no retracto forzado», casilla de aceptación, botón «Firmar» con ícono, nota con candado al pie | **Sin perfil ni migas** (`HeaderPantalla sinPerfil`). El contrato es un **PDF embebido** (`<iframe>`) con el resumen legible al lado o debajo (CA-W03-02), no las cláusulas escritas a mano. El distintivo dice «Identidad verificada con código». **Bloque nuevo de firma en tres modos** entre el contrato y la casilla (paso 5). Estado vacío de enlace vencido |
| **W03-02b** Confirmar firma | `2020:32` | Título, caja de alerta con «Al firmar autorizas un cobro recurrente» y el monto grande, «Qué ocurre al confirmar», botón primario «Sí, firmar y autorizar el cobro» y secundario «Volver al contrato» | **Sin perfil ni migas.** Textos corregidos (W03-31): ya no «junto con la cuota de tu crédito» sino **«con la tarjeta de crédito o débito que elijas en el siguiente paso, durante N meses»**; «Qué ocurre»: firma registrada → pagas la primera prima → **al confirmarse el pago se emite la póliza** y te llega el documento al correo |
| **W03-03** Firma confirmada | `2001:1969` | Tarjeta centrada con ícono verde, «Tu firma quedó registrada», caja gris con radicado, estampa de tiempo y estado «Firmado electrónicamente» | **Sin perfil ni migas.** Se quitan «Validación biométrica aprobada», «en segundo plano» y «avanza automáticamente…». «Ir al inicio» pasa a **«Pagar»** (primario, ícono `credit_card`). Texto: «Ahora paga la primera prima para emitir tu póliza» |
| **Retorno de la pasarela** | *sin Figma* | Misma tarjeta centrada de W03-03 | Estados en el paso 8. Aprobado sin Figma (plan principal 5.2) |
| **W03-04** Póliza emitida | `2001:2057` | Tarjeta centrada con ícono de verificado, «Tu póliza fue emitida», número de póliza en `enlace`, «Emitida el … · Vigencia desde …», botón primario «Descargar documento» con ícono | **Sin perfil ni migas** (es la página del enlace). Se quita «Ir al inicio». «Descargar documento» abre el PDF **en una pestaña nueva**. Se quita «Ver detalle de fuentes» (D-6). La nota gris dice «También te enviamos el documento a tu correo» |
| W03-05 Documento de póliza | `2001:2128` | — | **No se construye** |
| **W01-01** Solicitud y consentimiento | `2001:1016` | Lo implementado | Campos del ASESOR (paso 2), sin Figma, con los `CampoFormulario` existentes |
| **W05-01** Conciliación de pagos | `2001:3156` | Lo implementado | Columna «Medio de pago» (paso 11), sin Figma |

**Librería:** no hace falta ningún componente nuevo en `src/components/ui/`. Las piezas nuevas van en
`src/components/` (como `ModalRechazo.vue` y `TarjetaConfirmacion.vue` de W04): `ModalVerificacionAsesor.vue`,
`FirmaTresModos.vue` y, si W03-03, el retorno y W03-04 comparten la tarjeta centrada, se reutiliza
`TarjetaConfirmacion.vue` de W04 antes de crear otra (revisarla en el paso 7).

**Íconos nuevos en `IconoMaterial.vue`** (Material Symbols Outlined, cada uno con su uso al lado):
`description` (documento, W03-01/02), `account_balance` (banco), `leaderboard` (score), `event_available` (fecha),
`mail` (correo del modal y de W01-01), `draw` (firmar y modo trazo), `upload` (modo imagen), `text_fields` (modo nombre),
`credit_card` («Pagar»), `verified` (W03-04), `download` y `open_in_new` (PDF). Ya existen: `person`, `schedule`,
`check_circle`, `verified_user`, `info`, `warning`, `lock`, `refresh`, `arrow_forward`, `timer`, `send`, `event`.

---

## 2. Cómo se trabaja «solo front» (la decisión que sostiene todo)

### 2.1 El contrato

| Qué | Situación (2026-10-27) | Qué se hace |
|---|---|---|
| `contrato/schema.graphql` | La copia de `develop` está en **v0.10** | **Paso 1:** sincronizar con la **v0.16** de `solventa-backend/develop` (ya trae `Propuesta`, `aceptarOferta`, `documentoFirma`, `firmarPropuesta`, `poliza`, `tieneContacto`). Es una copia legítima (regla 1) |
| Lo de la v0.17 (contacto, código, emitir, enlace, pago, `Cobro.origen/medio`) | **No está publicado** | **Esquema borrador aparte** (D-1): `contrato/borrador-v0.17.graphql`, con `extend type` / `extend input` sobre la v0.16 y **los nombres exactos del bloque 9**. Codegen lo genera en `src/graphql/tipos-borrador.ts` (mismo patrón que `contrato/siniestros.graphql` de W04). Al publicarse la v0.17: se borra el borrador, se regenera `tipos.ts` y se cambian los `import` |

Operaciones del borrador (copiadas del bloque 9, fila 1 de «Qué cambia, por servicio»):

```graphql
# contrato/borrador-v0.17.graphql — BORRADOR LOCAL, se borra al publicarse la v0.17 del backend.
input ContactoTitularInput { nombre: String!  correo: String! }
extend enum EstadoPropuesta { IDENTIDAD_VERIFICADA  EN_FIRMA  FIRMADA  CANCELADA }
extend input CrearUsuarioInput { documentoIdentidad: String }
extend type Cobro { origen: OrigenCobro  medio: MedioPago }
enum OrigenCobro { INTERACTIVO  RECURRENTE }
type MedioPago { marca: String!  tipo: TipoMedioPago! }       # nunca número ni últimos dígitos
enum TipoMedioPago { CREDITO  DEBITO }
# Asesor (con sesión)
extend type Mutation {
  # `aceptarOferta(ofertaId, contacto: ContactoTitularInput)`: argumento opcional nuevo (ver la nota de abajo)
  enviarCodigoVerificacion(propuestaId: ID!, correo: String): ResultadoCodigo!
  verificarCodigo(propuestaId: ID!, codigo: String!): ResultadoVerificacion!
  emitirPropuesta(propuestaId: ID!): ResultadoEmision!
  reenviarEnlaceFirma(propuestaId: ID!): ResultadoEmision!
  # Enlace (sin sesión, token en X-Enlace-Firma)
  firmarPorEnlace(entrada: FirmarPorEnlaceInput!): ResultadoFirma!
  iniciarPago: ResultadoInicioPago!
  confirmarPago(sesionId: ID!): ResultadoPago!
}
extend type Query { firmaPorEnlace: EstadoEnlace }
```

> Los tipos de resultado (`ResultadoCodigo`, `ResultadoEmision`, `EstadoEnlace`, `ResultadoPago`, …) **los inventa este
> borrador** porque el bloque 9 solo nombra las operaciones. Se escriben como uniones `Tipo | Error…` con `mensaje` y
> `puedeReintentar`, como el resto del contrato, y **se avisan al backend** (contract-keeper) para que la v0.17 los tome
> o los corrija. Un `aceptarOferta` con argumento nuevo no se puede declarar con `extend`: el borrador redeclara la
> mutación completa en un `schema` combinado solo para codegen.

### 2.2 Los mocks

- Todo en MSW, en archivos aparte para no crecer `handlers.ts`: **`src/mocks/suscripcion.ts`** (W03, asesor y enlace)
  y los cobros nuevos en `handlers.ts` (W05). Se registran en `mocks/browser.ts` **y** `mocks/node.ts`: a diferencia de
  W04, aquí no hay dummy del backend, así que `dev:mock` también los usa.
- Estado en memoria del mock (propuestas, códigos, enlaces, sesiones de pago), como `cobrosIniciales()` de W05.
- **Convenciones de demo** (como «documento terminado en 999», **no son del backend real**; se documentan en el
  encabezado de `suscripcion.ts` y en `docs/convenciones.md`):

| Dónde | Valor | Resultado |
|---|---|---|
| Código de verificación | `000000` | Válido |
| Código de verificación | cualquier otro | Inválido; al 5.º intento, bloqueado («pide otro código») |
| Código de verificación | `999999` | Vencido |
| Correo del cliente (al emitir) | termina en `@revision.test` | UNDER → `EN_REVISION` (sin enlace) |
| Correo del cliente (al emitir) | termina en `@rechazo.test` | UNDER → `NO_EMITIDA` (sin enlace) |
| Correo del cliente | cualquier otro | Aprobada → se «envía» el enlace (`EN_FIRMA`) |
| Token del enlace | `demo` | Enlace vigente, en `EN_FIRMA` |
| Token del enlace | `vencido` | Estado vacío «Este enlace venció» |
| Token del enlace | `firmado` / `emitido` | Retoma en W03-03 / W03-04 |
| Tarjeta en la pasarela simulada | `4242 4242 4242 4242` | Crédito Visa, aprobada |
| Tarjeta | `5555 5555 5555 4444` | Débito Mastercard, aprobada |
| Tarjeta | `4000 0000 0000 0002` | Rechazada: fondos insuficientes |
| Tarjeta | `4000 0000 0000 0069` | Rechazada: tarjeta vencida |
| Tarjeta | `4000 0000 0000 0119` | Falla la pasarela (cuenta para el 3.er fallo) |

(Las tarjetas son las mismas del stub del backend, sección 2.2 del plan principal.)

### 2.3 Lo que en real hace el backend y aquí se simula (D-5)

Dos rutas **solo de `dev:mock`**, fuera de `pantallas.ts`, registradas en el router con
`if (import.meta.env.MODE === 'mock')` e importación dinámica (no entran al `build` de producción):

| Ruta | Simula | Contenido |
|---|---|---|
| `/dev/correo` | El buzón del cliente | Lista lo que el mock «envió»: códigos de verificación y enlaces de firma (con su botón «Abrir enlace»). Permite hacer la demo y el Cypress sin servidor de correo |
| `/dev/pasarela/:sesion` | La página de pago del stub (8103) | Formulario mínimo (crédito/débito, número, nombre, vencimiento, CVV), la tabla de tarjetas de prueba, «Pagando…» y «Regresar al comercio» → `/pago/retorno?sesion=…`. Con el aviso fijo «Pasarela simulada (solo desarrollo)». **No usa la marca de Solventa** |

---

## 3. Flujo que se construye

```
W01-01 (ASESOR) ─ nombre y correo del cliente en memoria (paso 2)
W01-03a «Continuar a suscripción» ─► W03-01 /suscripcion/:ofertaId
W03-01 «Aceptar y continuar» ─► aceptarOferta(ofertaId, contacto) ─► Propuesta ACEPTADA
     └─ abre ModalVerificacionAsesor
         enviarCodigoVerificacion ─► verificarCodigo ─► IDENTIDAD_VERIFICADA ─► «Emitir»
         emitirPropuesta ─┬─ EN_FIRMA: «Enlace enviado a c•••@correo.com, vence en 30 min» + «Reenviar enlace»
                          └─ EN_REVISION / NO_EMITIDA: mensajeEstado + accionSugerida
(/dev/correo) ─► /firma#t=…  (público, sin perfil ni migas)
W03-02  /firma            firmaPorEnlace ─► PDF + resumen + términos + firma (trazo | imagen | nombre) ─► «Firmar»
W03-02b /firma/confirmar  firmarPorEnlace ─► FIRMADA
W03-03  /firma/confirmada «Pagar» ─► iniciarPago ─► (/dev/pasarela/:sesion)
Retorno /pago/retorno?sesion=…  confirmarPago ─┬─ EMITIDA ─► W03-04
                                               ├─ rechazo ─► «Pagar con otra tarjeta» (iniciarPago de nuevo)
                                               ├─ falla ─► «Reintentar» (al 3.er fallo seguido: otra tarjeta)
                                               └─ sesión vencida ─► «Volver a abrir el pago»
W03-04  /firma/poliza     «Descargar documento» ─► PDF en pestaña nueva
```

Cualquier ruta del enlace llama primero a `firmaPorEnlace` y **retoma donde iba** según el estado
(`EN_FIRMA` → W03-02, `FIRMADA` → W03-03, `EMITIDA` → W03-04, vencido → estado vacío).

---

## 4. Pasos (cada uno es un PR a `develop`)

Verificación de **todos** los pasos, con la salida a la vista: en `apps/web`, `npm run typecheck`, `npm run lint`,
`npm run formato:verificar`, `npm test` y `npm run build`; la pantalla vista en el navegador con `npm run dev:mock`
(escritorio y 375 px). Rama `feat/KAN-26-…` o `feat/KAN-24-…` según la historia; commits en español con la clave.

### Paso 1 · Contrato v0.16 y esquema borrador (KAN-26) — agente `contract-consumer`

| Archivo | Cambio |
|---|---|
| `contrato/schema.graphql`, `contrato/CHANGELOG.md` | Copia de `solventa-backend/develop:contracts/graphql/schema.graphql` (v0.16) |
| `apps/web/src/graphql/tipos.ts` | `npm run codegen` |
| `contrato/borrador-v0.17.graphql` (nuevo) | Sección 2.1, con el encabezado «BORRADOR LOCAL» |
| `apps/web/codegen.ts` | Salida `src/graphql/tipos-borrador.ts` desde `[schema.graphql, borrador-v0.17.graphql]` |
| `apps/web/src/mocks/handlers.ts` | Ajustes que pida la v0.11–v0.16 (revisar el CHANGELOG del backend; p. ej. `tieneContacto` en `Usuario` de `iniciarSesion` y `yo`) |
| `contrato/README.md` | Una línea: qué es el borrador y cuándo se borra |

**Hecho cuando:** codegen sin diferencias, los 5 comandos en verde y `dev:mock` de W01 y W05 sin cambios visibles.

### Paso 2 · W01-01: nombre y correo del cliente solo para el ASESOR (KAN-24)

Es la sección 3 de `docs/plan-w01-w05-w07-front.md`, sin cambios:

| Archivo | Cambio |
|---|---|
| `src/composables/useCotizacion.ts` | `CapturaCotizacion` suma `nombreCliente` y `correoCliente` (solo en memoria). **No viajan** en `registrarConsentimiento` ni `solicitarOferta`. `reiniciar()` y el vencimiento del consentimiento los borran. Se exponen para W03-01 |
| `src/views/SolicitudYConsentimiento.vue` | Con `rol === 'ASESOR'`, dos `CampoFormulario` arriba de «Documento de identidad»: «Nombre completo del cliente *» (`person`, «Ej: Carlos Restrepo Gómez») y «Correo del cliente *» (`mail`, «Ej: cliente@correo.com»). Validación: nombre 2–100 sin solo espacios; correo con forma de correo, en minúsculas. Error bajo el campo solo tras intentar enviar |
| `src/i18n/es.ts`, `en.ts` | `solicitud.nombreCliente`, `…Ejemplo`, `solicitud.correoCliente`, `…Ejemplo` y sus errores |
| `src/composables/useSesion.ts` | `cerrarSesion` ya llama a `reiniciar()`: verificar que borra los campos nuevos |
| Pruebas | Vitest: campos solo para ASESOR; 1/2/100/101 caracteres; correo inválido; no viajan en las dos mutaciones. Cypress `pantallas/w01-01.cy.ts`: ASESOR y CLIENTE, responsive |

### Paso 3 · W03-01 Revisar oferta aceptada (KAN-209, KAN-152, parte de KAN-240)

| Archivo | Cambio |
|---|---|
| `src/router/pantallas.ts` | `historia` suma `'HU-W03'`. Entrada `W03-01`, ruta `/suscripcion/:ofertaId`, sprint 2, `roles: ['ASESOR']` (D-2), criterios `CA-W03-01` |
| `src/views/OfertaCompleta.vue` | «Continuar a suscripción» deja de estar deshabilitado para el ASESOR y lleva a W03-01. Para el CLIENTE sigue como hoy, con «Contactar a un asesor» (D-2) |
| `src/composables/useSuscripcion.ts` (nuevo) | Singleton de módulo como `useConciliacion`: `propuesta`, `cargando`, `error`, `aceptar(ofertaId)` (manda el contacto de `useCotizacion`), `enviarCodigo`, `verificarCodigo`, `emitir`, `reenviarEnlace`, `consultarPropuesta`. Errores con `ErrorGraphQL` reintentable, nunca un 5xx (regla 5) |
| `src/views/RevisarOfertaAceptada.vue` (nuevo) | Frame `2001:1704` (sección 1). Lee la oferta de `useCotizacion` (y si se recargó la página, `Query.oferta(id)`). Montos con `Intl.NumberFormat` (`utils/formato.ts`) |
| Errores de `aceptarOferta` | `OFERTA_PRELIMINAR` → «Esta oferta es preliminar…» con **«Volver a calcular»** (D-11, CA-W03-01). `OFERTA_VENCIDA` / `OFERTA_NO_ENCONTRADA` → «Cotizar de nuevo». `CONSENTIMIENTO_NO_VIGENTE` → el mismo flujo del bloque 4 de W01 (vuelve a W01-01 con el aviso) |
| `src/mocks/suscripcion.ts` (nuevo) | `aceptarOferta` idempotente por `ofertaId`, `oferta(id)` |
| Pruebas | Vitest de `useSuscripcion` y de la vista (datos, preliminar, vencida, consentimiento). Cypress `pantallas/w03-01.cy.ts` |

### Paso 4 · Modal del asesor: código, «Emitir» y reenvío (tarea nueva de KAN-26)

`src/components/ModalVerificacionAsesor.vue` (nuevo), con la estructura y la accesibilidad de `ModalRechazo.vue`.
Solo presentación: emite eventos; `RevisarOfertaAceptada.vue` llama a `useSuscripcion`.

| Paso del modal | Contenido |
|---|---|
| 1 · Correo | «Enviaremos un código al correo del cliente»: correo **enmascarado** (`c•••@correo.com`) con «Corregir» que lo vuelve editable (`CampoFormulario`, `mail`). Botón primario «Enviar código» (`send`) |
| 2 · Código | Campo de 6 dígitos (`inputmode="numeric"`, `autocomplete="one-time-code"`), «Pídele al cliente el código que le llegó». «Verificar». Errores: inválido (con intentos restantes), vencido, bloqueado → «Enviar otro código». Cuenta regresiva de 10 min (`timer`) |
| 3 · Emitir | «Identidad verificada» (`verified_user`) y botón primario «Emitir» (deshabilitado hasta verificar, CA-W03-11). «Emitiendo…» mientras espera |
| 4 · Resultado | `EN_FIRMA`: «Enviamos el enlace de firma a c•••@correo.com. Vence en 30 min» + «Reenviar enlace» (`refresh`) + «Cerrar». `EN_REVISION` / `NO_EMITIDA`: `mensajeEstado` y, si `accionSugerida = CONTACTAR_ASESOR`, el texto que corresponda. Nunca la URL del enlace (W07-17) |

Mock: códigos con la tabla de 2.2; cada envío y cada enlace quedan en el «buzón» de `/dev/correo` (paso 5).
Pruebas: Vitest del modal (foco, Escape, pasos, errores, «Emitir» deshabilitado sin código válido, el correo no aparece
completo). Cypress dentro de `w03-01.cy.ts`.

### Paso 5 · W03-02 Página del enlace con la firma en tres modos (KAN-210, KAN-153)

| Archivo | Cambio |
|---|---|
| `src/graphql/cliente.ts` | `OpcionesEjecucion` suma `cabeceras?: Record<string, string>` para mandar `X-Enlace-Firma` (con `conToken: false`) |
| `src/composables/useEnlaceFirma.ts` (nuevo) | Lee el token de `location.hash` (`#t=…`), lo guarda (D-3) y nunca lo pone en un log ni en la consulta. `estado`, `documento`, `cargar()` (`firmaPorEnlace` + decide a qué paso ir), `firmar()`, `iniciarPago()`, `confirmarPago(sesion)`, `abrirPoliza()` |
| `src/router/pantallas.ts` | `W03-02` `/firma`, `W03-02b` `/firma/confirmar`, `W03-03` `/firma/confirmada`, `W03-R` `/pago/retorno`, `W03-04` `/firma/poliza`: **sin `roles`** (públicas, las autoriza el token). Las navegaciones internas conservan el `hash` |
| `src/router/index.ts` | Rutas de dev (2.3) y que el guardia de sesión no exija login en las públicas (ya ocurre con `roles` omitido: verificar) |
| `src/views/FirmaElectronica.vue` (nuevo) | Frame `2001:1832` (sección 1): `HeaderPantalla sinPerfil`, sin migas. Contrato en `<iframe>` (el mock sirve un PDF de ejemplo), resumen legible, casilla de términos (sin marcar, regla 6) y `FirmaTresModos`. «Firmar» habilitado solo con términos + firma válida → W03-02b |
| `src/components/FirmaTresModos.vue` (nuevo) | Pestañas con `Chip` `tablist` (patrón de W05-01): **Dibujar** (`<canvas>` con eventos de puntero, «Borrar», sale como PNG), **Subir imagen** (PNG o JPG, ≤ 500 KB, ≤ 1200×600, bordes blancos o transparentes revisados con `getImageData`; error claro antes de enviar), **Escribir nombre** (campo + vista previa, D-4). Emite `{ modo, contenido }` |
| Estado vacío | Enlace vencido o inexistente: ícono, «Este enlace venció», «Pídele a tu asesor que te envíe uno nuevo». Sin botones que no lleven a nada |
| `src/views/dev/BuzonSimulado.vue` (nuevo, solo mock) | `/dev/correo` (2.3) |
| Pruebas | Vitest: lectura del token, retoma por estado, «Firmar» deshabilitado, validaciones de la imagen (tipo, peso, dimensiones, fondo), canvas vacío no cuenta, vencido. Cypress `pantallas/w03-02.cy.ts` con los tres modos (la imagen con `cy.selectFile` de fixtures válida e inválidas) |

### Paso 6 · W03-02b Confirmar firma (KAN-210, KAN-172, parte de KAN-240)

`src/views/ConfirmarFirma.vue` (nuevo), frame `2020:32` con los textos corregidos (sección 1). «Sí, firmar y autorizar
el cobro» → `firmarPorEnlace` con `autorizaCobro: true`, la versión del documento, el modo y la firma. Errores
(`ErrorFirma`): `VERSION_DOCUMENTO_DESACTUALIZADA` → vuelve a W03-02 con «El contrato se actualizó, revísalo de nuevo»;
`SERVICIO_FIRMA_NO_DISPONIBLE` → «Reintentar» (nunca un 5xx, CA-W03-05); `PROPUESTA_NO_FIRMABLE` → retoma por estado.
Si W03-02b se abre sin firma capturada (recarga), vuelve a W03-02. Pruebas: Vitest y `pantallas/w03-02b.cy.ts`.

### Paso 7 · W03-03 Firma confirmada con «Pagar» (KAN-214, KAN-154)

`src/views/FirmaConfirmada.vue` (nuevo), frame `2001:1969` con los cambios de W03-31. Revisar si
`components/TarjetaConfirmacion.vue` (W04) sirve para la tarjeta centrada antes de escribir otra. «Pagar» →
`iniciarPago` → `window.location.assign(url)` (en mock, `/dev/pasarela/:sesion`). Error al iniciar → «Reintentar».
Crea `src/views/dev/PasarelaSimulada.vue` (2.3). Pruebas: Vitest y `pantallas/w03-03.cy.ts`.

### Paso 8 · Retorno de la pasarela (tarea nueva de KAN-26)

`src/views/RetornoPago.vue` (nuevo), `/pago/retorno?sesion=…` (el id de sesión no es dato personal), con la tarjeta de
W03-03:

| Resultado de `confirmarPago` | Pantalla |
|---|---|
| Cargando | «Confirmando tu pago…» (`progress_activity`) |
| Cobrado → `EMITIDA` | Va a W03-04 |
| Rechazado | Motivo en lenguaje claro y **«Pagar con otra tarjeta»** (nuevo `iniciarPago`). La firma no se pierde (CA-W03-06) |
| Falla la pasarela (1.º y 2.º) | «No pudimos confirmar tu pago» + **«Reintentar»**, que concilia antes de cobrar (CA-W03-05) |
| 3.er fallo seguido | Solo «Pagar con otra tarjeta» |
| Sesión vencida | «La sesión de pago venció» + «Volver a abrir el pago» |
| Enlace vencido sin pago | Estado vacío del paso 5 |

Pruebas: Vitest de los seis estados y de que el contador no se pierde al recargar (lo lleva el mock como lo llevará
PAYMENTS, no el navegador). Cypress `pantallas/w03-retorno.cy.ts`.

### Paso 9 · W03-04 Póliza emitida (KAN-214, KAN-155, parte de KAN-241)

`src/views/PolizaEmitida.vue` (nuevo), frame `2001:2057` con los cambios de la sección 1. «Descargar documento»: `fetch`
del PDF con `X-Enlace-Firma`, `URL.createObjectURL` y `window.open` en pestaña nueva (`open_in_new`); el objeto se
libera al cerrar. Si el navegador bloquea la ventana, el mismo botón descarga (`download`). Pruebas: Vitest y
`pantallas/w03-04.cy.ts`.

### Paso 10 · E2E de W01 a W03 con mocks (parte web de KAN-216) — agente `frontend-quality`

`e2e/cypress/e2e/w03-suscripcion.cy.ts`: ASESOR cotiza con nombre y correo → acepta → código `000000` → emite → abre
el enlace desde `/dev/correo` → firma (un modo por corrida) → confirma → paga con `4242…` → W03-04 → abre el PDF.
Variantes: rechazo con `…0002` y otra tarjeta; tres fallos con `…0119`; enlace `vencido`; UNDER en revisión.
Responsive a 375 px. Se salta solo contra staging (`support/entorno.ts`, como los specs de mocks de W05).
Evidencia: `docs/evidencias/HU-W03-web-<fecha>.md` con capturas.

### Paso 11 · W05-01 medio de pago y acciones por origen (KAN-28)

Es la sección 4 de `docs/plan-w01-w05-w07-front.md` (W05-A5, aún **Propuesta**): columna «Medio de pago» entre
«Prima» y «Estado» (marca · tipo; segunda línea «En línea» o «Recurrente»; «—» sin medio; nunca dígitos), un
`INTERACTIVO` rechazado muestra «Lo resuelve el cliente» y un pendiente «Se concilia», frase nueva en «Control de
dispersión», textos `conciliacion.*`, mocks con cobros en línea y recurrentes, Vitest y `w05-01.cy.ts`. Usa
`Cobro.origen` y `Cobro.medio` del borrador.

### Paso 12 · Cierre

- `CLAUDE.md` → **Estado**, `README.md`, `docs/plan-frontend.md` (pantallas de W03), `docs/convenciones.md`
  (convenciones de demo de 2.2) y este plan.
- `IndicePantallas.vue` muestra las de HU-W03 (sale solo de `pantallas.ts`: verificar).
- Lista para el backend: los tipos de resultado que inventó el borrador (2.1) y la decisión D-3.

---

## 5. Orden y dependencias

| Paso | Depende de | Se puede hacer en paralelo con |
|---|---|---|
| 1 Contrato | — | — |
| 2 W01-01 | 1 | 3 |
| 3 W03-01 | 1 | 2 |
| 4 Modal | 3 | 5 |
| 5 W03-02 + buzón | 1 | 4 |
| 6 W03-02b | 5 | — |
| 7 W03-03 + pasarela simulada | 6 | — |
| 8 Retorno | 7 | 9 |
| 9 W03-04 | 5 | 8 |
| 10 E2E | 2 a 9 | 11 |
| 11 W05-01 | 1 | 2 a 10 |
| 12 Cierre | todo | — |

## 6. Decisiones que necesito antes de empezar

| # | Tema | Recomendación | Por qué |
|---|---|---|---|
| D-1 | Tipos de la v0.17 sin publicar | **Esquema borrador local** (2.1), borrado al llegar la v0.17 | Es la única forma de tener tipos sin editar `schema.graphql` a mano (regla 1). W04 ya usa un esquema aparte. Alternativa: esperar la v0.17 y bloquear los pasos 2 a 11 |
| D-2 | Quién entra a W03-01 | **Solo ASESOR**; el CLIENTE sigue viendo «Contactar a un asesor» en W01-03a | W03-19: «por ahora siempre hay un ASESOR» |
| D-3 | Dónde vive el token del enlace | **`sessionStorage` (`solventa.enlaceFirma`)**, borrado al emitir o al vencer | El navegador sale a la pasarela y vuelve: en memoria se pierde y el regreso (`?sesion=`) no trae el fragmento. Es una excepción a la regla 7, igual que el JWT y `solventa.tokenSocio`, y la tiene que aprobar Felipe. Alternativa: que el backend construya `url_retorno` con `#t=` |
| D-4 | Vista previa del nombre estilizado | **Inter cursiva**, sin dependencia nueva | La regla visual dice «ninguna otra fuente»; el PDF lo dibuja POLICY con su propia fuente |
| D-5 | Pasarela y correo simulados | **Rutas solo de `dev:mock`** (2.3) | Sin ellas no hay demo ni Cypress del flujo completo sin backend |
| D-6 | «Ver detalle de fuentes» en W03-04 | **Quitarlo** en la página del enlace | Exige sesión y el cliente entra solo con el token (plan principal 5.2) |
| D-7 | Registro de CLIENTE con cédula y correo | **Fuera de este plan** | No hay pantalla de alta de usuarios en la web ni frame en Figma; hoy los usuarios se crean en el backend. Si se quiere, hace falta diseño |

## 7. Pendiente en Jira (lo hace Felipe)

- Cerrar **KAN-157** (W03-05) con la nota «no se construye (W03-31)».
- Crear las tareas de front: modal del asesor, retorno de la pasarela, campos de W01-01 (KAN-24) y columna de W05-01
  (KAN-28). Anotar en KAN-210 y KAN-214 el cambio de alcance del bloque 9.
- KAN-167 a KAN-170 (G-01, G-02, G-02a, G-02b) ya están construidas desde el Sprint 1: asignarlas y cerrarlas.
