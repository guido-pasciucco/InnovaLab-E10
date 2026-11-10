# Especificación del flujo de costos — Fase 2

> **Documento de especificación del flujo de usuario** para el modelo multi-producto. Deriva de las issues #239 a #247 y #250.
>
> Estructura por bloque: **pasos → dónde está el usuario → huecos → propuesta**. Los huecos son contexto (lo que las issues no definen); las propuestas son una sugerencia a validar con el equipo, no una decisión tomada.

---

## Glosario

Términos de negocio usados en este documento. Cuando un término aparece con negrita en el glosario, se escribe igual en todo el documento.

| Término | Definición |
| --- | --- |
| **Insumo** | Material o servicio que se compra y usa en las recetas (harina, aceite, sal). |
| **Producto** | Bien o servicio que el emprendedor fabrica o vende (pan flauta, facturas). |
| **Receta** | Lista de insumos con la cantidad que lleva una unidad del producto. |
| **Compra por cantidad** | El insumo se compró en volumen (bolsa, kilo, litro); el precio de compra se reparte en la unidad mínima. |
| **Compra por unidad** | El insumo se compró por unidad; el precio ya está en la unidad que usa la receta. |
| **Unidad mínima** | La menor unidad en que puede expresarse el precio del insumo (ej. el kilo, no la bolsa). |
| **Costo variable unitario** | Suma de (precio unitario del insumo × cantidad de receta) sobre todos los insumos del producto. |
| **Capacidad mensual** | Cantidad que se planea fabricar de un producto en el mes; solo sirve para repartir los costos indirectos. |
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
| **Lista cerrada** | Estado de la lista de productos que no admite altas nuevas. |
| **Plan del mes** | *(Propuesto, ver decisión pendiente)* Entidad que agrupa capacidad mensual + costos indirectos + recargo de un período. |

---

## Navegación general

El usuario siempre está parado en el **dashboard del catálogo**, que funciona como hub con cuatro destinos:

| Destino | Ruta propuesta | Estado |
| --- | --- | --- |
| Insumos | `/insumos` | Editable siempre |
| Productos | `/productos` | Editable hasta cerrar la lista |
| Costos indirectos | `/costos-indirectos` | Se habilita al cerrar la lista |
| Tablero | `/tablero` | Solo lectura, alimentado por los cálculos guardados |

El orden de habilitación es bloqueante: no se puede cargar indirectos sin la lista de productos cerrada, ni ver el tablero sin indirectos y precios definidos. El dashboard muestra en qué bloque está parado el usuario y qué le falta para avanzar.

> **Nota:** las rutas definitivas quedan para implementación; en esta especificación se usan nombres en español por consistencia con el resto del flujo.

---

## Bloque 1 — Insumos

### Pasos

1. El usuario ingresa al sistema (login existente).
2. Desde el dashboard entra a **Insumos**.
3. Da de alta cada insumo con su precio de compra (ej. harina, aceite, sal). Puede ver, corregir y borrar insumos.
4. La lista queda guardada y es **compartida por todos los productos** del catálogo: con estos insumos se arman las recetas del bloque 2.
5. Cuando termina, avanza a **Productos**.

### Dónde está el usuario

- **Pantalla:** `/insumos` — "Catálogo de insumos". Header con negocio + usuario, lista editable y botón primario "Ir a productos".
- **Entra desde:** dashboard (sección Insumos) o desde Productos al agregar un producto nuevo.
- **Sale hacia:** `/productos` (siguiente bloque) o al dashboard.

### Huecos

- **Unidades de medida ausentes**: el insumo tiene nombre + precio, pero no unidad de compra ni unidad mínima. El bloque 2 necesita "repartir el precio en la unidad mínima" y eso es imposible sin este dato.
- **Precio de compra ambiguo**: si el insumo se compra por bolsa de 50 kg, ¿el precio guardado es de la bolsa o del kilo?
- **Clasificación compra por cantidad / por unidad sin paso definido**: #241 la pide "por ingrediente de la receta", o sea en la línea de receta, pero no dice en qué pantalla ni en qué momento del flujo se captura.
- **Borrado sin regla de integridad**: las issues no definen si se puede borrar un insumo que ya está en una receta guardada.

### Propuesta

