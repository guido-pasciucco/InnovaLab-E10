# Spec — Bloque 2: Productos y recetas (borrador vivo)

> Documento de trabajo para definir el spec del Bloque 2 de la Fase 2. Se construye decisión por decisión. Lo no decidido se marca explícitamente como **pendiente**.
>
> Se construye sobre la especificación, el alcance del MVP, el registro de decisiones y el glosario de la fase.

## Estado

- **En definición.** Decisiones cerradas: 14 (D1 a D14).
  - **D4 (recálculo en vivo) y D5–D8 (snapshot “Cerrar cálculo”)** son decisiones **transversales** del flujo completo (costos, precio y tablero), no exclusivas del Bloque 2; se documentan en el registro de decisiones a nivel general y el Bloque 2 las consume.
  - Las decisiones propias del Bloque 2: D1, D2, D3, D9, D10, D11, D12, D13 y D14 vigentes. D13 (presentaciones/packaging) volvió a estar vigente el 2026-11-23.
- Última actualización: 2026-11-17.

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
- **Restricciones:** `rendimiento` > 0. Formato (entero/decimal): **no bloqueante**, lo define la implementación. No hay base distinta por renglón en esta definición.
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
- **Histórico:** se registra con un botón manual **“Cerrar cálculo”** (snapshot cuando el usuario está conforme), en lugar de “cerrar lista”. **Mecanismo transversal** (no propio del Bloque 2): aplica al flujo completo (costos indirectos, precio, tablero); sus detalles están registrados a nivel general (D5–D8).
- **Alineación:** recorrido Insumos → mis productos → crear/editar producto (nombre + receta + rendimiento + capacidad); superset del flujo de las issues #240–#242 sin pantalla dedicada de capacidad.
- **Limitación aceptada:** la capacidad es un atributo único del producto (no por período); para un mes nuevo se edita cada producto (mitigable a futuro con edición masiva).
- **Detalle:** comparación de opciones en el doc de decisión capacidad vs plan del período.

### D4 — Recálculo en vivo ante cualquier edición (transversal — aplica al flujo completo)

- **Regla:** no hay un paso de cierre para poder calcular. Cualquier cambio en insumos, receta/rendimiento, capacidad, costos indirectos o recargo recalcula de inmediato todo lo derivado (CVU, prorrateo, costo total, precio y equilibrio), con aviso de qué cambió.
- **Alcance:** decisión general que aplica también al Bloque 2; productos y catálogo quedan editables siempre. La única dependencia de datos es que el prorrateo necesita capacidades cargadas.
- **Distinción:** "Cerrar cálculo" es un botón manual que solo genera una foto para el histórico; no habilita ni bloquea el cálculo.

### D5 — Snapshot de "Cerrar cálculo": qué congela (transversal)

- **Regla:** el snapshot congela **todo el estado del cálculo**: insumos, recetas/rendimiento, capacidades, costos indirectos, recargo y resultados calculados (costo total, precio sugerido, contribución, equilibrio). Foto completa y reproducible.
- **Catálogo en vivo:** sigue editable; la foto es una copia, no un bloqueo (D4).

### D6 — Snapshot "Cerrar cálculo": editable con auditoría (transversal)

- **Regla:** el snapshot se puede corregir, pero **cada cambio queda registrado**: qué campo cambió, valor anterior y nuevo, y cuándo. No es inmutable ni se sobreescribe sin rastro.
- **Alcance:** la corrección es sobre la copia congelada, no sobre el catálogo en vivo.

### D7 — Snapshot: período etiquetado, prorrateo en vivo (transversal)

- **Regla:** cada "Cerrar cálculo" queda asociado a un **período (mes)**. El prorrateo y el resto de los cálculos siguen en vivo sobre el catálogo actual (D4); el snapshot es el registro histórico de ese mes, no la base del cálculo.
- **Ediciones posteriores:** afectan al cálculo en vivo; no alteran el snapshot cerrado salvo una corrección auditada (D6).

### D8 — Consulta del histórico: pantalla "Datos históricos" (transversal)

- **Regla:** el histórico se consulta en un destino propio del menú, **"Datos históricos"**: lista de cierres por período, detalle de cada foto (D5) y registro de cambios auditados (D6).
- **Alcance:** solo lectura del histórico; la edición en vivo sigue en `/productos` y en el resto de los bloques (D4).

### D9 — Regla de capacidad: > 0 para habilitar el cálculo

- **Regla:** la capacidad mensual debe ser **> 0** para que el producto entre al prorrateo y muestre costo total, precio sugerido y equilibrio. Si está en 0 o sin cargar, el producto se guarda igual y la pantalla avisa qué falta; al completarla, todo se recalcula en vivo (D4).
- **CVU:** se calcula siempre (depende de la receta y el rendimiento, no de la capacidad).

### D10 — Validaciones de receta: estrictas al cargar

