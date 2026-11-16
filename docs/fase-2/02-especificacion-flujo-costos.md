# Especificación del flujo de costos — Fase 2

> **Documento de especificación del flujo de usuario** para el modelo multi-producto. Deriva de las issues #239 a #247 y #250.
>
> Estructura por bloque: **pasos → dónde está el usuario → datos/reglas decididas → huecos → propuesta pendiente**. Los huecos son contexto (lo que las issues no definen); las propuestas pendientes son una sugerencia a validar con el equipo, no una decisión tomada. Las decisiones ya tomadas están en el registro de decisiones.
>
> Los bloques 1 y 2 están consolidados con las decisiones registradas; los bloques 3 y 4 conservan huecos y propuestas.

---

## Glosario

Los términos de negocio del flujo están en el glosario. Cuando un término aparece con negrita en el glosario, se escribe igual en este documento.

---

## Navegación general

La navegación tiene dos piezas distintas:

- **Menú de navegación**: sección persistente, presente en todas las pantallas del flujo. Es el único camino para cambiar de sección; no desaparece al entrar a un destino.
- **Página inicial / dashboard**: una vista más del menú (`/dashboard` tentativa). Está **a decidir** si será un dashboard (resumen del estado del catálogo con accesos a cada bloque) o simplemente una página inicial; su contenido no está definido.

Todas las ventanas son accesibles en cualquier momento desde el menú: **no hay pasos obligatorios ni ventanas bloqueadas**. El usuario puede cargar indirectos antes de tener productos cargados, mirar el tablero con datos a medias o saltear secciones.

| Destino | Ruta propuesta | Estado |
| --- | --- | --- |
| Página inicial (dashboard?) | `/dashboard` | A decidir: dashboard o página inicial simple |
| Insumos | `/insumos` | Editable siempre |
| Productos | `/productos` | Editable siempre |
| Costos indirectos | `/costos-indirectos` | Carga única para todo el catálogo |
| Tablero | `/tablero` | Solo lectura, alimentado por los cálculos guardados |

Lo que sí existe son **dependencias de datos**, no bloqueos de interfaz:

- Los **costos indirectos** se pueden repartir (prorratear) cuando hay capacidades cargadas en los productos: sin capacidades no hay contra qué repartir. No hay cierre de lista: cualquier edición recalcula lo derivado en vivo.
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
- La clasificación **compra por cantidad / por unidad** no se usa: la receta solo declara cantidad usada y su unidad, de la misma familia que el insumo (bloque 2).
- **Borrado:** libre en el MVP (ninguna receta referencia insumos todavía); con recetas, se bloquea hasta quitar la referencia.

> **Packaging:** el catálogo suma una pestaña Packaging (mismo CRUD/buscador, diferenciada por `kind`). El formulario implementado no coincide con los campos decididos (catálogo precargado de unidades, sin "unidad de compra"); la alineación está pedida en #260.

---

## Bloque 2 — Productos

### Pasos

Para cada producto, dentro de `/productos`:

1. **Producto y receta**: nombre del producto (pan flauta, facturas) y receta armada eligiendo insumos ya cargados, con la cantidad de cada uno y un `rendimiento` declarado para toda la receta.
2. **Costo variable unitario**: por cada renglón se calcula `costo del renglón = (precio de compra del insumo ÷ cantidad de compra del insumo) × cantidad usada`, con conversión automática dentro de la familia. La suma da el costo de la receta para el rendimiento declarado; **CVU = costo de la receta ÷ rendimiento**, siempre por 1 unidad de producto.
3. **Capacidad mensual**: cuánto se va a fabricar de ese producto. No es lo vendido hoy ni el equilibrio: es la capacidad que después reparte los costos indirectos. Es un campo editable del formulario del producto, junto a nombre, receta y rendimiento.
4. **Agregar otro producto**: el usuario puede cargar cuantos productos quiera; cada alta vuelve al catálogo de insumos ya cargados para elegir del catálogo compartido (la lista de insumos queda guardada). Los productos quedan editables siempre: no hay cierre de lista. El histórico se registra con el botón **Cerrar cálculo**.

### Dónde está el usuario

- **Pantalla:** `/productos` — lista del catálogo + formulario de alta/edición de producto (nombre, receta, rendimiento y capacidad).
- **Entra desde:** el menú de navegación (destino Productos), el dashboard, o desde Insumos.
- **Estado visible:** el listado muestra la capacidad cargada de cada producto.
- **Sale hacia:** cualquier destino del menú en cualquier momento; el prorrateo de indirectos requiere capacidades cargadas.

### Datos de la receta y del producto (decidido)

