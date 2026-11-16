# Alineación con la guía de pantallas y navegación

> Documento de trabajo para cerrar las diferencias entre la guía de pantallas (P00–P18), de **Malena**, y las decisiones vigentes de la Fase 2, tomadas por **Alejandro**. Cada punto enfrenta lo que propone Malena con lo que decidió Alejandro y propone un camino de consolidación.
>
> Convención de autoría: las referencias a "la guía" son propuestas de Malena; las decisiones con número D son decisiones de Alejandro registradas en el registro de decisiones.
>
> Este documento **no crea decisiones nuevas**: la fuente de verdad sigue siendo el registro de decisiones. Lo que acá se propone queda marcado como "a confirmar" hasta que el equipo lo resuelva y se registre ahí.

## Panorama

| Tema | Propuesta de Malena | Decisión de Alejandro | Estado |
| --- | --- | --- | --- |
| Packaging como pestaña del catálogo | Dos pestañas en una misma pantalla: Insumos y Packaging | Pestaña diferenciada por `kind`, reutilizada por D13 | Alineado |
| Campos del insumo | Formulario con cantidad + unidad de medida + precio, sin envases | Sin unidad de compra; catálogo precargado de 4 familias | Alineado en el formulario; falta ajustar la ficha de catálogo |
| Buscador por nombre o unidad | Buscador en cada pestaña | Buscador por nombre o unidad de medida | Alineado |
| Receta | Insumos del catálogo, cantidad usada, rendimiento, sin precio por renglón | D1, D2 y D10 | Alineado |
| Costo unitario y costo de presentación | Dos cifras separadas, sin indirectos | D1 y D13 | Alineado |
| Reutilización de insumos y packaging | Carga única y reutilización en productos | D13 | Alineado |
| Datos históricos en el menú | Reservado en el menú, alcance por definir | D5–D8 | Resuelto por Alejandro |
| Borrado de insumo en uso | Lo dejaba por definir | D11 | Resuelto por Alejandro |
| Capacidad mensual | P13: pantalla propia o segunda pestaña de P12, con cierre de lista | D3, D4, D9 y D14: campo del producto, sin cierre | **Diferencia principal 1** |
| Menú y apartado Costos | Menú amplio y apartado Costos con tres pestañas | Destinos del flujo; alcance del menú pendiente | **Diferencia principal 2** |
| Presentaciones como entidad | Entidad con unidades contenidas y packaging | D13 define el vínculo; entidad sin modelar | **Diferencia principal 3** |
| Packaging referenciado | Bloquear el borrado de packaging en presentaciones | D11 cubre solo insumo en receta | **Diferencia principal 4** |
| Borrado lógico vs. eliminación | Eliminación con confirmación | D12: borrado lógico restaurable | Diferencia menor, informativa |
| Orden del recorrido | Recorrido secuencial | Navegación por destinos, sin pasos obligatorios | Diferencia menor, a confirmar |

---

## Diferencia 1 — Capacidad mensual: pantalla/pestaña propia vs. campo del producto

### Lo que propone Malena

La ficha P13 define una pantalla específica para la capacidad mensual, con el campo "¿Cuántas unidades pensás fabricar este mes?", un resumen de productos y capacidad, y las acciones "Agregar otro producto" / "Continuar" que cierran la lista y pasan a gastos.

Además, la propia guía marca un **por definir**: integrar esa funcionalidad como **segunda pestaña de P12** en lugar de una pantalla independiente. P12 quedaría con dos pestañas: "Costos y presentaciones" y "Producción mensual", esta última para registrar y editar la cantidad de unidades que se estima fabricar por mes, **tanto de la unidad como de presentaciones más grandes**.

### Lo que decidió Alejandro

- **D3:** la capacidad mensual es un **campo del formulario del producto**, el mismo donde se cargan nombre, receta y rendimiento. No hay pantalla propia para la capacidad ni entidad "plan del mes". El listado muestra la capacidad cargada y editarla recalcula lo dependiente en vivo.
- **D4:** no existe cierre de lista para calcular; cualquier edición recalcula de inmediato.
- **D9:** la capacidad debe ser > 0 para habilitar costo total, precio y equilibrio. Con 0 o sin cargar, el producto se guarda igual, se avisa y se excluye del prorrateo.
- **D14:** el campo va en el bloque principal del formulario, junto a nombre y rendimiento.
- **D5–D8:** al cerrar un cálculo, la capacidad se congela en el snapshot, queda asociada a un mes y se consulta en el histórico.

### Por qué importa

No es una diferencia de layout: cambia **dónde vive el dato** y **qué dispara el cálculo**.

