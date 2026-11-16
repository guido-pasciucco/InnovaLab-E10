# Spec — Bloque 2: Productos y recetas (borrador vivo)

> Documento de trabajo para definir el spec del Bloque 2 de la Fase 2. Se construye decisión por decisión. Lo no decidido se marca explícitamente como **pendiente**.
>
> Se construye sobre la especificación, el alcance del MVP, el registro de decisiones y el glosario de la fase.

## Estado

- **En definición.** Decisiones cerradas hasta ahora: 4 (D1, D2, D3, D4).

## Objetivo y alcance (borrador)

Permitir definir, por cada producto del catálogo, su **receta** (insumos y cantidades) y obtener su **costo variable unitario (CVU)**, dentro de `/productos`.

**Alcance:** el Bloque 2 incluye por producto: nombre, receta, rendimiento, **capacidad mensual** (D3) y CVU. El prorrateo del costo total vía capacidad depende de los costos indirectos (Bloque 3).

## Decisiones cerradas

### D1 — Rendimiento de la receta y normalización a unidad

- **Regla:** la receta del producto declara un `rendimiento` = cantidad de unidades de producto para las que están cargadas las cantidades de la receta. Es un **campo general de la receta** (mismo valor para todos los renglones), ubicado en la **receta del producto**.
- **Default:** `1` (carga directa por 1 unidad).
- **Carga:** todas las cantidades de insumos se ingresan para ese mismo rendimiento.
- **Cálculo:**
  - `costo de la receta = Σ (costo de cada insumo por la cantidad cargada)`
  - `CVU = costo de la receta ÷ rendimiento` (costo variable unitario, siempre expresado por 1 unidad de producto)
- **Restricciones:** `rendimiento` > 0. Formato (entero/decimal) **pendiente**. No hay base distinta por renglón en esta definición.
- **Notas:** permite cargar por tanda/lote (“para N unidades”) sin cálculo manual; el sistema normaliza a unidad. Pendiente de validar con planilla #250.

### D2 — Renglón de receta: sin “modo de compra”, cantidad usada + unidad de la misma familia

- **Regla:** cada renglón de la receta se define como **insumo del catálogo + cantidad usada + unidad de la cantidad usada**. No se incluye “modo de compra (por cantidad / por unidad)”.
- **Validación:** la unidad de la cantidad usada debe pertenecer a la **misma familia** que la unidad de medida del insumo; la conversión es automática dentro de la familia y mezclar familias es inválido.
- **Cálculo del renglón:** `costo del renglón = (precio de compra del insumo / cantidad de compra del insumo) × cantidad usada`, con la conversión necesaria dentro de la familia. La suma de renglones (para el rendimiento declarado) da el costo de la receta; ver D1 para el CVU.
- **Alineación:** coincide con lo planteado por Malena en P11 (selección de insumo, cantidad usada con su unidad, rendimiento, sin precio por renglón).
- **Nota:** ajusta la definición previa de “Datos de la receta” de la especificación. Pendiente de validar con planilla #250.

### D3 — Capacidad mensual como campo editable en el formulario del producto (opción A refinada)

- **Regla:** la **capacidad mensual** (“¿Cuántas unidades pensás fabricar este mes?”) es un **campo del formulario del producto**, editable siempre (como nombre/receta/rendimiento). No hay pantalla propia para la capacidad ni entidad “plan del mes”.
- **Listado:** el listado de productos muestra la capacidad cargada.
- **Edición:** cambiar la capacidad recalcula lo dependiente en vivo (prorrateo, costo total, precio, equilibrio). Regla generalizada en D4 a cualquier dato editado.
- **Histórico:** se registra con un botón manual **“Cerrar cálculo”** (snapshot cuando el usuario está conforme), en lugar de “cerrar lista”. **Detalles del snapshot pendientes** (qué congela, inmutabilidad, relación con prorrateo/período, consulta del histórico).
- **Alineación:** recorrido Insumos → mis productos → crear/editar producto (nombre + receta + rendimiento + capacidad); superset del flujo de las issues #240–#242 sin pantalla dedicada de capacidad.
- **Limitación aceptada:** la capacidad es un atributo único del producto (no por período); para un mes nuevo se edita cada producto (mitigable a futuro con edición masiva).
- **Detalle:** comparación de opciones en el doc de decisión capacidad vs plan del período.