- **Insumo mínimo** (fiel a #239): **nombre + precio de compra**. Las unidades de compra quedan fuera, como dice la issue.
- **Insumo con unidades de medida** (expande #239): **nombre + precio de compra + unidad de compra + cantidad por envase** (ej. "harina, $25.000, bolsa, 50 kg"). De ahí se deriva el precio por unidad mínima. Requiere confirmar con el equipo porque excede el alcance declarado de la issue.
- La clasificación **compra por cantidad / por unidad** se captura **en la línea de la receta** (como la ubica #241): cada renglón de la receta elige su modo y su cantidad en unidad mínima. La receta queda autocontenida.
- Borrado: si el insumo está en alguna receta, se bloquea el borrado y se pide quitarlo de la receta primero.

---

## Bloque 2 — Productos

### Pasos

Para cada producto, dentro de `/productos`:

1. **Producto y receta**: nombre del producto (pan flauta, facturas) y receta armada eligiendo insumos ya cargados, con la cantidad de cada uno.
2. **Costo variable unitario**: por cada renglón de la receta se calcula costo = precio unitario del insumo × cantidad. La suma es el costo variable unitario del producto.
3. **Capacidad mensual**: cuánto se va a fabricar de ese producto. No es lo vendido hoy ni el equilibrio: es la capacidad que después reparte los costos indirectos.
4. **Decisión de continuar**:
   - **Sí** → se repite el bloque con un producto nuevo. El usuario **vuelve a la pantalla de insumos ya cargados** para elegir insumos del catálogo compartido (#242 dice "vuelvo a cargar insumos": se interpreta como volver a esa pantalla, no como recargar datos, porque #239 establece que la lista de insumos queda guardada).
   - **No** → se cierra la lista de productos del catálogo.

### Dónde está el usuario

- **Pantalla:** `/productos` — lista del catálogo + formulario/wizard de alta de producto (nombre → receta → capacidad).
- **Entra desde:** dashboard, o desde Insumos con "Ir a productos".
- **Estado visible:** contador de productos cargados y botón "Cerrar lista" habilitado cuando hay al menos un producto con capacidad.
- **Sale hacia:** al cerrar la lista, `/costos-indirectos` (bloque 3).

### Huecos

- **Base de la receta indefinida**: ¿las cantidades son por unidad de producto (1 pan) o por lote (1 bandeja de 12)? Cambia por completo el costo variable unitario.
- **Capacidad parcial o cero**: #244 dice "sin capacidades cargadas no se muestra costo total", pero no define qué pasa si un producto tiene capacidad 0 o si solo algunos la tienen.
- **Cerrar la lista es un punto de no retorno**: #242 dice que al cerrar "no se pierdan" los productos, pero no dice si se puede reabrir, corregir un producto o borrar uno después de cerrar.
- **Relación con el cálculo de un solo producto** *(fuera del set de issues: decisión de producto, no un hueco de #239–#247)*: la aplicación actual ya tiene un flujo de cálculo para un único producto. Las issues de fase 2 no mencionan qué pasa con ese flujo.

### Propuesta

- Receta **siempre por unidad de producto** (la cantidad de insumo que lleva 1 unidad). Es lo que el usuario entiende y lo que el costo variable unitario necesita. Pendiente de confirmar con la planilla #250.
- Capacidad obligatoria **> 0** para poder cerrar la lista; un producto sin capacidad no puede cerrar el catálogo. **Ojo:** esto es más estricto que las issues — #244 tolera capacidades faltantes ("sin capacidades cargadas no se muestra costo total"). Es una propuesta de endurecimiento, no una regla existente.
- Lista cerrada: para esta versión se propone que **cerrar sea definitivo** dentro del catálogo activo. Si el usuario necesita cambiar productos, el camino es revisar antes de cerrar (la lista sigue editable hasta ese momento). Queda como decisión a confirmar.
- El cálculo de un solo producto queda **fuera del flujo nuevo**: el catálogo lo reemplaza. Qué pasa con los "cálculos" existentes es una decisión de producto aparte.

---

## Decisión a definir — ¿dónde vive la capacidad mensual?

> **Estado: pendiente de decisión del equipo.** Esta sección documenta una bifurcación de diseño detectada al especificar el bloque 2. Las issues #240–#242 la resuelven de una forma; hay una alternativa que cambia la arquitectura del flujo.

### Contexto

La capacidad mensual (cuánto se va a fabricar de cada producto en el mes, issue #242) es hoy el **paso 3 del alta de cada producto**, dentro del loop del bloque 2. Pero es un dato distinto en naturaleza:

- **Producto + receta** = catálogo: qué existe, reutilizable mes a mes.
- **Capacidad mensual** = plan del mes: cuánto se fabricará *en este período*, junto con los costos indirectos.

### Opción A — Capacidad dentro del alta de producto (lo que dicen las issues)

- La capacidad se carga como paso final de cada producto, dentro del loop del bloque 2.
- Fiel a la redacción actual de #242.
- Un solo recorrido: producto → receta → costo variable unitario → capacidad mensual → ¿otro?
- **Costo:** si el usuario quiere calcular otro mes, debe editar cada producto para cambiar su capacidad. El catálogo y el plan del mes quedan mezclados.

### Opción B — Separar catálogo de plan del mes

- **Bloque 2** queda solo con catálogo: insumos + productos + recetas (permanente, sin capacidad).
- La capacidad mensual se muda al **bloque 3**, que pasa a ser "plan del mes": capacidad por producto + costos indirectos del período + recargo → cálculos → tablero.
- El catálogo no se toca entre meses; cada plan/cálculo tiene su propio período, capacidades y costos indirectos.
- **Costo:** se desvía de la redacción literal de las issues, agrega una entidad nueva ("plan del mes") y un paso más en el flujo.

### Impacto en el resto del documento

- Si se elige **B**: el bloque 2 pierde su paso 3 y su decisión de "cerrar lista" pasa a ser "catálogo completo" (los productos se pueden seguir agregando); el bloque 3 absorbe capacidad + costos indirectos + recargo + cálculos; el tablero pasa a colgar del plan del mes.
- Si se elige **A**: el documento queda como está y el hueco del "período" (un solo cálculo vigente vs. histórico) sigue abierto.

### Propuesta tentativa

**Opción B.** Separa datos permanentes (catálogo) de datos del período (plan), resuelve de paso el hueco del período y hace natural el histórico futuro. Requiere confirmar con el equipo porque contradice la redacción actual de #242.

---

## Bloque 3 — Costos indirectos, precio y equilibrio

> Solo disponible con la lista de productos cerrada.

### Pasos

1. **Costos indirectos del período**: se cargan **una sola vez** para todo el catálogo (alquiler, servicios, etc.). Quedan guardados.
2. **Prorrateo** (automático al guardar): cada producto absorbe costos indirectos en proporción a su capacidad mensual. Resultado: **costo total unitario = costo variable unitario + tasa indirecta por unidad**.
3. **Precio sugerido**: el usuario indica un % de recargo; precio sugerido = costo total unitario × (1 + %).
4. **Contribución y equilibrio**: se calculan y guardan contribución unitaria, margen, mezcla, contribución ponderada, unidades para cubrir los costos indirectos, cuota por producto y equilibrio en unidades y pesos.
5. El usuario puede volver al tablero o ajustar el recargo.

### Dónde está el usuario

- **Pantallas:** `/costos-indirectos` (carga única de costos indirectos) → `/precio` o sección dentro del mismo flujo (recargo + resultados por producto) → `/tablero`.
- **Entra desde:** botón "Cerrar lista" en Productos, o desde el dashboard cuando la lista ya está cerrada.
- **Estado visible:** resumen de costos indirectos cargados, costo total por producto y precio sugerido antes de confirmar.

### Huecos

- **"Importancia de cada gasto" sin regla** (#244): el issue habla de "promedio ajustado según la importancia de cada gasto", pero no define cómo se pondera. La fórmula que sigue trata los costos indirectos como un solo total.
- **Fórmulas de #246 ambiguas** (marcadas "(Validar)" en el issue):
  - Cuota por producto: ¿unidades totales × mezcla, o cantidad propia?
  - Equilibrio en pesos: ¿suma de cuota × precio sugerido o × precio real? El precio real quedó fuera de #245.
  - Prueba de cierre: Σ(cuota × contribución) = costos indirectos del período solo se cumple con una interpretación específica.
- **Período sin modelo**: los costos indirectos son "del mes" pero no hay campo de período. ¿Un solo cálculo vigente o histórico?
- **Recargo global o por producto**: #245 dice "cada producto" pero no aclara si el % es uno solo o individual.
- **División por cero**: si la contribución ponderada es 0 (todos los precios sugeridos igualan al costo variable unitario) o la suma de capacidades es 0.
- **Edición post-cálculo**: cambiar un insumo, una capacidad o el recargo después de calcular no tiene flujo definido (¿recalcula todo? ¿avisa?).

### Propuesta

- **Prorrateo simple por capacidad**: cada gasto se reparte por participación de capacidad (capacidad del producto ÷ suma de capacidades). Descartar la "importancia por gasto" hasta que exista una regla de drivers; si el equipo la quiere, cada gasto declara su driver y el default es capacidad.
- **Fórmulas propuestas** (a validar con la planilla #250):
  - `unidadesTotales = costosIndirectosDelPeriodo ÷ contribuciónPonderada`
  - `cuotaᵢ = unidadesTotales × mezclaᵢ`
  - `equilibrioEnPesos = Σ (cuotaᵢ × precioSugeridoᵢ)`
  - Prueba de cierre: `Σ (cuotaᵢ × contribuciónᵢ) = costosIndirectosDelPeriodo`
- **Un solo recargo global** para todos los productos (más simple de explicar); si se necesita por producto, es un campo opcional con default global.
- **Período como dato del plan**: cada plan del mes (o catálogo, si se elige la opción A) lleva mes o período; para esta versión puede ser un solo período activo por usuario.
- Recálculo: cualquier cambio en insumos, capacidades, costos indirectos o recargo **dispara recálculo automático** de todo lo derivado, con aviso de qué cambió.

---

## Bloque 4 — Tablero del catálogo

### Pasos

1. Desde el dashboard (o al terminar el bloque 3) el usuario abre **Tablero**.
2. Ve la tabla por producto: costo total unitario, contribución, margen.
3. Ve el resumen del negocio: cuota mínima de cada producto, equilibrio en unidades y en pesos.
4. Ve el gráfico del punto de equilibrio en pesos con las cuotas junto al cruce.

### Dónde está el usuario

- **Pantalla:** `/tablero` — solo lectura. No introduce datos nuevos; todo viene de lo guardado en el bloque 3.
- **Entra desde:** dashboard (sección Tablero) o al finalizar el bloque 3.
- **Acciones disponibles:** ajustar recargo (vuelve al bloque 3), volver al dashboard. Nada más.

### Huecos

- **Eje del gráfico indefinido**: con varios productos, ¿el eje X son unidades de qué? El issue no lo especifica.
- **Formato del gráfico**: qué líneas se dibujan (¿costos indirectos vs. contribución de la mezcla? ¿ingresos vs. costos como en el cálculo de un solo producto?) no está detallado.
- **Estados vacíos**: sin catálogo cerrado, sin costos indirectos, sin capacidades — qué ve el usuario en cada caso.
- **Cuotas fraccionarias**: las cuotas pueden dar decimales (ej. 3,7 unidades); no está definido si se muestran exactas, redondeadas o como "unidades vendibles".

### Propuesta

- Eje X = **unidades totales vendidas de la mezcla** (Σ de cuotas en el equilibrio). Es la única lectura que hace comparable multi-producto.
- Gráfico: línea de **costos indirectos del período** (constante) vs. línea de **contribución acumulada de la mezcla**; el cruce es el equilibrio en unidades/pesos. Misma lógica del gráfico del cálculo de un solo producto, pero con la mezcla en vez de un solo producto.
- Cuotas mostradas con **2 decimales** + texto "≈ N unidades" para la lectura práctica.
- Estados vacíos con mensaje y CTA al bloque que falta (ej. "Cerrá la lista de productos para ver el tablero").

---

## Modelo de cálculo

> _Pendiente._ Consolidar las fórmulas propuestas de cada bloque en una sección única y verificable contra la planilla de DATA (#250).

## Alcance de esta versión

> _Pendiente._ Qué bloques/pantallas entran en la primera entrega del flujo v2.

## Fuera de alcance

> _Pendiente._ Candidatos: comparar escenarios, precio de venta real, histórico de períodos, reabrir catálogo, drivers de costos indirectos distintos a capacidad.

## Decisiones pendientes

> _Pendiente._ Lista consolidada de los huecos que requieren respuesta del equipo antes de implementar:
>
> 1. Unidades de medida y equivalencia lote ↔ unidad (bloque 1).
> 2. Base de la receta: ¿por unidad de producto o por lote? (bloque 2).
> 3. Lista cerrada: ¿definitiva o reabrible? (bloque 2).
> 4. Capacidad mensual: ¿en el alta de producto (opción A) o en el plan del mes (opción B)? (sección "Decisión a definir").
> 5. Regla de "importancia de cada gasto" en el prorrateo (bloque 3).
> 6. Interpretación final de cuota, equilibrio en pesos y prueba de cierre (bloque 3).
> 7. Recargo global vs. por producto (bloque 3).
> 8. Modelo de período: ¿un cálculo activo o histórico? (bloque 3).
> 9. Destino del cálculo de un solo producto ya existente (global).
> 10. Planilla #250: sin ella no hay oráculo de validación para QA.

---

> _Documento en construcción — iteración por bloques._
