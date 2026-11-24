# 05 — Cálculo de costos, precio y equilibrio

Bloque 3 y 4 del flujo de costos: carga de indirectos, reparto entre productos, precio sugerido, punto de equilibrio y tablero. Todo se recalcula en vivo; el cierre manual solo guarda una foto para el histórico.

## Recorrido

1. El usuario carga los **gastos del período** una sola vez para todo el catálogo.
2. El sistema **reparte** esos gastos entre los productos según su capacidad mensual.
3. El usuario ingresa el **margen** y ve el precio sugerido por producto.
4. Ve contribución, cuotas y **punto de equilibrio** en unidades y en pesos.
5. Consulta el **tablero**, de solo lectura, o ajusta el margen.
6. Cuando terminó, puede **cerrar el cálculo** para dejar una foto del mes en "Datos históricos".

## Gastos del período

- Pantalla con tabla de solo lectura, `+ Nuevo`, buscador por concepto, contador y un único modal de alta/edición (concepto e importe del mes). El borrado pide confirmación.
- El período de la vista es el **mes actual** de `America/Argentina/Buenos_Aires`. No hay selector de mes: consultar otro mes requiere antes definir la regla de edición histórica.
- El mes es la unidad de trabajo del cálculo: los gastos, el reparto y el cierre se expresan para un mes. No hay vista anual. Proyectar el gasto de un mes a doce daría un valor engañoso porque los gastos no son uniformes, y antes haría falta acordar qué se muestra como dato real y qué como proyección. Una vista anual, si se quiere, necesita su propia decisión.
- Se **permiten líneas repetidas** con el mismo concepto en un mes; el total suma todas.
- La columna `notes` existe pero no se expone en servicios ni en la UI.
- Los gastos son fijos e indirectos por definición: el servidor fija esas dimensiones y el cliente no puede cambiarlas.
- Los gastos generales compartidos se cargan **una vez** en la lista del período, sin elegir producto: un alquiler de $120.000 se cuenta como $120.000, no una vez por producto. Ese total único se reparte entre los productos con capacidad > 0 según su capacidad mensual, y la foto del mes congela el resultado.
- Los gastos directos por producto quedan fuera de alcance: no hay carga por producto y todo lo que se guarda se trata como indirecto. Si se quieren, hace falta una forma de medir el uso o el tiempo dedicado a cada producto y una decisión propia.
- Esta pantalla **no prorratea**, no calcula precio ni equilibrio; esas piezas son etapas separadas.

## Reparto de indirectos

- Solo entran al reparto los productos con **capacidad > 0**. Sin capacidades o sin gastos no se muestra costo total.
- Regla vigente del motor de reparto:

```text
participaciónᵢ       = capacidadᵢ ÷ Σ capacidades
gasto indirecto por unidad = gastos del mes ÷ Σ capacidades
costo total unitarioᵢ = CVUᵢ + gasto indirecto por unidad
```

- Un producto sin CVU absorbe su parte de los gastos, pero su costo total se muestra como **"No disponible"** con el motivo, nunca como `$ 0`.
- La "cantidad producida" que absorbe los indirectos es la **capacidad normal planeada** que el usuario carga en cada producto ("¿Cuántas unidades pensás fabricar este mes?"). No se usa producción real —ese dato no existe en el catálogo— ni un campo separado de "producción esperada", que sería equivalente y no cambiaría ningún número. Si la producción efectiva se desvía de lo planeado, la foto de "Cerrar cálculo" congela el valor del mes.
- Queda abierta la regla de "importancia de cada gasto": hoy los indirectos se tratan como un solo total.

## Precio y margen

El usuario ingresa un **recargo sobre el costo total unitario**:

```text
precio sugerido = costo total unitario × (1 + recargo)
margen real     = (precio sugerido − costo total unitario) ÷ precio sugerido
```

Con costo total unitario de `$ 7.000` y recargo de `30 %`: precio `$ 9.100`, ganancia `$ 2.100` y margen real `23,08 %`. El recargo y el margen real son números distintos y se muestran por separado: el recargo es lo que el usuario carga, el margen real es lo que efectivamente gana sobre el precio. Un recargo de cero o negativo deja el precio igual o por debajo del costo y se pide corregirlo.

