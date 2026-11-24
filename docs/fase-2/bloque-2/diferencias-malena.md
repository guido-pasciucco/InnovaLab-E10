# Bloque 2 — Productos: diferencias entre la guía de Malena y la guía de Alejandro

> Documento de discusión. Reúne, solo para el Bloque 2 (productos y recetas), las diferencias entre la **guía de pantallas de Malena** y las **decisiones/especificación de Alejandro** (Fase 2), junto con las razones de cada decisión de Alejandro. Sirve como base del diálogo con el equipo; no crea decisiones nuevas.
>
> Convenciones: "la guía de Malena" se refiere a las pantallas P10–P13 de su documento de pantallas y navegación. Las decisiones D# corresponden a la especificación de Alejandro (Fase 2).
>
> **Estado de presentaciones y packaging (2026-11-23):** las Diferencias 2 y 3 quedaron resueltas con D13, que sigue la guía de Malena (P08 y P12). La Diferencia 1·bis (capacidad de las presentaciones) sigue pendiente de revisión.


## En qué coinciden (no requiere discusión)

- **Producto y receta:** selección del insumo del catálogo, cantidad usada con su unidad (misma familia que el insumo), **rendimiento de la receta**, renglones agregables y editables. No se pide el precio del insumo en el renglón (viene del catálogo).
- **Costo variable por unidad:** se calcula una sola vez por renglón, con conversión automática dentro de la familia; sin “modo de compra” de por medio.
- **Buscador** por nombre o unidad y **catálogo compartido** de insumos (carga única, reutilizable en todos los productos).
- **Borrado de insumo** referenciado: bloqueado con aviso, quitando primero la referencia (congelar en el snapshot histórico no se ve afectado porque la foto guarda su propia copia).

## Diferencia 1 — ¿Dónde se carga la capacidad mensual?

**Lo que propone Malena (guía de pantallas):** una pantalla propia (o una segunda pestaña dentro de P12, “Producción mensual”) para "¿Cuántas unidades pensás fabricar este mes?", con un resumen de todos los productos y sus capacidades, y la acción "Continuar" (o "finalizar lista y pasar a gastos").

**Lo que define Alejandro:** la capacidad es **un campo más del formulario del producto**, al lado de nombre, receta y rendimiento, editable siempre. No hay pantalla ni pestaña propia, ni “cierre de lista” para pasar a costos: la carga de costos indirectos puede hacerse en cualquier momento; lo único que exige el prorrateo es que haya capacidades cargadas.

**Por qué (según Alejandro):**

- Menos pantallas y menos pasos: un solo lugar donde editar el producto (nombre, receta, rendimiento y capacidad).
- Coherente con edición en vivo: si cambia la capacidad, todo lo dependiente se recalcula al instante; no existe el acto "Finalizar lista".
- La capacidad es un dato del producto, no una etapa: ponerla en el alta y en la edición evita un segundo recorrido por producto solo para corregir la producción del mes.
- El histórico/registro del mes se resuelve con el botón "Cerrar cálculo" (foto), **mecanismo transversal que no pertenece solo al Bloque 2** (aplica al flujo completo: costos, precio, equilibrio y tablero).

**Qué corresponde acordar:**

- Que el campo quede en el bloque principal del formulario del producto (visible sin scroll), y el listado muestre la capacidad.
- La relación con "presentaciones": si la capacidad de una presentación (caja x6) se **deriva** de la capacidad de la unidad o se carga aparte (ver abajo, Diferencia 1·bis — pendiente de revisión).

### Diferencia 1·bis — Capacidad de las presentaciones

> **Pendiente de revisión** — Alejandro todavía no termina de entender esta opción y no la confirma; no avanza como decisión hasta que la revise y la defina.

- **Derivarla** (si el producto rinde 100 unidades este mes y una presentación trae 6, su capacidad se calcula de ahí): no pide dos veces el mismo dato.
- **Cargarla por separado** (cada presentación declara su producción): más flexible, más datos a cargar.

*Propuesta de Alejandro: derivarla para no pedir el mismo dato dos veces. **No confirmada — pendiente de revisión de Alejandro**; sujeta además a confirmar con Malena.*

### Issues relacionadas (posible cierre con el equipo)

- **#241** (lote vs unidad) → superada por D1/D2 (rendimiento de la receta; CVU por unidad; sin “modo de compra”). Posible cierre como absorbida.
- **#242** (capacidad del mes) → implementa P13; posible cierre/reemplazo por una issue que complemente #240 (FE) y #255 (BE) con la capacidad como campo editable en el formulario del producto.
- **“Cerrar cálculo”** (snapshot) es transversal, no propio del Bloque 2.

## Diferencia 2 — Presentaciones como entidad (costo variable por presentación)

> **Resuelta (D13, 2026-11-23).** Se adopta la propuesta de Malena: P12 es una pantalla propia del producto, con las dos cifras separadas, la lista editable de presentaciones (nombre libre, unidades enteras y varios ítems de packaging con cantidad) y los avisos cuando falta un dato. El costo de la presentación es `costo de la receta × unidades ÷ rendimiento + Σ costo del packaging`. Antes estuvo descartada de momento.