- **Regla:** al agregar o editar un renglón se valida de inmediato: insumo existente del catálogo del usuario, unidad de la misma familia, cantidad > 0 y un solo renglón por insumo.
- **Efecto:** el error se marca en el formulario y el renglón no entra al cálculo hasta corregirlo; al corregirlo se recalcula en vivo (D4).

### D11 — Borrado de insumo referenciado

- **Regla:** no se puede borrar un insumo que aparece en una receta viva. El sistema bloquea la acción, indica qué recetas lo usan y hay que quitarlo de ellas (o borrarlas) primero.
- **Histórico:** los snapshots conservan su copia del insumo (D5), así que el borrado en vivo no rompe el histórico.

### D12 — Ciclo de vida: edición libre y borrado lógico

- **Regla:** productos y recetas se pueden editar y borrar siempre. El borrado es **lógico**: el registro se marca como borrado, deja de mostrarse en el catálogo vivo y de entrar en los cálculos, pero se conserva y se puede restaurar.
- **Efectos:** cualquier cambio recalcula en vivo (D4); los snapshots cerrados no se afectan (D5, D6).

### D13 — Packaging en presentaciones: referencia del catálogo y suma al costo

> **Vigente desde el 2026-11-23.** Antes estuvo descartada de momento, pendiente de comprensión y validación con Malena.

- **Regla:** cada producto puede tener presentaciones con nombre único en el producto, una cantidad entera de unidades mayor que 0 y packaging del catálogo con cantidad y unidad de su misma familia.
- **Cálculo:** `costo de la presentación = costo de la receta × unidades ÷ rendimiento + Σ costo del packaging`.
- **Fuente única:** el precio del packaging se carga una vez en la pestaña Packaging; la presentación solo referencia.
- **Pantalla (P12):** vista propia del producto con el costo de elaborar una unidad y el de cada presentación por separado, desglose y avisos cuando falta un dato. No suma gastos indirectos.
- **Protección:** el packaging usado por una presentación no se borra ni cambia de tipo o familia de unidad.

### D14 — UX en `/productos`: capacidad arriba y CVU en vivo

- **Regla:** el campo de capacidad va en el bloque principal del formulario, junto a nombre y rendimiento, visible sin scroll; el CVU se muestra ahí mismo y recalcula en vivo (D4).
- **Avisos:** capacidad 0/vacía (D9) y errores de renglón (D10) se muestran en el formulario. Los estados vacíos y el contador son detalle de implementación.

## Modelo de datos (borrador, parcial)

> Solo lo que se va definiendo; incompleto a propósito.

- **Producto**
  - nombre — **pendiente de detallar**
  - receta (1:1 asumido por ahora) — **pendiente**
  - capacidad mensual (“¿Cuántas unidades pensás fabricar este mes?”) — **definido (D3 y D9)**: campo editable en el formulario del producto; > 0 para habilitar el cálculo, con aviso si está vacía o en 0.
- **Receta (del producto)**
  - `rendimiento` (unidades que rinde la receta), > 0, default `1` — **definido (D1)**
  - renglones — **definido (D2)**
  - presentaciones — **definido (D13)**: nombre único en el producto, unidades enteras > 0 y packaging del catálogo con cantidad y unidad de su familia
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
- **Costo de una presentación:** `costo de la receta × unidades ÷ rendimiento + Σ costo del packaging` — **definido (D13)**.
- **Redondeo/decimales:** **no bloqueante** (moneda, precisión intermedia y final); lo define la implementación.

## Decisiones pendientes (Bloque 2)

1. ~~**“Cerrar cálculo” (snapshot) para histórico**~~ **Resuelto (transversal, D5–D8):** alcance (congela todo el estado del cálculo), inmutabilidad (editable con auditoría), relación con prorrateo/período (etiquetado por mes, prorrateo en vivo) y consulta (“Datos históricos”). No es propia del Bloque 2; registrada a nivel general.
2. ~~**Regla de capacidad**~~ **Resuelta (D9):** > 0 para habilitar el cálculo; con 0 o sin cargar se guarda igual, avisa y se excluye del prorrateo hasta completarla.
3. ~~**Validaciones de receta**~~ **Resueltas (D10):** estrictas al cargar (familia, cantidad > 0, sin duplicados, insumo válido).
4. ~~**Ciclo de vida**~~ **Resuelto:** borrado de insumo referenciado (D11) y edición/borrado de producto y receta con borrado lógico (D12).
5. ~~**Packaging en presentaciones**~~ **Resuelto (D13, 2026-11-23):** presentaciones con unidades y packaging del catálogo, costo separado del de la unidad y protección del packaging en uso. Antes estuvo descartada de momento.
6. ~~**UX/estados en `/productos`**~~ **Resuelto (D14):** capacidad arriba junto a nombre y rendimiento, CVU en vivo. Vacíos y contador son detalle de implementación.
7. ~~**Formato de `rendimiento` y redondeo/decimales**~~ **No bloqueante:** no es decisión de negocio; lo define la implementación.
8. **Planilla #250 (dependencia externa):** oráculo de validación de fórmulas; no es una decisión de producto. Sigue siendo el bloqueante de QA para D1/D2.

