# 04 — Productos

Alta y edición de productos, sus recetas y la capacidad mensual. Aquí se obtiene el **costo variable unitario (CVU)** que después alimenta el reparto de indirectos, el precio y el equilibrio.

## Recorrido

1. El usuario entra a **Productos** desde el menú, desde la página inicial o desde Insumos.
2. Crea un producto con **nombre, receta, rendimiento y capacidad mensual**.
3. La receta se arma eligiendo insumos ya cargados: por cada renglón se indica cantidad usada y su unidad.
4. El sistema muestra el CVU en el mismo formulario y lo recalcula en vivo ante cualquier cambio.
5. Puede agregar cuantos productos quiera, editarlos o borrarlos. No hay cierre de lista.

## Datos del producto

| Dato | Regla |
| --- | --- |
| Nombre | Texto libre. |
| Receta | Uno o más renglones. Cada renglón = insumo del catálogo + cantidad usada + unidad de la cantidad usada. Sin campo "modo de compra". |
| Rendimiento | Un solo valor para toda la receta (no por renglón). Default `1`, debe ser > 0. Todas las cantidades se cargan para ese rendimiento. |
| Capacidad mensual | Campo editable del formulario ("¿Cuántas unidades pensás fabricar este mes?"). No tiene pantalla propia ni entidad "plan del mes". |

## Cálculo del CVU

```text
costo del renglón = (precio de compra del insumo ÷ cantidad de compra del insumo) × cantidad usada
costo de la receta = Σ costo de renglones        (para el rendimiento declarado)
CVU = costo de la receta ÷ rendimiento            (siempre por 1 unidad de producto)
```

La conversión de unidades ocurre dentro de la misma familia del catálogo de insumos.

## Validaciones al cargar un renglón

- El insumo existe y pertenece al catálogo del usuario.
- La unidad usada es de la **misma familia** que la unidad de medida del insumo.
- La cantidad usada es **> 0**.
- No hay otro renglón con el **mismo insumo**.

Si hay error, se marca en el formulario y el renglón no entra al cálculo hasta corregirlo. Al corregirlo, todo se recalcula en vivo.

## Capacidad y presentación de resultados

- La capacidad va en el bloque principal del formulario, junto a nombre y rendimiento, visible sin scroll.
- El listado muestra la capacidad cargada de cada producto.
- Con capacidad `0` o vacía se guarda igual, se avisa y se excluye del prorrateo; el CVU se calcula de todas formas porque depende de la receta, no de la capacidad.
- La capacidad es un atributo del producto, no del período: para un mes nuevo se edita cada producto.

## Presentaciones

Cada producto puede tener presentaciones —por ejemplo "Unidad" o "Caja x6"— con nombre único dentro del producto, cantidad entera de unidades mayor que 0 y una lista opcional de **packaging del catálogo**, cada uno con su cantidad y una unidad de la misma familia (antes estuvo descartada de momento y hoy está vigente).

```text
costo de la presentación = costo de la receta × unidades ÷ rendimiento + Σ costo del packaging
```

El packaging no se divide por el rendimiento: se suma entero a la presentación que lo usa. El precio del packaging se carga una sola vez en la pestaña Packaging del catálogo; si cambia, cambia el costo de todas las presentaciones que lo usan.

La pantalla propia del producto (P12) muestra por separado el costo variable de elaborar una unidad y el de cada presentación, con su desglose. Si falta un dato —receta incompleta, rendimiento inválido o packaging sin precio— avisa en vez de mostrar `$0` como si fuera válido. No suma gastos indirectos.

Un packaging usado por una presentación no se puede borrar ni cambiar de tipo o de familia de unidad: primero hay que quitarlo de las presentaciones que lo usan, la misma regla que para los insumos de una receta.

Queda fuera de alcance la capacidad de cada presentación (Diferencia 1·bis, pendiente) y el precio de venta.

## Mermas, pérdidas y sobrantes

```text
unidades vendibles   = cantidad producida − merma − unidades no vendibles
costo directo unitario = costo directo del lote ÷ unidades vendibles
```

- **Merma del insumo:** materia prima descartada antes o durante la elaboración.
- **Pérdida durante la producción:** su costo se reparte entre las unidades que sí se venden.
- **Pérdida posterior:** producto terminado que se descarta después. Se registra como pérdida del período y **no modifica retroactivamente** el costo del lote original.
- **Sobrante aprovechable:** puede convertirse en insumo de otro producto. Conserva el costo unitario que tenía, se descuenta del stock de origen y al lote derivado se le suman **solo los costos adicionales de transformación**. Ambos movimientos quedan vinculados.

```text
costo transferido           = cantidad reutilizada × costo unitario registrado del origen
costo total del lote derivado = costo transferido + costos adicionales de transformación
```

Si esta sección llega a implementarse, el sistema debe impedir reutilizar más de lo disponible, transferir el precio de venta en lugar del costo, usar la misma unidad en dos lotes derivados, crear un lote derivado con cantidad cero y romper el vínculo con el origen. Estas reglas son una **propuesta documentada**, no una decisión en alcance: su implementación está diferida a largo plazo y requiere acuerdo previo con el equipo.

## Ciclo de vida

Productos y recetas se editan y se borran siempre. Borrar es **definitivo para el usuario**: el producto deja de mostrarse y de entrar en los cálculos, y no hay forma de restaurarlo. Internamente el registro se conserva marcado como inactivo, así que las fotos cerradas no se afectan. Sacar un producto del cálculo sin borrarlo (desactivarlo) es una mejora diferida.

## Precisión

Los importes se calculan con fracciones exactas y se redondean recién al salir del motor (`ROUND_HALF_UP`, 2 decimales). Los valores exactos se conservan como par `numerator`/`denominator` para cualquier cálculo posterior; no se reconstruyen desde el importe mostrado.

## Decisiones aplicables

Todas las reglas de este flujo están decididas y explicadas arriba: rendimiento único, renglón sin modo de compra, capacidad en el producto, recálculo en vivo, validaciones, protección de recetas, borrado lógico y presentaciones. Los puntos que siguen abiertos son los que aún no tienen regla.
