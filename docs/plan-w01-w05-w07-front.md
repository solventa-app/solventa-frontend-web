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

Salen de la web implementada.

### 1.1 Base visual

| Qué | Dónde | Regla |
|---|---|---|
| Tipografía | **Inter**, con `@fontsource/inter` y la escala de 5 pasos de SG-01 en `styles/twind.ts` | Ninguna otra fuente |
| Colores | Tokens de `styles/twind.ts`: `primario` #1e4680, `enlace` #2b5aa3, `tinta` #333, `tinta-suave` #6e6e6e, `superficie` #fff, `fondo` #f5f5f5, `borde` #d9d9d9 y los estados `exito`, `alerta`, `error` e `info` con su `-fondo` | Nunca un color escrito a mano. Los estados siempre con texto o ícono |
| Íconos | Material Symbols Outlined, copiados como SVG en `components/ui/IconoMaterial.vue` | Un glifo nuevo se agrega ahí con su uso al lado; nunca otro set de íconos |
| Estilos | Twind con las clases de la web y `styles/base.css` | Sin CSS propio por pantalla, salvo el ajuste del Swagger embebido (5.4) |

### 1.2 Patrones de pantalla


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

**Principio (Felipe, 2026-10-27): solo se arman pantallas.** El portal se construye con lo que ya tiene el repo:

- los componentes de `src/components/ui/`;
- la tipografía, los colores y los íconos de la sección 1.1;
- los patrones de las pantallas ya hechas.

No se crean estilos propios ni componentes nuevos. **La única pieza nueva de la librería es la barra de pestañas de
W07-03**, porque el repo no tiene una con el estilo del prototipo (5.4). Todo lo demás se compone dentro de cada
`views/*.vue`, como las pantallas existentes.

**Comparación general.** Las tres pantallas de Figma muestran **menos de lo decidido** y algunas cosas que ya no aplican:

- una sola clave en lugar de cuatro;
- una cuota mensual que se renueva, cuando el presupuesto no se renueva solo: lo recarga Solventa (W07-9);
- un estado «Operativo» sin el porcentaje ponderado;
- endpoints y un ejemplo que **no coinciden con la API decidida**. El ejemplo hasta expone un «score_open_finance», que el socio no debe ver (W07-1);
- un encabezado propio en W07-02, distinto del resto de la web.

Se toma de Figma la **estructura** (login técnico, tres tarjetas de resumen, documentación con pestañas) y se construye
con las convenciones de la sección 1. Las partes sin diseño (**«sin Figma»**) las aprobó Felipe el 2026-10-27.

### 5.1 Piezas comunes

| # | Qué implementar | Detalle |
|---|---|---|
| 1 | Sesión del socio | Composable nuevo **`useSesionSocio.ts`**, separado de `useSesion`, porque el socio no es un usuario con rol. Pide el token con `POST /v1/token` (ID de socio y clave) y recibe un JWT de 15 min. Lo guarda en `sessionStorage` (`solventa.tokenSocio`), con la misma excepción de la regla 7 que el JWT de usuario (decidido). Al vencer, vuelve al login con el aviso «Tu sesión técnica venció» |
| 2 | Cliente REST | `src/api/socios.ts`: `fetch` con `Authorization: Bearer`, `Accept-Language` y los tipos generados de `socios-v1.yaml` (`openapi-typescript`, decidido). Los 502, 503 y 504 del gateway se traducen como en `graphql/cliente.ts`. Un 429 muestra «Presupuesto agotado» |
| 3 | Rutas | En `router/pantallas.ts`, `historia` suma `'HU-W07'`. El portal **no** usa `roles`: lleva `socio: true` y el guardia del router lo manda a `/socios/ingreso` si no hay sesión de socio. Las rutas son `/socios/ingreso`, `/socios/panel` y `/socios/documentacion` |
| 4 | Encabezado | `HeaderPantalla` con `sinPerfil`, porque el socio no tiene perfil. Debajo, `BarraDeCerrarSesion` con «‹nombre del socio› · Socio de distribución» y «Cerrar sesión», como en G-02a. Así se reemplaza el encabezado propio de Figma W07-02. El pie es `FooterPantalla`, igual que en toda la web |
| 5 | Enlace en G-01 | En `IngresoConRol.vue`, «¿Eres un socio de distribución?…» deja de estar deshabilitado y lleva a `/socios/ingreso`. Se quita `ingreso.socioTitulo` («Disponible próximamente») |
| 6 | Íconos nuevos | Se agregan a `IconoMaterial.vue` **solo** los glifos de Material Symbols Outlined que faltan, cada uno con su uso al lado, como exige ese archivo: `key` (credenciales), `content_copy` (copiar), `speed` (consumo), `monitor_heart` (estado), `menu_book` (guía), `science` (pruebas), `rocket_launch` (producción), `open_in_new` (abrir el PDF) y `download`. Los demás ya existen: `visibility`, `refresh`, `lock`, `badge`, `arrow_forward`, `logout`, `info`, `warning`, `check_circle`, `shield`, `verified_user` y `timer` |
| 7 | Mocks | MSW REST para `/v1/token` (clave `clave-erronea` → 401), `/v1/credenciales`, `/v1/consumo`, `/v1/estado?ventana=`, `/v1/ventas` y la rotación. Siguen la convención de demo de `handlers.ts` (un ID que empieza por `bloqueado` → bloqueo por intentos), que **no es del backend real** |

