# Validación del flujo de licitaciones — hallazgos y planificación de especificaciones

Documento de planificación, no de reglas vigentes. Las reglas que hoy rigen están en [`flujos/09-licitaciones.md`](../../flujos/09-licitaciones.md) y los puntos ya conocidos en [`flujos/09-licitaciones-pendientes.md`](../../flujos/09-licitaciones-pendientes.md).

- **Fuente:** `08-guia-de-uso-licitaciones-2-hugo.pdf`, 5 páginas, adjunto por el usuario el 24 de noviembre de 2026.
- **Extracción:** las observaciones no están en el texto imprimible del PDF. Se leyeron los objetos de anotación (`/Text` y `/Highlight`) del archivo: 22 anotaciones con texto de autor y 15 globos `/Popup` sin contenido, que se descartaron.
- **Autores de las notas:** `ariel` (notas de texto, 21 y 22 de noviembre de 2026) y `alelex10` (resaltados, 22 y 23 de noviembre de 2026).
- **Estado:** los 22 hallazgos del PDF y el requerimiento H-23 tienen su decisión o estado registrado al 24 de noviembre de 2026. Nada se implementó ni se commiteó: este documento es solo planificación.
- **Destino:** este documento alimentó cuatro issues agrupadas por unidad de trabajo (guido-pasciucco/InnovaLab-E10#306 a #309). Los hallazgos sin trabajo pendiente no generan issue.

## Decisiones tomadas

| Fecha | Hallazgo | Decisión | Efecto en las reglas |
| --- | --- | --- | --- |
| 24 nov 2026 | H-03 | Mantener el % de baja por ronda tal como está | Ninguno: siguen vigentes ES-01, RN-09, N-11 y N-18 |
| 24 nov 2026 | H-13 | Calcular el objetivo desde el objetivo anterior, sin mirar ofertas | Ninguno: N-18 queda vigente |
| 24 nov 2026 | H-05 | La duración de cada ronda y la cantidad de rondas son inputs configurables | Pendiente de bajar a reglas: RN-02, ES-03, check `tenders_round_hours_valid` y `tenders_round_count_valid`, formulario y tests |
| 24 nov 2026 | H-16 (b) | Diferido: se saltea el reloj controlado; se comprobará con inputs de 1 h por ronda | Ninguno por ahora; sigue vigente la manipulación de fechas de la guía de QA |
| 24 nov 2026 | H-21 | Mantener la vigencia de 7 días del enlace | Sin efecto desde el 24 nov por H-23: se eliminan los enlaces de invitación |
| 24 nov 2026 | H-04 | Mantener el tope de 20 insumos por licitación | Ninguno: RN-01 y N-17 quedan vigentes |
| 24 nov 2026 | H-06 | Mantener cualquier insumo del catálogo, packaging incluido | Ninguno: RN-01 y N-16 quedan vigentes |
| 24 nov 2026 | H-09 | Permitir varios borradores y continuar el que se elija | Pendiente de bajar a reglas y modelo: reemplaza N-31/D-12, cambia `tender_drafts`, la lista de Licitaciones y la publicación |
| 24 nov 2026 | H-10 | Diferido: registrar como idea a futuro | Ninguno por ahora: N-12 sigue vigente |
| 24 nov 2026 | H-22 | Diferido: nota completa a Ideas a futuro | Ninguno: ES-01 y N-12 siguen vigentes |
| 24 nov 2026 | H-07 | Dar por cubierta: el proveedor no ve el precio de catálogo | Ninguno: RN-07 y N-21 quedan vigentes; queda como verificación de QA |
| 24 nov 2026 | H-14 | Bug confirmado y registrado con diagnóstico; se convierte en issue con los demás | Sin cambio de código ahora; el hallazgo original se reformula |
| 24 nov 2026 | H-15 | Quitar "Cancelar licitación" del aviso sin ofertas | Pendiente de bajar a RN-18 y a la interfaz; la cancelación sigue en la ficha general |
| 24 nov 2026 | H-17 | Diferido: queda como idea; los avisos actuales se documentan como referencia | Ninguno: RN-23/N-24 y el servicio de avisos siguen vigentes |
| 24 nov 2026 | H-19 | Mantener la generación de órdenes de compra | Ninguno: ES-11, RN-15 y N-28 quedan vigentes |
| 24 nov 2026 | H-01 | Mantener el nombre "licitación de insumos" | Ninguno: el nombre del flujo y la documentación no cambian |
| 24 nov 2026 | H-23 (visibilidad) | Ver todas las licitaciones; se conservan RN-06/RN-07 (sin ofertas ajenas ni catálogo) | Implementado en #309: se cayó el filtro de invitaciones y se reescribió RN-05 |
| 24 nov 2026 | H-23 (alta) | Quitar enlaces, `supplier_links` y selección de invitados; alta pública | Implementado en #309: RN-05, RN-23, ES-09, D-01 a D-03 reescritos; H-21 sin efecto y H-02 absorbida |
| 24 nov 2026 | H-11 | Mantener el término "precio de partida" | Ninguno: RN-02 y la guía no cambian |
| 24 nov 2026 | H-12 | Mantener el término "oferta" | Ninguno: RN-10, botones y mensajes no cambian |
| 24 nov 2026 | H-08 | Mantener ronda y objetivo en el panel del proveedor | Ninguno: N-21 queda vigente; la frase "quitar ronda" no se adopta |
| 24 nov 2026 | H-18 | Mantener la negociación en cualquier momento | Ninguno: N-27 y RN-21 quedan vigentes |
| 24 nov 2026 | H-20 | Diferido: chat interno a Ideas a futuro | Ninguno: RN-21 sigue vigente |

La nota del equipo, literal: "lo dejamos tal como esta, anda anotando en algun archivos las desiciones tomadas, no comitees nada". La opción elegida fue *Mantener % por ronda*. El cálculo verificado en `lib/calc/tenderRounds.ts` y `lib/services/tenders.ts` es `objetivo anterior × (1 − %)`, sin intervención de las ofertas; queda documentado acá para decidir H-13 sobre un dato comprobado.

## Cómo leer los hallazgos

Cada entrada conserva la **cita literal** de la anotación, con su ortografía original, entre comillas de bloque. `Contexto` es el fragmento de la guía donde cae la nota (puede estar recortado por el resaltado). `Regla vigente` apunta a la regla actual que el hallazgo discute, para que la decisión se tome contra algo concreto.

---

## 1. Hallazgos

### H-01 · "requerimiento de compra de insumos"

- **Fuente:** pág. 1, resaltado de `alelex10`, 22 nov 2026 15:09.
- **Cita literal:**
  > requerimiento de compra de insumos
- **Contexto:** introducción de la guía, "...una licitación completa desde la aplicación: desde sumar a tus proveedores hasta generar la orden de compra."
- **Regla vigente:** el flujo se llama "Licitación de insumos" (`09-licitaciones.md`, encabezado).
- **Estado:** decidido el 24 nov 2026 — se mantiene "licitación de insumos" como nombre del flujo; sin cambios en interfaz ni documentación.

### H-02 · Registro único y participación en varias licitaciones

- **Fuente:** pág. 1, resaltado de `alelex10`, 23 nov 2026 14:41.
- **Cita literal:**
  > se pueden registraruna sola ves y participar en las licitaciones que quieran
- **Contexto:** paso 1, "El proveedor abre el enlace, completa sus datos (nombre del negocio, CUIT, contacto, teléfono, rubros) y crea su cuenta."
- **Regla vigente:** RN-22 y ES-08 (una sola cuenta, varios vínculos con emprendedores).
- **Estado:** absorbida por H-23 el 24 nov 2026 — con el alta pública y sin vínculos, una sola cuenta ve todas las licitaciones. RN-22/ES-08 quedan pendientes de reescritura; la verificación de interfaz se integra a esa especificación.

### H-03 · "% por ronda" contra "techo de precio"

- **Fuente:** pág. 2, nota de texto de `ariel`, 21 nov 2026 17:07.
- **Cita literal:**
  > No recuerdo que hablamos de %por ronda. Habíamos hablado de techo de precio.
- **Contexto:** paso 2, "Poné el % de baja por ronda: cuánto querés que baje el precio en cada ronda."
- **Regla vigente:** ES-01 y RN-09 (% de baja fijado al publicar, objetivo por ronda); N-11 (entre 0 y 50 %).
- **Estado:** decidido el 24 nov 2026 — se mantiene el % por ronda tal como está. Sin cambios en reglas ni código.

### H-04 · Tope de insumos por licitación

- **Fuente:** pág. 2, nota de texto de `ariel`, 21 nov 2026 17:01.
- **Cita literal:**
  > Yo lo limitaría hasta 10 insumos solamente.
- **Contexto:** "Entre 1 y 20 insumos por licitación."
- **Regla vigente:** RN-01 y N-17 (entre 1 y 20 insumos).
- **Estado:** decidido el 24 nov 2026 — se mantiene el tope de 20 insumos. RN-01 y N-17 quedan vigentes; sin cambios en código.

### H-05 · Duración de ronda: tope, mínimo y forma de configuración

- **Fuente:** pág. 2, nota de texto de `ariel`, 22 nov 2026 15:30.
- **Cita literal:**
  > Yo limitaría la duración de ronda por 12hs. De otro modo, no le da tiempo al proveedor de analizar y confirmar si puede vender esa cantidad y a ese precio.
  >
  > Hugo preferencias de 3 horas como minimo de cada ronda de licitacion
  >
  > Ale, hugo: lo mas configurable posible, sean inputs y no select
- **Contexto:** paso 2, "Elegí cuántas horas dura cada ronda (6, 12 o 24)".
- **Regla vigente:** ES-03, RN-02 y RN-09 (selector de 6/12/24 h; 6 h por defecto).
- **Estado:** decidido el 24 nov 2026 — "tanto la ora y la ronda son inputs configurabes": duración de ronda y cantidad de rondas pasan a ser campos configurables. No se adoptó ningún rango: el mínimo de 3 h y el tope de 12 h siguen siendo propuestas no decididas. Falta bajarlo a reglas y a la base.

### H-06 · Insumos habilitados para licitar

- **Fuente:** pág. 2, nota de texto de `ariel`, 21 nov 2026 17:07.
- **Cita literal:**
  > Habíamos hablado que podría comprar más insumos, además de los pertenecen a productos. Sin embargo, me parece correcto que los insumos habilitados para licitación sean sólo los de los productos en su catálogo.
  >
  > Extra(se complica en la implementacion)
- **Contexto:** paso 2, "Tildá los insumos que querés comprar".
- **Regla vigente:** RN-01 y N-16 (cualquier insumo del Maestro, incluido packaging).
- **Estado:** decidido el 24 nov 2026 — se mantiene cualquier insumo del Maestro, packaging incluido. RN-01 y N-16 quedan vigentes; sin cambios en código.

### H-07 · Qué precio ve el proveedor

- **Fuente:** pág. 2, nota de texto de `ariel`, 21 nov 2026 17:10.
- **Cita literal:**
  > Habíamos hablado que el proveedor no ve el precio del catálogo del insumo del emprendedor. Sólo vería el techo de lo que el emprendedor está dispuesto a pagar.
- **Contexto:** "El precio de partida viene sugerido con lo que pagás hoy según tu catálogo... los proveedores ven ese precio, porque es el techo de sus ofertas."
- **Regla vigente:** RN-07 y N-21 (el proveedor no ve catálogo ni recetas; ve el objetivo de la ronda, no el % de baja).
- **Estado:** dada por cubierta el 24 nov 2026 — RN-07/N-21 ya están implementados; sin cambios en reglas ni código. Queda como verificación de QA.

### H-08 · El proveedor y el estado de la ronda

- **Fuente:** pág. 2, nota de texto de `ariel`, 22 nov 2026 15:41.
- **Cita literal:**
  > El proveedro debería ser capaz de ver en que etapa de ronda se encuentra la licitacion. De esta manera sabe cuándo se va a cerrar la presente licitación, ya que si entró tarde a dicha licitación sabe que se vencerá pronto y debe apurarse a ofertar en caso de considerar vender al emprendedor.
  >
  > Hugo: quitar ronda para proveedor
- **Contexto:** paso 3, "El proveedor ve la licitación con sus insumos... y el precio objetivo de la ronda".
- **Regla vigente:** N-21 (el proveedor ve el objetivo de la ronda en curso).
- **Estado:** decidido el 24 nov 2026 — se mantiene la ronda actual y el objetivo vigente según N-21. La frase "Hugo: quitar ronda para proveedor" queda como opinión no adoptada; sin cambios en código.

### H-09 · Varios borradores

- **Fuente:** pág. 2, resaltado de `alelex10`, 22 nov 2026 15:35.
- **Cita literal:**
  > deveria poder guardar varios borradores, y que pueda continuar con el que quiera
- **Contexto:** "Para retomarlo, entrá a Licitaciones y tocá Seguir con el borrador. Hay un solo borrador a la vez. Al publicar, el borrador desaparece."
- **Regla vigente:** N-31 y D-12 (un borrador por emprendedor en `tender_drafts`).
- **Estado:** decidido el 24 nov 2026 — se permiten varios borradores y se elige cuál continuar. Reemplaza N-31/D-12; pendiente de bajar a reglas, modelo e interfaz.

### H-10 · Programar el inicio

- **Fuente:** pág. 2, resaltado de `alelex10`, 22 nov 2026 15:38.
- **Cita literal:**
  > Se podria implementar
- **Contexto:** "La licitación empieza en el momento en que la publicás. No se puede programar para más adelante."
- **Regla vigente:** N-12 (inicio al publicar).
- **Estado:** diferido el 24 nov 2026 — registrado en *Ideas a futuro*; N-12 sigue vigente y no se toca código.

### H-11 · Nombre del precio inicial

- **Fuente:** pág. 2, resaltado de `alelex10`, 22 nov 2026 16:07.
- **Cita literal:**
  > precio de inicio/partida
- **Contexto:** paso 3, donde el proveedor ve "el precio de partida y el precio objetivo de la ronda".
- **Regla vigente:** RN-02 (precio de partida).
- **Estado:** decidido el 24 nov 2026 — se mantiene "precio de partida" en RN-02, formularios y guía; sin cambios.

### H-12 · Nombre de la oferta

- **Fuente:** pág. 2, resaltado de `alelex10`, 22 nov 2026 16:08.
- **Cita literal:**
  > cotización
- **Contexto:** paso 3, "Escribe su precio por los insumos que quiera y toca Enviar ofertas."
- **Regla vigente:** RN-10 (ofertas por ronda).
- **Estado:** decidido el 24 nov 2026 — se mantiene "oferta" en reglas, botones y mensajes; sin cambios.

### H-13 · Cálculo del objetivo a partir de la oferta más baja

- **Fuente:** pág. 2, resaltado de `alelex10`, 23 nov 2026 15:00.
- **Cita literal:**
  > ver si usa la ultima propuesta mas baja del proveedor
- **Contexto:** paso 2, "Poné el % de baja por ronda: cuánto querés que baje el precio en cada ronda."
- **Regla vigente:** N-18 (objetivo de la ronda siguiente = objetivo anterior × (1 − % de baja), redondeado a centavos); D-09 (oferta vigente = menor precio).
- **Estado:** decidido el 24 nov 2026 — se calcula desde el objetivo anterior, sin mirar ofertas. N-18 queda vigente; sin cambios en código.

### H-14 · Validación de números negativos

- **Fuente:** pág. 3, resaltado de `alelex10`, 22 nov 2026 16:18.
- **Cita literal:**
  > preguntar
  >
  > falta validacion apra numeros negativos
- **Contexto:** "Si un precio está mal, no se guarda ninguno de ese envío. Así no queda una oferta a medias sin que el proveedor lo note."
- **Regla vigente:** N-22 (un precio inválido rechaza todo el envío); QA-24 a QA-28.
- **Estado:** bug confirmado el 24 nov 2026, reformulado con el equipo. Los negativos **sí se rechazan** (`unitPriceField` usa regex sin signo menos y `> 0`, en `lib/schemas/tenders/fields.ts`), pero el usuario no ve ningún mensaje y el botón sigue habilitado.
- **Causa raíz verificada:** `submitOffersService` usa `.parse()` (`lib/services/tenders.ts`), `toAppError` convierte el `ZodError` en `VALIDATION` con `z.flattenError()` (`lib/errors/app-error.ts`) y las claves quedan como `offers.0.unitPrice`. El formulario busca `price-<itemId>` (`components/tenders/offer-form.tsx`), claves que solo se generan cuando la oferta supera el techo (`lib/services/tenders.ts`). Al quedar claves desconocidas, `useFormDataAction` tampoco muestra el banner (`components/forms/use-form-data-action.ts`).

### H-15 · Quitar "Cancelar licitación" del aviso sin ofertas

- **Fuente:** pág. 3, resaltado de `alelex10`, 22 nov 2026 16:19.
- **Cita literal:**
  > no hace falta cancelar licitacion, quitar
- **Contexto:** "Dejar que siga: la licitación continúa y el aviso no vuelve a aparecer. / Cancelar la licitación: se corta todo y podés publicar otra."
- **Regla vigente:** RN-18 (dejar seguir o cancelar); ES-13.
- **Estado:** decidido el 24 nov 2026 — se saca el botón de cancelación del aviso y queda solo "Dejar que siga". "Cancelar licitación" permanece en la ficha general; pendiente de bajar a RN-18 y a la interfaz.

### H-16 · Configuración de horas y rondas por emprendedor y prueba del aviso

- **Fuente:** pág. 3, resaltado de `alelex10`, 22 nov 2026 16:21.
- **Cita literal:**
  > no se puede probar por tema de esperar las horas de cada ronda, eso se va a configurar para que cada emprendedor pueda configurar las oras y rondas
- **Contexto:** encabezado "Si un insumo no recibe ofertas".
- **Regla vigente:** RN-02/RN-09 (duración y cantidad de rondas fijas al publicar); sección 6 de `09-licitaciones.md` (para probar se manipulan fechas en la base).
- **Estado:** (a) decidido por H-05 el 24 nov 2026 — horas y rondas configurables por emprendedor; (b) diferido el 24 nov 2026 — se saltea el reloj controlado y se comprobará con inputs de 1 h por ronda.

### H-17 · Definir los avisos de cada ronda

- **Fuente:** pág. 3, resaltado de `alelex10`, 22 nov 2026 16:20.
- **Cita literal:**
  > avizos en cada ronda, ver que avisos
- **Contexto:** "Al empezar la ronda 2, si algún insumo sigue sin ofertas, el emprendedor ve un aviso con dos opciones".
- **Regla vigente:** RN-23/N-24 (avisos solo en panel; ronda nueva con su objetivo); RN-18 (aviso único de insumos sin ofertas).
- **Estado:** diferido el 24 nov 2026 — registrado en *Ideas a futuro*. Referencia de lo que hoy existe: emprendedor ve `no_offers` y `closed`; proveedor ve `invited`, `round`, `negotiation`, `thank_you`, `closed` y `cancelled`, todos derivados del estado y visibles solo en el panel durante 7 días.

### H-18 · Cuándo se puede negociar

- **Fuente:** pág. 4, nota de texto de `ariel`, 21 nov 2026 17:19.
- **Cita literal:**
  > Entonces esto sucede luego de terminar la ronda. No es posible comenzar una negociación hasta tanto se haya terminado la ronda.
  >
  > Por lo que se ve más arriba una ronda duraría sólo dos días y medio.
- **Contexto:** paso 5, "Si querés hablar con un proveedor antes de decidir, tocá Pedir negociar y Avisar al proveedor."
- **Regla vigente:** N-27 (se puede pedir negociar varios a la vez, antes o después de elegir); RN-21.
- **Estado:** decidido el 24 nov 2026 — se mantiene la negociación en cualquier momento según N-27/RN-21; sin cambios en reglas ni código.

### H-19 · Orden de compra y actualización del catálogo

- **Fuente:** pág. 4, nota de texto de `ariel`, 21 nov 2026 17:24.
- **Cita literal:**
  > La aplicación no genera órdenes de compra. No sé cómo lo va a interpretar la IA al momento de generar el código. Sólo mencionaría que el insumo podrá o no actualizar el precio de su catálogo como se menciona en el siguiente ítem.
- **Contexto:** "Hasta generar la orden, podés cambiar de opinión. Una vez que el insumo está en una orden de compra, queda fijo..."
- **Regla vigente:** ES-11, RN-15 y N-28 (orden imprimible por proveedor); E-02 y CC-01 a CC-05 (actualización de catálogo fuera de la primera versión).
- **Estado:** decidido el 24 nov 2026 — se mantiene la orden de compra; ES-11, RN-15 y N-28 quedan vigentes. La nota se interpreta como desacuerdo superado por las decisiones del 20-21/11; sin cambios en código.

### H-20 · Chat dentro de la aplicación

- **Fuente:** pág. 4, resaltado de `alelex10`, 22 nov 2026 16:26.
- **Cita literal:**
  > si hay tiempo incorporar chat en la aplicacion apra el contacto entre proveedor y emprendedor
- **Contexto:** "La charla sigue por fuera de la aplicación."
- **Regla vigente:** RN-21 (la negociación sigue fuera de la aplicación).
- **Estado:** diferido el 24 nov 2026 — registrado en *Ideas a futuro*; RN-21 sigue vigente y no se toca código.

### H-21 · Vigencia del enlace frente a la duración de la licitación

- **Fuente:** pág. 5, nota de texto de `ariel`, 21 nov 2026 17:31.
- **Cita literal:**
  > Si la ronda de licitación dura hasta 2 dias y medio no tiene sentido que la invitación dure hasta 7 días. Al menos debe durar lo que dura esa licitación.
- **Contexto:** "Esperá a que venza (7 días) o no lo mandes."
- **Regla vigente:** RN-23 y ES-09 (enlace de un uso, vigencia de 7 días).
- **Estado:** decidido el 24 nov 2026, pero **sin efecto** desde ese mismo día por H-23: se eliminan los enlaces de invitación. RN-23 y ES-09 quedan pendientes de reescritura.

### H-22 · Programar inicio y adelantar o pausar rondas

- **Fuente:** pág. 5, resaltado de `alelex10`, 22 nov 2026 16:31.
- **Cita literal:**
  > se podria desarrollar
- **Contexto:** tabla "Lo que todavía no se puede hacer": "Programar la hora de inicio" y "Adelantar o pausar las rondas".
- **Regla vigente:** N-12 (no se programa inicio) y ES-01 (rondas automáticas, sin adelantar ni pausar).
- **Estado:** diferido el 24 nov 2026 — registrado en *Ideas a futuro* junto con H-10; ES-01 y N-12 siguen vigentes.

---

## 2. Agrupamiento propuesto para las issues

Agrupa hallazgos del mismo problema. **Son candidatos, no issues creadas.** La última columna registra lo decidido el 24 de noviembre de 2026; lo que cambia reglas sigue pendiente de bajarse a `docs/flujos/`.

| Grupo | Hallazgos | Título propuesto de la issue | Resultado del 24 nov 2026 |
| --- | --- | --- | --- |
| C-01 | H-03, H-13 | Definir el modelo de precio de la licitación | Sin cambios: % por ronda y objetivo calculado desde el objetivo anterior. |
| C-02 | H-05, H-16, H-21 | Rondas configurables y vigencia de invitaciones | Horas y rondas como inputs; prueba con 1 h por ronda. H-21 sin efecto por H-23 (se eliminan los enlaces). |
| C-03 | H-04, H-06 | Límites y origen de los insumos licitables | Sin cambios: hasta 20 insumos y cualquier insumo del catálogo. |
| C-04 | H-09, H-10, H-22 | Borradores múltiples y control del inicio | Varios borradores; programar inicio y adelantar/pausar rondas van a Ideas a futuro. |
| C-05 | H-07, H-08, H-18, H-20 | Visibilidad para el proveedor y negociación | Sin cambios en ronda, objetivo ni negociación; chat interno va a Ideas a futuro. |
| C-06 | H-14, H-15, H-17 | Validación de precios y avisos por ronda | Bug de feedback registrado con diagnóstico; se quita "cancelar" del aviso; avisos por ronda van a Ideas a futuro. |
| C-07 | H-01, H-02, H-11, H-12, H-19 | Alcance de la orden de compra y terminología | Sin cambios: orden de compra, "licitación", "precio de partida" y "oferta". H-02 absorbida por H-23. |
| C-08 | H-23 | Registro público de proveedores y todas las licitaciones visibles | Implementado en #309: ver todo salvo ofertas ajenas; alta pública sin enlaces ni vínculos. |

## Requerimiento nuevo de la validación (a especificar)

### H-23 · Registro público y licitaciones visibles para todos los proveedores

- **Fuente:** decisión del equipo en la validación, 24 nov 2026 (no viene del PDF).
- **Texto literal:**
  > aca quieor agregar de que se cree una seccion de registro para el proovedor no hace falta que el emprendedor invite a los proveedores
  >
  > los proveedores pueden ver todas las licitaciones para participar no tienen restriccion alguna
  >
  > no ahce falta que el emprendedor seleccione proveedores para invitar, participa el que quiera
  >
  > si tenes preguntas para espesificar mejor y explora como esta implementado ahora mejor
- **Estado:** implementado por la issue #309 el 26 nov 2026 (registro público, sin invitaciones, ofertas por proveedor). Corresponde al DD-01 que `09-licitaciones-pendientes.md` tenía diferido para una versión siguiente.
- **Decisión parcial del 24 nov 2026:** cualquier proveedor registrado ve **todas** las licitaciones (insumos, cantidades, precio de partida y objetivo), pero se mantienen RN-06/RN-07: no ve ofertas de otros proveedores ni el catálogo del emprendedor. La opción "absolutamente todo" fue descartada.
- **Decisión parcial del 24 nov 2026:** se eliminan los enlaces de invitación, `supplier_links` y la selección de invitados al publicar. El alta pasa a ser pública en una sección de proveedores; las ofertas se identifican por proveedor en lugar de por invitación (cambio de esquema). Esto deja sin efecto la decisión de H-21 y absorbe H-02.
- **Qué cambia respecto de hoy:** (1) el alta de proveedor deja de exigir el enlace del emprendedor; (2) se cae `supplier_links` como filtro de la relación; (3) `tender_invitations` deja de ser el filtro de licitaciones visibles para el proveedor; (4) desaparece la selección de invitados al publicar.
- **Conflictos a resolver:** RN-05, RN-06, RN-07, ES-07, ES-08, N-08, N-31 y D-01 a D-03. Los resguardos ya enumerados en DD-01 (licitación pública/privada, verificar CUIT, mostrar por rubro o zona, bloquear proveedores, ocultar el nombre del emprendedor hasta negociar) siguen siendo punto de partida, no decisiones.

## Ideas a futuro (registradas, no implementadas)

Notas que el equipo decidió no hacer ahora pero quiere conservar para una versión siguiente. No son reglas, no generan issues todavía y no cambian código. La instrucción literal fue: "crea una seccion de iedas en docs donde esto se pueda implementar a futuro, pero de momento no".

| Hallazgo | Idea | Fecha | Motivo del diferimiento |
| --- | --- | --- | --- |
| H-10 | Programar la hora de inicio de la licitación | 24 nov 2026 | Se registra para el futuro; "de momento no" |
| H-22 | Programar inicio y adelantar o pausar las rondas | 24 nov 2026 | Nota registrada como idea; se mantienen el inicio al publicar y las rondas automáticas |
| H-20 | Chat interno entre emprendedor y proveedor | 24 nov 2026 | Idea condicionada a tiempo ("si hay tiempo"); la negociación sigue por fuera de la aplicación |
| H-17 | Rediseñar los avisos por ronda | 24 nov 2026 | "No es importante por ahora"; hoy existen avisos básicos derivados del estado, solo en el panel |

## Issues creadas

Se agruparon las unidades de trabajo en cuatro issues, en lugar de abrir una por hallazgo.

| Issue | Hallazgos | Unidad de trabajo |
| --- | --- | --- |
| guido-pasciucco/InnovaLab-E10#306 | H-14, H-15 | Feedback del formulario de ofertas y botón de cancelar del aviso sin ofertas |
| guido-pasciucco/InnovaLab-E10#307 | H-05, H-16 | Horas de ronda y cantidad de rondas configurables |
| guido-pasciucco/InnovaLab-E10#308 | H-09 | Varios borradores de licitación |
| guido-pasciucco/InnovaLab-E10#309 | H-23 | Registro público y licitaciones visibles sin invitaciones |

Los hallazgos decididos "sin cambios" y los diferidos a *Ideas a futuro* no generan issues adicionales.

## 3. Fuera de alcance de este documento

- ❌ **Cambios en `docs/flujos/`** — los hallazgos todavía no son reglas vigentes; ese cambio requiere una decisión explícita del equipo.
- ❌ **Más issues en GitHub** — ya se crearon cuatro; los hallazgos sin trabajo pendiente no justifican una issue propia.
- ❌ **Cambios de código** — este PR es solo planificación.
