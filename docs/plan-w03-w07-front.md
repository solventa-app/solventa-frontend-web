# Plan del front para W03 (firma y pago), los ajustes de W01 y W05, y HU-W07

> **Estado: borrador (2026-10-27), sin código.** Las decisiones las tomó Felipe el 2026-10-26 y el 2026-10-27 al
> revisar HU-W07 (KAN-30). El plan completo, con el backend, el orden y los cambios en Jira, está en
> [`../solventa-backend/docs/plan-hu-w07-y-ajustes.md`](../../solventa-backend/docs/plan-hu-w07-y-ajustes.md). El detalle
> de W03 está en el **bloque 9** de [`../solventa-backend/docs/plan-completar-hu-w03.md`](../../solventa-backend/docs/plan-completar-hu-w03.md),
> con las decisiones W03-19 a W03-31.
>
> Si este documento choca con esos planes, ganan ellos y se corrige este. Las decisiones marcadas **Propuesta** esperan
> el visto bueno de Felipe.

**Contrato.** La web de W01, W03 y W05 usa la **v0.17**, y el portal de socios la **v0.18** más
`contracts/openapi/socios-v1.yaml`. Ninguna existe todavía: hasta que el backend las publique, se trabaja con mocks
(regla 2).

Figma `Solventa-web-Final` (`yKWD8jrwERtJkuSj0mk0Gz`):

| Grupo | Pantallas (nodo) |
|---|---|
| W01 | W01-01 `2001:1016` |
| W03 | W03-02 `2001:1832`, W03-02b `2020:32`, W03-03 `2001:1969`, W03-04 `2001:2057` y W03-05 `2001:2128` (no se construye) |
| W07 | W07-01 `2001:3340`, W07-02 `2001:3562` y W07-03 `2001:3434` |

## 1. Decisiones que afectan al front

| Tema | Decisión |
|---|---|
| Quién inicia | **Por ahora siempre hay un ASESOR.** Él acepta la oferta, pide el código y pulsa «Emitir». El autoservicio del CLIENTE queda fuera |
| Identidad | Se envía un **código al correo** del cliente, que el ASESOR **digita en el modal** cuando el cliente se lo dicta. Solo con el código válido se habilita «Emitir» |
| «Emitir» | Lo decide UNDER (puede rechazar o mandar a revisión). Si aprueba, se envía al cliente un **enlace de un solo uso, vigente 30 min**, que cubre todo hasta la póliza emitida y la descarga del PDF. Un enlace nuevo anula el anterior. Vencido, se muestra un **estado vacío**, el asesor reenvía y el cliente **retoma donde iba** |
| El token del enlace | Viaja en el **fragmento** (`/firma#t=…`), que el navegador no envía al servidor. La web lo lee y lo manda en la cabecera `X-Enlace-Firma`. **No se guarda en `localStorage`** (Propuesta) |
| Firma | Página pública, **sin perfil ni migas**, con el contrato en **PDF**, la casilla de términos y tres modos de firma: <br>• trazo con el mouse (se envía como PNG); <br>• imagen **PNG o JPG**, que la web valida antes de enviar (tipo, tamaño y fondo blanco o transparente) y que el backend valida otra vez; <br>• **nombre estilizado** |
| Pago | «Pagar» lleva a la **página de la pasarela**, que **no es de Solventa**: es `stubs/pasarela` del backend, en su propio origen, y simula a PayU o Stripe. **La web nunca captura ni ve un dato de tarjeta.** Medios: solo tarjeta de **crédito o débito**, **sin PSE**. La sesión de pago dura 10 min y se puede volver a abrir |
| Retorno | La pasarela vuelve a `/pago/retorno?sesion=…`. **El resultado no se lee de la URL**: la web llama a `confirmarPago` y el backend lo confirma con la pasarela |
| Fallos | **Falla la pasarela:** «Reintentar» (el backend concilia antes de cobrar) y, al **3.er fallo seguido**, «Pagar con otra tarjeta». **Rechazo:** «Pagar con otra tarjeta» sin perder la firma. Nunca un error técnico ni un 5xx (regla 5) |
| Emisión | Con el pago confirmado, la póliza queda emitida **en la misma respuesta** y se muestra W03-04. El correo con el PDF firmado sale en segundo plano |
| Contacto | Con un ASESOR, el nombre y el correo los da W01-01. Con un CLIENTE, el formulario los rellena desde su perfil. Se envían en `aceptarOferta`, **no al cotizar** |
| Registro de CLIENTE | Cédula y correo **obligatorios**. Los usuarios de prueba se recrean |
| Socios (W07) | El socio revende la póliza y hace el papel del asesor por la API. El titular firma y paga con **el mismo enlace y las mismas pantallas** de W03. El portal no cambia frente a la v2 |

