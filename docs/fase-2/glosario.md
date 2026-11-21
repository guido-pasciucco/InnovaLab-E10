# Glosario — Fase 2

Términos de negocio del flujo de costos multi-producto. Cuando un término aparece con negrita en el glosario, se escribe igual en todo el flujo.

| Término | Definición |
| --- | --- |
| **Insumo** | Material o servicio que se compra y usa en las recetas (harina, aceite, sal). |
| **Packaging** | Ítem de embalaje del mismo catálogo que los insumos; se diferencia solo por `kind`. |
| **Producto** | Bien o servicio que el emprendedor fabrica o vende (pan flauta, facturas). |
| **Receta** | Renglones de insumos (cantidad usada + unidad) cargados para un `rendimiento` dado y normalizados a costo por unidad. |
| **Rendimiento** | Cantidad de unidades de producto para las que están cargadas las cantidades de la receta. Un solo valor para toda la receta, default `1`, > 0. |
| **Renglón de receta** | Insumo del catálogo + cantidad usada + unidad de esa cantidad, de la misma familia que la unidad del insumo. Sin "modo de compra". |
| **Costo variable unitario** | Suma del costo de los renglones de la receta dividida por el rendimiento. Siempre expresado por 1 unidad de producto. |
| **CVU** | Sigla de costo variable unitario. |
| **Capacidad mensual** | Cantidad que se planea fabricar de un producto en el mes; campo editable del formulario del producto que sirve para repartir los costos indirectos. |
| **Cerrar cálculo** | Botón manual que genera una foto/snapshot del estado del cálculo para el histórico. No existe el cierre de la lista de productos. |
| **Costos indirectos del período** | Gastos del mes compartidos por todos los productos (alquiler, servicios); se cargan una sola vez para todo el catálogo. |
| **Prorrateo** | Reparto de los costos indirectos entre productos según su participación de capacidad. |
| **Tasa indirecta por unidad** | Porción de los costos indirectos que absorbe una unidad del producto. |
| **Costo total unitario** | Costo variable unitario + tasa indirecta por unidad. |
| **Recargo** | Porcentaje que el usuario indica para sumar al costo total y obtener el precio sugerido. |
| **Precio sugerido** | Costo total unitario × (1 + recargo). |
| **Contribución unitaria** | Precio sugerido − costo variable unitario. Los costos indirectos no entran en esta cuenta. |
| **Margen** | Precio sugerido − costo total unitario, leído como porcentaje del costo total. |
| **Mezcla** | Capacidad del producto ÷ suma de las capacidades de todos los productos. |
| **Contribución ponderada** | Σ (contribución unitaria × mezcla) sobre todos los productos. |
| **Cuota** | Unidades de cada producto que hay que vender para cubrir los costos indirectos del período. |
| **Equilibrio** | Punto en que la contribución de la mezcla cubre los costos indirectos; se expresa en unidades y en pesos. |
| **Catálogo** | Conjunto de insumos y productos del usuario. |
