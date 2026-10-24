# Plan de ejecución HU-W04 · Siniestros asistidos y peritaje (KAN-27)

> Plan para construir la HU-W04 en el front web, consumiendo un dummy de siniestros que vive en el backend.
> - **Pantallas:** bandeja de siniestros, detalle con la galería de evidencia, derivar a perito, aprobar, rechazar con motivo y las tres confirmaciones.
> - **Backend:** un dummy GraphQL con datos y fotos de prueba, que por ahora corre solo en local.
> - **Ejecución:** dos agentes, un dev senior de front que implementa y un diseñador web que resuelve las dudas visuales y de negocio. Un PR por bloque.

## Contexto
HU-W04 (KAN-27, 13 pts) es la mesa de siniestros del operador de back-office. Figma `Solventa-web-Final`
(`yKWD8jrwERtJkuSj0mk0Gz`), sección "HU-W04":

| Id | Frame | Nodo |
|---|---|---|
| W04-01 | Bandeja de siniestros pendientes | 2001:2316 |
| W04-02 | Detalle del siniestro | 2001:2503 |
| W04-02b | Asignar perito (derivar) | 2001:2721 |
| W04-03a/b/c | Confirmación de aprobación, rechazo y derivación | 2001:2865, 2001:2963, 2001:3068 |

**Lineamientos de diseño:**
- SG-01 Guía de estilos (2028:35), incluida su lista de "Qué no hacer": no inventar secciones, botones ni datos; un solo botón primario por pantalla; el estado nunca va solo con color; Material Symbols Outlined; formato es-CO.
- Librería de componentes (2006:2).
- Las pantallas de HU-W01 y W05-01 (2001:3156), que son la referencia de tabla del back-office.

**Por qué un dummy:** el backend no tiene siniestros. Se construye un **dummy autónomo** que el front consume como si fuera real. Cuando exista el servicio real, solo cambia una URL.

**Ramas:**
- Front: `feat/KAN-27-siniestros-asistidos-peritaje`, ya creada desde `develop`.
- Backend: `feat/KAN-27-mock-stub-siniestros`, a crear desde `develop` del backend.

Un PR por bloque.

## Decisiones cerradas
- **Dónde vive el dummy:** microservicio propio en el backend, sin BD, sin tokens y sin llamar a nada más. No se usa el BFF, el gateway ni código de otras ramas. Expone su GraphQL en `/graphql/siniestros`.
- **Cómo lo alcanza el front:** por el proxy de Vite en local y por un rewrite de Vercel en staging.
- **Por ahora solo local** (docker compose). El despliegue a staging en Cloud Run queda **diferido**, no descartado: se hará después con la excepción `dummy` para que pueda ser `publico` y el rewrite de Vercel. Ver la sección "Diferido".
- **Estado de las acciones:** aprobar, rechazar y derivar cambian el estado en memoria. `POST /graphql/siniestros/control/reiniciar` vuelve a los datos del JSON.
- **Datos de prueba:**
  - 10 siniestros, de 2 a 7 fotos cada uno, de la misma escena.
  - Choques simples: bumper, farola, rayón, espejo; de día y de noche.
  - Lugares reales de Colombia, por ejemplo la salida por la Calle 80 en el puente de Guadua o la vía Silvania km 13.
  - **Solo fotos descargadas con licencia libre** (Pexels, Unsplash, Wikimedia), con la fuente, el autor y la licencia de cada una en `CREDITOS.md`. Las facturas de taller se dibujan por código (PIL), sin créditos de IA.
- **Rechazo:** un modal con selector de motivo y comentario opcional (máximo 500 caracteres). "Confirmar rechazo" queda deshabilitado hasta elegir el motivo. El estilo sale de `ModalCerrarSesion` y de los campos de formulario.
- **Migas:** `MigasDePan` pasa a admitir varios niveles, sin romper el uso actual de `seccion` + `aInicio`.
- **Criterios CA-W04-xx:** los derivo de Figma y quedan marcados como "propuestos" en `docs/plan-frontend.md` para validarlos contra Jira.

## Esquema de dos agentes (ejecución)
Nuevos en `.claude/agents/`, con el formato de `web-builder.md` (frontmatter y secciones en español):

