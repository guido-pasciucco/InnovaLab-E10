# Fase 2 — Registro de decisiones

Centraliza las decisiones de producto/arquitectura del flujo de costos multi-producto: las ya tomadas y las que siguen abiertas, agrupadas por bloque como en la especificación. Cuando una decisión pendiente se resuelva, se mueve a "Decisiones tomadas" y se actualizan la especificación y/o el MVP.

## Decisiones tomadas

### Navegación y alcance general

#### Menú de navegación persistente separado del dashboard

- **Decisión:** la navegación tiene dos piezas distintas:
  - **Menú de navegación**: sección persistente presente en todas las pantallas del flujo. Único camino para cambiar de sección; no desaparece al entrar a un destino y no tiene estado.
  - **Página inicial / dashboard**: una vista más del menú (`/dashboard` tentativa). Está **a decidir** si será un dashboard o simplemente una página inicial; su contenido no está definido.

#### Navegación por destinos, no por pasos

- **Decisión:** no hay pasos obligatorios ni ventanas bloqueadas. Existen solo **dependencias de datos** (el prorrateo de indirectos requiere capacidades cargadas; tablero requiere datos cargados).

#### Alcance del MVP: solo bloque 1 (Insumos)

- **Decisión:** la primera entrega del flujo de costos incluye únicamente el catálogo de insumos completo (alta, corrección y borrado) más la navegación del flujo. Productos, costos indirectos y tablero quedan fuera hasta resolver las decisiones de negocio pendientes.

### General

#### Catálogo de unidades de medida: 4 familias, equivalencias dentro de la familia

- **Decisión:** el catálogo precargado tiene **11 unidades en 4 familias**, cada una con una unidad base:
  - **Masa** (base `g`): `g`, `kg`
  - **Volumen** (base `ml`): `ml`, `L`
  - **Longitud** (base `mm`): `mm`, `cm`, `m`
  - **Unidad/contable** (base `unidad`): `unidad`, `par` (2), `media docena` (6), `docena` (12)
- **Conversión:** automática solo dentro de la misma familia; equivalencias de masa/volumen/longitud son potencias de 10, contable usa ×2/×6/×12. La receta no puede mezclar familias (ej. "2 L de harina" es error de validación, no conversión).
- **Alcance:** pensado para cualquier emprendimiento de productos físicos (no solo alimenticio): masa y volumen cubren alimentos/bebidas, longitud cubre textiles/marroquinería/carpintería, contable cubre indumentaria/regalería.
- **Queda afuera deliberadamente:** superficie (m²), tiempo, unidades de envase (caja, bolsa, paquete — coherente con la decisión de no tener "unidad de compra"). Si un rubro los necesita, se agregan como familia/unidades nuevas sin migrar datos.
- **Catálogo extensible:** se pueden agregar unidades con su equivalencia sin romper datos existentes.

#### D4 — Recálculo en vivo ante cualquier edición

- **Decisión:** no existe un paso de cierre para poder calcular. Cualquier cambio en un dato del flujo — insumos, receta/rendimiento, capacidad, costos indirectos o recargo — dispara de inmediato el recálculo de todo lo derivado (CVU, prorrateo, costo total, precio y equilibrio), con aviso de qué cambió. Productos y catálogo quedan editables siempre.
- **Alcance:** decisión general que aplica a todos los bloques. La única dependencia de datos es que el prorrateo necesita capacidades cargadas; no requiere un cierre de lista.
- **Por qué:** el usuario quiere ver el efecto de cada dato en el momento, sin cerrar el catálogo ni rehacer pasos para obtener números.
- **Distinción:** "Cerrar cálculo" es un botón manual que solo toma una foto para el histórico; no habilita ni bloquea el cálculo en vivo.
- **Ajusta:** el hueco "Edición post-cálculo" y la propuesta de recálculo automático de la especificación, que pasan a ser decisión tomada.

### Bloque 1 — Insumos

#### Packaging como pestaña aceptada del catálogo

- **Decisión:** el catálogo de insumos del MVP incluye además una pestaña **Packaging**: mismo CRUD, mismo buscador y mismo formulario; se diferencia solo por `kind` (`supply` / `packaging`). Se reutiliza después en presentaciones (P12).
- **Por qué:** la guía de pantallas (Malena, P08) lo propuso y el equipo lo aceptó; no cambia la estructura de datos del backend más allá del campo `kind`.
- **Estado:** implementado. La guía, en su apartado de campos del insumo, deja abierta la diferencia con esta decisión — ver pendiente de Bloque 1.

#### El insumo no lleva "unidad de compra" y la unidad de medida se selecciona

