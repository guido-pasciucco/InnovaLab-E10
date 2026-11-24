# Validación del flujo de licitaciones — hallazgos y planificación de especificaciones

Documento de planificación, no de reglas vigentes. Las reglas que hoy rigen están en [`flujos/09-licitaciones.md`](../../flujos/09-licitaciones.md) y los puntos ya conocidos en [`flujos/09-licitaciones-pendientes.md`](../../flujos/09-licitaciones-pendientes.md).

- **Fuente:** `08-guia-de-uso-licitaciones-2-hugo.pdf`, 5 páginas, adjunto por el usuario el 24 de noviembre de 2026.
- **Extracción:** las observaciones no están en el texto imprimible del PDF. Se leyeron los objetos de anotación (`/Text` y `/Highlight`) del archivo: 22 anotaciones con texto de autor y 15 globos `/Popup` sin contenido, que se descartaron.
- **Autores de las notas:** `ariel` (notas de texto, 21 y 22 de noviembre de 2026) y `alelex10` (resaltados, 22 y 23 de noviembre de 2026).
- **Estado:** ningún hallazgo se implementó ni se resolvió acá. Varios contradicen reglas vigentes o se contradicen entre sí: siguen **sin decidir** hasta que el equipo lo resuelva.
- **Destino:** este documento alimenta las issues que se crearán después. No se crearon issues en este cambio.

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
- **Estado:** sin decidir — propuesta de nombre/alcance. Define si el producto se presenta como "requerimiento de compra" y qué incluye ese término.

### H-02 · Registro único y participación en varias licitaciones

- **Fuente:** pág. 1, resaltado de `alelex10`, 23 nov 2026 14:41.
- **Cita literal:**
  > se pueden registraruna sola ves y participar en las licitaciones que quieran
- **Contexto:** paso 1, "El proveedor abre el enlace, completa sus datos (nombre del negocio, CUIT, contacto, teléfono, rubros) y crea su cuenta."
- **Regla vigente:** RN-22 y ES-08 (una sola cuenta, varios vínculos con emprendedores).
- **Estado:** confirmación a verificar — coincide con la regla vigente; requiere comprobar que la interfaz lo explicite y que el alta no pida datos dos veces.

### H-03 · "% por ronda" contra "techo de precio"

- **Fuente:** pág. 2, nota de texto de `ariel`, 21 nov 2026 17:07.
- **Cita literal:**
  > No recuerdo que hablamos de %por ronda. Habíamos hablado de techo de precio.
- **Contexto:** paso 2, "Poné el % de baja por ronda: cuánto querés que baje el precio en cada ronda."
- **Regla vigente:** ES-01 y RN-09 (% de baja fijado al publicar, objetivo por ronda); N-11 (entre 0 y 50 %).
- **Estado:** sin decidir — cambia el modelo de precios de la licitación. Pregunta a responder: ¿se mantiene el % por ronda, se usa solo un techo, o conviven?

### H-04 · Tope de insumos por licitación

- **Fuente:** pág. 2, nota de texto de `ariel`, 21 nov 2026 17:01.
- **Cita literal:**
  > Yo lo limitaría hasta 10 insumos solamente.
- **Contexto:** "Entre 1 y 20 insumos por licitación."
- **Regla vigente:** RN-01 y N-17 (entre 1 y 20 insumos).
- **Estado:** sin decidir — propuesta de bajar el máximo de 20 a 10.

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
- **Estado:** sin decidir — hay tres opiniones encontradas en la misma nota: tope de 12 h, mínimo de 3 h y campos libres en lugar de un selector.

### H-06 · Insumos habilitados para licitar

- **Fuente:** pág. 2, nota de texto de `ariel`, 21 nov 2026 17:07.
- **Cita literal:**
  > Habíamos hablado que podría comprar más insumos, además de los pertenecen a productos. Sin embargo, me parece correcto que los insumos habilitados para licitación sean sólo los de los productos en su catálogo.
  >
  > Extra(se complica en la implementacion)
- **Contexto:** paso 2, "Tildá los insumos que querés comprar".
- **Regla vigente:** RN-01 y N-16 (cualquier insumo del Maestro, incluido packaging).
- **Estado:** sin decidir — propuesta de restringir la licitación a insumos usados por productos del catálogo. El propio autor marca complejidad de implementación.