**`dev-front-senior.md`** (`model: opus`)
- Herramientas: Read, Write, Edit, Bash, Glob, Grep y las de lectura de Figma (`get_design_context`, `get_screenshot`, `get_metadata`).
- Implementa cada bloque del front contra Figma, la guía SG-01 y el dummy.
- Cuando tiene una duda de negocio o visual, la devuelve como lista ("Dudas para el diseñador") en vez de inventar.

**`disenador-web.md`** (`model: sonnet`)
- Herramientas: Read, Glob, Grep y las de lectura de Figma. No escribe código.
- Al empezar cada bloque entrega la especificación visual: textos literales, tokens, estados y qué componentes reutilizar.
- Responde las dudas del dev y revisa la fidelidad contra el frame.

**Flujo por bloque:** diseñador (especificación) → dev (implementa) → yo llevo las dudas al diseñador (`SendMessage`) y sus respuestas de vuelta al dev → el diseñador revisa con capturas → verificación final mía.

El bloque 0 (backend) lo ejecuto yo. El diseñador define el relato de los 10 siniestros.

**Commits y push (autorizados para esta historia):**
- El dev hace commit y push a su rama de trabajo al cerrar cada bloque, después de que la verificación pase.
- Lo mismo aplica a mis commits del bloque 0 en la rama del backend.
- **La autoría es solo tuya:** se usa el `user.name` y `user.email` de git ya configurados (Daniel Felipe Urrego Riveros), sin cambiarlos.
- **Sin coautorías ni menciones a asistentes de IA:** sin `Co-Authored-By`, sin "Generated with…" y sin menciones en commits, cuerpos de commit, ramas ni código. Esto queda escrito como regla en `dev-front-senior.md`.
- Mensajes con Conventional Commits en español y la clave de Jira: `feat(web): KAN-27 …` en el front y `feat(stubs): KAN-27 …` en el backend, como exigen los `pr-titulo.yml`.
- Push solo a las ramas `feat/KAN-27-*`. Nunca a `develop` ni a `main`, sin force-push. Abrir PRs sigue siendo decisión tuya.

## Bloque 0 · Backend `stubs/siniestros`
Rama del backend. Título del PR: `feat(stubs): KAN-27 dummy de siniestros para HU-W04`.

**Patrón a copiar:** `stubs/firma/`.
- `app/main.py` con `create_app()`, `GET /health`, `observabilidad.py` copiado y `Instrumentator` para `/metrics`.
- Dockerfile `python:3.14-slim` fijado por digest, puerto 8105.
- `requirements.in` con versiones `==`, y `.txt` generado con `scripts/compilar-requirements.sh`.
- Pruebas con `TestClient`, ruff y README con el mismo formato.

**GraphQL:** `strawberry-graphql[fastapi]==0.336.0`, el mismo pin del BFF. Esquema code-first montado en `/graphql/siniestros`.

**Rutas:**
- `GET /graphql/siniestros/medios/{archivo}` con `StaticFiles` (devuelve las URL relativas que usa el front).
- `POST /graphql/siniestros/control/reiniciar`.

**Datos:**
- `app/datos/siniestros.json`, `app/datos/medios/*.jpg|png` y `app/datos/CREDITOS.md`.
- El Dockerfile ya copia `app/`.

**Borrador del esquema** (montos como `Monto { valor: String!, moneda: String! }`, igual que el contrato principal):
- **Tipos y enums:**
  - `enum EstadoSiniestro { PENDIENTE EN_REVISION APROBADO RECHAZADO }`. No hay estado `DERIVADO`: derivar a perito deja el siniestro **EN_REVISION**, con el perito en la resolución.
  - `enum MotivoRechazo { EVIDENCIA_INSUFICIENTE FUERA_DE_COBERTURA POLIZA_NO_VIGENTE INCONSISTENCIA_EN_RELATO OTRO }`
  - `Siniestro`, con estos campos:
    - Identificación y estado: `id`, `radicado`, `estado`.
    - Asegurado: `asegurado { nombre documento }`.
    - Póliza: `poliza`, resuelta desde `polizas.json` (ver "Pólizas de prueba"). Las piezas propias del siniestro (cobertura aplicada, entidad acreedora) van en el siniestro.
    - Fechas: `ocurridoEn` y `notificadoEn`.
    - Hecho: `ubicacion { descripcion ciudad latitud longitud }`, `descripcion` y `sumaReclamada`.
    - Plazo: `venceDictamenEn`.
    - Evidencia y validaciones: `evidencias[] { id tipo(FOTO|DOCUMENTO) titulo archivo url registradaEn geoetiquetada nota }` y `verificaciones[] { descripcion cumple }`.
    - Resultado: `resolucion`.
  - `Resolucion`, con estos campos:
    - Comunes: `tipo`, `resueltaEn` y `notificacion`.
    - Rechazo: `motivo` y `comentario`.
    - Aprobación: `indemnizacion`, `metodoTransferencia` y `plazoDispersion`.
    - Derivación: `perito`, `instrucciones` y `vencimientoInforme`.
  - `Perito { id nombre ciudad red registro tiempoRespuestaDias }`.
