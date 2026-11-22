# Decisión — Capacidad mensual y “cerrar cálculo” (Fase 2)

> **Estado:** DECIDIDA (2026-11-15). Opción A refinada: la capacidad mensual es un **campo editable en el formulario del producto**; sin pantalla propia ni entidad “plan del mes”. El histórico se registra con un botón manual **“Cerrar cálculo”** (snapshot; detalles del snapshot pendientes).

---

## Contexto común

- El **Bloque 2** busca: por cada producto, **nombre + receta + rendimiento** y calcular **CVU** (costo variable unitario).
- El prorrateo de costos indirectos necesita una **capacidad** por producto (cuánto vas a fabricar de cada uno).
- Además de la ubicación de la capacidad, se planteó un modelo de **edición en vivo** y un **“cerrar cálculo”** manual para guardar un histórico (snapshot) cuando el usuario cargó todo y está satisfecho. Esto reemplaza/modifica el concepto de “cerrar lista” y se relaciona con períodos/histórico.

---

## Flujo A — Capacidad dentro del alta de producto

**Idea:** la capacidad mensual se carga **en el mismo recorrido** del producto, como paso final de su alta/edición (Bloque 2). Al declarar capacidad de cada producto, cuando estén todos, se puede prorratear y calcular.

### Recorrido (mapa mental)

1. **Inicio / menú lateral** → entrás a **Insumos**.
2. **Insumos** → cargás tus insumos una vez (Bloque 1, ya definido).
3. **Productos (mis productos / catálogo)** → creás cada producto:
   1. Cargás **nombre + receta + rendimiento**; el sistema calcula y muestra el **CVU** por unidad.
   2. Cargás **capacidad mensual** (“¿Cuántas unidades pensás fabricar este mes?” con unidad) **para ese producto** (p. ej. al final del alta/edición del producto).
   3. Repetís por cada producto del catálogo.
4. **Costos indirectos del mes** (Bloque 3) → cargás gastos del mes **una sola vez**.
5. **Precio / equilibrio / tablero** (Bloques 3–4) → calculás y ves resultados.
6. **Cerrar cálculo (opcional)** → si el usuario está conforme, un botón **“Cerrar cálculo”** genera una **foto/snapshot** de los datos de ese momento (insumos, recetas, capacidades, gastos, recargo y resultados) para el **histórico**; la sesión en vivo puede seguir editándose.

### Ventajas
- Recorrido más simple y directo; alinea con las issues #240–#242 (capacidad y cierre en el bloque 2).
- Menos pantallas y menos entidades nuevas.
- El usuario ve el CVU y su capacidad en el mismo lugar, sin volver a recorrer el catálogo.

### Desventajas
- Mezcla catálogo (más permanente) con plan/capacidad del mes (más variable).
- Cada mes, para actualizar capacidad, habría que **editar cada producto** (salvo que después se agregue una vista de edición masiva).
- “Cerrar cálculo” pasa a ser un concepto manual (no un “cierre de lista” obligatorio): hay que definir su alcance (qué se congela y qué no).

---

## Flujo B — Capacidad en el “plan del mes / cálculo del período”

**Idea:** separar **catálogo** (insumos + productos + recetas + CVU) de **plan del mes/período** (capacidad + costos indirectos + recargo). En Bloque 2 **no se pide capacidad**; se carga en el plan del período.

### Recorrido (mapa mental)

1. **Inicio / menú lateral** → entrás a **Insumos**.
2. **Insumos** → cargás tus insumos una vez (lo ya definido en Bloque 1).
3. **Productos (mis productos / catálogo)** → creás cada producto:
   - En el alta cargás **nombre + receta + rendimiento**; el sistema te muestra el **CVU** por unidad.
   - **Acá NO se pide capacidad mensual.**
4. **Plan del mes / cálculo del período** (pantalla nueva o reestructuración del bloque 3) → elegís/ves el **período** (ej. “Noviembre 2026”, o el período activo) y cargás:
   - **Producción mensual:** por cada producto del catálogo cargás cuántas unidades pensás fabricar este mes (“¿Cuántas unidades pensás fabricar este mes?”). Para no duplicar trabajo, esta pantalla debería ser una **tabla con todos los productos** y una columna editable de capacidad (con default previo o 0), guardando todo de una vez.
   - **Costos indirectos del período:** cargás gastos del mes (una vez para el negocio).
   - **Recargo (%):** definís el recargo para precio sugerido.
   - **Calcular / guardar:** al ejecutar, el sistema prorratea por capacidad, saca costo total, precio sugerido, contribución, equilibrio, etc.
5. **Resultados / tablero del período**; y si querés quedar con histórico, un **“Cerrar cálculo”** genera la **foto/snapshot** de ese período.

