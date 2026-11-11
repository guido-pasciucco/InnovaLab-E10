# Costos variables por unidad y presentación

El motor puro `lib/calc/calculateVariableCosts.ts` calcula dos resultados del mismo producto:

- costo variable de una unidad elaborada: ingredientes de la receta divididos por su rendimiento;
- costo variable de cada presentación comercial: costo unitario sin redondear por unidades de la presentación, más packaging.

El catálogo de insumos es único: ingredientes y packaging se referencian por el mismo identificador. Una receta principal, con su rendimiento, se reutiliza para cualquier cantidad de presentaciones comerciales asociadas al producto; no se duplica.

Los valores entran como strings decimales finitos y se convierten en fracciones de `BigInt` normalizadas. El motor suma, multiplica y divide esas fracciones sin crear decimales periódicos aproximados. Cada uso de insumo multiplica el precio por la cantidad usada antes de dividir por la cantidad comprada; así conserva empates como `653,54 × 375 ÷ 492 = 498,125`. Para una presentación también multiplica el costo de ingredientes por sus unidades antes de dividir por el rendimiento.

Los importes monetarios se convierten por primera vez al salir del motor, a dos decimales con `ROUND_HALF_UP` exacto. El total retornado por el motor es autoritativo. La vista muestra por separado los componentes redondeados, el subtotal de packaging y dos ajustes explícitos cuando son necesarios: uno entre sus ítems y su subtotal, y otro entre subtotales y total. No reasigna silenciosamente una diferencia a ingredientes ni packaging.

La representación pública nunca serializa `BigInt`: expone strings monetarios y la relación racional exacta usada por unidad. Los inputs numéricos aceptan como máximo 100 dígitos entre parte entera y decimal, sin exponentes ni decimales infinitos, para acotar consumo de memoria y tiempo. Si el dominio necesitara cantidades mayores o notación científica, deberá acordar explícitamente otro contrato de entrada y sus límites.

El motor normaliza `unidad`, `g`/`kg` y `ml`/`l`. Normaliza espacios de los identificadores antes de comparar referencias. Rechaza unidades incompatibles, cantidades o rendimientos no positivos, insumos inexistentes y presentaciones sin una cantidad entera positiva. No devuelve un costo si falta un dato indispensable.

La vista reutilizable `components/products/variable-costs-summary.tsx` recibe el resultado exitoso del motor, sin recalcular importes. Distingue costo de elaborar una unidad de costo de vender una presentación y expone el detalle de la receta, la relación exacta usada antes de redondear, las unidades incluidas y cada insumo de packaging. El total del motor es autoritativo. Quien la integra debe resolver el estado incompleto o el error `VariableCostsFailure`; el componente recibe únicamente `VariableCostsSuccess`.

## Límites de esta primera entrega

Los contratos de #239 y #240 aún no persisten cantidad y unidad de compra, rendimiento de receta ni presentaciones. Por eso #241 no agrega tablas, migraciones, servicios ni integra la vista en sus catálogos. Un adaptador futuro deberá transformar sus filas persistidas en el contrato puro del motor, recalcular los costos vigentes cuando cambie un precio y decidir cómo conservar snapshots históricos frente a cambios posteriores.

La fase 2 adopta recargo porcentual sobre el costo para precios, pero este motor no calcula precios ni modifica la implementación histórica de margen sobre precio de venta.
## Contrato de precisión

Cada respuesta exitosa diferencia tres clases de datos:

- Los campos monetarios (`ingredientsCost`, `unitCost`, costos de packaging y de presentación, ajustes y `totalCost`) son strings redondeados a dos decimales para mostrar o persistir como importes monetarios.
- `exact.ingredientsCost`, `exact.unitCost`, `presentation.exact.productCost`, `presentation.exact.packagingCost`, `presentation.exact.totalCost` y `packaging.exactCost` son el valor autoritativo para cálculos posteriores. Cada uno se serializa como `{ numerator: string, denominator: string }`; nunca como `BigInt` en JSON.
- El input conserva la fuente de verdad para recálculo: precio, cantidad y unidad de compra, usos de receta, rendimiento, unidades de presentación y packaging. La persistencia de esos datos corresponde a los contratos pendientes de #239 y #240.

Un consumidor posterior no debe multiplicar `unitCost` mostrado (por ejemplo, `$ 0,33`) para reconstruir un pack de tres unidades. Debe usar la fracción exacta transferida o recalcular desde los datos originales; así el resultado conserva `$ 1,00` y nunca `$ 0,99`. Los componentes React solo muestran estos resultados y no contienen fórmulas de dominio.

## Límites de entrada y operaciones internas

Los inputs numéricos aceptan como máximo 100 dígitos entre parte entera y decimal, sin exponentes ni decimales infinitos. Este límite protege la entrada externa: resultados internos válidos pueden tener más de 100 dígitos y no se someten nuevamente a esa validación. Las tablas monetarias existentes usan `numeric(12,2)` (diez dígitos enteros), pero no son todavía el esquema de #239/#240; no se adopta ese límite silenciosamente.

El motor tampoco impone todavía un máximo funcional para cantidad de insumos, ingredientes, presentaciones o materiales de packaging. Los contratos de #239/#240 deberán establecer y validar esos límites en el borde de persistencia, midiendo el crecimiento de colecciones y fracciones para el uso real de Numora.