La base es el costo total unitario: el costo variable de la receta y las presentaciones más la parte de los gastos del mes que le toca al producto según su capacidad. No entran comisiones por venta ni impuestos, y la mano de obra ya está dentro de los gastos del período.

## Trabajo propio

Cada costo responde tres preguntas independientes: ¿cambia si produzco más? (fijo/variable), ¿se puede asignar al producto? (directo/indirecto) y ¿el tiempo lo pone el emprendedor? (sí/no).

- El trabajo propio **entra en `totalPeriodo`** por su comportamiento fijo o variable; la vista de trabajo propio es informativa y **no se suma de nuevo** (0001).
- Se registra como dato propio, nunca se deduce del texto del concepto (0002).

El valor por hora se sugiere con datos del negocio, no con una tarifa de mercado:

```text
horas totales           = días trabajados × horas por día
horas productivas       = horas totales − horas de tareas generales (compras, administración, ventas)
valor sugerido por hora = remuneración mensual deseada ÷ horas productivas
```

Es un piso editable y su cálculo debe mostrarse. Si las horas productivas son cero, no se puede sugerir un valor: se piden datos o se carga uno manual. En cada receta se registra solo el **tiempo efectivo de elaboración**; las tareas generales ya se descontaron al calcular las horas productivas y no se suman otra vez. El personal contratado se carga como directo cuando su tiempo es medible por producto, y como indirecto cuando es un sueldo mensual con cargas: se reparte por tiempo de producción.

## Equilibrio y tablero

El tablero muestra por producto costo total unitario, contribución y margen; y como resumen la cuota mínima de cada producto y el equilibrio en unidades y en pesos, con un gráfico del punto de equilibrio.

Las fórmulas que hoy se usan como propuesta pendiente de validar con la planilla de referencia son:

```text
unidadesTotales   = costos indirectos del período ÷ contribución ponderada
cuotaᵢ            = unidadesTotales × mezclaᵢ
equilibrioEnPesos = Σ (cuotaᵢ × precio sugeridoᵢ)
prueba de cierre  = Σ (cuotaᵢ × contribuciónᵢ) = costos indirectos del período
```

También están abiertos el eje del gráfico, los estados vacíos y el formato de cuotas fraccionarias; esos tres puntos siguen sin regla.

## Histórico: "Cerrar cálculo"

- Es un **botón manual** que congela todo el estado del cálculo: insumos, recetas/rendimiento, capacidades, indirectos, margen y resultados. Es una foto completa y reproducible.
- El catálogo en vivo **sigue editable**; la foto no bloquea ni habilita el cálculo.
- La foto se puede corregir, pero **cada cambio queda auditado**: campo, valor anterior, valor nuevo y cuándo.
- Cada cierre se etiqueta con un **período (mes)**. El prorrateo y los cálculos siguen en vivo sobre el catálogo actual.
- Se consulta en el destino **"Datos históricos"** del menú, solo lectura.

## Reglas conceptuales del cálculo

### Alcance del producto

La calculadora es para **productos físicos** de cualquier rubro (alimentos, indumentaria, artesanías, cosmética, mobiliario). No calcula servicios en esta versión y no es sistema contable, de facturación, inventario ni impuestos. Es una herramienta de apoyo: no reemplaza asesoramiento contable ni impositivo.

**Principio de transparencia:** cada precio o escenario sugerido debe poder explicarse a partir de los datos y las fórmulas usados.

### Cadena del cálculo

`objeto de costo → unidad de costeo → recursos consumidos → clasificación → asignación → costo total → costo unitario → contribución → punto de equilibrio`.

La **unidad de costeo** es la presentación concreta en la que se vende ("una caja de 6 alfajores"), no la unidad de medida de un insumo (kg, g) ni el nombre genérico del producto. La interfaz pregunta *"¿Cómo vendés este producto?"* y confirma la elección con una frase comprensible. Todos los resultados nombran esa presentación.

El **lote** es lo producido en un proceso; el **rendimiento** dice cuántas unidades base utilizables se obtienen. Si la producción no forma presentaciones completas, se informa el sobrante en vez de redondearlo silenciosamente: se vende por separado, se conserva para otro lote o se considera merma.

### Costo total y costo unitario

