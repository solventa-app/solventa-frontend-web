# Plan del front: ajustes de W01 y W05 y HU-W07 (sin W03)

> **Estado: borrador (2026-10-27), sin código.** Las decisiones las tomó Felipe el 2026-10-26 y el 2026-10-27 al
> revisar HU-W07 (KAN-30). El plan completo, con el backend, el orden y los cambios en Jira, está en
> [`../solventa-backend/docs/plan-hu-w07-y-ajustes.md`](../../solventa-backend/docs/plan-hu-w07-y-ajustes.md).
>
> **HU-W03 queda fuera de este plan,** por pedido de Felipe. Sus decisiones (flujo con asesor, enlace de firma,
> pasarela y cobro síncrono) están en el bloque 9 de `../solventa-backend/docs/plan-completar-hu-w03.md`, y sus
> pantallas tendrán su propio plan.
>
> Si este documento choca con esos planes, ganan ellos y se corrige este. Lo marcado **Propuesta** espera el visto bueno
> de Felipe.

**Cómo se revisó.** Se capturaron las pantallas implementadas con `dev:mock` (G-01, G-02a, G-02b, G-05, W01-01 y W05-01)
y se compararon con Figma `Solventa-web-Final` (`yKWD8jrwERtJkuSj0mk0Gz`): W01-01 `2001:1016`, W05-01 `2001:3156`, G-02b
`2001:794`, W07-01 `2001:3340`, W07-02 `2001:3562` y W07-03 `2001:3434`. **Lo implementado manda sobre el prototipo**,
porque el prototipo no tenía varios detalles que la web ya resolvió:

- campos obligatorios con `*`;
- ejemplos «Ej: …» y ayudas en los campos;
- ícono a la derecha del campo;
- botón gris hasta que el formulario sea válido;
- tabla con acciones y paginación;
- «Volver a Inicio»;
- estados de carga, vacío y error.

Las pantallas nuevas de W07 siguen esas convenciones aunque Figma diga otra cosa.

## 1. Convenciones visuales que siguen las pantallas nuevas

Salen de la web implementada:

| Elemento | Cómo se hace hoy | Dónde está |
|---|---|---|
| Encabezado | `HeaderPantalla` con título, idioma, moneda y avatar; `sinPerfil` donde no hay persona con perfil (login) | `components/ui/HeaderPantalla.vue` |
| Cerrar sesión | Enlace «Cerrar sesión» con ícono, alineado a la derecha sobre un divisor (G-02b), o `BarraDeCerrarSesion` con «nombre · rol» (G-02a) | `HomeOperador.vue`, `HomeAsesor.vue` |
| Navegación | `MigasDePan` en los flujos (W01) o «‹ Volver a Inicio» en las pantallas del operador (W05-01) | `MigasDePan.vue`, `ConciliacionDePagos.vue` |
| Formularios | `CampoFormulario` con etiqueta y `*`, ejemplo «Ej: …», `hint`, ícono a la derecha y error bajo el campo solo tras intentar enviar | `SolicitudYConsentimiento.vue` |
| Login | Tarjeta blanca de ~464 px con su título adentro, campos, botón primario a todo el ancho (gris hasta ser válido) y nota en letra pequeña | `IngresoConRol.vue` |
| Filtros y pestañas | `Chip` con `tamano="filtro"` dentro de un `role="tablist"`, el activo en azul y un contador en el activo | `ConciliacionDePagos.vue` |
| Tablas | Contenedor de ~1020 px, encabezado beige, filas de 68 px, `Badge` para estados, pie con paginación a la izquierda y totales a la derecha | `ConciliacionDePagos.vue` |
| Tarjetas de inicio | Ícono en un cuadro azul claro, título y descripción, en 3 columnas | `HomeAsesor.vue`, `HomeOperador.vue` |
| Caja informativa | Tarjeta blanca con ícono a la izquierda, título y texto pequeño, al pie de la pantalla | «Control de dispersión» de W05-01 |
| Textos | Todos en `i18n/es.ts` y `en.ts` con la misma clave. Ninguno escrito directo en la plantilla | `src/i18n` |
| Botones | `Boton` en sus variantes `primario` (uno por pantalla), `secundario`, `destructivo` y `peligroBorde` (acción de riesgo con confirmación) | `Boton.vue` |

## 2. Antes de empezar: el contrato

