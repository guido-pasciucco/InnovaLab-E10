# Resumen operativo y fórmulas del motor

Esta pestaña reúne lo indispensable para repasar el producto sin releer todo el informe. La pestaña Análisis completo sigue siendo la explicación detallada y debe consultarse cuando una regla necesite mayor contexto.

# 1 Qué debe resolver la aplicación

* Calcular costos y analizar precios de productos elaborados o revendidos por emprendedores de distintos rubros.
* Trabajar inicialmente en pesos argentinos y guardar la información en una cuenta del usuario.
* Permitir registrar varios productos, recetas, lotes, presentaciones y canales de venta.
* Mostrar cómo se obtiene cada resultado; la aplicación no debe entregar un número sin explicación.
* Utilizar fórmulas determinísticas. No se necesita un LLM ni inteligencia artificial para realizar los cálculos del MVP.

# 2 Datos mínimos que necesita el motor

* Insumo: nombre, presentación de compra, cantidad incluida, unidad, precio pagado y fecha del precio.
* Producto o receta: ingredientes y cantidad utilizada de cada uno.
* Producción: cantidad inicial, cantidad final, unidades previstas, unidades producidas y unidades vendibles.
* Mano de obra: tiempo, forma de valoración y horas extra cuando correspondan.
* Costos fijos: importe, período y porcentaje asignado a cada producto.
* Presentación de venta: cantidad de unidades, envase, etiqueta, canal y precio.
* Condición de venta: comisión de cobro u otro costo que cambie con cada venta.

# 3 Orden general del cálculo

1. Convertir cada compra y consumo a una unidad común: gramos, mililitros o unidades.
2. Calcular cuánto cuesta la cantidad de cada ingrediente utilizada en la receta.
3. Sumar los costos variables del lote.
4. Determinar cuántas unidades son realmente vendibles.
5. Calcular el costo variable por unidad.
6. Asignar una parte de los costos fijos del período al producto.
7. Calcular el costo completo por unidad y por presentación.
8. Comparar el costo con el precio de venta y calcular ganancia, contribución y punto de equilibrio.
9. Guardar los datos y precios utilizados para que el resultado pueda explicarse y revisarse.

# 4 Fórmulas principales

* Costo por unidad de compra = precio pagado ÷ cantidad total comprada.
* Costo del ingrediente = cantidad utilizada × costo por gramo, mililitro o unidad.
* Costo variable del lote = ingredientes + envases del lote + mano de obra variable + otros costos que cambian con la producción.
* Unidades vendibles = unidades producidas − unidades que no pueden venderse.
* Costo variable por unidad = costo variable del lote ÷ unidades vendibles.
* Rendimiento en peso (%) = cantidad final obtenida ÷ cantidad inicial preparada × 100.
* Aprovechamiento de unidades (%) = unidades vendibles ÷ unidades previstas × 100.
* Costo fijo asignado al producto = costos fijos del período × porcentaje asignado al producto.
* Costo fijo por unidad = costo fijo asignado al producto ÷ unidades vendibles del producto en el período.
* Costo completo por unidad = costo variable por unidad + costo fijo por unidad.
* Costo de una presentación = costo completo por unidad × unidades incluidas + envase específico.
* Ganancia por unidad o presentación = precio de venta − costo completo.
* Precio con recargo = costo completo × (1 + porcentaje de recargo).
* Precio con margen sobre la venta = costo completo ÷ (1 − porcentaje de margen).
* Contribución por unidad = precio de venta − costos variables de esa venta.
* Punto de equilibrio en unidades = costos fijos del período ÷ contribución por unidad.

# 5 Reglas que no deben romperse

* Las cantidades y los precios deben ser mayores que cero cuando sean necesarios para el cálculo.
* No se deben mezclar unidades incompatibles. Primero hay que convertirlas a una unidad común.
* Si falta el precio de un insumo, el cálculo debe marcarse como incompleto; la app no debe inventarlo.
* Si las unidades vendibles son cero, no se puede calcular el costo por unidad.
* Para el MVP, el usuario puede asignar manualmente los porcentajes de costos fijos; entre todos deben sumar 100 %.
* Los sueldos mensuales se registran como costos fijos. Solo las horas extra o pagos que cambian con la producción se suman como mano de obra variable.
* Margen y recargo no son lo mismo. La interfaz debe preguntar cuál quiere utilizar el usuario y aplicar la fórmula correspondiente.
* Si la contribución es cero o negativa, no existe un punto de equilibrio alcanzable con ese precio y la app debe advertirlo.
* Los cálculos conservan decimales internamente y los importes finales se muestran redondeados a dos decimales.
* Cada cálculo guardado debe conservar los precios, cantidades, criterio de asignación y demás datos utilizados.

# 6 Resultado mínimo que debe mostrar la app

* Costo de ingredientes y materiales.
* Costo de envases.
* Costo de mano de obra incorporado.
* Costo variable por lote y por unidad.
* Costo fijo asignado.
* Costo completo por unidad y presentación.
* Precio ingresado y precio simulado según margen o recargo.
* Ganancia estimada, contribución y punto de equilibrio.
* Advertencias por precios faltantes o desactualizados, datos incompletos, unidades incompatibles o resultados imposibles.
* Explicación del cálculo y posibilidad de volver a editar los datos que lo originaron.

# 7 Decisiones propuestas para el MVP

* Usar un período mensual para cargar costos fijos y cantidades vendibles; la vista anual puede sumar o comparar los meses.
* Permitir asignar costos fijos mediante porcentajes manuales. La automatización por tiempo de producción o participación en ventas puede quedar para una iteración posterior.
* Permitir que el usuario trabaje con recargo o con margen, pero mostrar claramente la diferencia.
* Tratar las comisiones por cobro como costos variables de la venta.
* Mantener fuera del cálculo inicial las recomendaciones mediante inteligencia artificial, integraciones contables, envíos automáticos y funciones predictivas.