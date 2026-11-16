# Alineación con la guía de pantallas y navegación

> Documento de trabajo para cerrar las diferencias entre la guía de pantallas (P00–P18) y las decisiones vigentes de la Fase 2. Cada punto enfrenta la propuesta de la guía con la decisión correspondiente y propone un camino de consolidación.
>
> Este documento **no crea decisiones nuevas**: la fuente de verdad sigue siendo el registro de decisiones. Lo que acá se propone queda marcado como "a confirmar" hasta que el equipo lo resuelva y se registre ahí.

## Panorama

| Tema | Estado |
| --- | --- |
| Packaging como pestaña del catálogo | Alineado |
| Campos del insumo (formulario) | Alineado en el formulario; falta ajustar la ficha de catálogo |
| Buscador por nombre o unidad | Alineado |
| Receta: insumos, cantidades y rendimiento | Alineado |
| Costo unitario y costo de presentación como cifras separadas | Alineado |
| Reutilización de insumos y packaging | Alineado |
| Datos históricos en el menú | Resuelto por nuestras decisiones; la guía lo dejaba por definir |
| Borrado de insumo en uso | Resuelto por nuestras decisiones; la guía lo dejaba por definir |
| Capacidad mensual | **Diferencia principal 1** |
| Menú y apartado Costos | **Diferencia principal 2** |
| Presentaciones como entidad | **Diferencia principal 3** |
| Protección de packaging referenciado | **Diferencia principal 4** |
| Borrado lógico vs. eliminación | Diferencia menor, informativa |
| Orden del recorrido | Diferencia menor, a confirmar |

---

## Diferencia 1 — Capacidad mensual: pantalla/pestaña propia vs. campo del producto

### Lo que propone la guía

La ficha P13 define una pantalla específica para la capacidad mensual, con el campo "¿Cuántas unidades pensás fabricar este mes?", un resumen de productos y capacidad, y las acciones "Agregar otro producto" / "Continuar" que cierran la lista y pasan a gastos.

Además, la propia guía marca un **por definir**: integrar esa funcionalidad como **segunda pestaña de P12** en lugar de una pantalla independiente. P12 quedaría con dos pestañas: "Costos y presentaciones" y "Producción mensual", esta última para registrar y editar la cantidad de unidades que se estima fabricar por mes, **tanto de la unidad como de presentaciones más grandes**.

### Lo que decidimos nosotros

- **D3:** la capacidad mensual es un **campo del formulario del producto**, el mismo donde se cargan nombre, receta y rendimiento. No hay pantalla propia para la capacidad ni entidad "plan del mes". El listado muestra la capacidad cargada y editarla recalcula lo dependiente en vivo.
- **D4:** no existe cierre de lista para calcular; cualquier edición recalcula de inmediato.
- **D9:** la capacidad debe ser > 0 para habilitar costo total, precio y equilibrio. Con 0 o sin cargar, el producto se guarda igual, se avisa y se excluye del prorrateo.
- **D14:** el campo va en el bloque principal del formulario, junto a nombre y rendimiento.
- **D5–D8:** al cerrar un cálculo, la capacidad se congela en el snapshot, queda asociada a un mes y se consulta en el histórico.

### Por qué importa

No es una diferencia de layout: cambia **dónde vive el dato** y **qué dispara el cálculo**.

| | Guía | Decisión vigente |
| --- | --- | --- |
| Dónde se carga | Pantalla/pestaña de producción mensual | Formulario del producto |
| Cierre para pasar a costos | "Finalizar lista y pasar a gastos" | No hay cierre; los costos se pueden cargar cuando se quiera |
| Edición | Guardar capacidad | Edición en vivo con recálculo inmediato |
| Histórico | Sin definir | Snapshot por mes (D5–D8) |
| Ámbito | Unidades y presentaciones grandes | Solo unidades del producto |

### Propuesta de consolidación