- **Decisión:** se quita el campo "unidad de compra" (bolsa, caja, unidad) del insumo para evitar confusiones, y el contenido se separa en dos campos: **cantidad** (número, se ingresa) + **unidad de medida** (se **selecciona** de un catálogo precargado — kg, g, litro, unidad… — nunca texto libre). El insumo queda en **nombre + precio de compra + cantidad + unidad de medida** (ej. "Harina 000", $25.000, 50 kg).
- **Por qué:** el tipo de envase no aporta al cálculo (la matemática usa cantidad × unidad) y dos campos de "unidad" en el mismo formulario confunden. La unidad precargada garantiza equivalencias válidas para la conversión automática del bloque 2.
- **Ajusta:** la decisión previa (que incluía unidad de compra + cantidad por envase); el resto —cantidad con unidad de medida y costo por unidad calculado una sola vez— se mantiene.

#### Insumo con cantidad y unidad de medida (Opción B)

- **Decisión:** el insumo se da de alta con **nombre + precio de compra + unidad de compra + cantidad por envase** (ej. "Harina 000", $25.000, bolsa, 50 kg). El precio es del envase completo. *(Ajustada: ver decisión anterior — queda nombre + precio + cantidad + unidad de medida seleccionable.)*
- **Por qué:** la receta consume cantidades ("1000 g de harina") en unidades de medida relacionadas con las del envase. El sistema trabaja con un catálogo precargado de unidades de medida y hace la conversión por detrás (kg ↔ g, L ↔ ml): el usuario nunca hace la reducción a la unidad a mano. El costo por unidad se calcula una sola vez a partir del envase declarado en el insumo y todas las recetas lo comparten.
- **Revierte:** la Opción A anterior (insumo = nombre + precio, unidades en la receta), que queda documentada como descartada.

#### Borrado libre de insumos en el MVP

- **Decisión:** en el MVP se puede borrar cualquier insumo porque ninguna receta los referencia todavía.
- **Regla pendiente:** cuando existan recetas (bloque 2), el borrado de un insumo referenciado debe bloquearse hasta quitarlo de la receta.

### Bloque 2 — Productos y recetas

#### Rendimiento de la receta para normalizar a costo por unidad

- **Decisión:** la receta del producto tiene un campo **`rendimiento`** = cantidad de unidades de producto para las que están cargadas las cantidades de la receta (un solo valor general para toda la receta, no por insumo). **Default: `1`** (equivale a cargar directo por 1 unidad).
- **Ubicación:** dato de la **receta del producto**. Si cada producto tiene una sola receta, se guarda junto a la receta de ese producto.
- **Carga y cálculo:** todas las cantidades de insumos se ingresan para ese mismo rendimiento. `costo de la receta = Σ (costo de cada insumo por la cantidad cargada)`. **`CVU = costo de la receta ÷ rendimiento`**. El CVU queda siempre expresado por 1 unidad de producto.
- **Aclaraciones:** cubre el caso de cargar por tanda/lote indicando “para N unidades” sin cálculo manual (el sistema normaliza a 1 unidad). No se contempla, en esta definición, una base distinta por renglón; cada renglón refiere al mismo rendimiento de la receta. `rendimiento` debe ser > 0 (formato entero/decimal a precisar en el spec).
- **Resuelve:** la duda “¿receta por unidad de producto o por lote?” permitiendo declarar un rendimiento (lote) y obteniendo costo por unidad.
- **Pendiente:** validar con la planilla #250.

#### Renglón de receta sin “modo de compra”, con cantidad y unidad de la misma familia

- **Decisión:** cada renglón de la receta se compone de **insumo del catálogo + cantidad usada + unidad de la cantidad usada**. No se incluye el campo “modo de compra (por cantidad / por unidad)”.
- **Regla:** la unidad de la cantidad usada debe ser de la **misma familia** que la unidad de medida del insumo (conversión automática dentro de la familia; mezclar familias es inválido).
- **Cálculo:** `costo del renglón = (precio de compra del insumo / cantidad de compra del insumo) × cantidad usada`, aplicando la conversión necesaria dentro de la familia. El costo de la receta es la suma de sus renglones (para el rendimiento declarado) y el **`CVU = costo de la receta ÷ rendimiento`** (D1).
- **Por qué:** con el insumo ya modelado como precio + cantidad + unidad de medida (y costo por unidad derivado), la clasificación “por cantidad/por unidad” resulta redundante; la receta solo necesita expresar cuánto consume.
- **Alineación:** coherente con lo planteado en la guía de pantallas de Malena (P11: selección de insumo del catálogo, cantidad usada con su unidad, rendimiento de la receta/lote, sin pedir precio por renglón).
- **Ajusta:** la definición de “Datos de la receta” de la especificación (que incluía modo de compra).
- **Pendiente:** validar con la planilla #250.

#### Capacidad mensual como campo editable en el formulario del producto (opción A refinada)