- **Consultas:** `siniestros(estado)`, `siniestro(id)` y `peritos(siniestroId)` (cada perito con su `vencimientoInforme` calculado).
- **Mutaciones:**
  - `aprobarSiniestro(id)`
  - `rechazarSiniestro(id, motivo, comentario)`
  - `derivarSiniestro(id, peritoId, instrucciones)`
  - Las tres devuelven `ResultadoResolucion = Siniestro | ErrorSiniestro { mensaje }`.
  - Responden error de negocio al resolver un siniestro ya resuelto y cuando las instrucciones pasan de 500 caracteres.

**Pólizas de prueba (basadas en la tabla de pólizas emitidas del backend):**
- La fuente es la tabla `polizas` de `services/policy` (migraciones `0003_polizas.py` y `0004_poliza_notificada.py`) y el tipo GraphQL `Poliza`. Hoy solo existen en las ramas abiertas `feat/KAN-212-hu-w03-bloque-4-emision` y `feat/KAN-215-hu-w03-bloque-5-pdf-notificacion`.
- Se usa solo como referencia de forma; no se importa código de esas ramas.
- `app/datos/contrato-poliza.json` guarda el contrato de datos que copia el mock:
  - La rama y el commit de origen y los archivos de migración.
  - Las columnas de la tabla con su tipo y nulabilidad: `id`, `propuesta_id`, `numero`, `cliente_id`, `estado`, `vigencia_desde`, `vigencia_hasta`, `creado_en` y `notificada_en`.
  - Los campos del tipo `Poliza`: `id`, `numero`, `estado`, `vigenciaDesde`, `vigenciaHasta`, `prima`, `cobertura` y `documentoUrl`.
  - Qué campos agrega el mock y no están en el origen (ramo), marcados como tal.
- `app/datos/polizas.json`: 10 pólizas EMITIDA con esa forma, una por siniestro, con número de formato `VH-2026-00xxxxx`.
- Una prueba del dummy valida que `polizas.json` cumple `contrato-poliza.json`.

**Contrato:**
- El SDL se publica en `contracts/graphql/siniestros.graphql`.
- Prueba de paridad entre el SDL y strawberry, con el patrón de `services/bff/tests/test_esquema_contrato.py`.
- Entrada nueva en `contracts/CHANGELOG.md`, marcada como dummy (afecta al frontend: sí).

**Registro del servicio:**
- `docker-compose.yml`: `stub-siniestros` con `<<: *servicio` y puerto `8105:8105`.
- `.github/servicios.json`: `{ "nombre":"stub-siniestros", "ruta":"stubs/siniestros", "puerto":8105, "dummy":true, "entorno":{"TRAZAS_GCP":"true"} }`, **sin** `publico`.
  - Es obligatorio: `validar_servicios.py` exige que todo `stubs/*` con Dockerfile esté en el manifiesto.
- `scripts/validar_servicios.py`: un servicio con `"dummy": true` queda exento de la regla "nadie lo llama" (líneas 65-69), con su prueba. La regla de `publico` no se toca.
- `scripts/seleccionar_servicios.py`: excluye los servicios `dummy` del despliegue a staging mientras siga diferido, con su prueba.
- Filtro en `ci.yml` y entradas `pip` y `docker` en `dependabot.yml`.
- `docs/`: README del stub y una nota en `convenciones.md` sobre los servicios dummy (solo locales por ahora).