### 5.2 W07-01 · Login del socio (`/socios/ingreso`, Figma `2001:3340`)

**Se guía por dos referencias:** el login del prototipo, por el contenido y el tono técnico, y **el login ya
implementado (G-01, `IngresoConRol.vue`)**, por la estructura, los componentes y el comportamiento. La pantalla nueva
copia la plantilla de G-01, cambia los campos y quita el selector de rol:

- `HeaderPantalla sinPerfil`;
- la tarjeta de ~464 px;
- `CampoFormulario` y el control del ojo;
- el `Boton` que se habilita al ser válido;
- los mensajes de error;
- la nota en letra pequeña;
- `FooterPantalla`.

| Del prototipo | Se construye así (con lo de G-01) |
|---|---|
| Título del encabezado «Acceso técnico» | Igual, en `HeaderPantalla sinPerfil` |
| Tarjeta angosta (~320 px) con la etiqueta «Autenticación API & Portal» | **La tarjeta de G-01** (~464 px). Arriba, la etiqueta del prototipo con el ícono `shield`, en mayúsculas pequeñas y `tinta-suave`. Título «Portal de socios» y subtítulo «Acceso técnico con las credenciales de tu empresa, no de un cliente final» |
| «ID de socio» y «Clave de acceso» con el ícono a la izquierda | Los **mismos `CampoFormulario` de G-01**, con `*` y el ícono a la derecha (`badge`). La clave usa el ojo de G-01. Ayuda de la clave: «Tu clave de producción» (W07-3). Se reemplaza la etiqueta «Token corporativo» del prototipo, porque la clave no es el token |
| «Ingresar →» | El `Boton` primario de G-01, a todo el ancho y **gris hasta llenar los dos campos**, con `arrow_forward`. Mientras espera, «Ingresando…» |
| — | Los errores de G-01: genérico **«ID de socio o clave incorrectos»** (AUTH responde un 401 genérico) y **bloqueo por intentos** |
| «¿Problemas con su llave API o acceso?» | **Solo texto** en la nota (decidido) |
| «‹ Volver al inicio de sesión de Solventa» | Enlace a `/login`, con el estilo `text-enlace` del enlace de socios de G-01 |
| «Conexión cifrada…» y «Canal restringido…» | La nota en letra pequeña de G-01, con `lock` |

**Pruebas:**
- Vitest: el botón se habilita solo con los dos campos; error genérico; bloqueo; el token se guarda y se borra al
  cerrar sesión.
- Cypress: `w07-01.cy.ts` (camino feliz, error y responsive).

### 5.3 W07-02 · Panel del socio (`/socios/panel`, Figma `2001:3562`)

Disposición, de arriba abajo:

1. El encabezado común (5.1 #4).
2. Una fila con la descripción del prototipo («Gestión de entorno de producción, cuotas de llamada y telemetría de
   servicio») y el **botón «Documentación de la API»**: `Boton` secundario con `menu_book`, como el «Ver documentación»
   de Figma. **Navega dentro de la web** a `/socios/documentacion` (W07-03), en la misma pestaña, así que no lleva el
   ícono de abrir en otra.
3. El **selector de entorno** (sin Figma, aprobado): el `Chip` `tablist` de W05-01, con «Producción» y «Pruebas
   (sandbox)». Cambia las credenciales y el consumo.
4. **Las tres tarjetas de Figma**, en 3 columnas. Cada una es la tarjeta blanca con borde de `HomeAsesor.vue`, con el
   título y el ícono a la derecha, como en el prototipo:

| Tarjeta | Figma | Se construye así |
|---|---|---|
| **Credenciales** (`key`) | Una clave «sk_live_…», «Mostrar» y «Regenerar», y el aviso al regenerar | Para el entorno elegido: <br>• **ID de socio** con «Copiar» (`content_copy`); <br>• **clave** enmascarada en monoespaciada con «Mostrar» (`visibility`) y «Copiar»; <br>• **«Regenerar»** (`Boton peligroBorde` con `refresh`), que abre una **confirmación** con el patrón de `ModalCerrarSesion` y el aviso de Figma en la caja de alerta (`alerta-fondo`), y muestra la clave nueva **una sola vez**; <br>• **«Generar token»** (`Boton secundario`), que muestra el token de 15 min con su cuenta regresiva (`timer`) y «Copiar». <br>El `Badge` del entorno va junto a la clave, como «Producción» en Figma. Son las 4 claves: una larga y una corta por entorno (W07-4) |
| **Consumo** (`speed`) | «Cuota consumida 842 / 1.000 llamadas este mes», barra, % y «Renovación del ciclo» | **«Cotizaciones: 842 / 1.000»** (solo las cotizaciones descuentan, W07-9), con la barra en `primario` sobre `info-fondo`, «84 % utilizado» y «158 disponibles». «Renovación del ciclo» se reemplaza por **«Lo recarga Solventa»**. Agotado: la tarjeta pasa a alerta con «Presupuesto agotado: las cotizaciones responden 429» |
| **Estado** (`monitor_heart`) | Caja verde «Operativo», «Latencia media 48 ms · Disponibilidad 99,98 %» y «Última verificación» | La **caja de estado del prototipo** (`exito-fondo`, `alerta-fondo` o `error-fondo`, siempre con texto e ícono) con «Operativo», «Degradado» o «Con fallas» y el **% de salud general** en una barra. Debajo, la caja «Métricas de red» del prototipo: **disponibilidad y latencia media consolidadas**. Luego **Cotización** y **Emisión** con su `Badge`, el selector de **ventana** (`Chip` pequeños: 15 min, 1 h, 24 h, 7 d; 1 h por defecto) y «Última verificación». Sin tráfico, «Sin tráfico en la ventana». **Sin nombres de micros internos** (W07-14) |

5. **Debajo de las tarjetas, dos secciones** (sin Figma, aprobadas), con la tabla de W05-01 y las tarjetas de
   `HomeAsesor.vue`:

| Sección | Contenido |
|---|---|
| **Consumo por API** | Una tabla con API, llamadas, con éxito, con error y latencia media, para el entorno y la ventana elegidos. Encima, un gráfico de barras de las **cotizaciones por día**, en SVG propio y sin librería (regla 8), con los colores de la paleta y la skill de dataviz |
| **Ventas y comisiones** | Cinco indicadores en tarjetas (propuestas por estado, pólizas emitidas, conversión, primas cobradas y comisión causada) y una tabla por mes. Montos con `Intl.NumberFormat` (regla 7). En pruebas, el distintivo «Datos simulados» |

**Estados:** carga, vacío, error con reintento y degradado (sin métricas: solo `/health`). Ninguno muestra un 5xx (regla 5).

**Pruebas:**
- Vitest: cambio de entorno; confirmación al regenerar; cuenta regresiva del token; colores por umbral; «sin tráfico»;
  presupuesto agotado; formato de montos.
- Cypress: `w07-02.cy.ts` con el responsive (las 3 tarjetas se apilan) y el botón que lleva a W07-03.

### 5.4 W07-03 · Documentación de la API (`/socios/documentacion`, Figma `2001:3434`)

**Del prototipo se conserva:**

- el estilo;
- la navegación: la barra de pestañas bajo el encabezado y las migas «Portal de socios > Documentación»;
- los componentes visuales:
  - la barra beige (`fondo` con borde inferior `borde`);
  - las pestañas en texto con la **activa subrayada** en `primario` y en semibold;
  - el título de la sección con su ícono;
  - el subtítulo en `tinta-suave`;
  - las tarjetas blancas con borde;
  - el distintivo del entorno arriba a la derecha («Entorno: Sandbox»).

**Cambia el contenido:** son **tres pestañas** y no cuatro.

**Nombres de las pestañas.** Criterios de UX que se aplicaron:

1. **Se nombra lo que el usuario hace o dónde está, no la herramienta.** «Swagger» y «Playground» son jerga: un
   gerente de producto del socio no los entiende.
2. **Etiquetas cortas y paralelas**, de una a tres palabras y del mismo tipo: «Pruebas» y «Producción», no
   «Sandbox» y «Referencia API».
3. **Se conserva «sandbox» como apoyo**, porque el desarrollador que integra lo reconoce.
4. **El orden sigue el recorrido:** aprender, probar y salir en vivo.
5. **La pestaña por defecto no es la que cuesta.** Abrir en producción podría consumir presupuesto por error.
6. **Ícono más texto**, nunca solo ícono (regla de `IconoMaterial.vue`).

| Orden | Pestaña (ES · EN) | Ícono | Bajo el título | Contenido |
|---|---|---|---|---|
| 1 (por defecto) | **Guía de integración** · *Integration guide* | `menu_book` | «Todo lo que necesitas para vender pólizas Solventa desde tu app» | **PDF embebido** con la guía (5.5) |
| 2 | **Pruebas (sandbox)** · *Sandbox* | `science` | «Prueba la API con respuestas simuladas: no se cotiza ni se emite de verdad» | **Swagger embebido** con el **token de pruebas**, el distintivo «Entorno: Sandbox» del prototipo y una caja informativa con los documentos de prueba y el **código fijo `000000`** |
| 3 | **Producción** · *Production* | `rocket_launch` | «La API real: cada cotización descuenta de tu presupuesto» | **Swagger embebido** con el **token de producción**, el distintivo «Entorno: Producción» en alerta y la caja de alerta fija «Probar cotizaciones aquí descuenta presupuesto real» |

**Título de la pantalla:** «Documentación de la API». Reemplaza «Documentación y playground» por el mismo criterio 1.

| # | Qué implementar | Detalle |
|---|---|---|
| 1 | **Barra de pestañas** | **La única pieza nueva de la librería:** `components/ui/Pestanas.vue`, porque la web no tiene pestañas con este estilo (el `Chip` es para filtros). <br>• Accesible: `role="tablist"` y `tab`, flechas del teclado, `aria-selected` y foco visible. <br>• Se ve igual que el prototipo. <br>• Se exporta desde `components/ui/index.ts`. <br>• Se agrega a `IndiceComponentes.vue`. <br>La pestaña activa va en la URL como `?pestana=guia|pruebas|produccion`, que no es un dato personal, para que se pueda compartir el enlace |
| 2 | Swagger embebido | Un contenedor dentro de la vista (no un componente de la librería) con `swagger-ui-dist` en versión fija, empaquetado y **sin CDN**. Lee `contrato/socios-v1.yaml`. El token de la pestaña se inyecta con `requestInterceptor`. **Su CSS se ajusta** a la web: Inter, `primario` en botones y enlaces, `borde` y radios, los colores de los métodos como las pastillas del prototipo, y sin el logo ni la barra superior de Swagger |
| 3 | PDF embebido | `<iframe>` al PDF de `public/socios/` en el idioma activo (`guia-integracion-es.pdf` o `-en.pdf`). Encima, dos botones: «Abrir en otra pestaña» (`open_in_new`) y «Descargar» (`download`). Si el navegador no muestra PDF (algunos móviles), una tarjeta con la portada de la guía y el botón de descarga |
| 4 | Migas | `MigasDePan` con `aInicio="/socios/panel"` y «Documentación de la API» |

**Pruebas:**
- Vitest: la pestaña por defecto es la guía; la URL cambia con la pestaña; teclado en `Pestanas`; el token correcto en
  cada Swagger; el aviso de producción.
- Cypress: `w07-03.cy.ts`, que recorre las tres pestañas, hace «Try it out» de una cotización en pruebas contra el mock
  y comprueba que el PDF carga.

### 5.5 La guía de integración en PDF (se hace al final)

**Cuándo:** **después de terminar las pantallas finales**: el login, el panel y las dos pestañas de Swagger. Así las
capturas muestran la web real y no un borrador.

**Plantilla**, con la misma apariencia que la web y el prototipo:

| Elemento | Cómo |
|---|---|
| Tipografía | **Inter** (`@fontsource/inter`, la que ya usa la web), con la escala de SG-01 |
| Colores | Los de `styles/twind.ts`. Portada en `primario` (#1e4680), enlaces en `enlace`, texto en `tinta` y `tinta-suave`, superficie blanca con bordes `borde` y cajas de `info-fondo`, `alerta-fondo` y `exito-fondo` para notas, avisos y consejos |
| Íconos | Los mismos SVG de Material Symbols Outlined de `IconoMaterial.vue` |
| Formato | A4 vertical, márgenes amplios. Encabezado con «Solventa · Guía de integración» y pie con la versión, la fecha y «página N de M» |
| Portada | El nombre «Solventa» como en el encabezado de la web, el título «Guía de integración para socios de distribución», la versión de la API (v1), la fecha y una captura del panel con un marco de navegador |
| Componentes | Tarjetas con borde como las del panel; pastillas de método HTTP como las del prototipo; bloques de código en monoespaciada sobre `fondo` con borde; pasos numerados en círculos `primario`; capturas con marco y **llamadas numeradas** encima (círculos con número que remiten al texto) |

**Contenido**, con texto, imágenes y capturas:

1. **Qué puedes hacer con Solventa:**
   - vender la póliza de vida hipotecario desde tu app;
   - cómo se gana la comisión;
   - qué hace Solventa y qué hace tu app (un diagrama de tres carriles: tu app, el titular y Solventa).
2. **Entra al portal:** captura de W07-01 con llamadas (ID de socio, clave y ayuda).
3. **Conoce tu panel:** captura de W07-02 con llamadas en las tres tarjetas, el selector de entorno, consumo y ventas.
4. **Tus credenciales:** las 4 claves; clave larga frente a token corto; cómo pedir el token (`POST /v1/token`);
   regenerar sin romper la integración. Lleva la captura de la tarjeta de credenciales.
5. **Prueba sin riesgo:** captura de la pestaña «Pruebas (sandbox)», los documentos de prueba, el código `000000` y un
   ejemplo completo que se puede copiar.
6. **Vende una póliza paso a paso:**
   1. consentimiento;
   2. cotización;
   3. aceptar con el nombre y el correo del titular;
   4. código;
   5. emitir;
   6. el titular firma y paga desde su correo;
   7. consultar el estado;
   8. descargar la póliza.

   Es un diagrama del recorrido con los estados y lo que ve el titular. Los ejemplos salen de los `examples` del
   contrato, **sin datos de las fuentes**.
7. **Pasa a producción:** captura de la pestaña «Producción», el aviso del presupuesto y una lista de verificación
   antes de salir en vivo.
8. **Límites y errores:** 401, 404, 429 con `Retry-After`; nunca un 5xx; consulta periódica sin webhooks; cómo leer
   el estado del servicio del panel.
9. **Ayuda:** texto, sin enlace (decidido).

**Cómo se produce,** sin dependencias nuevas:

| Pieza | Detalle |
|---|---|
| Fuente | `apps/web/guia-socios/guia.html` y `guia.css` (versionados), con los textos en `guia.es.json` y `guia.en.json` |
| Capturas | `scripts/capturas-guia.mjs`: levanta `dev:mock` y captura con Chrome sin interfaz (protocolo de depuración) W07-01, W07-02, las dos pestañas de Swagger y los recortes de cada tarjeta, a 2× para que se vean nítidas, en los dos idiomas. Las llamadas numeradas van en el HTML, encima de la imagen, no pintadas sobre ella |
| PDF | `npm run guia:pdf` imprime `guia.html` con Chrome sin interfaz (`--print-to-pdf`) y deja `public/socios/guia-integracion-es.pdf` y `-en.pdf`. Los PDF se versionan: el CI no los genera |
| Revisión | Antes de publicarla, Felipe revisa el PDF en las dos lenguas. Si una pantalla cambia, se vuelven a correr las capturas y el PDF |

### 5.6 Estado del sistema para el BACKOFFICE (nuevo, sin Figma, aprobado)

| # | Qué implementar | Detalle |
|---|---|---|
| 1 | Tarjeta en G-02b | Una **tercera tarjeta**, «Estado del sistema», con el texto «Salud, disponibilidad y latencia por servicio» e ícono `monitor_heart`, con el estilo de las otras dos |
| 2 | Pantalla nueva | `/operador/estado`, id propuesto **W07-04**, `roles: ['BACKOFFICE']`, con «‹ Volver a Inicio» como W05-01 |
| 3 | Contenido | <br>• **Arriba:** la misma caja de estado y las métricas del panel del socio, con el selector de ventana. <br>• **Tabla por micro**, con la tabla de W05-01: micro, peso, salud (`Badge` con %), disponibilidad, latencia media, p95, `/health` y «sin tráfico». <br>• **Tabla de APIs externas:** proveedor y estado del circuito («Cerrado», «Medio abierto» o «Abierto», como `Badge` de éxito, alerta o error) |
| 4 | Datos | La consulta GraphQL `estadoSistema(ventana)` (v0.18), solo para BACKOFFICE |
| 5 | Recarga | Cada 30 s mientras está abierta, como W05-01 (`silencioso: true`) |
| 6 | Pruebas | <br>• Vitest: tablas, colores y «sin tráfico». <br>• Cypress: `w07-04.cy.ts` |

## 6. Orden de implementación en el front

| Paso | Qué | Espera a |
|---|---|---|
| 1 | Sincronizar el contrato hasta lo publicado (2, paso 0.1) | — |
| 2 | **W01-01**: campos del ASESOR (sección 3) | La v0.17, para el envío en `aceptarOferta`. La captura y la validación se pueden hacer antes |
| 3 | **W05-01**: medio de pago y acciones por origen (sección 4) | La v0.17 (`Cobro.origen` y `Cobro.medio`) |
| 4 | Piezas comunes de W07 e íconos nuevos, y **W07-01** (5.1 y 5.2) | La v0.18 y `socios-v1.yaml`. Con mocks se puede empezar antes |
| 5 | **W07-02** (5.3) | Paso 4 |
| 6 | **W07-03** con `Pestanas` y las dos pestañas de Swagger (5.4). La de la guía muestra un PDF provisional | Paso 4 |
| 7 | **Estado del sistema** (5.6) | `estadoSistema` en la v0.18 |
| 8 | **La guía en PDF** (5.5): capturas, plantilla, PDF en ES y EN, y revisión de Felipe | Pasos 4 a 6 **terminados** |
| 9 | E2E contra staging de lo que ya esté desplegado | Liberación del backend a `main` |

Antes de reportar cada paso: `npm run typecheck`, `lint`, `formato:verificar`, `test` y `build` en `apps/web`, y verla
en el navegador con `dev:mock`.

## 7. Decisiones de Felipe (2026-10-27)

| # | Tema | Decisión |
|---|---|---|
| 1 | Partes sin Figma (regla 3) | **Aprobadas** y construidas solo con componentes de `src/components/ui/`: <br>• el selector de entorno; <br>• las secciones «Consumo por API» y «Ventas y comisiones»; <br>• la pantalla «Estado del sistema»; <br>• la confirmación antes de regenerar una clave |
| 2 | «¿Problemas con tu llave API?» | **Solo texto**, sin enlace |
| 3 | Token del socio | En **`sessionStorage`** (`solventa.tokenSocio`), como el JWT de usuario |
| 4 | Tipos del contrato REST | **`openapi-typescript`** como dependencia de desarrollo |
| 5 | Cómo se construye el portal | **Solo se arman pantallas** con lo que ya tiene el repo: componentes, tipografía, colores, íconos y patrones. La única pieza nueva de la librería es `Pestanas.vue` |
| 6 | Login del socio | Se guía por el login del prototipo y por el G-01 implementado, del que reutiliza estructura, componentes y comportamiento |
| 7 | Documentación | Una pantalla aparte, a la que se llega con un botón del panel. Conserva el estilo y la navegación del prototipo, con **tres pestañas**: la guía en PDF embebido y los Swagger de pruebas y de producción embebidos |
| 8 | Guía en PDF | Plantilla con la apariencia de la web y del prototipo, con texto, imágenes y capturas, **hecha después de terminar las pantallas finales** |
| 9 | Nombres de las pestañas | Propuestos con criterios de UX (5.4): «Guía de integración», «Pruebas (sandbox)» y «Producción», en ese orden y con la guía por defecto. **Confirmados por Felipe el 2026-10-27** |

**Sigue abierto:** confirmar los íconos y textos de los campos nuevos de W01-01 (`person` y `mail`) y de la columna
«Medio de pago» de W05-01. No bloquea: se ajustan al revisarlos en el navegador.