### Ventajas
- Separa catálogo de período; encaja más natural con **histórico por mes** (un snapshot por cálculo cerrado) y con el hueco del período.
- No ensucia el alta de producto con datos mensuales.
- La capacidad se cargaría de forma **masiva** en una tabla en vez de producto por producto.

### Desventajas
- Más complejo: entidad/flujo de **plan del mes/período** (o cálculo) y, si se quiere histórico, gestión de snapshots.
- Desvía de la redacción de las issues #240–#242 (la capacidad dejaría de ser paso del alta del producto).
- Si el “plan del mes” listara el catálogo como pantalla aparte, podría sentirse como **duplicar** la carga; necesita una buena UX (tabla única, prellenado, edición inline) para que realmente compense.
- Se solapa con el modelo de período/snapshot aún no definido (reglas de edición en vivo, qué se congela, sobre qué se prorratea).

---

## “Cerrar cálculo” (idea común a A y B)

**Propuesta (en discusión):** un botón tipo **“Cerrar cálculo de costos”** que, cuando el usuario cargó todo y revisó las vistas y está satisfecho, genera una **foto/snapshot** de los datos de ese momento.

- **Para qué sirve:** registrar un histórico/resultado del período sin impedir edición en vivo después.
- **Qué debería congelar (a definir):** insumos, recetas/rendimiento, capacidades, costos indirectos, recargo y resultados calculados (costo total, precio sugerido, contribución, equilibrio, etc.), asociados a un período/fecha.
- **Preguntas a resolver:**
  - ¿El snapshot es **inmutable** o se puede sobreescribir/eliminar?
  - ¿“Cerrar cálculo” reemplaza por completo el concepto de **lista cerrada**? ¿Hay al mismo tiempo “un período activo” editable y snapshots históricos?
  - ¿Qué pasa con datos cambiados después de cerrar (nuevos productos, insumos, etc.)? ¿Afectan al histórico o quedan fuera?
  - ¿Dónde se ve el histórico (pantalla “Datos históricos” del menú) y qué muestra?

---

## Comparación rápida

| Criterio | Flujo A (capacidad en alta/edición producto) | Flujo B (capacidad en plan/período) |
| --- | --- | --- |
| Dónde se carga capacidad | En el alta/edición de cada producto (Bloque 2) | En “Plan del mes / cálculo del período” (Bloque 3 o nueva pantalla) |
| ¿Bloque 2 pide capacidad? | Sí | No |
| Alcance/pantallas | Menos | Más (plan/período + snapshot) |
| Alineará con issues #240–#242 | Sí | No (traslada/redefine capacidad y cierre) |
| Multi-período / histórico | Posible con “cerrar cálculo” (snapshot) | Más natural (un plan/snapshot por período) |
| Riesgo percibido | Mezcla catálogo con mensual | Complejidad/duplicación si la pantalla de capacidad no está bien resuelta |

---

## Lo que faltaba definir (detalles sobre el snapshot) — RESUELTO

1. **“Cerrar cálculo” (D5–D8):** qué congela (todo el estado del cálculo: insumos, recetas/rendimiento, capacidades, indirectos, recargo y resultados — costo total, precio sugerido, contribución, equilibrio), inmutabilidad (editable con auditoría: campo, valor anterior/nuevo y cuándo), relación con el prorrateo y la edición en vivo (el snapshot queda etiquetado por mes; prorrateo sigue en vivo) y consulta del histórico (pantalla “Datos históricos” en el menú).
2. **Períodos/histórico:** un solo cálculo vigente editable en vivo (D4) + cierres como fotos por mes, en lugar de la entidad “plan del mes”.
3. **Consulta:** “Datos históricos” — lista de cierres por período; detalle de la foto y registro de cambios auditados.

## Estado actual / decisión

- **DECIDIDA (2026-11-15):** opción A refinada — ver siguiente sección.
- Los flujos A y B se documentan completos como referencia del análisis previo.

## A refinada — detalle de la decisión (opción elegida)

- **La capacidad mensual por producto es un campo editable dentro del formulario del producto** (el mismo donde se carga el nombre de la receta y que se puede corregir después). No hay una pantalla/pestaña dedicada solo para la capacidad y no hay entidad “plan del mes”.
- El recorrido queda: **Insumos → mis productos → crear/editar producto** (nombre + receta + rendimiento + **producción mensual**, todas editables siempre), con el sistema mostrando CVU.
- El listado de productos muestra la capacidad cargada; la edición de capacidad produce recálculo en vivo de lo dependiente (prorrateo, costo total, precio, equilibrio).
- El **histórico** queda a cargo de un botón manual **“Cerrar cálculo”** (snapshot), no de una pantalla de cierre/lista ni de un período gestionado aparte.
- Ventajas: un solo lugar de edición por producto, menos pantallas, coherente con edición en vivo. Limitación aceptada: la capacidad es un atributo único del producto (no hay por período); para un mes nuevo se edita producto por producto (eventualmente mitigable con edición masiva agregada después).
