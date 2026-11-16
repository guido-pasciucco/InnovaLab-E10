# Análisis del flujo de costos — Fase 2

Análisis del flujo de usuario que surge de las issues de la fase 2 (#239 a #247, #250) y de los huecos que quedan sin definir.

## El flujo, en orden

### 1. Alta de insumos (#239)

El emprendedor crea su lista de insumos con el precio de compra (ej. harina, aceite, sal). Queda guardada de forma persistente; solo ve su propio catálogo.

### 2. Alta de producto + receta (#240)

Crea un producto con nombre (pan flauta, facturas) y arma la receta eligiendo insumos ya cargados y anotando la cantidad de cada uno. Producto y receta quedan guardados. Puede repetir para varios productos.

### 3. Costo variable unitario (#241)

Por cada ingrediente de la receta, clasifica la compra como **por cantidad** (el precio pagado se reparte en la unidad mínima) o **por unidad** (el precio ya está en la unidad que usa la receta). Cada renglón se multiplica por la cantidad de la receta y al sumar se obtiene el **costo variable unitario**. Un mismo producto puede mezclar ambos modos.

### 4. Capacidad mensual (#242)

Para cada producto indica cuánto va a fabricar en el mes. Puede agregar otro producto (vuelve al alta de insumos y repite el recorrido). Al cerrar la lista, el catálogo queda cerrado y persistido.

### 5. Costos indirectos del período (#243)

Carga los gastos del mes (alquiler, servicios) **una sola vez** para todo el catálogo, después de cerrar la lista de productos.

### 6. Prorrateo de indirectos (#244)

La participación de cada producto se calcula según su capacidad sobre la suma de capacidades, con un "promedio ajustado según la importancia de cada gasto". La tasa por unidad = gastos del mes ÷ suma de participaciones. **Costo total unitario = costo variable + tasa indirecta.**

### 7. Precio sugerido (#245)

El usuario indica un % de recargo. Precio sugerido = costo total unitario × (1 + %). Ejemplo del issue: 30 % sobre $ 7.000 da $ 9.100. Reemplaza la lógica anterior de margen sobre precio.

### 8. Contribución y equilibrio (#246)

- Contribución unitaria = precio sugerido − costo variable (los gastos repartidos no entran).
- Margen = precio sugerido − costo total (se lee como porcentaje del costo total).
- Mezcla de un producto = su capacidad ÷ suma de las capacidades.
- Contribución ponderada = Σ (contribución unitaria × mezcla) sobre todos los productos.
- Unidades para cubrir los gastos = gastos del mes ÷ contribución ponderada.
- Cuota de cada producto = esa cantidad de unidades × su mezcla.
- Equilibrio en pesos = Σ (cuota × precio).
- Prueba de cierre: Σ (cuota × contribución unitaria) = gastos del mes.
- Todo queda guardado.

### 9. Tablero del catálogo (#247)

Vista del catálogo completo: por producto (costo total, contribución, margen) y del negocio (cuota mínima, equilibrio en unidades y en pesos, gráfico del punto de equilibrio en pesos con los gastos del mes y la contribución de la mezcla cruzándose en el equilibrio, junto a las cuotas de cada producto).

### 10. Planilla de referencia (#250, DATA)

Caso completo de dos productos con fórmulas vivas. Es el oráculo contra el que QA valida cada historia. En la práctica bloquea a #239–#247 porque todas comparan contra "el ejemplo de DATA".

---

## Huecos y puntos sin definir

### Bloqueantes

**Las fórmulas de #246 son ambiguas o inconsistentes** (el propio issue marca "(Validar)" tres veces):

- "La cuota de cada producto es esa cantidad de unidades por su mezcla" — no queda claro si las unidades para cubrir gastos son un número global repartido por mezcla, o una cantidad por producto. La prueba de cierre solo cierra con la primera lectura.
- "El equilibrio en pesos suma la cuota de cada producto por su precio" — ¿precio sugerido o precio real? Como el precio de venta real quedó fuera de #245, el equilibrio se mediría contra el sugerido: decisión de negocio no confirmada.
- Prueba de cierre: Σ (cuota × contribución unitaria) = gastos del mes. Solo se cumple si la cuota se interpreta como unidades globales × mezcla de cada producto.
- #244: "promedio ajustado según la importancia de cada gasto" — no hay regla definida de cómo se pondera la importancia de cada gasto individual. La fórmula que sigue (gastos del mes ÷ suma de participaciones) trata los gastos como un solo total, lo que contradice ponderar gasto por gasto.

### Datos de entrada sin modelo definido

- **Unidades de medida ausentes**: #239 dice explícitamente "fuera: unidades de compra", pero #241 exige distinguir compra "por cantidad" vs "por unidad" y "repartir en la unidad mínima". ¿Cuál es la unidad mínima? ¿Dónde vive?
- **El precio del insumo**: si se compra por bolsa de 50 kg, ¿el "precio de compra" guardado es de la bolsa o del kilo? Sin eso #241 no puede calcular.
- **Unidad de la receta**: en compra por unidad, "el precio ya está en la unidad que usa la receta" — pero ni el insumo ni la línea de receta tienen campo de unidad.
- **Base de la receta**: ¿las cantidades son por unidad de producto o por lote?

### Proceso y ciclo de vida

- **Edición y borrado**: #239 menciona "ver, corregir, borrar" insumos, pero borrar un insumo usado en una receta guardada no tiene regla definida. Lo mismo para productos tras cerrar la lista.
- **Recalculo**: ninguna issue cubre cambiar precios, capacidades o el recargo después de calcular. Si se agrega un producto después de cargar los gastos (#242 permite seguir agregando), ¿se recalcula el prorrateo?
- **Período**: los gastos son "del período" pero no hay campo de mes/periodo definido. ¿Una sola corrida vigente o histórico?
- **Cuándo se congela**: el prorrateo de #244, ¿es automático al cargar gastos o una acción del usuario?

### Multi-producto y mezcla

- **Reabrir la lista**: #242 dice que al cerrar "no se pierdan" los productos, pero no dice si se puede reabrir o eliminar productos después de cerrar.
- **Capacidad parcial**: #244 dice "sin capacidades cargadas, no se muestra costo total", pero no define qué pasa si solo algunos productos tienen capacidad, o si un producto tiene capacidad 0.
- **Base de la mezcla**: mezcla = capacidad ÷ suma de capacidades — no está validado si usa capacidad planificada o producción real.

### Persistencia y tenancy

- Los gastos del catálogo "una sola vez" — ¿por usuario? ¿por período? Si el emprendedor calcula el mes siguiente, ¿empieza de cero o pisa el anterior?
- No hay concepto de "cálculo" o "escenario": todo asume un único catálogo activo. #247 deja fuera explícitamente comparar escenarios.

### UX y flujo

- **Orden real de pantallas**: #242 dice "vuelvo a cargar insumos" al agregar otro producto. ¿Los insumos son compartidos entre productos o cada producto tiene su lista? El texto es ambiguo.
- **Dónde vive la clasificación cantidad/unidad**: ¿al cargar el insumo (#239), al armar la receta (#240), o es una pantalla aparte (#241)? El dato pertenece a la compra, no queda claro en qué paso se captura.
- **Recargo**: #245 dice "por producto" pero no aclara si el % es global o individual por producto.
- **Gráfico del equilibrio**: con varios productos, ¿qué representa el eje X (unidades de qué)? El formato no está especificado.
- **Punto de entrada**: ¿el usuario llega directo a insumos o hay un wizard? Las issues de fase 1 (#170–#172) describen un wizard de un solo producto; no está dicho si la fase 2 lo reemplaza o convive.

### Validación y casos borde

- Montos negativos, cero, decimales, moneda: no definido en ninguna issue.
- División por cero: contribución ponderada = 0 (si precio sugerido = costo variable para todos), suma de capacidades = 0.
- Estados vacíos: sin insumos, sin productos, lista cerrada sin gastos.

---

## Resumen de los huecos más críticos

1. **Unidades de medida y equivalencia lote ↔ unidad**: ausentes del modelo, pero #241 depende de ellas.
2. **Fórmulas de #246 inconsistentes**: cuota, equilibrio y prueba de cierre necesitan confirmación matemática.
3. **"Importancia de cada gasto" en #244**: regla de ponderación indefinida.
4. **Ciclo de vida del cálculo**: edición, borrado, recálculo y períodos — nada definido.
5. **Destino de la calculadora single-product de fase 1**: ¿coexisten o se reemplaza?
6. **#250 sin adjuntar**: todas las historias referencian números que aún no existen; conviene marcarla como bloqueante.