**Lo que propone Malena (guía P12):** presentaciones como lista editable de cada producto: nombre configurable (no lista fija x4/x6/x12), unidades contenidas, packaging con cantidades, desglose de cómo se calculó y **dos cifras separadas**: costo variable de elaborar una unidad y costo variable de la presentación comercial. Además, estados: receta incompleta, packaging sin precio, rendimiento inválido, y no mostrar $0 cuando faltan datos.

**Lo que define Alejandro:**

- El costo por unidad de producto se calcula una vez (rendimiento de la receta).
- Las presentaciones referencian ítems del catálogo de packaging con cantidad; su costo se suma al de la receta y se normaliza por el rendimiento para el CVU de la presentación. El precio del packaging se carga una sola vez en la pestaña Packaging, no en la presentación.
- La entidad "presentación" todavía no fue modelada en el detalle.

**Por qué (según Alejandro):** el costo de elaborar la unidad y el de vender la presentación son cosas distintas y ambas son útiles; la presentación construye sobre la unidad y reutiliza el CVU ya calculado (no duplica el cálculo). Lo que falta decidir además del modelado:

- Si las unidades contenidas se cargan o se derivan del tipo de presentación.
- Si una presentación puede tener varios ítems de packaging o siempre uno.
- Cómo se expresa/deriva su capacidad (ver Diferencia 1·bis).

**Qué corresponde acordar:** si la presentación entra como parte de este bloque (recomendado por Alejandro, es la forma natural de "vender" el producto) y confirmar las reglas de cálculo del costo de la presentación (unidades contenidas × CVU por unidad + costo del packaging).

## Diferencia 3 — Protección del packaging referenciado

> **Resuelta (D13, 2026-11-23).** El packaging usado por una presentación no se puede borrar ni cambiar de tipo o de familia de unidad, con la misma regla que el insumo usado por una receta. Antes estuvo descartada de momento.


**Lo que propone Malena (guía P08 y P12):** la misma protección que ya se aplica al insumo —bloquear el borrado si está en uso— debe aplicarse al **packaging vinculado a presentaciones**, validada en la interfaz y en el backend.

**Lo que define Alejandro:**

- El borrado de un **insumo** usado por una receta está bloqueado (con aviso y mención de las recetas que lo usan).
- El borrado de productos y recetas es **lógico y restaurable** (no elimina de verdad).
- El vínculo presentación ↔ packaging ya está definido.

**Por qué (según Alejandro):** si se puede dar de baja un packaging que una presentación sigue usando, el costo de esa presentación pierde su insumo de origen. La protección debe ser una regla única para los dos catálogos (insumo y packaging) y para las dos referencias (receta y presentación).

**Qué corresponde acordar:** extender la regla de bloqueo al packaging referenciado por presentaciones, con el mismo criterio que la de insumos (bloquear, indicar qué lo usa, quitar la referencia antes). Con borrado lógico, "dar de baja" significa marcar como borrado; el histórico no se rompe porque el snapshot guarda su copia.

## Diferencia 4 — Orden del recorrido

**Lo que propone Malena (guía):** un recorrido secuencial (acceso → insumos → producto → presentaciones → capacidad → costos → resultados) con un orden sugerido y "otro producto" como loop.

**Lo que define Alejandro:** navegación por destinos, no por pasos: todas las ventanas son accesibles en cualquier orden y en cualquier momento; lo único que existen son dependencias de datos (el reparto de costos necesita capacidades cargadas), no pantallas bloqueadas.

**Por qué (según Alejandro):** el usuario suele saber cuánto le cuesta producir y cuándo lo cambia; obligarlo a un orden lo frena. Una sola regla —ningún paso bloquea a otro; solo hay datos que, al faltar, muestran "no disponible" o avisan— simplifica modelo y código.

**Qué corresponde acordar:** que el orden de la guía de Malena sea una sugerencia de uso (cómo guiar al usuario) y no un bloqueo de pantallas; si se quiere onboarding/ayuda, que sea opcional y no cambie el orden permitido.

## Diferencia menor — Borrado: lógico vs. eliminación con confirmación

- **Lo que propone Malena:** eliminar con confirmación.
- **Lo que define Alejandro:** borrado lógico (se marca, deja de mostrarse y de entrar en los cálculos, se puede restaurar).
- **Por qué (según Alejandro):** el dato no se pierde sin querer; un catálogo compartido (insumos/productos) corre menos riesgo de vacíos accidentales.
- **Qué corresponde acordar:** informar que en la implementación de Alejandro "Eliminar" no borra de verdad; si la guía de Malena promete eliminación definitiva, conviene corregirla.

## Qué no entra en esta discusión (se trata en otros bloques u otros documentos)

- **“Cerrar cálculo” (snapshot histórico por mes):** mecanismo transversal del flujo completo; no es exclusivo ni propio del Bloque 2. Se define en el nivel general (junto con costos indirectos, precio y tablero).
- Datos históricos como concepto de producto (ya decidido); su registro/consulta queda fuera del Bloque 2.

- Datos históricos y "Cerrar cálculo" (decisión ya tomada por Alejandro, fuera de Productos).
- Menú lateral y apartado "Costos" en tres pestañas (es de costos/tablero, no del bloque de productos).
- Campos del insumo ("unidad de compra" vs unidad de medida): es del bloque de insumos de Alejandro; la decisión coincide con el formulario y la implementación ya está alineada (#260, PR #263).
- Fórmulas de prorrateo y equilibrio: son del bloque de costos y del tablero.
