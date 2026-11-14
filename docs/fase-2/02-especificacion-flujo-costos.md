# Especificación del flujo de costos — Fase 2

> **Documento de especificación del flujo de usuario** para el modelo multi-producto. Deriva de las issues #239 a #247 y #250.
>
> Estructura por bloque: **pasos → dónde está el usuario → datos/reglas decididas → huecos → propuesta pendiente**. Los huecos son contexto (lo que las issues no definen); las propuestas pendientes son una sugerencia a validar con el equipo, no una decisión tomada. Las decisiones ya tomadas están en [`04-decisiones.md`](04-decisiones.md).

---

## Glosario

Los términos de negocio del flujo están en [`glosario.md`](glosario.md). Cuando un término aparece con negrita en el glosario, se escribe igual en este documento.

---

## Navegación general

La navegación tiene dos piezas distintas:

- **Menú de navegación**: sección persistente, presente en todas las pantallas del flujo. Es el único camino para cambiar de sección; no desaparece al entrar a un destino.
- **Página inicial / dashboard**: una vista más del menú (`/dashboard` tentativa). Está **a decidir** si será un dashboard (resumen del estado del catálogo con accesos a cada bloque) o simplemente una página inicial; su contenido no está definido.

Todas las ventanas son accesibles en cualquier momento desde el menú: **no hay pasos obligatorios ni ventanas bloqueadas**. El usuario puede cargar indirectos antes de cerrar la lista, mirar el tablero con datos a medias o saltear secciones.

| Destino | Ruta propuesta | Estado |
| --- | --- | --- |
| Página inicial (dashboard?) | `/dashboard` | A decidir: dashboard o página inicial simple |
| Insumos | `/insumos` | Editable siempre |
| Productos | `/productos` | Editable hasta cerrar la lista |
| Costos indirectos | `/costos-indirectos` | Carga única para todo el catálogo |
| Tablero | `/tablero` | Solo lectura, alimentado por los cálculos guardados |

Lo que sí existe son **dependencias de datos**, no bloqueos de interfaz:

- Los **costos indirectos** solo se pueden repartir (prorratear) cuando la lista de productos está cerrada: sin productos cerrados no hay capacidades contra las cuales prorratear.
- El **tablero** solo muestra resultados cuando existen indirectos, precios y capacidades cargados; con datos a medias muestra lo que haya o un estado vacío.

La página inicial/dashboard no fuerza un orden ni bloquea secciones: todas las ventanas son accesibles desde el menú en cualquier momento. Su contenido está **a decidir** (ver "Decisiones pendientes"). El menú, en cambio, es solo navegación: siempre visible, sin estado.

> **Tipo de navegación: por destinos (hub), no por pasos (wizard).** En cada bloque, la subsección "Pasos" describe la secuencia lógica de la tarea dentro de esa pantalla o el orden natural de uso — no pantallas obligatorias ni un asistente secuencial. El usuario puede entrar a cualquier destino en cualquier momento; lo único que existe son dependencias de datos (ver arriba).

> **Nota:** las rutas definitivas quedan para implementación; en esta especificación se usan nombres en español por consistencia con el resto del flujo.

---

## Bloque 1 — Insumos

### Pasos

1. El usuario ingresa al sistema (login existente).
2. Desde el dashboard entra a **Insumos**.
3. Da de alta cada insumo con su precio de compra, cantidad y unidad de medida (ej. harina, aceite, sal). Puede ver, corregir y borrar insumos.
4. La lista queda guardada y es **compartida por todos los productos** del catálogo: con estos insumos se arman las recetas del bloque 2.
5. Cuando termina, avanza a **Productos**.

### Dónde está el usuario

- **Pantalla:** `/insumos` — "Catálogo de insumos". Header con negocio + usuario y lista editable.
- **Entra desde:** el menú de navegación (destino Insumos, disponible en cualquier momento), la página inicial/dashboard, o desde Productos al agregar un producto nuevo.
- **Sale hacia:** `/productos` o al dashboard.

### Datos del insumo