La copia de `contrato/schema.graphql` está **atrasada frente al backend**: no tiene `aceptarOferta` ni `tieneContacto`.
El backend está en la v0.16 y W01 y W05 necesitan la **v0.17**. El portal de W07 necesita la **v0.18** y un contrato
REST nuevo, `contracts/openapi/socios-v1.yaml`.

| Paso | Qué | Quién |
|---|---|---|
| 0.1 | Sincronizar el contrato hasta la versión publicada, regenerar `graphql/tipos.ts` y ajustar los mocks | agente `contract-consumer` |
| 0.2 | Al publicarse la v0.17, sincronizar de nuevo (W01 y W05) | `contract-consumer` |
| 0.3 | Al publicarse la v0.18 y `socios-v1.yaml`, copiarlo a `contrato/socios-v1.yaml`, generar sus tipos y agregar los mocks REST de `/v1/*` en MSW | `contract-consumer` |

Mientras el backend no publique una versión, se trabaja con mocks (regla 2).

Para los tipos del contrato REST se propone **`openapi-typescript`** (dependencia de desarrollo), con la misma
justificación que `graphql-codegen`: tipos generados y no escritos a mano (**decidido el 2026-10-27**).

## 3. HU-W01 · W01-01 Solicitud y consentimiento (ajuste)

**Comparación.** Lo implementado coincide con Figma en estructura y orden, y añade sobre el prototipo:

- los `*`;
- los ejemplos;
- la ayuda «Valor en pesos colombianos…»;
- la nota al lado del botón deshabilitado.

**Ningún diseño incluye el nombre ni el correo del cliente.**

**Qué cambia** (criterio nuevo de KAN-24, W01-A1):

| # | Qué implementar | Detalle |
|---|---|---|
| 1 | Dos campos **solo cuando el usuario es ASESOR** | «Nombre completo del cliente \*» y «Correo del cliente \*», **arriba de «Documento de identidad»**, con los mismos `CampoFormulario`, ejemplos y estilo de error. Íconos propuestos: `person` y `mail`, a la derecha. Ejemplos: «Ej: Carlos Restrepo Gómez» y «Ej: cliente@correo.com» |
| 2 | **Un CLIENTE no ve los campos** | Su contacto lo lee POLICY de AUTH, y el contrato **no devuelve** el correo por GraphQL (solo `tieneContacto`), así que no hay con qué rellenarlo. Esto **corrige** lo que se había dicho antes («se rellenan desde su perfil»), porque no es posible |
| 3 | Validación en el cliente | Nombre de 2 a 100 caracteres, sin solo espacios (la misma regla que `crearUsuario`). Correo con forma de correo, que se guarda en minúsculas. Error bajo el campo al intentar enviar, como los demás |
| 4 | **Dónde viven hasta aceptar la oferta** | En `useCotizacion`: `CapturaCotizacion` suma `nombreCliente` y `correoCliente`. Solo en memoria: **nunca** en `sessionStorage` ni en la URL (regla 7). Cotizar **no los envía** (`registrarConsentimiento` y `solicitarOferta` no cambian). Se envían después, en `aceptarOferta`, que es de W03 |
| 5 | Limpiar | Se borran con el resto de la captura al cerrar sesión, al empezar una cotización nueva y cuando el consentimiento vence (el flujo actual del bloque 4) |
| 6 | Textos | Claves nuevas `solicitud.nombreCliente`, `solicitud.nombreClienteEjemplo`, `solicitud.correoCliente`, `solicitud.correoClienteEjemplo` y sus errores, en `es.ts` y `en.ts` |
| 7 | Pruebas | <br>• **Vitest:** los campos aparecen solo para el ASESOR; validaciones y valores límite (1, 2, 100 y 101 caracteres; correo inválido); no viajan en `registrarConsentimiento` ni en `solicitarOferta`. <br>• **Cypress:** `w01-01.cy.ts` con el ASESOR y el CLIENTE, y el responsive |

Responsive: los campos nuevos se apilan igual que los existentes y no cambian el ancho de 400 px del formulario.

## 4. HU-W05 · W05-01 Conciliación de pagos (ajuste)

**Comparación.** Lo implementado va más allá del prototipo:

- la columna «Acciones», con «Reintentar cobro», «Reintento automático» y «Pagar con otro medio»;
- la paginación y el contador «Mostrando N de M»;
- «Volver a Inicio»;
- un contenedor más ancho (~1020 px frente a ~640 px en Figma).