### H-07 · Qué precio ve el proveedor

- **Fuente:** pág. 2, nota de texto de `ariel`, 21 nov 2026 17:10.
- **Cita literal:**
  > Habíamos hablado que el proveedor no ve el precio del catálogo del insumo del emprendedor. Sólo vería el techo de lo que el emprendedor está dispuesto a pagar.
- **Contexto:** "El precio de partida viene sugerido con lo que pagás hoy según tu catálogo... los proveedores ven ese precio, porque es el techo de sus ofertas."
- **Regla vigente:** RN-07 y N-21 (el proveedor no ve catálogo ni recetas; ve el objetivo de la ronda, no el % de baja).
- **Estado:** confirmación a verificar — coincide con la regla; requiere comprobar que el precio de catálogo no se filtre por otra vía (por ejemplo, al sugerir precios o en mensajes de error).

### H-08 · El proveedor y el estado de la ronda

- **Fuente:** pág. 2, nota de texto de `ariel`, 22 nov 2026 15:41.
- **Cita literal:**
  > El proveedro debería ser capaz de ver en que etapa de ronda se encuentra la licitacion. De esta manera sabe cuándo se va a cerrar la presente licitación, ya que si entró tarde a dicha licitación sabe que se vencerá pronto y debe apurarse a ofertar en caso de considerar vender al emprendedor.
  >
  > Hugo: quitar ronda para proveedor
- **Contexto:** paso 3, "El proveedor ve la licitación con sus insumos... y el precio objetivo de la ronda".
- **Regla vigente:** N-21 (el proveedor ve el objetivo de la ronda en curso).
- **Estado:** sin decidir — la misma nota propone mostrar la etapa de ronda y, debajo, "quitar ronda para proveedor". Hay que elegir.

### H-09 · Varios borradores

- **Fuente:** pág. 2, resaltado de `alelex10`, 22 nov 2026 15:35.
- **Cita literal:**
  > deveria poder guardar varios borradores, y que pueda continuar con el que quiera
- **Contexto:** "Para retomarlo, entrá a Licitaciones y tocá Seguir con el borrador. Hay un solo borrador a la vez. Al publicar, el borrador desaparece."
- **Regla vigente:** N-31 y D-12 (un borrador por emprendedor en `tender_drafts`).
- **Estado:** sin decidir — funcionalidad nueva; contradice la decisión de un solo borrador.

### H-10 · Programar el inicio

- **Fuente:** pág. 2, resaltado de `alelex10`, 22 nov 2026 15:38.
- **Cita literal:**
  > Se podria implementar
- **Contexto:** "La licitación empieza en el momento en que la publicás. No se puede programar para más adelante."
- **Regla vigente:** N-12 (inicio al publicar).
- **Estado:** sin decidir — propuesta de programar inicio posterior; ya figura como alternativa descartada en `09-licitaciones-pendientes.md`.

### H-11 · Nombre del precio inicial

- **Fuente:** pág. 2, resaltado de `alelex10`, 22 nov 2026 16:07.
- **Cita literal:**
  > precio de inicio/partida
- **Contexto:** paso 3, donde el proveedor ve "el precio de partida y el precio objetivo de la ronda".
- **Regla vigente:** RN-02 (precio de partida).
- **Estado:** sin decidir — propuesta terminológica: unificar "precio de partida" con "precio de inicio".

### H-12 · Nombre de la oferta

- **Fuente:** pág. 2, resaltado de `alelex10`, 22 nov 2026 16:08.
- **Cita literal:**
  > cotización
- **Contexto:** paso 3, "Escribe su precio por los insumos que quiera y toca Enviar ofertas."
- **Regla vigente:** RN-10 (ofertas por ronda).
- **Estado:** sin decidir — propuesta terminológica: llamar "cotización" a lo que hoy se llama "oferta"/"precio".

### H-13 · Cálculo del objetivo a partir de la oferta más baja

- **Fuente:** pág. 2, resaltado de `alelex10`, 23 nov 2026 15:00.
- **Cita literal:**
  > ver si usa la ultima propuesta mas baja del proveedor
- **Contexto:** paso 2, "Poné el % de baja por ronda: cuánto querés que baje el precio en cada ronda."
- **Regla vigente:** N-18 (objetivo de la ronda siguiente = objetivo anterior × (1 − % de baja), redondeado a centavos); D-09 (oferta vigente = menor precio).
- **Estado:** sin decidir — pregunta abierta sobre la base del cálculo del objetivo. Afecta directamente a H-03.