- **Decisión:** la capacidad mensual es un **campo del producto**, cargado y editable en el mismo formulario donde se define el producto (nombre, receta, rendimiento). **No hay pantalla propia para la capacidad** ni entidad “plan del mes”. El listado de productos muestra la capacidad cargada; editarla recalcula lo dependiente en vivo.
- **Histórico:** se registra con un botón manual **“Cerrar cálculo”** que genera una foto/snapshot cuando el usuario terminó de cargar y está conforme (reemplaza/modifica el concepto de “cerrar lista”). Enfoque decidido; **detalles del snapshot pendientes** (qué congela, inmutabilidad, relación con prorrateo/período, dónde se consulta el histórico).
- **Recorrido:** Insumos → mis productos → crear/editar producto (nombre + receta + rendimiento + producción mensual, editables siempre); el sistema muestra CVU.
- **Por qué:** un solo lugar de edición por producto, menos pantallas, encaja con edición en vivo. Limitación aceptada: la capacidad es un atributo único del producto (no por período); para un mes nuevo se edita cada producto (eventualmente mitigable con edición masiva agregada después).
- **Alineación:** coherente con el recorrido de las issues #240–#242 (capacidad atada al producto); a diferencia de Malena (P13 dedicada o pestaña de P12), acá no hay pantalla separada. Ajusta P13 de la guía de Malena (tanto en A simple como en esta variante).
- **Ajusta:** pendiente de spec sobre “dónde vive la capacidad” y la discusión previa de “cerrar lista”. Ejemplo de pantalla: campo “Producción mensual — ¿Cuántas unidades pensás fabricar este mes?” dentro del formulario del producto.
- **Detalle:** comparación de opciones de capacidad en el doc de decisión capacidad vs plan del período.

## Decisiones pendientes

### General

#### Contenido de la página inicial/dashboard

- No está definido si la vista inicial será un **dashboard** (resumen del estado del catálogo con accesos a cada bloque) o una **página inicial** simple. El contenido está a decidir.
- **Contexto:** la propuesta de "hub de estado con una tarjeta por bloque" (Insumos, Productos, Costos indirectos, Tablero, cada una con estado y CTA) quedó en pausa; no es decisión tomada.
- **Bloquea:** qué se construye en `/dashboard` (ruta tentativa) y su criterio de aceptación en el MVP.

#### Alcance del menú persistente

- ¿El menú aplica a **todo el producto** o solo a las rutas del catálogo de fase 2 (`/insumos`, `/productos`, `/costos-indirectos`, `/tablero`, `/dashboard`)?
- **Contexto:** el flujo actual del producto es un wizard (`/paso-1` a `/paso-8`). Si el menú es global, convive o reemplaza esa navegación; si es solo del catálogo, hay que definir cómo se alternan.
- **Bloquea:** layout y navegación compartida.

### Bloque 1 — Insumos

- El formulario implementado sigue el modelo de la guía Malena / #239 (unidad de compra + unidad mínima + equivalencia, en texto libre) en lugar del catálogo precargado de 4 familias sin unidad de compra. Pedido de alineación: #260.

### Bloque 2 — Productos y recetas

- ~~Base de cálculo de la receta: ¿cantidades por unidad de producto (1 pan) o por lote (1 bandeja de 12)?~~ **Resuelto:** se define `rendimiento` de la receta (default 1) y se normaliza a unidad (`CVU = costo receta ÷ rendimiento`). Ver decisión tomada. Queda pendiente validar con planilla #250.
- ~~“Modo de compra” en el renglón de receta (por cantidad / por unidad).~~ **Resuelto:** se quita del renglón; el renglón es insumo + cantidad usada + unidad (misma familia) y el costo se calcula con conversión automática. Ver decisión tomada. Queda pendiente validar con planilla #250.
- ~~¿Dónde vive la capacidad mensual?~~ **Resuelto:** como **campo editable en el formulario del producto** (opción A refinada, sin pantalla propia ni “plan del mes”); histórico vía botón **“Cerrar cálculo”**. Ver decisión tomada.
- **“Cerrar cálculo” (snapshot) para histórico:** enfoque decidido (botón manual que genera una foto/snapshot cuando el usuario está conforme, en lugar de “cerrar lista”). **Pendiente:** qué congela el snapshot (insumos, recetas/rendimiento, capacidades, gastos indirectos, recargo y resultados), inmutabilidad (¿editable/sobreescribible?), relación con prorrateo/período, y alcance/consulta del histórico (pantalla “Datos históricos”). Ver el detalle comparativo de opciones.
- **Cierre para prorrateo/histórico vs “cerrar lista”:** resuelto en el enfoque (no hay “cerrar lista”; hay edición en vivo + “Cerrar cálculo” manual para un snapshot). Falta la regla concreta de qué ocurre tras el snapshot (el enunciado anterior queda cubierto por el punto de “Cerrar cálculo”).
- Destino del cálculo de un solo producto ya existente (fase 1): decisión de producto aparte; el catálogo lo reemplazaría.

### Bloque 3 — Costos indirectos

- Fórmulas de prorrateo y reparto (hereda ambigüedades de #246, #244: cuota, equilibrio en pesos, "importancia de cada gasto").
- La planilla #250 es el oráculo para validar las fórmulas; sin ella no hay cómo verificar.

### Bloque 4 — Tablero

- Qué resultados se muestran (precio sugerido, contribución, punto de equilibrio, recargo) y con qué fórmulas.
- Histórico de períodos y comparación de escenarios quedaron fuera del alcance original — confirmar si aplican.