**Verificación:**
- `python -m pytest` y `ruff check .` en el stub.
- `python scripts/validar_servicios.py` y `scripts/validar_contratos.py`.
- `docker compose --profile servicios up stub-siniestros --wait`, y luego un `curl` a `/health`, a la consulta `siniestros` y a una imagen.

## Bloque 1 · Front fundaciones
**Contrato y tipos:**
- `scripts/contrato.mjs` también sincroniza `contracts/graphql/siniestros.graphql` en `contrato/siniestros.graphql`.
- `apps/web/codegen.ts` suma un segundo `generates` que produce `src/graphql/tipos-siniestros.ts`, con la misma configuración.
- `ci-web.yml` también revisa con `git diff` ese archivo.

**Cliente:** `src/graphql/cliente.ts` gana un 4.º argumento opcional `opciones?: { endpoint?: string; conToken?: boolean }`.
- Por defecto `'/graphql/web'` y `true`, así ningún llamado actual cambia.
- Siniestros llama con `{ endpoint: '/graphql/siniestros', conToken: false }`: no se envía el JWT a un servicio público.

**Proxy y entorno:**
- `vite.config.ts`: una entrada `'/graphql/siniestros'` con `target: env.VITE_SINIESTROS_URL || 'http://localhost:8105'`, **antes** de la de `'/graphql'`.
- `env.d.ts` y `.env.example`, con la variable nueva.

**Mocks para Vitest:**
- `src/mocks/siniestros.ts` con datos reducidos y `graphql.link('*/graphql/siniestros')`.
- Se registran solo en `mocks/node.ts`. En `dev:mock`, siniestros va al dummy real (`docker compose up stub-siniestros`).
- Incluye `restablecerSiniestrosDePrueba()`.

**Composable `src/composables/useSiniestros.ts`:**
- Sigue el patrón de `useConciliacion.ts` (estado singleton, `fetchFn` inyectable, errores que se convierten en mensaje seguro).
- Guarda el último resultado de una acción para las confirmaciones, como hace `useCotizacion` con `resultado`.

**Router (`src/router/pantallas.ts`):**
- `historia` suma `'HU-W04'` y hay un campo opcional `rutaEjemplo` para rutas con `:id`.
- Rutas, todas con rol `BACKOFFICE`:
  - `/operador/siniestros`
  - `/operador/siniestros/:id`
  - `/operador/siniestros/:id/derivar`
  - `/operador/siniestros/:id/aprobado`, `/rechazado` y `/derivado`
- Ajustar `tests/pantallas.test.ts` e `IndicePantallas.vue` para que usen `rutaEjemplo`.

**Componentes de la librería (`components/ui`):**
- `MigasDePan` con `niveles`.
- `CampoSeleccion` y `CampoAreaTexto` (con contador "0 / 500"), con el mismo estilo y la misma accesibilidad que `CampoFormulario`.
- `EstadoOperador`, la pastilla "Operador de back-office activo".
- Íconos nuevos en `IconoMaterial`, cada uno justificado: inbox, filter_list, arrow_forward, location_on, engineering, check, close, timer, send.
- Las insignias de estado reutilizan el mapa de `ConciliacionDePagos`, o `Badge` si el diseñador lo valida.

**Resto:**
- `HomeOperador.vue`: la tarjeta "Siniestros" pasa a ser `RouterLink`. Actualizar `tests/pantallas-w05.test.ts:45-54` y `e2e/.../g-02b.cy.ts:50-54`.
- i18n: claves `siniestros.*` en `es.ts` y `en.ts`; ningún texto queda fijo en las plantillas.

## Bloques 2 a 5 · Pantallas
Cada pantalla es una vista en `src/views/` con `data-pantalla` y sus estados de carga, vacío, error y "no encontrado" (regla 5).

**Bloque 2 · W04-01 `BandejaSiniestros.vue`** (patrón de `ConciliacionDePagos.vue`):
- Chips de filtro Todos, Pendiente y En revisión. "Todos" lleva el contador. El chip **"Derivado"** de Figma **se omite**, porque derivado y en revisión son el mismo estado. Las filas Aprobado y Rechazado solo aparecen en "Todos".
- "Total en cola", tabla de cliente con radicado, fecha, estado y "Abrir →", y pie "Mostrando X de Y".

