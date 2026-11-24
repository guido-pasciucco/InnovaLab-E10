# Mora — Glosario de costos, precios y resultados

> **Contenido derivado para asistencia al usuario; revisión funcional pendiente antes de publicar.**
> Fuente: «Glosario v 1.4s - numora» (5 páginas). Las definiciones se adaptaron a un lenguaje de ayuda, preservando conceptos, ejemplos y utilidad. Donde el PDF presenta resultados de fase 2 como si ya existieran, se señala su estado según la auditoría técnica del 23/11/2026 y `producto.md`.
> **Regla para Mora:** explicar el concepto sin prometer que existe una pantalla o fórmula concreta en la versión actual. Distinguir siempre entre valor unitario, por presentación y por mes.

## Antes de interpretar el tablero

- **Datos cargados:** los costos se basan en precios y cantidades informados por el usuario, no en una actualización automática por inflación.
- **Impuestos:** el glosario describe un cálculo de costos sin liquidar impuestos, percepciones o retenciones. No ofrecer asesoramiento impositivo.
- **Cantidades y merma:** la receta debe reflejar lo que realmente se utiliza, incluida la merma cuando corresponde.
- **Trabajo propio:** la guía recomienda considerar la remuneración de quien trabaja en el emprendimiento para no subestimar costos. Su asignación final depende de las reglas vigentes.
- **Gastos de estructura:** la forma definitiva de distribuirlos entre distintos productos está en definición para fase 2; no afirmar una regla de reparto definitiva.

## Costo variable

**Qué es.** Costo de insumos y materiales que varía con las unidades elaboradas, como ingredientes o envases.

**Para qué sirve.** Permite conocer lo que cuesta producir antes de distribuir gastos generales y detectar insumos costosos. Que el costo sea variable no significa que sea igual al precio de compra de un paquete completo: importa la cantidad utilizada.

## Costo variable unitario (CVU)

**Qué es.** Costo variable correspondiente a una unidad elaborada.

**Cómo se obtiene.** Se suman los costos de insumos realmente utilizados en la receta y se divide por el rendimiento declarado. Para una presentación comercial, se agrega el costo de packaging correspondiente y de todas las unidades que contiene.

**Para qué sirve.** Comparar productos, revisar consumo de materiales y calcular la contribución por venta. **No confundir** con el costo total unitario ni con el costo variable de una caja con empaque.

## Gastos fijos, indirectos y de estructura

**Qué son.** Gastos generales del período que no se identifican directamente con cada unidad elaborada, como alquiler, servicios, seguros o ciertos sueldos.

**Matiz importante.** El PDF original usa «fijos», «indirectos» y «de estructura» como equivalentes pedagógicos. **No son sinónimos universales en contabilidad.** En la aplicación se debe seguir la clasificación funcional aprobada; no inventar un criterio automático de distribución.

## Costo total unitario

**Qué es.** Costo variable unitario más la porción de gastos de estructura asignada a la unidad según las reglas del período.

**Para qué sirve.** Evaluar si el precio cubre los costos estimados en el escenario de producción. El valor puede variar si cambian insumos, gastos o producción planificada.

**Estado:** el desglose y prorrateo multiproducto de fase 2 están sujetos a integración/validación. No asumir que todas las vistas del tablero diseñado existen.

## Precio sugerido

**Qué es.** Precio de referencia calculado usando el costo y el porcentaje establecido en el mecanismo de precio. Es orientativo; además importan la competencia, el mercado y el comportamiento real de las ventas.

**Convenciones distintas que no deben mezclarse:**

- **Motor histórico verificado:** margen objetivo **sobre el precio de venta**; precio sugerido = costo total unitario / (1 − margen decimal), para valores válidos.
- **Regla acordada para fase 2 (aún no certificada como integrada):** **recargo sobre el costo total**; precio sugerido = costo total unitario × (1 + recargo decimal).

El glosario original describe el precio con recargo como si fuera la única fórmula. **Mora debe distinguir qué convención utiliza la versión consultada antes de explicar el cálculo actual.**

## Margen en pesos

**Qué es.** Diferencia entre precio de venta y costo total unitario: `precio de venta − costo total unitario`.

**Para qué sirve.** Comparar cuánto queda por unidad una vez considerados los costos asignados. Es una estimación bajo los supuestos cargados, **no necesariamente ganancia neta realizada**.

## Margen sobre el precio

**Qué es.** Parte del precio de venta que representa el margen en pesos.

**Cómo se calcula.** `(precio de venta − costo total unitario) / precio de venta × 100`, cuando el precio es válido y distinto de cero.

**Ejemplo del documento.** Un producto cuesta $200 y se vende a $300: el margen es $100 y equivale al 33,3 % del precio.

## Recargo sobre el costo (markup)

**Qué es.** Porcentaje añadido al costo total para obtener un precio. No es el mismo porcentaje que el margen sobre el precio.

**Cómo se calcula.** `(precio de venta − costo total unitario) / costo total unitario × 100`, cuando el costo es válido y mayor que cero.

**Ejemplo del documento.** Costo $200, precio $300: recargo 50 %, mientras el margen sobre el precio es 33,3 %. Otras equivalencias del PDF: recargo 20 % → margen ≈16,7 %; recargo 100 % → margen 50 %.

