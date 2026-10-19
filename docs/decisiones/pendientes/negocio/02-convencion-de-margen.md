# 02 — Convención de margen: sobre costo o sobre precio de venta

| Campo | Valor |
| --- | --- |
| **Estado** | ⏳ Pendiente de decisión |
| **Fecha** | 2026-10-17 |
| **Relacionado** | [`docs/producto/05-Motor de cálculo de Innova Lab.md`](../../../producto/05-Motor%20de%20cálculo%20de%20Innova%20Lab.md) · [`docs/producto/04-definicion-conceptual-calculadora-costos-emprendedores.md`](../../../producto/04-definicion-conceptual-calculadora-costos-emprendedores.md) · [`docs/producto/03-definiciones.md`](../../../producto/03-definiciones.md) · [`docs/producto/01-calculadora-inteligente.md`](../../../producto/01-calculadora-inteligente.md) · [`docs/producto/02-modelo-de-datos-del-calculo.md`](../../../producto/02-modelo-de-datos-del-calculo.md) · [01 — Selección del modelo de costos](01-seleccion-del-modelo-de-costos.md) |

## Contexto

El porcentaje de margen no significa lo mismo según sobre qué se lo calcule. La **convención de margen** define la base del porcentaje y, con ella, la fórmula con la que el motor obtiene el precio sugerido.

Las dos convenciones en juego:

- **Margen sobre el precio de venta** (sobre ventas): el porcentaje se mide sobre el precio final. El precio se despeja con `precio = costo / (1 − margen)`. Un margen del 20 % deja una ganancia que es el 20 % del precio cobrado.
- **Recargo sobre el costo** (*markup*): el porcentaje se suma al costo. El precio se obtiene con `precio = costo × (1 + recargo)`. El mismo número de referencia no da el mismo precio que la convención anterior.

Ejemplo verificable: con un costo de $8.000 y un precio de $10.000, la diferencia es $2.000. El **margen sobre ventas es 20 %** ($2.000 ÷ $10.000) y el **recargo sobre costo es 25 %** ($2.000 ÷ $8.000). El mismo precio corresponde a dos porcentajes distintos según la base. A la inversa, un recargo del 30 % sobre un costo de $8.000 da un precio de $10.400, cuyo margen real sobre ventas es del **23,08 %**.

Situación actual del material del producto: el **motor** y la **definición conceptual** ya recomiendan margen sobre el precio de venta, mientras que el **ejemplo del modelo de datos** usa `sobre costo`. El acuerdo formal del equipo, además, nunca se cerró: la convención figura como ítem abierto en varios documentos y como dependencia de la Semana 3.

## Evidencia en el repositorio

| Fuente | Qué dice |
| --- | --- |
| [`05-Motor de cálculo de Innova Lab.md`](../../../producto/05-Motor%20de%20cálculo%20de%20Innova%20Lab.md) (línea 471) | `Precio sugerido = costo total unitario / (1 - margen deseado)` → **margen sobre precio**. |
| [`05-Motor de cálculo de Innova Lab.md`](../../../producto/05-Motor%20de%20cálculo%20de%20Innova%20Lab.md) (línea 482) | *"Sumar 30 % al costo daría $1.300, pero el margen real sería 23,08 %. Esto ocurre porque el margen se mide sobre el precio final, no sobre el costo."* |
| [`04-definicion-conceptual-calculadora-costos-emprendedores.md`](../../../producto/04-definicion-conceptual-calculadora-costos-emprendedores.md) (líneas 314–320) | *"Margen de ganancia sobre ventas y recargo sobre costo son porcentajes diferentes."* y *"Recomendación: utilizar margen sobre el precio de venta, nombrarlo explícitamente y mostrar la fórmula."* |
| [`04-definicion-conceptual-calculadora-costos-emprendedores.md`](../../../producto/04-definicion-conceptual-calculadora-costos-emprendedores.md) (línea 383) | Ítem abierto: *"Confirmar margen sobre ventas como convención para el precio sugerido."* |
| [`03-definiciones.md`](../../../producto/03-definiciones.md) (línea 85) | *"Sobre qué se calcula el margen: sobre el costo (markup) o sobre el precio de venta. El mismo 30 % da precios distintos según la convención."* |
| [`01-calculadora-inteligente.md`](../../../producto/01-calculadora-inteligente.md) (línea 118) | *"antes del desarrollo debe acordarse una única convención de margen"*. |
| [`01-calculadora-inteligente.md`](../../../producto/01-calculadora-inteligente.md) (línea 238) | Dependencia de la Semana 3: *"convención de margen cerrada"*. |
| [`02-modelo-de-datos-del-calculo.md`](../../../producto/02-modelo-de-datos-del-calculo.md) (línea 114) | Ejemplo `\| c-2 \| sobre costo \| 30 \|` → **contradice al motor**. |