| | Propuesta de Malena | Decisión de Alejandro |
| --- | --- | --- |
| Dónde se carga | Pantalla/pestaña de producción mensual | Formulario del producto |
| Cierre para pasar a costos | "Finalizar lista y pasar a gastos" | No hay cierre; los costos se pueden cargar cuando se quiera |
| Edición | Guardar capacidad | Edición en vivo con recálculo inmediato |
| Histórico | Sin definir | Snapshot por mes (D5–D8) |
| Ámbito | Unidades y presentaciones grandes | Solo unidades del producto |

### Propuesta de consolidación

1. Mantener la decisión vigente (capacidad como campo del producto, sin cierre de lista). Llevar la ficha P13 de Malena a una **sección dentro del formulario del producto**, no a una pantalla ni a una pestaña separada, y quitar la acción "finalizar lista".
2. Reemplazar "pasar a gastos" por una dependencia de datos: el prorrateo requiere que haya capacidades cargadas, no un acto de cierre.
3. Resolver el punto de **presentaciones grandes**: hoy la capacidad decidida por Alejandro es por producto en unidades. Hay dos caminos posibles:
   - **Derivarla**: si un producto rinde 100 unidades por mes y una presentación contiene 6, la capacidad de esa presentación se calcula a partir de las unidades.
   - **Cargarla por separado**: cada presentación declara su propia producción mensual.
   
   Se propone derivarla para no pedir dos veces el mismo dato, en línea con la regla de Malena de no solicitar información duplicada. **A confirmar con Malena.**

---

## Diferencia 2 — Menú y estructura del apartado Costos

### Lo que propone Malena

El menú lateral incluye Inicio, Insumos (con Packaging), Productos (con presentaciones), Tabla de resultados/Tablero, Datos históricos, Configuraciones y Cerrar sesión. Además incorpora un apartado **Costos** organizado en tres pestañas:

- **Costos Variables**
- **Costos Fijos e indirectos**
- **Costos totales**

La propia guía aclara que los costos directos ya se obtienen de las recetas y presentaciones de cada producto, por lo que **no deberían solicitarse otra vez**.

### Lo que decidió Alejandro

Los destinos decididos por Alejandro son los del flujo de costos: página inicial, Insumos, Productos, Costos indirectos y Tablero. Con D8 se agrega "Datos históricos". El **alcance del menú persistente sigue siendo una decisión pendiente** en el registro de Alejandro: no está definido si el menú aplica a todo el producto o solo a las rutas del catálogo de la Fase 2.

### Por qué importa

El riesgo es construir **dos lugares para cargar lo mismo**. Si "Costos Variables" se implementa como formulario, se duplicate lo que ya se carga en la receta (D2) y en las presentaciones (D13). Si "Costos totales" se implementa como pantalla de carga, se duplica un resultado que ya produce el cálculo.

### Propuesta de consolidación

Mapear las tres pestañas propuestas por Malena a conceptos que ya existen en las decisiones de Alejandro, y decidir cuáles necesitan destino propio:

| Pestaña propuesta por Malena | Equivalente en las decisiones de Alejandro | Tratamiento propuesto |
| --- | --- | --- |
| Costos Variables | Receta (D1, D2) + presentaciones (D13) | **Solo lectura**; nunca carga de datos. Sería una vista agregada del costo variable por producto, no un formulario. |
| Costos Fijos e indirectos | Bloque 3, carga única para todo el catálogo | Sí es destino de carga. Es el actual "Costos indirectos" de las decisiones de Alejandro. |
| Costos totales | Resultado del Bloque 3, visible en el tablero (Bloque 4) | No es carga: es un resultado derivado. Podría ser una sección del tablero, no una pantalla de entrada. |

Puntos a confirmar con Malena:

- Si "Inicio/Bienvenida" reemplaza a la página inicial pendiente de Alejandro, o si conviven.
- Si "Configuraciones" y "Cerrar sesión" entran en el alcance de la Fase 2 o quedan fuera del flujo de costos.
- Si el menú cubre solo el catálogo de la Fase 2 o todo el producto (es la decisión pendiente de Alejandro).

---

## Diferencia 3 — Presentaciones como entidad

### Lo que propone Malena

P12 define las presentaciones como una lista editable: cada una tiene un nombre, unas **unidades contenidas** configurables (no solo x4/x6/x12), packaging seleccionado con cantidades, desglose de "¿Cómo se calculó?" y dos resultados diferenciados: costo variable de elaborar una unidad y costo variable de esa presentación.

También pide estados para receta incompleta, packaging sin precio y rendimiento inválido, y la regla de no mostrar $0 cuando faltan datos.

### Lo que decidió Alejandro

- **D1:** el CVU se normaliza siempre a una unidad de producto: `costo de la receta ÷ rendimiento`.
- **D13:** las presentaciones referencian ítems de packaging del catálogo con cantidad; su costo se suma al de la receta y se normaliza con el rendimiento para obtener el CVU de esa presentación. El precio del packaging se carga una sola vez, en el catálogo.

