# Bloque 1 — Insumos: diferencias entre la guía de Malena y la guía de Alejandro

> Documento de discusión. Reúne, solo para el Bloque 1 (catálogo de insumos), las diferencias entre la **guía de pantallas de Malena** y las **decisiones/especificación de Alejandro** (Fase 2), junto con el porqué de cada decisión de Alejandro. Sirve como base del diálogo con el equipo; no crea decisiones nuevas.
>
> Convenciones: "la guía de Malena" se refiere a las fichas P08 y P09 de su documento de pantallas y navegación. Las decisiones corresponden a la especificación de Alejandro (Fase 2).

## Qué define el Bloque 1

El catálogo de insumos del negocio: carga, consulta, edición y borrado de cada insumo (harina, aceite, etc.) que después consume la receta de los productos. El catálogo es **compartido** por todos los productos; se carga una sola vez.

## En qué coinciden (no requiere discusión)

- **Buscador** por nombre o unidad de medida en la lista (decisión aceptada también por el equipo; ya está en la spec de Alejandro).
- **Pestaña Packaging:** el catálogo incluye una pestaña Packaging con el mismo diseño de tabla, buscador y CRUD (diferenciada por `kind`); reusable más tarde por las presentaciones.
- **Costo por unidad mínima calculado por el sistema:** ambos esperan que el sistema muestre el costo por unidad mínima (ej. $/g, $/ml, $/unidad) sin pedirlo al usuario.
- **Borrado libre en el MVP:** mientras no haya recetas, se puede borrar cualquier insumo sin restricción.
- **UX de P09:** la forma de cargar (modal vs. alta inline) es una decisión de diseño, no funcional: si UX prefiere el modal de la guía, se implementa modal.

## Diferencia 1 — Campos del insumo al cargar

**Lo que propone Malena (guía P08 y P09):** cada fila muestra *nombre, cantidad comprada, unidad de compra, precio total pagado* y el costo por unidad mínima calculado; el formulario pide nombre, cantidad comprada, unidad de compra y precio total pagado.

**Lo que define Alejandro:** el insumo se da de alta con **nombre + precio de compra + cantidad + unidad de medida**, donde la unidad de medida **se selecciona de un catálogo precargado de 4 familias** (masa `g`/`kg`; volumen `ml`/`L`; longitud `mm`/`cm`/`m`; contable `unidad`/`par`/`media docena`/`docena`), nunca texto libre. El campo **"unidad de compra" (bolsa, caja, paquete) no existe**: no aporta al cálculo y genera dos campos de "unidad" que confunden.

**Por qué (según Alejandro):** con la unidad fija y con equivalencias de familia, el sistema deriva el costo por unidad de medida una vez y todas las recetas lo comparten, con conversión automática dentro de la familia. La "unidad de compra" es redundante: el precio se asigna siempre a "la cantidad + unidad de medida" declaradas.

**Estado:** decisión tomada por Alejandro; la implementación actual (formulario) todavía sigue el modelo de la guía de Malena (unidad de compra + texto libre). La alineación está pedida y abierta en **#260**. Si la guía de Malena sigue pidiendo "unidad de compra" como campo, conviene alinear la ficha con la decisión de Alejandro (cantidad + unidad de medida, selección).

## Diferencia 2 — La naturaleza de la pestaña Packaging

**Lo que propone Malena (guía P08, P12):** Packaging como catálogo paralelo real (mismos campos y CRUD que insumos), que después reutilizan las presentaciones (P12) para elegir packaging con cantidades.

**Lo que define Alejandro:** la pestaña Packaging se acepta igualmente (mismo CRUD y buscador, diferenciada por `kind`), pero Alejandro la lee como **apartado visual para la persona usuaria**, sin diferencia funcional propia para la spec del catálogo; su peso real aparece más adelante en el vínculo con las presentaciones (D13).

**Por qué (según Alejandro):** no introduce campos distintos de los que ya usa el insumo/producto; el precio se carga una sola vez en la pestaña y las presentaciones solo referencian. No hay diferencia funcional hasta que exista la presentación; modelarlo como entidad completa antes de eso es alcance que no hace falta.

**Qué corresponde acordar:** mantener la pestaña Packaging con CRUD y buscador al mismo nivel que insumos; la entidad/presentación con packaging se define cuando se modele la entidad presentación (Bloque 2).

## Diferencia 3 — Qué pasa al eliminar un insumo (o packaging) en uso

**Lo que propone Malena (guía):** queda pendiente definir qué ocurre si se intenta eliminar un insumo o packaging ya utilizado por un producto, y qué aviso mostrar.

**Lo que define Alejandro:** está decidido: en el MVP se borra libremente; **cuando existen recetas**, el borrado de un insumo referenciado se **bloquea** con un mensaje que indica qué recetas lo usan y pide quitarlo de ahí antes (mismo criterio para packaging referenciado por presentaciones, ver bloque 2).

**Por qué (según Alejandro):** borrar un insumo que una receta viva sigue usando deja la receta sin insumo de origen y silenciaría el cálculo del costo; el bloqueo con aviso es la única forma honesta de proteger el catálogo común.

**Estado:** decisión tomada de fondo por Alejandro; falta la implementación cuando exista el Bloque 2. Si la guía sigue mostrándolo como abierto, la respuesta del equipo ya está definida (bloqueo con aviso); solo pendiente de implementar.

## Diferencias menores

- **Modal vs. alta inline (P09):** decisión de diseño, no de spec. Si UX prefiere el modal del flujo P09, se implementa modal; no cambia qué datos se piden.
- **Ubicación del "costo por unidad mínima":** Malena lo muestra en la fila como columna de "costo por unidad mínima"; Alejandro lo define derivado una única vez y compartido por todas las recetas. Concepto equivalente; el rótulo exacto de la columna se alinea con UX.

## Qué no entra en esta discusión (se trata en otros bloques u otros documentos)

- Menú lateral y sus opciones, onboarding e Inicio/Configuraciones (alcance del menú en general; no del Bloque 1).
- Presentaciones, costo variable por presentación y capacidad (Bloque 2).
- Costos indirectos, precio y equilibrio (Bloque 3); tablero (Bloque 4).
- Implementación pendiente #260 (alinear el formulario implementado con la decisión de Alejandro).