1. Mantener la decisión vigente (capacidad como campo del producto, sin cierre de lista). Llevar la ficha P13 de la guía a una **sección dentro del formulario del producto**, no a una pantalla ni a una pestaña separada, y quitar la acción "finalizar lista".
2. Reemplazar "pasar a gastos" por una dependencia de datos: el prorrateo requiere que haya capacidades cargadas, no un acto de cierre.
3. Resolver el punto de **presentaciones grandes**: hoy nuestra capacidad es por producto en unidades. Hay dos caminos posibles:
   - **Derivarla**: si un producto rinde 100 unidades por mes y una presentación contiene 6, la capacidad de esa presentación se calcula a partir de las unidades.
   - **Cargarla por separado**: cada presentación declara su propia producción mensual.
   
   Proponemos derivarla para no pedir dos veces el mismo dato, en línea con la regla de la guía de no solicitar información duplicada. **A confirmar con Malena.**

---

## Diferencia 2 — Menú y estructura del apartado Costos

### Lo que propone la guía

El menú lateral incluye Inicio, Insumos (con Packaging), Productos (con presentaciones), Tabla de resultados/Tablero, Datos históricos, Configuraciones y Cerrar sesión. Además incorpora un apartado **Costos** organizado en tres pestañas:

- **Costos Variables**
- **Costos Fijos e indirectos**
- **Costos totales**

La propia guía aclara que los costos directos ya se obtienen de las recetas y presentaciones de cada producto, por lo que **no deberían solicitarse otra vez**.

### Lo que decidimos nosotros

Nuestro menú son los destinos del flujo de costos: página inicial, Insumos, Productos, Costos indirectos y Tablero. Con D8 se agrega "Datos históricos". El **alcance del menú persistente sigue siendo una decisión pendiente** en nuestro registro: no está definido si el menú aplica a todo el producto o solo a las rutas del catálogo de la Fase 2.

### Por qué importa

El riesgo es construir **dos lugares para cargar lo mismo**. Si "Costos Variables" se implementa como formulario, se duplicate lo que ya se carga en la receta (D2) y en las presentaciones (D13). Si "Costos totales" se implementa como pantalla de carga, se duplica un resultado que ya produce el cálculo.

### Propuesta de consolidación

Mapear las tres pestañas de la guía a conceptos que ya existen, y decidir cuáles necesitan destino propio:

| Pestaña de la guía | Equivalente en nuestras decisiones | Tratamiento propuesto |
| --- | --- | --- |
| Costos Variables | Receta (D1, D2) + presentaciones (D13) | **Solo lectura**; nunca carga de datos. Sería una vista agregada del costo variable por producto, no un formulario. |
| Costos Fijos e indirectos | Bloque 3, carga única para todo el catálogo | Sí es destino de carga. Es nuestro actual "Costos indirectos". |
| Costos totales | Resultado del Bloque 3, visible en el tablero (Bloque 4) | No es carga: es un resultado derivado. Podría ser una sección del tablero, no una pantalla de entrada. |

Puntos a confirmar con Malena:

- Si "Inicio/Bienvenida" reemplaza a nuestra página inicial pendiente, o si conviven.
- Si "Configuraciones" y "Cerrar sesión" entran en el alcance de la Fase 2 o quedan fuera del flujo de costos.
- Si el menú cubre solo el catálogo de la Fase 2 o todo el producto (es nuestra decisión pendiente).

---

## Diferencia 3 — Presentaciones como entidad

### Lo que propone la guía

P12 define las presentaciones como una lista editable: cada una tiene un nombre, unas **unidades contenidas** configurables (no solo x4/x6/x12), packaging seleccionado con cantidades, desglose de "¿Cómo se calculó?" y dos resultados diferenciados: costo variable de elaborar una unidad y costo variable de esa presentación.

También pide estados para receta incompleta, packaging sin precio y rendimiento inválido, y la regla de no mostrar $0 cuando faltan datos.

### Lo que decidimos nosotros

- **D1:** el CVU se normaliza siempre a una unidad de producto: `costo de la receta ÷ rendimiento`.
- **D13:** las presentaciones referencian ítems de packaging del catálogo con cantidad; su costo se suma al de la receta y se normaliza con el rendimiento para obtener el CVU de esa presentación. El precio del packaging se carga una sola vez, en el catálogo.

Pero **la entidad "presentación" todavía no está modelada** en nuestra spec. D13 define el vínculo con packaging, no la estructura de la presentación.

### Por qué importa

Sin la entidad no se puede calcular el costo de una presentación: falta el dato de **cuántas unidades de producto contiene**. Es el hueco concreto que nos separa de la guía.

