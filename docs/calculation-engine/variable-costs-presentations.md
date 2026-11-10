# Costos variables por unidad y presentación

El motor puro `lib/calc/calculateVariableCosts.ts` calcula dos resultados del mismo producto:

- costo variable de una unidad elaborada: ingredientes de la receta divididos por su rendimiento;
- costo variable de cada presentación comercial: costo unitario sin redondear por unidades de la presentación, más packaging.

El catálogo de insumos es único: ingredientes y packaging se referencian por el mismo identificador. Una receta principal se reutiliza para cualquier cantidad de presentaciones; no se duplica.

Los valores entran como strings decimales y se calculan con `decimal.js`. Se redondea una sola vez al devolver cada importe, a dos decimales con `ROUND_HALF_UP`. La multiplicación de una presentación usa el valor exacto interno, para evitar que el redondeo del costo unitario acumule diferencias.

El motor normaliza `unidad`, `g`/`kg` y `ml`/`l`. Rechaza unidades incompatibles, cantidades o rendimientos no positivos, insumos inexistentes y presentaciones sin una cantidad entera positiva. No devuelve un costo si falta un dato indispensable.

## Límites de esta primera entrega

Los contratos de #239 y #240 aún no persisten cantidad y unidad de compra, rendimiento de receta ni presentaciones. Por eso #241 no agrega tablas, migraciones, servicios ni UI sobre esas ramas. Un adaptador futuro deberá transformar sus filas persistidas en el contrato puro del motor y decidir cómo conservar snapshots históricos frente a actualizaciones de precio.

La fase 2 adopta recargo porcentual sobre el costo para precios, pero este motor no calcula precios ni modifica la implementación histórica de margen sobre precio de venta.