Se conserva lo implementado.

**Qué cambia** (W05-A5, Propuesta; depende de la v0.17 con `Cobro.origen` y `Cobro.medio`):

| # | Qué implementar | Detalle |
|---|---|---|
| 1 | Columna **«Medio de pago»** entre «Prima» y «Estado» | Primera línea: marca y tipo («Visa · Crédito», «Mastercard · Débito»). Segunda línea, en `text-[11px]` y tinta suave: el origen, **«En línea»** (lo pagó el cliente) o **«Recurrente»**. Sin el medio (cobros viejos o del convenio), «—». **Nunca un número de tarjeta ni los últimos dígitos**, porque el backend no los guarda |
| 2 | **«Acciones» según el origen** | Hoy un `RECHAZADO` muestra «Reintentar cobro». Con origen **En línea**, el operador **no** reintenta, porque cobraría una tarjeta que el cliente pudo cambiar (W03-30). En su lugar muestra el texto «Lo resuelve el cliente». Un `PENDIENTE` en línea muestra «Se concilia», no «Reintento automático». Los **Recurrentes** siguen como hoy |
| 3 | Ancho | Con una columna más, la tabla cabe en los 1020 px si «Cliente» baja a dos líneas. En pantallas angostas conserva el desplazamiento horizontal que ya tiene |
| 4 | Caja «Control de dispersión» | Suma una frase: «Los cobros en línea los paga el cliente desde la pasarela; si fallan o se rechazan, él elige otra tarjeta» |
| 5 | Textos | `conciliacion.medio`, `conciliacion.origen.INTERACTIVO`, `conciliacion.origen.RECURRENTE`, `conciliacion.loResuelveCliente` y `conciliacion.seConcilia` |
| 6 | Mocks | `cobrosIniciales()` suma cobros en línea (cobrado, rechazado y pendiente) y recurrentes, con su medio |
| 7 | Pruebas | <br>• **Vitest:** la columna y sus textos; sin botón de reintento en los cobros en línea; «—» sin medio. <br>• **Cypress:** `w05-01.cy.ts` y la recarga cada 30 s, que no cambia |

## 5. HU-W07 · Portal de socios (nuevo)

**Comparación general.** Las tres pantallas de Figma muestran **menos de lo decidido** y algunas cosas que ya no aplican:

- una sola clave en lugar de cuatro;
- una cuota mensual que se renueva, cuando el presupuesto no se renueva solo: lo recarga Solventa (W07-9);
- un estado «Operativo» sin el porcentaje ponderado;
- endpoints y un ejemplo que **no coinciden con la API decidida**. El ejemplo hasta expone un «score_open_finance», que el socio no debe ver (W07-1);
- un encabezado propio en W07-02, distinto del resto de la web.

Se toma de Figma la **estructura** (login técnico, tres tarjetas de resumen, documentación con pestañas) y se
construye con las convenciones de la sección 1. Las partes sin diseño se marcan **«sin Figma»**. **Felipe las aprobó el
2026-10-27** (regla 3) y se construyen solo con componentes de `src/components/ui/`.

### 5.1 Piezas comunes

| # | Qué implementar | Detalle |
|---|---|---|
| 1 | Sesión del socio | Composable nuevo **`useSesionSocio.ts`**, separado de `useSesion`, porque el socio no es un usuario con rol. Pide el token con `POST /v1/token` (ID de socio y clave) y recibe un JWT de 15 min. Lo guarda en `sessionStorage` (`solventa.tokenSocio`), con la misma excepción de la regla 7 que el JWT de usuario (**decidido el 2026-10-27**). Al vencer, vuelve al login con el aviso «Tu sesión técnica venció» |
| 2 | Cliente REST | `src/api/socios.ts`: `fetch` con `Authorization: Bearer`, `Accept-Language` y los tipos de `socios-v1.yaml`. Los 502, 503 y 504 del gateway se traducen como en `graphql/cliente.ts`. Un 429 muestra «Presupuesto agotado» |
| 3 | Rutas | En `router/pantallas.ts`, `historia` suma `'HU-W07'`. El portal **no** usa `roles`: lleva `socio: true` y el guardia del router lo manda a `/socios/ingreso` si no hay sesión de socio. Las rutas son `/socios/ingreso`, `/socios/panel` y `/socios/documentacion` |
| 4 | Encabezado | `HeaderPantalla` con `sinPerfil`, porque el socio no tiene perfil. Debajo, `BarraDeCerrarSesion` con «‹nombre del socio› · Socio de distribución» y «Cerrar sesión», como en G-02a. Así se reemplaza el encabezado propio de Figma W07-02 |
| 5 | Enlace en G-01 | En `IngresoConRol.vue`, «¿Eres un socio de distribución?…» deja de estar deshabilitado y lleva a `/socios/ingreso`. Se quita `ingreso.socioTitulo` («Disponible próximamente») |
| 6 | Mocks | MSW REST para `/v1/token` (clave `clave-erronea` → 401), `/v1/credenciales`, `/v1/consumo`, `/v1/estado?ventana=`, `/v1/ventas` y la rotación. Siguen la convención de demo de `handlers.ts` (un ID que empieza por `bloqueado` → bloqueo por intentos), que **no es del backend real** |