### H-14 · Validación de números negativos

- **Fuente:** pág. 3, resaltado de `alelex10`, 22 nov 2026 16:18.
- **Cita literal:**
  > preguntar
  >
  > falta validacion apra numeros negativos
- **Contexto:** "Si un precio está mal, no se guarda ninguno de ese envío. Así no queda una oferta a medias sin que el proveedor lo note."
- **Regla vigente:** N-22 (un precio inválido rechaza todo el envío); QA-24 a QA-28.
- **Estado:** sin decidir / posible defecto — confirmar si hoy se aceptan precios negativos en cantidades o precios y qué campos alcanza la validación.

### H-15 · Quitar "Cancelar licitación" del aviso sin ofertas

- **Fuente:** pág. 3, resaltado de `alelex10`, 22 nov 2026 16:19.
- **Cita literal:**
  > no hace falta cancelar licitacion, quitar
- **Contexto:** "Dejar que siga: la licitación continúa y el aviso no vuelve a aparecer. / Cancelar la licitación: se corta todo y podés publicar otra."
- **Regla vigente:** RN-18 (dejar seguir o cancelar); ES-13.
- **Estado:** sin decidir — propuesta de sacar la opción de cancelar de ese aviso. Pregunta: ¿se conserva "Cancelar licitación" en otro lugar?

### H-16 · Configuración de horas y rondas por emprendedor y prueba del aviso

- **Fuente:** pág. 3, resaltado de `alelex10`, 22 nov 2026 16:21.
- **Cita literal:**
  > no se puede probar por tema de esperar las horas de cada ronda, eso se va a configurar para que cada emprendedor pueda configurar las oras y rondas
- **Contexto:** encabezado "Si un insumo no recibe ofertas".
- **Regla vigente:** RN-02/RN-09 (duración y cantidad de rondas fijas al publicar); sección 6 de `09-licitaciones.md` (para probar se manipulan fechas en la base).
- **Estado:** sin decidir — dos cosas distintas: (a) reitera H-05 (configuración por emprendedor) y (b) pide una forma de probar sin esperar horas de ronda.

### H-17 · Definir los avisos de cada ronda

- **Fuente:** pág. 3, resaltado de `alelex10`, 22 nov 2026 16:20.
- **Cita literal:**
  > avizos en cada ronda, ver que avisos
- **Contexto:** "Al empezar la ronda 2, si algún insumo sigue sin ofertas, el emprendedor ve un aviso con dos opciones".
- **Regla vigente:** RN-23/N-24 (avisos solo en panel; ronda nueva con su objetivo); RN-18 (aviso único de insumos sin ofertas).
- **Estado:** sin decidir — hace falta enumerar qué avisos corresponden a cada ronda y a quién.

### H-18 · Cuándo se puede negociar

- **Fuente:** pág. 4, nota de texto de `ariel`, 21 nov 2026 17:19.
- **Cita literal:**
  > Entonces esto sucede luego de terminar la ronda. No es posible comenzar una negociación hasta tanto se haya terminado la ronda.
  >
  > Por lo que se ve más arriba una ronda duraría sólo dos días y medio.
- **Contexto:** paso 5, "Si querés hablar con un proveedor antes de decidir, tocá Pedir negociar y Avisar al proveedor."
- **Regla vigente:** N-27 (se puede pedir negociar varios a la vez, antes o después de elegir); RN-21.
- **Estado:** sin decidir — propuesta de permitir la negociación recién después de terminada la ronda.

### H-19 · Orden de compra y actualización del catálogo

- **Fuente:** pág. 4, nota de texto de `ariel`, 21 nov 2026 17:24.
- **Cita literal:**
  > La aplicación no genera órdenes de compra. No sé cómo lo va a interpretar la IA al momento de generar el código. Sólo mencionaría que el insumo podrá o no actualizar el precio de su catálogo como se menciona en el siguiente ítem.
- **Contexto:** "Hasta generar la orden, podés cambiar de opinión. Una vez que el insumo está en una orden de compra, queda fijo..."
- **Regla vigente:** ES-11, RN-15 y N-28 (orden imprimible por proveedor); E-02 y CC-01 a CC-05 (actualización de catálogo fuera de la primera versión).
- **Estado:** sin decidir — contradice directamente la generación de órdenes de compra incluida en la versión actual. Es la decisión de alcance más grande del documento.

