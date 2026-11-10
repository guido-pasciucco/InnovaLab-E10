# Costos variables por unidad y presentación

El motor puro `lib/calc/calculateVariableCosts.ts` calcula dos resultados del mismo producto:

- costo variable de una unidad elaborada: ingredientes de la receta divididos por su rendimiento;
- costo variable de cada presentación comercial: costo unitario sin redondear por unidades de la presentación, más packaging.

El catálogo de insumos es único: ingredientes y packaging se referencian por el mismo identificador. Una receta principal, con su rendimiento, se reutiliza para cualquier cantidad de presentaciones comerciales asociadas al producto; no se duplica.

Los valores entran como strings decimales y se calculan con un contexto local de `decimal.js` de 80 dígitos. Se redondea una sola vez al devolver cada importe, a dos decimales con `ROUND_HALF_UP`. Cada uso de insumo multiplica el precio por la cantidad usada antes de dividir por la cantidad comprada; así conserva empates como `653,54 × 375 ÷ 492 = 498,125`. Para una presentación el motor también multiplica el costo de ingredientes por sus unidades antes de dividir por el rendimiento; así evita que una división periódica como `1 / 3` pierda los centavos al multiplicarse después.

La precisión finita no demuestra exactitud absoluta para entradas decimales arbitrarias: limita el error de divisiones no terminantes a un contexto alto y el único importe autoritativo es el total retornado por el motor. Si el dominio necesitara garantizar exactitud matemática para cantidades con más dígitos que ese contexto, deberá adoptar aritmética racional (numerador y denominador enteros) hasta el redondeo final. La vista muestra por separado los componentes redondeados, el subtotal de packaging y dos ajustes explícitos cuando son necesarios: uno entre sus ítems y su subtotal, y otro entre subtotales y total. No reasigna silenciosamente una diferencia a ingredientes ni packaging.

El motor normaliza `unidad`, `g`/`kg` y `ml`/`l`. Normaliza espacios de los identificadores antes de comparar referencias. Rechaza unidades incompatibles, cantidades o rendimientos no positivos, insumos inexistentes y presentaciones sin una cantidad entera positiva. No devuelve un costo si falta un dato indispensable.

La vista reutilizable `components/products/variable-costs-summary.tsx` recibe el resultado exitoso del motor, sin recalcular importes. Distingue costo de elaborar una unidad de costo de vender una presentación y expone el detalle de la receta, el valor interno usado antes de redondear (acotado a ocho decimales para lectura), las unidades incluidas y cada insumo de packaging. El total del motor es autoritativo. Quien la integra debe resolver el estado incompleto o el error `VariableCostsFailure`; el componente recibe únicamente `VariableCostsSuccess`.

## Límites de esta primera entrega

Los contratos de #239 y #240 aún no persisten cantidad y unidad de compra, rendimiento de receta ni presentaciones. Por eso #241 no agrega tablas, migraciones, servicios ni integra la vista en sus catálogos. Un adaptador futuro deberá transformar sus filas persistidas en el contrato puro del motor, recalcular los costos vigentes cuando cambie un precio y decidir cómo conservar snapshots históricos frente a cambios posteriores.

La fase 2 adopta recargo porcentual sobre el costo para precios, pero este motor no calcula precios ni modifica la implementación histórica de margen sobre precio de venta.
