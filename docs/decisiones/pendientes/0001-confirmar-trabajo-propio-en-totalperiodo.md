# 0001 — El trabajo propio SÍ entra en `totalPeriodo`

> **Decisión:** ✅ **Decidida el 2026-10-19 por @alelex10 — Opción A.** El tiempo de trabajo propio del emprendedor **se suma dentro de `totalPeriodo`**, porque cada renglón de trabajo propio ya tiene su `behavior` (fijo o variable) y por ahí cae en el total. El bloqueo para implementar #111 queda resuelto.

| Campo | Valor |
| --- | --- |
| **Estado** | ✅ Decidida — **Opción A** (2026-10-19, @alelex10) |
| Pregunta planteada por | @maluguiro (comentario en #111, 2026-10-15) |
| Registrada por | @alelex10 |
| Tickets alcanzados | #111 (motor puro totales), #91 (migración), #75 (historias H2/H4) |
| Modelo confirmado el | 2026-10-17 (cierre de #88/#97 + comentario en #76) |

## La idea en una frase

`totalPeriodo` es **toda la plata que te cuesta producir en el mes**: lo que pagás a terceros **más lo que vale tu propio tiempo**. La fórmula del motor no cambia — las filas de trabajo propio entran por su `behavior` como cualquier otro costo.

## ¿Qué es `totalPeriodo`? (el ejemplo del panadero)

El período es la ventana de tiempo de los costos: normalmente un mes ("durante octubre gasté esto"). `totalPeriodo` es la suma de los costos de ese mes, contada una sola vez:

| Concepto | ¿Qué es? | Importe |
| --- | --- | --- |
| Alquiler del local | Fijo (no cambia si produzco más) | $300.000 |
| Internet | Fijo | $30.000 |
| Harina | Variable (crece con la producción) | $500.000 |
| Gas del horno | Variable | $100.000 |
| **totalPeriodo** | **fijo + variable** | **$930.000** |

De ahí sale lo que le importa al emprendedor — el costo de cada docena:

```text
unitarioPorDocena = totalPeriodo / docenas producidas
930.000 / 1000    = $930 la docena
```

Ese es el número sobre el que después se calculan margen y precio sugerido.

## ¿Qué faltaba decidir?

El panadero también trabaja él: dedicó horas del mes a amasar. Ese tiempo es un **costo real que nadie le paga con un recibo** — es *trabajo propio*. Quedaba en el aire si ese tiempo se suma dentro de los $930.000 o se muestra aparte como dato informativo.

Con el modelo confirmado (2026-10-17), cada costo tiene **tres datos independientes**:

- `behavior`: `fixed | variable` — ¿cambia cuando se produce más?
- `traceability`: `direct | indirect` — ¿se puede asignar directo al producto?
- `isOwnLabor`: boolean — ¿es trabajo propio del emprendedor? (ya **no** es un valor de `traceability`)

Entonces un renglón de trabajo propio *también* es fijo o variable (horas amasando = variable y directo; horas manteniendo el taller = fijo e indirecto).

## La decisión: Opción A — el trabajo propio entra en `totalPeriodo`

**Qué significa, en concreto:**

1. **La fórmula del motor no cambia:** `totalPeriodo = subtotalFijo + subtotalVariable`. Las filas con `isOwnLabor: true` ya suman en su bucket de `behavior`, como cualquier otra fila. No hace falta excluir nada.
2. **`subtotalTrabajoPropio` es una vista transversal informativa:** suma solo las filas con `isOwnLabor: true` y responde "¿cuánta plata del mes es mi propio trabajo?". Es informativa, como `subtotalIndirecto` — **no se suma de nuevo** al total.
3. **El unitario por docena incluye tu tiempo:** el precio sugerido va a cubrir tus horas. Si el trabajo propio quedara fuera, el precio pagaría harina, gas y alquiler… pero te dejaría sin cobrar tu trabajo.

## Por qué no se eligió la Opción B (quedar fuera)

- Contradice la premisa de dimensiones independientes: una dimensión que *modifica* el total no es independiente.
- Obliga al motor a **excluir activamente** filas del total — eso reescribiría la firma de la función y los tests CA1/CA4/CA5 de #111.
- El capítulo 9 del doc funcional (absorción) ya establece que el costo del producto incluye **todos** los costos de fabricación; el tiempo propio es uno de ellos (§8: "el trabajo propio también debe incluirse en el costo total del producto").

## Qué hay que alinear ahora (un solo PR)

Aunque la fórmula no cambia, el ticket #111 quedó redactado con el modelo viejo (`traceability ∈ {directo, indirecto, trabajo-propio}`). El alineamiento queda en:

1. **Tipo de entrada de `calculateCostTotals`:** `traceability: "direct" | "indirect"` (abajo el valor `trabajo-propio`) + `isOwnLabor: boolean` en `CostLine`.
2. **Bucket de `traceability`:** solo `subtotalIndirecto` como vista transversal; `subtotalTrabajoPropio` se arma ahora desde `isOwnLabor`.
3. **Dejar escrito el contrato:** `totalPeriodo = subtotalFijo + subtotalVariable` **incluye** el trabajo propio (por su `behavior`). `subtotalTrabajoPropio` y `subtotalIndirecto` son informativas y no se suman de nuevo.
4. **#91 (migración):** `is_own_labor` se guarda en su columna propia sin ambigüedad de cómo la consume el motor.

Los criterios de aceptación existentes de #111 (CA1 total = fijo + variable, CA4 espejo de planilla, CA5 sin fijos) **siguen válidos sin cambios**.

## Impacto evitado

Si se implementaba #111 con la respuesta por defecto ("trabajo-propio" como valor de `traceability`), después habría que reescribir la firma del motor y sus tests; #91 guardaría `is_own_labor` sin uso definido; y el capítulo 9 del doc funcional quedaría con una regla sin definición operativa.

## Referencias

- Pregunta original: comentario de @maluguiro en #111 (2026-10-15); cuerpo de #91 (sección decisión); cierre de PR #97.
- Modelo confirmado: #76 (enunciado reescrito 2026-10-17).
- Motor normativo: `docs/producto/05-Motor de cálculo de Innova Lab.md` §8 (trabajo propio), §9 (absorción).
