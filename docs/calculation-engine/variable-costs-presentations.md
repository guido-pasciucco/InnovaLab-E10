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