### H-20 · Chat dentro de la aplicación

- **Fuente:** pág. 4, resaltado de `alelex10`, 22 nov 2026 16:26.
- **Cita literal:**
  > si hay tiempo incorporar chat en la aplicacion apra el contacto entre proveedor y emprendedor
- **Contexto:** "La charla sigue por fuera de la aplicación."
- **Regla vigente:** RN-21 (la negociación sigue fuera de la aplicación).
- **Estado:** sin decidir — idea condicionada a tiempo ("si hay tiempo"); reemplazaría el contacto externo por mensajería interna.

### H-21 · Vigencia del enlace frente a la duración de la licitación

- **Fuente:** pág. 5, nota de texto de `ariel`, 21 nov 2026 17:31.
- **Cita literal:**
  > Si la ronda de licitación dura hasta 2 dias y medio no tiene sentido que la invitación dure hasta 7 días. Al menos debe durar lo que dura esa licitación.
- **Contexto:** "Esperá a que venza (7 días) o no lo mandes."
- **Regla vigente:** RN-23 y ES-09 (enlace de un uso, vigencia de 7 días).
- **Estado:** sin decidir — propuesta de que el vencimiento sea al menos igual a la duración total de la licitación.

### H-22 · Programar inicio y adelantar o pausar rondas

- **Fuente:** pág. 5, resaltado de `alelex10`, 22 nov 2026 16:31.
- **Cita literal:**
  > se podria desarrollar
- **Contexto:** tabla "Lo que todavía no se puede hacer": "Programar la hora de inicio" y "Adelantar o pausar las rondas".
- **Regla vigente:** N-12 (no se programa inicio) y ES-01 (rondas automáticas, sin adelantar ni pausar).
- **Estado:** sin decidir — propuesta de desarrollar ambas funcionalidades; se solapa con H-10.

---

## 2. Agrupamiento propuesto para las issues

Agrupa hallazgos del mismo problema. **Son candidatos, no issues creadas.** Cada grupo necesita una decisión del equipo antes de convertirse en especificación.

| Grupo | Hallazgos | Título propuesto de la issue | Decisión que habilita la especificación |
| --- | --- | --- | --- |
| C-01 | H-03, H-13 | Definir el modelo de precio de la licitación | ¿% por ronda, techo fijo o ambos? ¿Sobre qué valor se calcula el objetivo de cada ronda? |
| C-02 | H-05, H-16, H-21 | Rondas configurables y vigencia de invitaciones | ¿Inputs libres o selector? ¿Mínimo 3 h, tope 12 h? ¿Cómo se prueba sin esperar horas reales? ¿Vencimiento del enlace igual a la duración? |
| C-03 | H-04, H-06 | Límites y origen de los insumos licitables | ¿Tope de 10 insumos? ¿Solo insumos usados por productos del catálogo? |
| C-04 | H-09, H-10, H-22 | Borradores múltiples y control del inicio | ¿Varios borradores por emprendedor? ¿Programar inicio? ¿Adelantar o pausar rondas? |
| C-05 | H-07, H-08, H-18, H-20 | Visibilidad para el proveedor y negociación | ¿Ve la etapa de ronda? ¿Se quita la ronda de su panel? ¿Negociación solo después de la ronda? ¿Chat interno? |
| C-06 | H-14, H-15, H-17 | Validación de precios y avisos por ronda | ¿Rechazar negativos en todos los campos? ¿Quitar "cancelar" del aviso sin ofertas? ¿Qué avisos por ronda? |
| C-07 | H-01, H-02, H-11, H-12, H-19 | Alcance de la orden de compra y terminología | ¿Se mantiene la orden de compra en esta versión? ¿Cómo se nombran el precio inicial y la oferta? ¿Confirmar registro único y actualización manual del catálogo? |

## 3. Fuera de alcance de este documento

- ❌ **Cambios en `docs/flujos/`** — los hallazgos todavía no son reglas vigentes; ese cambio requiere una decisión explícita del equipo.
- ❌ **Issues en GitHub** — se crearán a partir de los grupos C-01 a C-07 cuando se definan las prioridades.
- ❌ **Cambios de código** — este PR es solo planificación.
