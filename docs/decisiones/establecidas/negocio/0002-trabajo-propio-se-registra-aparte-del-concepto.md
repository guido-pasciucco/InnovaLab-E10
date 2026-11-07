# 0002 — El trabajo propio se registra aparte del concepto

| Campo | Valor |
| --- | --- |
| **Estado** | ✅ Decidida |
| **Fechas** | 2026-10-17 (dimensión independiente) · 2026-10-19 (entra en el total del período) |

## La regla

Cada costo del producto registra dos datos distintos:

- **Concepto:** qué es el costo. Es una etiqueta libre que escribe el usuario.
- **Trabajo propio:** si el tiempo que representa ese costo lo aporta el emprendedor. Es un sí o un no.

El trabajo propio no se deduce del concepto. Se registra como un dato propio.

## Por qué

El tiempo de las personas es parte del costo del producto. Si no se registra, el costo queda incompleto y el precio no cubre ese trabajo.

Al analizar el costo del producto, el emprendedor necesita separar dos cosas:

- cuánto del costo es su propio tiempo;
- cuánto es trabajo pagado a terceros.

Esa separación es una regla de negocio: permite filtrar y comparar el costo por origen del trabajo, y decidir si el precio cubre el tiempo propio.

## Por qué el concepto no alcanza

Clasificar por el texto del concepto falla en silencio. Estos son casos reales de lo que puede escribir un usuario:

| Lo que escribe | Qué pasa si se clasifica por el texto |
| --- | --- |
| `"mi tiempo"` | No dice "trabajo propio" → no se reconoce como propio |
| `"mano de obra propia"` | Es un sinónimo → no se reconoce |
| `"horas amasando"` | Describe la tarea, no quién la hace → no se reconoce |
| `"trabajo del ayudante"` | Dice "trabajo", pero no es propio → se clasifica mal |
| `"trabajo propío"` | Un error de escritura → no se reconoce |
| `"horas de trabajo"` en dos filas, una del dueño y otra del ayudante | El texto es idéntico → no se pueden distinguir |

Hay dos problemas más:

1. **El concepto es editable.** Si el usuario renombra "horas propias" a "horas de amasado", la clasificación no puede cambiar con él. El concepto es una etiqueta para el usuario; la clasificación es un dato del negocio y tiene que sobrevivir al renombre.
2. **El mismo concepto puede ser propio o ajeno.** "Horas de trabajo" no dice quién las pone. Solo el dato de trabajo propio lo dice.

## Es independiente de las otras dos preguntas

Todo costo responde tres preguntas separadas:

1. ¿Cambia si produzco más? → fijo o variable.
2. ¿Se puede asignar directo al producto? → directo o indirecto.
3. ¿El tiempo lo pone el emprendedor? → sí o no.

Las tres son independientes. Un renglón de trabajo propio también es fijo o variable, y directo o indirecto. Si las tres respuestas se guardaran como una sola categoría, se perdería al menos una de las respuestas del usuario.

## Qué permite

- Separar el costo del producto por origen del trabajo: propio o de terceros.
- Ver cuánto del costo es el tiempo del emprendedor.
- Incluir ese tiempo en el total del período sin contarlo dos veces: entra por su comportamiento fijo o variable, y la vista de trabajo propio es informativa.
- Que el precio sugerido cubra el trabajo propio.

## Límites

- No define cuánto vale la hora. Eso se calcula aparte.
- No reemplaza las preguntas de fijo o variable ni de directo o indirecto.
- No distingue entre distintas personas terceras: solo separa trabajo propio de trabajo que no lo es.
- Cómo se agrupa en la interfaz es una decisión de producto separada.

## Ejemplo

El panadero dedica 40 horas al mes a amasar. Ese tiempo es un costo real, aunque nadie le pase una factura. Puede cargarlo con el concepto "horas de amasado" o "mi tiempo": en los dos casos, el dato de trabajo propio dice que ese tiempo lo pone él.

Si más adelante contrata un ayudante y vuelve a cargar "horas de amasado", el concepto es el mismo, pero el dato de trabajo propio dice que ese tiempo no es suyo. Así el costo del producto se puede separar por origen del trabajo sin depender de cómo se escribió el concepto.
