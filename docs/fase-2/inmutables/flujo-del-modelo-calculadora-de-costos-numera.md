# Flujo del modelo - Calculadora de Costos NUMERA

## Visión general

El modelo se divide en cuatro bloques principales que guían al emprendedor desde el relevamiento inicial hasta el análisis de resultados en un tablero.

---

## Bloque 1 - Relevo y alta del catálogo

### Propósito
Acceder al sistema, verificar credenciales y cargar el catálogo de productos.

### Pasos
1. **Inicio del flujo**: El usuario ingresa al sistema.
2. **Verificación de credenciales**: Validación de autenticación.
3. **Carga del catálogo**: 
   - El sistema permite crear el catálogo de productos.
   - Se registran los productos que el emprendedor va a fabricar.
   - El catálogo queda disponible para los siguientes bloques.

### Notas
- Este bloque es el punto de entrada: sin un catálogo de productos, no se puede avanzar a los cálculos.
- El catálogo es persistente: se guarda y puede recuperarse en sesiones posteriores.

---

## Bloque 2 - Cargar cada producto

### Propósito
Ingresar la información detallada de cada producto: ingredientes, cantidades, costos y capacidad de producción.

### Pasos
1. **Definición del producto**:
   - Nombre del producto.
   - Receta con insumos ya cargados.
   - Cantidades de cada ingrediente en la receta.

2. **Costos variables**:
   - Para cada ingrediente, indicar si la compra fue por cantidad o por unidad.
   - Si fue por cantidad: el precio pagado se reparte en la unidad mínima.
   - Si fue por unidad: el precio ya está en la unidad que usa la receta.
   - Cada renglón se multiplica por la cantidad de la receta.
   - **Resultado**: costo variable unitario del producto.

3. **Capacidad del mes**:
   - Indicar cuánto se va a fabricar de ese producto en el mes.
   - Este volumen se usará posteriormente para repartir costos indirectos.
   - No es lo que se vende hoy ni el punto de equilibrio: es la capacidad de producción.

4. **Decisión de continuar**:
   - **Sí**: agregar otro producto → volver al inicio del bloque 2 (recargar insumos, receta, costo variable, capacidad).
   - **No**: cerrar la lista de productos del catálogo → el catálogo queda sellado y no se pueden agregar más productos.

### Notas
- Un mismo producto puede mezclar insumos por cantidad y por unidad.
- La capacidad es por producto y se guarda en el catálogo.
- El cierre de la lista es el punto de no retorno para agregar productos nuevos.

---

## Bloque 3 - Repartir la estructura, definir el precio y calcular el equilibrio

### Propósito
Distribuir los costos indirectos entre productos según su capacidad, definir precios de venta y calcular el punto de equilibrio.

### Pasos
1. **Cargar costos indirectos del período**:
   - Se cargan una sola vez (alquiler, servicios, etc.) después de cerrar la lista de productos.
   - El total queda guardado para el prorrateo.

2. **Prorrateo de costos indirectos**:
   - La participación de cada producto se ajusta según su capacidad mensual.
   - La tasa por unidad = gastos del mes ÷ suma de la participación de cada producto.
   - El producto de mayor capacidad absorbe más pesos de gastos.
   - **Resultado**: costo total de una unidad = costo variable + tasa por unidad.

3. **Definición del precio**:
   - Sugerir el precio con un recargo sobre el costo total.
   - El usuario puede ajustar el precio sugerido.

4. **Cálculo del equilibrio**:
   - **Contribución de una unidad**: precio sugerido - costo variable (los gastos repartidos no entran en esta cuenta).
   - **Margen**: precio sugerido - costo total (expresado como porcentaje del costo total).
   - **Mezcla de un producto**: capacidad ÷ suma de las capacidades.
   - **Contribución ponderada**: Σ (contribución de una unidad × mezcla de cada producto).
   - **Unidades para cubrir gastos**: gastos del mes ÷ contribución ponderada.
   - **Cuota de cada producto**: unidades para cubrir gastos × mezcla del producto.
   - **Equilibrio en pesos**: Σ (cuota de cada producto × precio).

### Prueba de cierre
La suma de `(cuota × contribución de una unidad)` debe igualar a los costos del mes.

### Notas
- Los resultados (contribución, margen, cuota) quedan guardados para el tablero.
- Sin capacidades cargadas, no se muestra un costo total.

---

## Bloque 4 - Tablero de resultados

### Propósito
Presentar visualmente los resultados calculados: rentabilidad por producto, márgenes y volúmenes de venta necesarios.

### Elementos del tablero
- **Rentabilidad por producto**: cuánto aporta cada producto a cubrir los costos.
- **Margen**: porcentaje de ganancia sobre el costo total.
- **Volúmenes de venta (Ventas)**: cuántas unidades hay que vender de cada producto para alcanzar el punto de equilibrio.
- **Equilibrio en pesos**: monto total de ventas necesarias.

### Notas
- Este bloque es de visualización y consulta: no introduce nuevos datos.
- El tablero se alimenta de los resultados calculados y guardados en el bloque 3.

---

## Resumen del flujo

```
Inicio
  ↓
[Bloque 1] Relevo y alta del catálogo
  ↓
[Bloque 2] Cargar cada producto (loop por producto)
  - Definir producto y receta
  - Calcular costo variable unitario
  - Indicar capacidad del mes
  - ¿Otro producto? → Sí → volver al inicio del bloque 2
                    → No → cerrar lista
  ↓
[Bloque 3] Repartir estructura, definir precio, calcular equilibrio
  - Cargar costos indirectos
  - Prorratear según capacidad
  - Definir precio con recargo
  - Calcular contribución, margen y punto de equilibrio
  ↓
[Bloque 4] Tablero de resultados
  ↓
Fin
```

## Correlación con issues de GitHub

| Bloque | Issue | Estado |
|--------|-------|--------|
| Bloque 1 | - | Completado (auth y perfil) |
| Bloque 2 - Producto y receta | #240 | En curso (andrevivi) |
| Bloque 2 - Costo variable unitario | #241 | En curso (maluguiro) |
| Bloque 2 - Capacidad y cierre de lista | #242 | En curso (alelex10) |
| Bloque 3 - Costos indirectos | #243 | En curso (Victor-HCC) |
| Bloque 3 - Prorrateo | #244 | En curso (VeraMiguelAngel) |
| Bloque 3 - Precio sugerido | #245 | En curso (magaliantonella98) |
| Bloque 3 - Equilibrio multi-producto | #246 | Abierto |
| Bloque 4 - Tablero | #247, #250 | Abierto (arielsubia) |