Lectura de la evidencia:

- El motor (`05-Motor…`) y el documento conceptual (`04-…`) **ya recomiendan margen sobre el precio de venta**.
- El ejemplo del modelo de datos (`02-modelo-de-datos…`, línea 114) usa `sobre costo` → **contradicción real pendiente de resolver**.
- El **acuerdo formal del equipo nunca se cerró**: no alcanza con que dos documentos coincidan si el dato que se va a persistir ejemplifica lo contrario.

## Opciones

### A. Margen sobre el precio de venta (recomendada por el motor y el conceptual)

El porcentaje se mide sobre el precio final. El precio sugerido se obtiene con `precio = costo / (1 − margen)`.

- ✅ Es la convención que ya usan el motor (`05-Motor…`, línea 471) y la definición conceptual (`04-…`, líneas 314–320).
- ✅ Coincide con el uso habitual de "margen" en el negocio y con el indicador que se muestra como rentabilidad sobre la venta.
- ❌ El número que ingresa el usuario ("quiero ganar 30 %") no es el recargo sobre el costo: exige explicitar la fórmula para evitar confusiones.
- ❌ Un margen cercano al 100 % dispara el precio; hay que definir el rango admitido y el manejo de valores inviables.

### B. Recargo sobre el costo (*markup*)

El porcentaje se suma al costo. El precio se obtiene con `precio = costo × (1 + recargo)`.

- ✅ Cálculo directo y fácil de explicar: "sumo un 30 % a lo que me costó".
- ❌ Produce un margen real menor al porcentaje ingresado (30 % de recargo → 23,08 % de margen sobre ventas).
- ❌ **Contradice al motor** (`05-Motor…`) y a la recomendación conceptual (`04-…`).
- ❌ Obliga a reescribir la fórmula documentada y el ejemplo del modelo de datos si se lo adopta como convención única.

### C. Mostrar ambas explícitamente

La interfaz expone las dos lecturas del mismo precio (margen sobre ventas y recargo sobre costo) y deja elegir cuál se usa para el precio sugerido.

- ✅ Máxima transparencia: el usuario ve que el mismo precio corresponde a dos porcentajes distintos.
- ✅ Evita la ambigüedad del término "margen" al nombrar cada base.
- ❌ Más superficie de interfaz y de explicación para el MVP.
- ❌ No elimina la necesidad de fijar **una** convención como predeterminada para el precio sugerido.

## Decisión

_Pendiente._ A resolver por el equipo de producto, con validación del mentor, antes de la Semana 3 (dependencia "convención de margen cerrada" en [`01-calculadora-inteligente.md`](../../../producto/01-calculadora-inteligente.md), línea 238).

## Consecuencias a evaluar

- **Fórmula del motor:** la convención elegida fija la fórmula del precio sugerido en `lib/calc`. Si se adopta margen sobre ventas, se mantiene `precio = costo / (1 − margen)`; si se adopta recargo sobre costo, cambia la fórmula documentada.
- **Campo persistido:** `pricing_inputs.margin_convention` debe guardar el mismo valor que la convención acordada. El ejemplo `sobre costo` de [`02-modelo-de-datos-del-calculo.md`](../../../producto/02-modelo-de-datos-del-calculo.md) (línea 114) hay que corregirlo si la decisión es margen sobre ventas.
- **Presentación al usuario:** decidir cómo se nombra el porcentaje ("margen" frente a "recargo"), si se muestra la fórmula y si se admiten ambas lecturas (opción C).
- **Validaciones y límites:** definir el rango de margen admitido y el tratamiento de precios no viables (margen igual o mayor al 100 %), en línea con las validaciones de la Semana 3.
- **Ejemplos de referencia:** fijar casos numéricos de contraste (costo $8.000 y precio $10.000 → 20 % de margen sobre ventas, 25 % de recargo sobre costo) para validar el motor y la planilla de referencia.
- **Documentos afectados:** al cerrar la decisión, alinear el motor (`05-Motor…`), la definición conceptual (`04-…`), las definiciones (`03-definiciones.md`), el criterio de cálculo (`01-calculadora-inteligente.md`) y el ejemplo del modelo de datos (`02-modelo-de-datos…`).