Pero **la entidad "presentación" todavía no está modelada** en la spec de Alejandro. D13 define el vínculo con packaging, no la estructura de la presentación.

### Por qué importa

Sin la entidad no se puede calcular el costo de una presentación: falta el dato de **cuántas unidades de producto contiene**. Es el hueco concreto que separa la spec de Alejandro de la propuesta de Malena.

### Propuesta de consolidación

Modelar la presentación como parte del producto:

| Campo | Regla propuesta |
| --- | --- |
| Producto | Referencia al producto dueño |
| Nombre | Ejemplo: "Caja x6". Configurable, no una lista fija |
| Unidades contenidas | Número > 0, configurable por presentación |
| Packaging | Lista de ítems del catálogo (`kind = packaging`) con cantidad |
| Costo | `N × CVU por unidad + Σ (costo unitario del packaging × cantidad)` |

La fórmula queda **sujeta a validación con la planilla #250**, que es la dependencia externa de QA de Alejandro. Los estados de "no disponible" en lugar de $0 ya son coherentes con sus decisiones D9 y D10.

A confirmar con Malena:

- Si las unidades contenidas son un dato cargado o se derivan del tipo de presentación.
- Si una presentación puede tener varios ítems de packaging o siempre uno solo.
- Cómo se expresa la capacidad mensual de una presentación (ver Diferencia 1).

---

## Diferencia 4 — Protección de packaging referenciado

### Lo que propone Malena

La ficha P08 pide que, al intentar eliminar un insumo asociado a una receta, el sistema bloquee la eliminación con un mensaje explicativo. Y agrega: **la misma protección debe aplicarse al packaging vinculado a presentaciones comerciales**, validada en la interfaz y en el backend.

### Lo que decidió Alejandro

- **D11:** no se puede borrar un insumo que aparece en una receta viva. El sistema bloquea la acción, indica qué recetas lo usan y requiere quitarlo primero.
- **D12:** el borrado de productos y recetas es lógico y restaurable.
- **D13:** las presentaciones referencian packaging del catálogo.

### Por qué importa

La protección decidida por Alejandro cubre solo **insumo → receta**. Falta **packaging → presentación**. Sin esa regla, se podría dar de baja un packaging que una presentación sigue usando y el costo de esa presentación quedaría sin insumo de origen.

### Propuesta de consolidación

Ampliar D11 para que la regla sea una sola, válida para ambos catálogos:

> No se puede dar de baja un insumo ni un packaging que esté referenciado por una receta o una presentación viva. El sistema bloquea la acción, indica qué productos lo usan y requiere quitar la referencia antes.

Con borrado lógico (D12), "dar de baja" significa marcar como borrado; la protección sigue aplicando porque el ítem seguiría apareciendo en cálculos vivos. El histórico no se rompe: los snapshots conservan su propia copia (D5).

---

## Diferencias menores

- **Borrado lógico (D12) vs. eliminación con confirmación.** Malena habla de eliminación confirmada; la decisión de Alejandro permite recuperar lo borrado. Es una diferencia de comportamiento, no de presentación: conviene informarla para que la guía de Malena no prometa una eliminación definitiva.
- **Unidad de compra vs. unidad de medida.** La ficha de catálogo de Malena todavía muestra "unidad de compra" y "costo por unidad mínima", mientras que el formulario ya pide cantidad + unidad de medida seleccionable y no solicita envases. La decisión de Alejandro coincide con el formulario. El número #260 sigue abierto por la implementación del formulario de insumos.
- **Orden del recorrido.** Malena presenta un recorrido secuencial (acceso → insumos → producto → presentaciones → capacidad → costos → resultados). Alejandro decidió en la especificación la navegación por destinos, sin pasos obligatorios. Conviene confirmar que el orden de Malena es una sugerencia de uso y no un bloqueo de pantallas.

## Lo que las decisiones de Alejandro ya resuelven

| Punto que Malena dejaba abierto en la guía | Decisión de Alejandro |
| --- | --- |
| "Datos históricos ... por definir con Ariel" | D5–D8 definen snapshot, auditoría, período y consulta |
| Borrado de insumo en uso "pendiente" | D11 lo decide: bloqueo con aviso |
| "Finalizar lista y pasar a gastos" | D4 lo elimina: no hay cierre, hay dependencia de capacidades |
| Formulario de insumos "pendiente de validación funcional" | Decidido: cantidad + unidad de medida del catálogo, sin unidad de compra |

## Próximo paso

Revisar con Malena las cuatro diferencias principales, en este orden: capacidad mensual, presentaciones, menú/Costos y protección de packaging. Los acuerdos que se alcancen se registran en el registro de decisiones y se reflejan acá como resueltos.