### D4 — Recálculo en vivo ante cualquier edición (decisión general)

- **Regla:** no hay un paso de cierre para poder calcular. Cualquier cambio en insumos, receta/rendimiento, capacidad, costos indirectos o recargo recalcula de inmediato todo lo derivado (CVU, prorrateo, costo total, precio y equilibrio), con aviso de qué cambió.
- **Alcance:** decisión general que aplica también al Bloque 2; productos y catálogo quedan editables siempre. La única dependencia de datos es que el prorrateo necesita capacidades cargadas.
- **Distinción:** "Cerrar cálculo" es un botón manual que solo genera una foto para el histórico; no habilita ni bloquea el cálculo.

## Modelo de datos (borrador, parcial)

> Solo lo que se va definiendo; incompleto a propósito.

- **Producto**
  - nombre — **pendiente de detallar**
  - receta (1:1 asumido por ahora) — **pendiente**
  - capacidad mensual (“¿Cuántas unidades pensás fabricar este mes?”) — **definido (D3)**: campo editable en el formulario del producto; su regla (obligatoria, >0, manejo de 0/sin cargar) está pendiente.
- **Receta (del producto)**
  - `rendimiento` (unidades que rinde la receta), > 0, default `1` — **definido (D1)**
  - renglones — **pendiente**
- **Renglón de receta** — **definido (D2)**
  - insumo (referencia al catálogo compartido de insumos)
  - cantidad usada
  - unidad de la cantidad usada (misma familia que la unidad del insumo; conversión automática dentro de la familia)
  - *sin campo “modo de compra”*
- **Insumo (referencia, Bloque 1, decidido):** nombre + precio de compra + cantidad + unidad de medida (catálogo precargado, 4 familias). Costo por unidad de medida derivado una vez; conversión automática dentro de la misma familia.

## Reglas de cálculo (borrador, parcial)

- **Costo por renglón:** `costo del renglón = (precio de compra del insumo / cantidad de compra del insumo) × cantidad usada`, con conversión automática dentro de la **misma familia** de unidades — **definido (D2)**.
- **Costo de la receta:** `Σ costo de renglones` para el rendimiento declarado.
- **CVU:** `CVU = costo de la receta ÷ rendimiento` (por 1 unidad de producto) — **definido (D1)**.
- **Redondeo/decimales:** **pendiente** (moneda, precisión intermedia y final).

## Decisiones pendientes (Bloque 2)

1. **“Cerrar cálculo” (snapshot) para histórico:** qué congela (insumos, recetas/rendimiento, capacidades, indirectos, recargo y resultados), inmutabilidad, relación con prorrateo/período y consulta del histórico (pantalla “Datos históricos”). Ver el detalle comparativo de opciones.
2. **Regla de capacidad:** obligatoria > 0 para cerrar/habilitar cálculo y tratamiento de capacidad 0 o sin cargar.
3. **Validaciones de receta:** compatibilidad de familia/unidad, cantidades válidas, duplicados, insumo inválido.
4. **Ciclo de vida:** edición/borrado de producto y receta; borrado de insumo referenciado (bloqueado) antes/después de snapshot; efectos de cambios.
5. **Packaging en presentaciones:** cómo se reutiliza packaging del catálogo de insumos en presentaciones (P12); su alta como pestaña del catálogo ya está decidida.
6. **UX/estados en `/productos`:** vacíos, contador, feedback de CVU; ubicación visual del campo de capacidad en el formulario/edición.
7. **Formato de `rendimiento` y redondeo/decimales:** entero o decimal, precisión de cálculo y de visualización.
8. **Planilla #250:** oráculo de validación de fórmulas/números.