### Propuesta de consolidación

Modelar la presentación como parte del producto:

| Campo | Regla propuesta |
| --- | --- |
| Producto | Referencia al producto dueño |
| Nombre | Ejemplo: "Caja x6". Configurable, no una lista fija |
| Unidades contenidas | Número > 0, configurable por presentación |
| Packaging | Lista de ítems del catálogo (`kind = packaging`) con cantidad |
| Costo | `N × CVU por unidad + Σ (costo unitario del packaging × cantidad)` |

La fórmula queda **sujeta a validación con la planilla #250**, que es nuestra dependencia externa de QA. Los estados de "no disponible" en lugar de $0 ya son coherentes con nuestras decisiones D9 y D10.

A confirmar con Malena:

- Si las unidades contenidas son un dato cargado o se derivan del tipo de presentación.
- Si una presentación puede tener varios ítems de packaging o siempre uno solo.
- Cómo se expresa la capacidad mensual de una presentación (ver Diferencia 1).

---

## Diferencia 4 — Protección de packaging referenciado

### Lo que propone la guía

La ficha P08 pide que, al intentar eliminar un insumo asociado a una receta, el sistema bloquee la eliminación con un mensaje explicativo. Y agrega: **la misma protección debe aplicarse al packaging vinculado a presentaciones comerciales**, validada en la interfaz y en el backend.

### Lo que decidimos nosotros

- **D11:** no se puede borrar un insumo que aparece en una receta viva. El sistema bloquea la acción, indica qué recetas lo usan y requiere quitarlo primero.
- **D12:** el borrado de productos y recetas es lógico y restaurable.
- **D13:** las presentaciones referencian packaging del catálogo.

### Por qué importa

Nuestra protección cubre solo **insumo → receta**. Falta **packaging → presentación**. Sin esa regla, se podría dar de baja un packaging que una presentación sigue usando y el costo de esa presentación quedaría sin insumo de origen.

### Propuesta de consolidación

Ampliar D11 para que la regla sea una sola, válida para ambos catálogos:

> No se puede dar de baja un insumo ni un packaging que esté referenciado por una receta o una presentación viva. El sistema bloquea la acción, indica qué productos lo usan y requiere quitar la referencia antes.

Con borrado lógico (D12), "dar de baja" significa marcar como borrado; la protección sigue aplicando porque el ítem seguiría apareciendo en cálculos vivos. El histórico no se rompe: los snapshots conservan su propia copia (D5).

---

## Diferencias menores

- **Borrado lógico (D12) vs. eliminación con confirmación.** La guía habla de eliminación confirmada; nuestra decisión permite recuperar lo borrado. Es una diferencia de comportamiento, no de presentación: conviene informarla para que la guía no prometa una eliminación definitiva.
- **Unidad de compra vs. unidad de medida.** La ficha de catálogo de la guía todavía muestra "unidad de compra" y "costo por unidad mínima", mientras que el formulario ya pide cantidad + unidad de medida seleccionable y no solicita envases. Nuestra decisión coincide con el formulario. El número #260 sigue abierto por la implementación del formulario de insumos.
- **Orden del recorrido.** La guía presenta un recorrido secuencial (acceso → insumos → producto → presentaciones → capacidad → costos → resultados). Nuestra especificación decide navegación por destinos, sin pasos obligatorios. Conviene confirmar que el orden de la guía es una sugerencia de uso y no un bloqueo de pantallas.

## Lo que nuestras decisiones ya resuelven

| Punto que la guía dejaba abierto | Resolución |
| --- | --- |
| "Datos históricos ... por definir con Ariel" | D5–D8 definen snapshot, auditoría, período y consulta |
| Borrado de insumo en uso "pendiente" | D11 lo decide: bloqueo con aviso |
| "Finalizar lista y pasar a gastos" | D4 lo elimina: no hay cierre, hay dependencia de capacidades |
| Formulario de insumos "pendiente de validación funcional" | Decidido: cantidad + unidad de medida del catálogo, sin unidad de compra |

## Próximo paso

Revisar con Malena las cuatro diferencias principales, en este orden: capacidad mensual, presentaciones, menú/Costos y protección de packaging. Los acuerdos que se alcancen se registran en el registro de decisiones y se reflejan acá como resueltos.