- **Campos:** nombre (texto) + precio de compra (monto de esa cantidad completa) + cantidad (número) + unidad de medida (**selección** de un catálogo precargado — no texto libre). El catálogo tiene 4 familias: masa (`g`, `kg`), volumen (`ml`, `L`), longitud (`mm`, `cm`, `m`) y unidad/contable (`unidad`, `par`, `media docena`, `docena`). Ej: "harina, $25.000, 50 kg".
- El costo por unidad de medida se calcula una sola vez (precio ÷ cantidad) y todas las recetas lo comparten; la conversión a la unidad de la receta es automática **dentro de la misma familia** (la receta no puede mezclar familias).
- La lista permite **buscar por nombre o unidad de medida**.
- La clasificación **compra por cantidad / por unidad** se captura en la línea de la receta (bloque 2).
- **Borrado:** libre en el MVP (ninguna receta referencia insumos todavía); con recetas, se bloquea hasta quitar la referencia.

---

## Bloque 2 — Productos

### Pasos

Para cada producto, dentro de `/productos`:

1. **Producto y receta**: nombre del producto (pan flauta, facturas) y receta armada eligiendo insumos ya cargados, con la cantidad de cada uno.
2. **Costo variable unitario**: por cada renglón de la receta se calcula costo = precio unitario del insumo × cantidad. La suma es el costo variable unitario del producto.
3. **Capacidad mensual**: cuánto se va a fabricar de ese producto. No es lo vendido hoy ni el equilibrio: es la capacidad que después reparte los costos indirectos.
4. **Agregar otro producto o cerrar la lista**: el usuario puede cargar cuantos productos quiera; cada alta vuelve a la lista de insumos ya cargados para elegir del catálogo compartido (#242 dice "vuelvo a cargar insumos": se interpreta como volver a esa pantalla, no como recargar datos, porque #239 establece que la lista de insumos queda guardada). Cuando termina, cierra la lista de productos del catálogo.

### Dónde está el usuario

- **Pantalla:** `/productos` — lista del catálogo + formulario de alta de producto (nombre, receta y capacidad).
- **Entra desde:** el menú de navegación (destino Productos), el dashboard, o desde Insumos.
- **Estado visible:** contador de productos cargados y botón "Cerrar lista" habilitado cuando hay al menos un producto con capacidad.
- **Sale hacia:** `/costos-indirectos` cuando el usuario quiera (el prorrateo recién es posible con la lista cerrada), o al dashboard.

### Datos de la receta (decidido — Opción B del insumo)

- **Campos de cada renglón de receta:** insumo del catálogo + modo de compra (por cantidad / por unidad) + cantidad de insumo que usa el producto (ej. "1000 g de harina"). La reducción a la unidad ya no se carga por línea: se deriva de la cantidad y unidad declaradas en el insumo, así todas las recetas comparten la misma lectura del precio.

### Huecos

- **Base de la receta indefinida**: ¿las cantidades son por unidad de producto (1 pan) o por lote (1 bandeja de 12)? Cambia por completo el costo variable unitario.
- **Capacidad parcial o cero**: #244 dice "sin capacidades cargadas no se muestra costo total", pero no define qué pasa si un producto tiene capacidad 0 o si solo algunos la tienen.
- **Cerrar la lista es un punto de no retorno**: #242 dice que al cerrar "no se pierdan" los productos, pero no dice si se puede reabrir, corregir un producto o borrar uno después de cerrar.
- **Relación con el cálculo de un solo producto** *(fuera del set de issues: decisión de producto, no un hueco de #239–#247)*: la aplicación actual ya tiene un flujo de cálculo para un único producto. Las issues de fase 2 no mencionan qué pasa con ese flujo.

### Propuesta (pendiente de confirmar)

- Receta **siempre por unidad de producto** (la cantidad de insumo que lleva 1 unidad). Es lo que el usuario entiende y lo que el costo variable unitario necesita. Pendiente de confirmar con la planilla #250.
- Capacidad obligatoria **> 0** para poder cerrar la lista; un producto sin capacidad no puede cerrar el catálogo. **Ojo:** esto es más estricto que las issues — #244 tolera capacidades faltantes ("sin capacidades cargadas no se muestra costo total"). Es una propuesta de endurecimiento, no una regla existente.
- Lista cerrada: para esta versión se propone que **cerrar sea definitivo** dentro del catálogo activo. Si el usuario necesita cambiar productos, el camino es revisar antes de cerrar (la lista sigue editable hasta ese momento). Queda como decisión a confirmar.
- El cálculo de un solo producto queda **fuera del flujo nuevo**: el catálogo lo reemplaza. Qué pasa con los "cálculos" existentes es una decisión de producto aparte.

---

## Bloque 3 — Costos indirectos, precio y equilibrio

> El prorrateo de los costos indirectos requiere la lista de productos cerrada (necesita las capacidades de todos los productos). La carga en sí se puede hacer antes; lo que no se puede es repartir sin productos cerrados.

### Pasos

1. **Costos indirectos del período**: se cargan **una sola vez** para todo el catálogo (alquiler, servicios, etc.). Quedan guardados.
2. **Prorrateo** (automático al guardar): cada producto absorbe costos indirectos en proporción a su capacidad mensual. Resultado: **costo total unitario = costo variable unitario + tasa indirecta por unidad**.
3. **Precio sugerido**: el usuario indica un % de recargo; precio sugerido = costo total unitario × (1 + %).
4. **Contribución y equilibrio**: se calculan y guardan contribución unitaria, margen, mezcla, contribución ponderada, unidades para cubrir los costos indirectos, cuota por producto y equilibrio en unidades y pesos.
5. El usuario puede volver al tablero o ajustar el recargo.

### Dónde está el usuario

- **Pantallas:** `/costos-indirectos` (carga única de costos indirectos) → `/precio` o sección dentro del mismo flujo (recargo + resultados por producto) → `/tablero`.
- **Entra desde:** el menú de navegación (destino Costos indirectos), el dashboard o Productos, en cualquier momento (ver "Navegación general").
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

### Propuesta (pendiente de confirmar)

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
- **Entra desde:** el menú de navegación (destino Tablero) o la página inicial/dashboard, en cualquier momento; con datos incompletos muestra estados vacíos.
- **Acciones disponibles:** ajustar recargo (vuelve al bloque 3), volver al dashboard. Nada más.

### Huecos

- **Eje del gráfico indefinido**: con varios productos, ¿el eje X son unidades de qué? El issue no lo especifica.
- **Formato del gráfico**: qué líneas se dibujan (¿costos indirectos vs. contribución de la mezcla? ¿ingresos vs. costos como en el cálculo de un solo producto?) no está detallado.
- **Estados vacíos**: sin catálogo cerrado, sin costos indirectos, sin capacidades — qué ve el usuario en cada caso.
- **Cuotas fraccionarias**: las cuotas pueden dar decimales (ej. 3,7 unidades); no está definido si se muestran exactas, redondeadas o como "unidades vendibles".

### Propuesta (pendiente de confirmar)

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

> Las decisiones ya tomadas están centralizadas en [`04-decisiones.md`](04-decisiones.md). Esta lista consolida los huecos que aún requieren respuesta del equipo antes de implementar:
>
> 1. Base de la receta: ¿por unidad de producto o por lote? (bloque 2).
> 2. Lista cerrada: ¿definitiva o reabrible? (bloque 2).
> 3. Capacidad mensual: ¿en el alta de producto (opción A) o en el plan del mes (opción B)? (ver `04-decisiones.md`).
> 4. Regla de "importancia de cada gasto" en el prorrateo (bloque 3).
> 5. Interpretación final de cuota, equilibrio en pesos y prueba de cierre (bloque 3).
> 6. Recargo global vs. por producto (bloque 3).
> 7. Modelo de período: ¿un cálculo activo o histórico? (bloque 3).
> 8. Destino del cálculo de un solo producto ya existente (global).
> 9. Página inicial/dashboard: ¿será un dashboard con resumen del estado del catálogo o una página inicial simple? Su contenido está a decidir; afecta la navegación y el MVP.
> 10. Planilla #250: sin ella no hay oráculo de validación para QA.

---

> _Documento en construcción — iteración por bloques._
