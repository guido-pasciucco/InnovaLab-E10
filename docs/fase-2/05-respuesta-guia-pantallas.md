# Respuesta a la guía de pantallas — Innova Lab 2026

> **Documento de trabajo** con la posición del equipo frente a las diferencias detectadas entre lo que propone Malena en la guía de pantallas y navegación y la especificación de Alejandro del flujo de costos.
>
> Cada punto referencia las pantallas de la guía de Malena (P00–P18) y deja explícito qué se acepta, qué se ajusta en la spec de Alejandro y qué queda por conversar.

---

## 1. Packaging como pestaña del catálogo de insumos (P08, impacta P12)

**Lo que propone Malena:** el catálogo de insumos tiene dos pestañas — «Insumos» y «Packaging» — con el mismo diseño de tabla y las mismas funcionalidades (búsqueda, alta, edición, eliminación). Packaging es un catálogo propio que luego se reutiliza al definir presentaciones (P12).

**Posición de Alejandro:** es una decisión que todavía no termina de entender del todo en su funcionalidad, pero **está bien / la acepta**. Queda registrada como catálogo paralelo a insumos.

**Impacto en la spec de Alejandro:** hoy solo existe el catálogo de insumos; packaging nunca se definió como entidad propia (aparece recién como "packaging seleccionado" en presentaciones). **Opinión de Alejandro:** cree que sería solo un apartado visual para la persona usuaria, por lo que no le importa si va o no — no genera diferencia funcional para la spec.

---

## 2. Campos del insumo: diferencia a tratar con Malena (P08 y P09)

**Lo que propone Malena (P08):** *"Cada fila mostrará el nombre, la cantidad comprada, la unidad de compra, el precio total pagado, el costo calculado por unidad mínima (por ejemplo, $/g, $/ml o $/unidad)…"* — y en P09 el formulario pide *"nombre, cantidad comprada, unidad de compra, precio total pagado"*.

**Lo que está decidido en la spec de Alejandro:** el insumo se da de alta con **nombre + precio de compra + cantidad + unidad de medida**, donde la unidad de medida **se selecciona de un catálogo precargado** (kg, g, litro, unidad…) y **nunca se escribe libre**. El campo "unidad de compra" (bolsa, caja, envase) se **eliminó deliberadamente** para evitar dos campos de unidad confusos en el mismo formulario.

**Diferencia concreta a mencionar a Malena:** la guía pide "unidad de compra" como campo del insumo; la spec de Alejandro decidió **no tener unidad de compra** y en su lugar tener **unidad de medida seleccionable con equivalencias automáticas** (kg↔g, L↔ml). Hay que alinear las fichas P08/P09 con esa decisión: el formulario debería pedir cantidad + unidad de medida (selección), no unidad de compra.

**Pendiente:** confirmar con Malena si la "unidad de compra" de la guía se refiere a lo mismo que la "unidad de medida" de la spec (en cuyo caso es solo un tema de rótulo) o si efectivamente quiere un campo de envase adicional (en cuyo caso revierte una decisión tomada).

---

## 3. Forma de carga de insumos: modal vs. alta inline (P08, P09)

**Posición de Alejandro:** es una decisión de diseño — cómo se cargan los insumos — **irrelevante para la funcionalidad**. No se trata como diferencia de spec; si UX prefiere el modal de Malena (P09), se implementa modal.

---

## 4. Buscador por nombre o unidad (P08)

**Lo que propone Malena:** cada pestaña del catálogo tiene un buscador por nombre o unidad.

**Posición del equipo:** aceptado, **ya está agregado a la spec de Alejandro** (bloque de insumos: "La lista permite buscar por nombre o unidad de medida") y al alcance del MVP.

---

## 5. Eliminación de insumos/packaging en uso (P08, relacionados con P11)

**Lo que propone Malena:** queda pendiente definir qué pasa si se intenta eliminar un insumo o packaging utilizado por un producto, y qué aviso mostrar.

**Decisión de la spec de Alejandro (ya tomada):**

- **En el MVP no aplica:** se puede borrar cualquier insumo libremente, porque todavía no existen recetas que los referencien (el bloque de productos no está implementado).
- **Cuando existan recetas:** el borrado de un insumo referenciado por una receta **se bloquea** hasta que el usuario lo quite de la receta primero. La spec ya lo deja como "regla pendiente para el bloque de productos"; Malena lo presenta como hueco abierto, pero para el equipo ya está decidido — solo falta implementarlo cuando llegue el bloque de productos.

**Para alinear con Malena:** la guía puede seguir mostrando el caso como "por definir", pero la respuesta del equipo es que la regla ya está decidida (bloqueo con aviso), pendiente solo de implementación.

---

## 6. Menú lateral y sus opciones (P07 y navegación común)

**Lo que propone Malena:** menú lateral persistente (desktop) / desplegable (móvil) con: Inicio, Insumos (con pestaña Packaging), Productos (con pestaña de presentaciones), Tabla de resultados/Tablero, Datos históricos, Configuraciones, Cerrar sesión. Además: onboarding guiado en el primer ingreso, Inicio/Bienvenida como pantalla de entrada, y Configuraciones permite volver a ver el onboarding.

**Posición de Alejandro:**

- **Le gustan las opciones que Malena propone en general.** En particular:
  - **Datos históricos:** le gusta la opción; la reserva en el menú está bien aunque el alcance funcional está por definir con Ariel.
  - **Configuraciones:** todavía no está claro para qué serviría — queda como opción a definir con el equipo.
  - Las opciones que le faltan le parecen bien.
- **El alcance del menú sigue siendo decisión pendiente** en la spec de Alejandro: la especificación actual contempla menú con los destinos del flujo de costos (Dashboard, Insumos, Productos, Costos indirectos, Tablero), pero Malena propone un menú más amplio (Inicio, Datos históricos, Configuraciones, onboarding). Hay que decidir si el menú lateral de la guía **reemplaza** al menú de destinos del flujo o convive con él, y si Inicio/Bienvenida + onboarding entran al alcance.

---

## Resumen

| # | Tema (pantallas de la guía de Malena) | Posición |
| --- | --- | --- |
| 1 | Packaging como pestaña (P08, P12) | Se acepta; funcionalidad por terminar de entender; impacta el modelo de datos de la spec de Alejandro |
| 2 | Campos del insumo (P08, P09) | **Diferencia a tratar con Malena**: la guía pide "unidad de compra"; la spec de Alejandro decidió cantidad + unidad de medida seleccionable, sin unidad de compra |
| 3 | Forma de carga: modal vs. inline (P08, P09) | Decisión de diseño sin diferencia funcional; si UX prefiere el modal, se implementa modal |
| 4 | Buscador (P08) | Aceptado y ya agregado a la spec de Alejandro y al MVP |
| 5 | Borrado de insumo en uso (P08, P11) | Ya decidido en la spec de Alejandro: libre en MVP, bloqueado cuando existan recetas; Malena lo deja como pendiente pero el equipo ya lo resolvió |
| 6 | Menú lateral y opciones (P07) | Opciones de Malena aceptadas en general; Datos históricos ok (alcance por definir); Configuraciones por definir; alcance del menú sigue pendiente de decisión en la spec de Alejandro |