- "Costo total" necesita contexto: puede ser de un lote, de la producción mensual o completo. La app siempre dice cuál está calculando.
- **Costo unitario = costo total ÷ cantidad obtenida**, donde "unitario" significa una unidad de la presentación elegida, no necesariamente una pieza.
- El costo fijo unitario es una **asignación basada en un volumen**: el fijo total no se transforma en variable. Si se reparten `$ 300.000` entre 100 unidades son `$ 3.000` cada una; entre 50, `$ 6.000`.
- **Cantidad producida y cantidad vendida no son equivalentes.** La producción interviene en el costo; las ventas, en ingresos, resultados y equilibrio.

### Clasificación de costos

Son tres preguntas independientes; no existe una categoría única que las reemplace:

1. ¿Cambia si produzco más? → fijo / variable.
2. ¿Puedo vincularlo razonablemente con el producto? → directo / indirecto.
3. ¿El tiempo lo pone el emprendedor? → sí / no.

**Directo no significa variable** y **fijo no significa eterno**: un fijo puede aumentar entre meses sin crecer por cada unidad fabricada. La clasificación directo/indirecto depende del vínculo con el objeto de costo: la electricidad de una máquina dedicada es directa; la del taller compartido, indirecta.

### Costeo por absorción y generadores de costo

Bajo el costeo por absorción, el costo final del producto incluye **todos los costos de fabricación**: materiales directos, mano de obra directa e indirectos, tanto variables como fijos.

```text
costo unitario total = costos directos + costos indirectos asignados
```

El reparto se rige por **relación causa-efecto**: quien consume el recurso paga el costo. El **generador de costo** (*cost driver*) es la variable medible que operacionaliza esa relación (horas de máquina, horas de mano de obra, unidades, lotes). No existe un método de asignación universal: forzar el mismo criterio en procesos distintos produce **subsidio cruzado**, es decir, unos productos absorben costos de otros.

> Los documentos de origen proponían criterios adicionales —tiempo de producción, ventas planificadas, costo directo planificado y porcentaje manual— para distintos tipos de gasto. Están registrados como alternativas, **no como regla vigente**: hoy el reparto se hace por capacidad (la regla de importancia de cada gasto sigue abierta).

### Contribución, margen y comisiones

- **Contribución por unidad = precio de venta − costo variable unitario.** Es el dinero que deja cada venta para cubrir los fijos.
- **Margen de contribución (%) = contribución ÷ ventas.** Debe llamarse por su nombre completo: decirle solo "margen" lo confunde con el porcentaje usado para fijar el precio.

Cuando hay comisiones u otros porcentajes sobre la venta, entran en la misma fórmula para no reducir la ganancia esperada:

```text
precio sugerido = (costo unitario + cargo fijo por venta)
                  ÷ (1 − margen − comisión porcentual − otros % sobre la venta)
```

Si margen y descuentos porcentuales suman 100 % o más, no hay precio válido. Los impuestos solo se incorporan cuando funcionan como porcentaje o cargo que debe cubrir el precio; la app no asume una condición impositiva.

### Equilibrio sin solución

Si el precio es igual o menor al costo variable unitario, la contribución es cero o negativa: **no existe punto de equilibrio alcanzable**. La app muestra una advertencia, no un número de unidades. Con varios productos, el cálculo depende de la mezcla de ventas planificada y debe mostrar la proporción usada.

### Precisión e histórico

- El dinero se calcula en decimal, sin redondeos intermedios; se redondea a dos decimales recién al mostrar o persistir.
- Las cantidades físicas conservan la precisión ingresada: `1,275 kg` no se convierte en `1,28 kg` para calcular.
- Un cálculo guardado conserva precios, cantidades, porcentajes, tiempos y reglas. Cambiar el precio de un insumo afecta cálculos futuros, **nunca resultados históricos**.
- Cada cálculo registra: producto y versión de receta, insumos con cantidades y precios, unidades producidas y vendibles, mermas y reutilizaciones, horas y valor de la mano de obra, otros costos directos, indirectos del período, criterio y porcentajes de reparto, margen, comisiones, precio sugerido y precio elegido, y fecha.

El motor conserva la precisión como fracción exacta con numerador y denominador, y redondea recién al mostrar el importe.

## Decisiones aplicables

En este flujo rigen el recálculo en vivo, la foto del cierre con correcciones auditadas, el prorrateo por capacidad, el mes actual para los gastos, y las reglas de trabajo propio, recargo sobre el costo total y margen real informado por separado.