**Bloque 3 · W04-02 `DetalleSiniestro.vue`:**
- Galería de evidencia en tarjetas: imagen, pastilla "Geoetiquetada", etiqueta con el nombre del archivo y pie con fecha, coordenadas o nota. Si la imagen falla, se ve "Imagen no disponible".
- Tarjeta de datos del cliente y la póliza, con la suma reclamada.
- "Conformidad regulatoria SFC" con las verificaciones del dummy.
- "Tiempo restante para dictamen", calculado desde `venceDictamenEn`.
- Barra de acciones: Derivar (secundario), Rechazar (destructivo con borde) y Aprobar (el único primario).
- Un siniestro APROBADO o RECHAZADO se ve en solo lectura.
- Un siniestro EN_REVISION que ya tiene perito muestra el perito asignado y deshabilita "Derivar"; aprobar y rechazar siguen activos. El diseñador valida esta regla.

**Bloque 4 · W04-02b `DerivarSiniestro.vue` y W04-03c `ConfirmacionDerivacion.vue`:**
- Selector de perito, instrucciones con contador y el tiempo y vencimiento del perito elegido.
- Cancelar vuelve al detalle; Confirmar dispara `derivarSiniestro` y lleva a la confirmación.

**Bloque 5 · Aprobar y rechazar:**
- `ModalRechazo.vue` (en `components/`) toma la base de `ModalCerrarSesion` y agrega lo que le falta: foco atrapado dentro del modal, foco devuelto al cerrar y Escape.
- `ConfirmacionAprobacion.vue` (W04-03a) y `ConfirmacionRechazo.vue` (W04-03b).
- Las confirmaciones siguen el patrón de tarjeta de `OfertaCompleta.vue`. Si se entra por URL sin un resultado en memoria, muestran el estado vacío con "Volver a la bandeja".

**Antes de cada pantalla:** `get_design_context` del nodo, cargando antes la skill `figma:figma-design-to-code`. Un dato que falte en el dummy se agrega al dummy; no se inventa en el front.

## Bloque 6 · Cierre
**Pruebas:**
- Vitest: `tests/useSiniestros.test.ts` y `tests/pantallas-w04.test.ts`, con el patrón de `pantallas-w05.test.ts`.
- Cypress por pantalla: `e2e/cypress/e2e/pantallas/w04-*.cy.ts` con `describeConMocks` y `visitarComo('BACKOFFICE', …)`, más un `cy.request` a `/control/reiniciar` en `beforeEach`.
- Cypress por historia: `w04-siniestros.cy.ts` (bandeja → detalle → derivar, aprobar y rechazar), solo contra local.

**Documentos:**
- `docs/plan-frontend.md`: tabla de W04 con sus CA-W04 propuestos.
- `CLAUDE.md`: sección Estado.
- `README.md`: cómo levantar el dummy.
- Evidencia: `docs/evidencias/W04-<fecha>.md`.

## Diferido: despliegue a staging (se hará después, no ahora)
- Backend:
  - En `servicios.json` agregar `"publico": true` al dummy.
  - En `validar_servicios.py`, permitir `publico` solo a los servicios `dummy`.
  - Quitar la exclusión del despliegue en `seleccionar_servicios.py`.
  - Terraform ya da `allUsers` a los públicos (`infra/servicios.tf:281-289`).
- Front:
  - En `apps/web/vercel.json`, el rewrite `/graphql/siniestros/:path*` hacia la URL de Cloud Run, **antes** de `/graphql/:path*`.
  - El spec `w04-staging.cy.ts`.
  - La evidencia contra staging.

## Verificación de cada bloque del front
- En `apps/web`: `npm run typecheck`, `lint`, `formato:verificar`, `test` y `build`.
- Verla en el navegador con `npm run dev:mock` y el dummy levantado.
- Captura comparada contra el frame de Figma (`get_screenshot`), revisada por el diseñador.
- Cypress con `unset ELECTRON_RUN_AS_NODE`.

Si la verificación pasa, se hace commit y push del bloque a su rama, con la autoría del responsable y sin coautorías.

## Pasos manuales del responsable (felipe)
1. Abrir y mergear los PRs (los commits y push los hacen los agentes).
2. Validar los CA-W04 propuestos contra Jira (KAN-27).
3. Decidir cuándo se retoma staging (sección "Diferido").