### 5.2 W07-01 · Login del socio (`/socios/ingreso`, Figma `2001:3340`)

| Figma | Se construye así |
|---|---|
| Título del encabezado «Acceso técnico» | Igual, en `HeaderPantalla` con `sinPerfil` |
| Tarjeta angosta (~320 px) con «Autenticación API & Portal» | La tarjeta de G-01 (~464 px), con el título «Portal de socios — Acceso técnico» y el subtítulo «Credenciales de socio, no de cliente final». La etiqueta «Autenticación API & Portal» con su ícono se conserva arriba del título |
| «ID de socio» y «Clave de acceso» con el ícono a la izquierda | `CampoFormulario` con `*`, el ícono a la derecha (`badge`) y la clave con el ojo de G-01. Ayuda de la clave: «Tu clave de producción» (W07-3) |
| «Ingresar →» activo | `Boton` primario a todo el ancho, **gris hasta llenar los dos campos**. Mientras espera, «Ingresando…» |
| — | Error genérico **«ID de socio o clave incorrectos»** (AUTH responde un 401 genérico) y mensaje de **bloqueo por intentos**, con el estilo de error de G-01 |
| «¿Problemas con su llave API o acceso?» | **Solo texto**, en la nota y sin enlace (decidido el 2026-10-27) |
| «‹ Volver al inicio de sesión de Solventa» | Enlace a `/login` |
| «Conexión cifrada…» y «Canal restringido…» | Nota en letra pequeña, como la de G-01 |

**Pruebas:**
- Vitest: el botón se habilita solo con los dos campos; error genérico; bloqueo; el token se guarda y se borra al cerrar sesión.
- Cypress: `w07-01.cy.ts` (camino feliz, error y responsive).

### 5.3 W07-02 · Panel del socio (`/socios/panel`, Figma `2001:3562`)

Disposición, de arriba abajo:

1. El encabezado común (5.1 #4).
2. Una fila con la descripción «Gestión de entorno de producción, cuotas de llamada y telemetría de servicio» y
   `Boton` secundario **«Ver documentación»**, que lleva a `/socios/documentacion`.
3. El **selector de entorno**, con dos `Chip` («Producción» y «Pruebas») que cambian las credenciales y el consumo.
   Está **sin Figma**: el prototipo solo tiene producción.
4. **Las tres tarjetas de Figma**, en 3 columnas, con lo decidido:

| Tarjeta | Figma | Se construye así |
|---|---|---|
| **Credenciales** | Una clave «sk_live_…», «Mostrar» y «Regenerar», y el aviso al regenerar | Para el entorno elegido: <br>• **ID de socio** (`client_id`) con «Copiar»; <br>• **clave** enmascarada con «Mostrar» y «Copiar»; <br>• **«Regenerar»** (`peligroBorde`), que abre una **confirmación** en el estilo de `ModalCerrarSesion` con el aviso de Figma, y muestra la clave nueva **una sola vez**; <br>• **«Generar token»**, que muestra el token corto de 15 min con su cuenta regresiva y «Copiar». <br>Un `Badge` indica el entorno. Son las **4 claves**: una larga y una corta en cada entorno (W07-4) |
| **Consumo** | «Cuota consumida 842 / 1.000 llamadas este mes», barra, % y «Renovación del ciclo» | **«Cotizaciones: 842 / 1.000»**, porque solo las cotizaciones descuentan (W07-9), con la barra, «84 % utilizado» y «158 disponibles». «Renovación del ciclo» se reemplaza por **«Lo recarga Solventa»**, porque no hay ciclo. Agotado: la tarjeta pasa a alerta con «Presupuesto agotado: las cotizaciones responden 429» |
| **Estado** | Caja verde «Operativo», «Latencia media 48 ms · Disponibilidad 99,98 %» y «Última verificación» | Una **barra de salud general en %** con su color (verde ≥ 90, amarillo ≥ 70, rojo < 70) y el texto «Operativo», «Degradado» o «Con fallas». Debajo: **disponibilidad y latencia media consolidadas**; **Cotización** y **Emisión**, cada una con su `Badge` de color; selector de **ventana** con `Chip` pequeños (15 min, 1 h, 24 h, 7 d; 1 h por defecto); y «Última verificación». Sin tráfico, muestra «Sin tráfico en la ventana» y no un 100 % (bloque 3b). **Sin nombres de micros internos** (W07-14) |

5. **Debajo de las tarjetas, dos secciones sin Figma** (aprobadas el 2026-10-27), con el estilo de la tabla de W05-01:

| Sección | Contenido |
|---|---|
| **Consumo por API** | Una tabla con API (cotizaciones, propuestas, identidad, emisión, pólizas, cuenta), llamadas, con éxito, con error y latencia media, para el entorno y la ventana elegidos. Encima, un gráfico de barras sencillo con las **cotizaciones por día** del mes. Se dibuja en SVG propio, sin librería de gráficos (regla 8), con la skill de dataviz del repo |
| **Ventas y comisiones** | Cinco indicadores en tarjetas (propuestas por estado, pólizas emitidas, conversión de cotización a póliza, primas cobradas y comisión causada) y una tabla por mes (mes, pólizas emitidas, primas cobradas y comisión). Los montos van como texto decimal formateado con `Intl.NumberFormat` (regla 7). En el entorno de pruebas muestra los datos ficticios del dummy con el distintivo «Datos simulados» |

**Estados:** carga, vacío (socio sin consumo ni ventas), error con reintento y degradado (sin métricas: solo `/health`).
Ninguno muestra un 5xx (regla 5).

**Pruebas:**
- Vitest: cambio de entorno; confirmar al regenerar; cuenta regresiva del token; colores por umbral; «sin tráfico»;
  presupuesto agotado; formato de montos.
- Cypress: `w07-02.cy.ts` con el responsive (las 3 tarjetas se apilan).

### 5.4 W07-03 · Documentación y pruebas (`/socios/documentacion`, Figma `2001:3434`)

| Figma | Se construye así |
|---|---|
| Pestañas subrayadas: Documentación, Guía de integración, Referencia API y Playground | **Tres pestañas** con el `Chip` `tablist` de la web: <br>• **«Guía de integración»**, que absorbe «Documentación»; <br>• **«Referencia API»**; <br>• **«Modo prueba»**, que es el Playground. <br>La pestaña activa va en la URL como `?pestana=`, que no es un dato personal |
| Migas «Portal de socios > Documentación» | `MigasDePan` con `aInicio="/socios/panel"` |
| Lista fija de 4 endpoints (`/v1/cotizaciones`, `/v1/cotizaciones/{id}`, `/v1/polizas`, `/v1/polizas/{id}`) | La lista sale de **`socios-v1.yaml`**, no se escribe a mano: token, consentimiento, cotizaciones, propuestas (con contacto), código, emitir, reenviar enlace, pólizas y cuenta. Mismo estilo de la tarjeta de Figma: método en una pastilla de color, ruta en monoespaciada y descripción a la derecha |
| Ejemplo fijo de *request* y *response* con `score_open_finance` | **Guía de integración:** el flujo paso a paso del socio: <br>1. token; <br>2. consentimiento; <br>3. cotización; <br>4. aceptar con el **nombre y el correo** del titular; <br>5. pedir el código; <br>6. verificarlo con lo que el titular le dicta; <br>7. emitir; <br>8. consultar periódicamente el estado; <br>9. póliza y PDF. <br>Explica que **el titular firma y paga por un enlace que le llega a su correo** y que el socio no recibe; los errores comunes (401, 404, 429 con `Retry-After` y el no 5xx); y que solo cotizar descuenta presupuesto. Los ejemplos salen de los `examples` del contrato, con «Copiar» como en Figma, y **sin datos de las fuentes** |
| «Ejemplo fijo, no interactivo en esta versión» | **Referencia API:** Swagger UI embebido (`swagger-ui-dist` en versión fija, empaquetado y sin CDN) con el **token de producción** de la sesión, inyectado con `requestInterceptor`, y un aviso fijo: «Probar cotizaciones aquí descuenta presupuesto real» |
| «Entorno: Sandbox» | **Modo prueba:** el mismo Swagger con el **token de pruebas** y el distintivo «Respuestas simuladas». Una tabla con los documentos de prueba del dummy (oferta completa, preliminar, presupuesto agotado y consentimiento vencido) y el **código fijo `000000`** |

**Pruebas:**
- Vitest: la lista se genera del contrato; el token correcto según la pestaña; el aviso de producción.
- Cypress: `w07-03.cy.ts`, que abre cada pestaña y hace «Try it out» de una cotización en modo prueba contra el mock.

### 5.5 Estado del sistema para el BACKOFFICE (nuevo, sin Figma)

| # | Qué implementar | Detalle |
|---|---|---|
| 1 | Tarjeta en G-02b | Una **tercera tarjeta**, «Estado del sistema», con el texto «Salud, disponibilidad y latencia por servicio», junto a Siniestros y Conciliación de pagos y con el mismo estilo |
| 2 | Pantalla nueva | `/operador/estado`, id propuesto **W07-04**, `roles: ['BACKOFFICE']`, con «‹ Volver a Inicio» como W05-01 |
| 3 | Contenido | <br>• **Arriba:** la misma barra de salud general y las métricas consolidadas del panel del socio, con el selector de ventana. <br>• **Tabla por micro**, con el estilo de W05-01: micro, peso, salud (`Badge` de color con %), disponibilidad, latencia media, p95, `/health` y «sin tráfico». <br>• **Tabla de APIs externas:** proveedor y estado del circuito («Cerrado», «Medio abierto» o «Abierto», como `Badge` de éxito, alerta o error) |
| 4 | Datos | La consulta GraphQL `estadoSistema(ventana)` (v0.18), solo para BACKOFFICE |
| 5 | Recarga | Cada 30 s mientras está abierta, como W05-01 (`silencioso: true`) |
| 6 | Pruebas | <br>• Vitest: tablas, colores y «sin tráfico». <br>• Cypress: `w07-04.cy.ts` |

## 6. Orden de implementación en el front

| Paso | Qué | Espera a |
|---|---|---|
| 1 | Sincronizar el contrato hasta lo publicado (2, paso 0.1) | — |
| 2 | **W01-01**: campos del ASESOR (sección 3) | La v0.17, para el envío en `aceptarOferta`. La captura y la validación se pueden hacer antes |
| 3 | **W05-01**: medio de pago y acciones por origen (sección 4) | La v0.17 (`Cobro.origen` y `Cobro.medio`) |
| 4 | Piezas comunes de W07 y **W07-01** (5.1 y 5.2) | La v0.18 y `socios-v1.yaml`. Con mocks se puede empezar antes |
| 5 | **W07-02** (5.3) | Paso 4 |
| 6 | **W07-03** (5.4) | Paso 4 |
| 7 | **Estado del sistema** (5.5) | `estadoSistema` en la v0.18 |
| 8 | E2E contra staging de lo que ya esté desplegado | Liberación del backend a `main` |

Antes de reportar cada paso: `npm run typecheck`, `lint`, `formato:verificar`, `test` y `build` en `apps/web`, y verla
en el navegador con `dev:mock`.

## 7. Decisiones de Felipe (2026-10-27)

| # | Tema | Decisión |
|---|---|---|
| 1 | Partes sin Figma (regla 3) | **Aprobadas** y construidas solo con componentes de `src/components/ui/`: <br>• el selector de entorno; <br>• las secciones «Consumo por API» y «Ventas y comisiones»; <br>• la pantalla «Estado del sistema»; <br>• la confirmación antes de regenerar una clave |
| 2 | «¿Problemas con tu llave API?» | **Solo texto**, sin enlace |
| 3 | Token del socio | En **`sessionStorage`** (`solventa.tokenSocio`), como el JWT de usuario |
| 4 | Tipos del contrato REST | **`openapi-typescript`** como dependencia de desarrollo |

**Sigue abierto:** confirmar los íconos y textos de los campos nuevos de W01-01 (`person` y `mail`) y de la columna
«Medio de pago» de W05-01. No bloquea: se ajustan al revisarlos en el navegador.