**Precaución:** el título original «Margen sobre el costo total — % Recargo» mezcla nombres. Para evitar ambigüedad, Mora debe llamarlo **recargo**, diferenciándolo del margen sobre precio.

## Contribución de una unidad

**Qué es.** Dinero aportado por cada venta después de cubrir únicamente el costo variable de esa unidad o presentación.

**Cómo se calcula.** `precio de venta − costo variable unitario`.

**Para qué sirve.** Saber cuánto aporta la venta para cubrir gastos de estructura y, una vez cubiertos, contribuir al resultado. **Contribución positiva no significa ganancia neta.**

## Capacidad del mes / objetivo de producción

**Qué es.** Cantidad que se **planea fabricar** durante el mes. No es venta real, pedidos actuales ni necesariamente el máximo físico posible.

**Para qué sirve.** Planificar producción y alimentar estimaciones de distribución de costos en el flujo de fase 2. La ubicación final de esta carga en la interfaz estaba por definir.

## Mezcla de productos

**Qué es.** Participación de cada producto en el volumen de producción planificado.

**Cálculo conceptual del glosario.** `producción planificada de un producto / producción planificada total` cuando las unidades son comparables y el criterio está validado.

**Para qué sirve.** Comprender cuánto depende el negocio de cada producto y estudiar escenarios de equilibrio.

**Estado:** concepto del diseño multiproducto de **fase 2**; no afirmar que Numora ya calcula o presenta la mezcla en el tablero actual.

## Contribución ponderada

**Qué es.** Promedio de contribuciones unitarias considerando la participación de cada producto en la mezcla.

**Para qué sirve.** Analizar el punto de equilibrio cuando se venden varios productos con contribuciones diferentes.

**Estado:** explicación conceptual de fase 2, no una funcionalidad certificada en la versión actual. La fórmula precisa requiere la mezcla y reglas validadas por el equipo.

## Punto de equilibrio

**Qué es.** Nivel de ventas en que la contribución de las ventas alcanza a cubrir los gastos de estructura del período: bajo los supuestos del cálculo, ingresos y costos se equilibran.

**Para qué sirve.** Definir metas mínimas de ventas y evaluar cambios de precios, costos o volumen.

**Estado:** la documentación de Mora auditada distingue el equilibrio por producto disponible del **equilibrio multiproducto** previsto para fase 2. No anunciar el segundo como implementado.

## Unidades de equilibrio de una mezcla

**Qué son.** Volumen combinado teórico de ventas necesario para cubrir los gastos de estructura, **respetando una mezcla de productos supuesta**.

**Para qué sirven.** Transformar un escenario de equilibrio multiproducto en una meta de unidades.

**Estado:** fase 2. El glosario original presenta la división de gastos de estructura por contribución ponderada como regla conceptual; el criterio final y el redondeo deben validarse antes de afirmar un resultado exacto en Numora.

## Cuota en unidades por producto

**Qué es.** Parte del objetivo total de ventas en unidades asignada a cada producto conforme a una mezcla teórica.

**Para qué sirve.** Definir metas por producto dentro del escenario multiproducto.

**Estado:** fase 2. No asegurar que vender exactamente esa cuota garantice cubrir costos: el resultado depende de que se respeten precios, mezcla, cantidades y supuestos del período.

## Facturación por producto vinculada al equilibrio

**Qué es.** Ingreso de venta asociado a la cuota teórica de unidades de un producto.

**Cálculo conceptual.** `cuota en unidades × precio de venta`.

**Para qué sirve.** Traducir cuotas de ventas a importes monetarios para planificar objetivos.

**Estado:** fase 2, no vista actual verificada.

## Equilibrio en pesos

**Qué es.** Ingresos totales necesarios, bajo los supuestos de costos y mezcla, para alcanzar el equilibrio del período.

**Para qué sirve.** Comparar metas de facturación con la estructura de costos y medir el margen de seguridad ante cambios de ventas.

**Estado:** el indicador de equilibrio multiproducto en pesos del glosario es **una propuesta de fase 2**. No describirlo como disponible en el tablero actual sin verificarlo.

## Indicadores destacados del tablero diseñado

El glosario propone, **a revisar con el equipo**, destacar: costo total unitario, precio sugerido, contribución de una unidad, unidades para cubrir gastos indirectos y equilibrio en pesos. Son una **propuesta de jerarquía visual**, no una lista garantizada de indicadores ya desplegados.

## Qué debe recordar Mora

- No confundir costo variable unitario con costo total unitario, ni con costo de presentación.
- No equiparar **margen** con **recargo**: tienen denominadores distintos.
- No confundir contribución positiva con ganancia neta.
- No usar producción planificada como si fueran ventas reales.
- Identificar el **estado** de cada indicador multiproducto antes de ofrecer instrucciones de navegación.
- Si la pregunta requiere datos concretos de la cuenta, aclarar que Mora no accede a esos datos privados.

## Validación pendiente

Revisar con el equipo la clasificación de gastos, la regla final de prorrateo, el estado de integración del precio por recargo, las fórmulas y redondeos del equilibrio multiproducto y las etiquetas exactas del tablero antes de publicar estas explicaciones como ayuda definitiva.