## 2. Pantallas y piezas

| Historia | Pantalla o pieza | Qué hacer |
|---|---|---|
| W01 | W01-01 Solicitud y consentimiento | Sumar **nombre completo y correo**. Es un criterio nuevo de KAN-24. Con un CLIENTE, se rellenan desde su perfil |
| W03 | Registro de CLIENTE | Cédula y correo obligatorios |
| W03 | **Modal del asesor** (nuevo, no está en Figma) | <br>• Correo del cliente enmascarado y editable. <br>• «Enviar código» y el campo del código. <br>• **«Emitir»**. <br>• «Reenviar enlace». <br>• Los mensajes de UNDER (rechazo y revisión) |
| W03 | W03-02 Firma electrónica (página del enlace) | <br>• Ruta pública, sin perfil ni migas. <br>• Contrato en **PDF** en lugar del texto de cláusulas. <br>• Casilla de términos y firma en tres modos. <br>• Estado vacío si el enlace venció |
| W03 | W03-02b Confirmar firma y autorización de cobro | <br>• Sin perfil ni migas. <br>• Corregir los textos: el cobro va a la **tarjeta**, no «junto con la cuota del crédito», y la póliza se emite **al pagar**, no al confirmar la firma |
| W03 | W03-03 Firma confirmada | <br>• «Ir al inicio» pasa a ser **«Pagar»**, que llama a `iniciarPago` y redirige a la pasarela. <br>• Quitar «Validación biométrica aprobada», «la emisión y el cobro continúan en segundo plano» y el avance automático |
| W03 | **Retorno de la pasarela** (nuevo) | `/pago/retorno?sesion=…` → `confirmarPago` → W03-04. Si falló: reintentar o pagar con otra tarjeta. Si la sesión venció, se abre otra |
| W03 | W03-04 Póliza emitida | <br>• Quitar «Ir al inicio». <br>• **«Descargar documento» abre el PDF en una pestaña nueva**, autorizado por el token del enlace. <br>• Revisar «Ver detalle de fuentes consultadas», porque exige sesión |
| W03 | W03-05 Documento de póliza | **No se construye** |
| W05 | W05-01 Conciliación de pagos | Columnas de origen del cobro y de marca y tipo del medio (Propuesta) |
| W07 | Portal de socios: W07-01, 02 y 03 | Lo del bloque 7 de la v2 del plan de W07 (rama `feat/KAN-30-socios-api` del backend). Ingreso con la clave del socio y un panel con seis pestañas: <br>• credenciales; <br>• estado (barra de salud general, disponibilidad y latencia); <br>• consumo; <br>• ventas y comisiones; <br>• Swagger de producción; <br>• modo prueba |
| W07 | Estado del sistema (BACKOFFICE) | La barra general y la tabla por micro, con `estadoSistema` |

**La página de la pasarela no se construye en este repo:** es parte del stub, en el backend. Aquí solo se redirige a
ella y se recibe el retorno.

## 3. Reglas de este repo que aplican

- **Regla 7 (sin datos personales en la URL ni en `localStorage`):**
  - el token del enlace va en el fragmento, nunca en la ruta ni en el *query*;
  - el correo se muestra enmascarado;
  - la imagen de la firma no se guarda en el navegador.
- **Regla 5:** un fallo de la pasarela o del enlace es un estado diseñado, nunca un error técnico.
- **Regla 3:** el modal del asesor y el retorno de la pasarela **no están en Figma**. Hay que diseñarlos antes de
  construirlos, o acordar con Felipe que se construyan con los componentes de `src/components/ui/`.

## 4. Orden

El front de W01 y W03 arranca con el contrato **v0.17** (paso 1 del plan completo), y el portal de W07 con la
**v0.18** (paso 8). Mientras el backend no los integre, se trabaja con mocks. Para la pasarela, el mock simula el
retorno con cada resultado: aprobado, rechazado, falla y sesión vencida.