- **Renglón de receta:** insumo del catálogo + cantidad usada + unidad de la cantidad usada. **Sin campo "modo de compra"**. La unidad usada debe ser de la **misma familia** que la unidad de medida del insumo: conversión automática dentro de la familia; mezclar familias es inválido.
- **Rendimiento:** un solo valor general para toda la receta (no por renglón), ubicado en la receta del producto. Default `1`; debe ser > 0. Todas las cantidades de insumos se cargan para ese mismo rendimiento.
- **Cálculo:** `costo del renglón = (precio de compra del insumo / cantidad de compra del insumo) × cantidad usada`, con la conversión necesaria dentro de la familia. `costo de la receta = Σ costo de renglones` (para el rendimiento declarado); **`CVU = costo de la receta ÷ rendimiento`**, siempre por 1 unidad de producto.
- **Capacidad mensual:** campo del formulario del producto ("¿Cuántas unidades pensás fabricar este mes?"), editable siempre como nombre, receta y rendimiento. No hay pantalla propia para la capacidad ni entidad "plan del mes". El listado muestra la capacidad; editarla recalcula lo dependiente en vivo. El histórico se registra con un botón manual **"Cerrar cálculo"** (detalles en D5–D8).
- **Alineación:** el recorrido es Insumos → mis productos → crear/editar producto (nombre + receta + rendimiento + capacidad). La capacidad es un atributo único del producto, no por período: para un mes nuevo se edita cada producto (mitigable a futuro con edición masiva).
- **Validaciones (decididas):** al cargar un renglón se exige insumo existente del catálogo, unidad de la misma familia, cantidad > 0 y un solo renglón por insumo. El error se marca en el formulario y el renglón no entra al cálculo hasta corregirlo.
- **Ciclo de vida (decidido):** productos y recetas se editan y se borran siempre; el borrado es **lógico** (se marca, no se elimina físicamente) y se puede restaurar. Los snapshots cerrados conservan su copia y no se afectan (D11, D12).

### Huecos

- **Formato de rendimiento y redondeo**: entero o decimal; precisión intermedia y final (moneda).
- **Relación con el cálculo de un solo producto** *(fuera del set de issues: decisión de producto, no un hueco de #239–#247)*: la aplicación actual ya tiene un flujo de cálculo para un único producto. Las issues de fase 2 no mencionan qué pasa con ese flujo.

### Propuesta (pendiente de confirmar)

- El cálculo de un solo producto queda **fuera del flujo nuevo**: el catálogo lo reemplaza. Qué pasa con los "cálculos" existentes es una decisión de producto aparte.

---

## Bloque 3 — Costos indirectos, precio y equilibrio

> El prorrateo de los costos indirectos requiere capacidades cargadas en los productos (necesita la capacidad de cada uno). La carga de indirectos se puede hacer en cualquier momento; lo que no se puede es repartir sin capacidades.
>
> **Recálculo en vivo (decidido):** cualquier cambio en insumos, receta/rendimiento, capacidad, costos indirectos o recargo recalcula de inmediato todo lo derivado, con aviso de qué cambió. No hay cierre de lista para calcular; "Cerrar cálculo" solo toma una foto para el histórico.

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

### Propuesta (pendiente de confirmar)

- **Prorrateo simple por capacidad**: cada gasto se reparte por participación de capacidad (capacidad del producto ÷ suma de capacidades). Descartar la "importancia por gasto" hasta que exista una regla de drivers; si el equipo la quiere, cada gasto declara su driver y el default es capacidad.
- **Fórmulas propuestas** (a validar con la planilla #250):
  - `unidadesTotales = costosIndirectosDelPeriodo ÷ contribuciónPonderada`
  - `cuotaᵢ = unidadesTotales × mezclaᵢ`
  - `equilibrioEnPesos = Σ (cuotaᵢ × precioSugeridoᵢ)`
  - Prueba de cierre: `Σ (cuotaᵢ × contribuciónᵢ) = costosIndirectosDelPeriodo`
- **Un solo recargo global** para todos los productos (más simple de explicar); si se necesita por producto, es un campo opcional con default global.
- **Período como dato del cálculo**: con la opción A (capacidad en el producto, decidida) no hay entidad "plan del mes"; el histórico se registra con el snapshot de **Cerrar cálculo**, cuyos detalles siguen pendientes. Para esta versión puede haber un solo cálculo vigente.

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

> Las decisiones ya tomadas están centralizadas en el registro de decisiones. Esta lista consolida los huecos que aún requieren respuesta del equipo antes de implementar:
>
> 1. ~~Regla de capacidad~~ **Resuelta (D9):** > 0 para habilitar el cálculo; con 0 o sin cargar se guarda igual, avisa y se excluye del prorrateo.
> 2. ~~Detalles del snapshot "Cerrar cálculo"~~ **Resueltos** (D5–D8: congela todo, editable con auditoría, mes etiquetado con prorrateo en vivo y consulta en "Datos históricos").
> 3. Formato de `rendimiento` (entero o decimal) y redondeo/decimales (bloque 2).
> 4. Regla de "importancia de cada gasto" en el prorrateo (bloque 3).
> 5. Interpretación final de cuota, equilibrio en pesos y prueba de cierre (bloque 3).
> 6. Recargo global vs. por producto (bloque 3).
> 7. Modelo de período: ¿un cálculo activo o histórico? (bloque 3).
> 8. Destino del cálculo de un solo producto ya existente (global).
> 9. Página inicial/dashboard: ¿será un dashboard con resumen del estado del catálogo o una página inicial simple? Su contenido está a decidir; afecta la navegación y el MVP.
> 10. Planilla #250: sin ella no hay oráculo de validación para QA.

---

> _Documento en construcción — iteración por bloques._
