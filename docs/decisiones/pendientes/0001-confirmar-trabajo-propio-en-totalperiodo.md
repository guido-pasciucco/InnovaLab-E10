# 0001 — ¿El trabajo propio entra en `totalPeriodo`?

> **En una línea:** Si `isOwnLabor` es una dimensión independiente, cada renglón de trabajo propio también tiene un `behavior`; hay que decidir si el motor lo suma dentro de `fixed + variable` o lo muestra como vista aparte, **antes** de implementar #111.

| Campo | Valor |
| --- | --- |
| Estado | **Abierta** — bloquea la alineación de #111 |
| Creada | 2026-10-17 |
| Pregunta planteada por | @maluguiro (comentario en #111, 2026-10-15) |
| Registrada por | @alelex10 |
| Tickets alcanzados | #111 (motor puro totales), #91 (migración), #75 (historias H2/H4) |

## Contexto

La definición funcional confirmada (2026-10-17, cierre de #88/#97 y comentarios en #76) establece tres datos **independientes** por renglón de costo:

- `behavior`: `fixed | variable` — ¿cambia cuando se produce más?
- `traceability`: `direct | indirect` — ¿se atribuye directo al producto?
- `isOwnLabor`: boolean — ¿es trabajo propio del emprendedor?

El issue #111 (H4.1.1) define hoy el motor con `traceability ∈ {directo, indirecto, trabajo-propio}` y calcula `totalPeriodo = subtotalFijo + subtotalVariable`, con `subtotalTrabajoPropio` como **vista transversal informativa que no se suma de nuevo**. Ese modelo quedó desalineado con la confirmación. Alinearlo, sin embargo, no agota el punto: hay una decisión que la confirmación del modelo no cubre.

## La pregunta

**Opción A — el trabajo propio entra en `totalPeriodo`.**

Cada renglón con `isOwnLabor: true` además es fijo o variable, y el total `fijo + variable` ya lo incluye. `subtotalTrabajoPropio` pasa a ser una **vista transversal informativa** (suma las filas con `isOwnLabor: true`), igual de informativa que `subtotalIndirecto`.

- A favor: respeta "dimensiones independientes" con literalidad; el total refleja el costo completo de producir (el tiempo propio es un costo real, no un adorno).
- En contra: si la vista transversal original se diseñó para **excluir** el trabajo propio del total (capítulo 9 del doc funcional, "absorción"), cambiar la semántica del total afecta los criterios de aceptación existentes (CA1, CA4, CA5 de #111).

**Opción B — el trabajo propio queda fuera de `totalPeriodo`.**

El motor ignora los renglones con `isOwnLabor: true` al sumar el total y los muestra aparte.

- A favor: puede ser la intención original de la vista informativa ("NO se cuentan de nuevo").
- En contra: contradice la premisa de dimensiones independientes — una dimensión que modifica el total no es independiente; y deja al emprendedor con un costo real que no se refleja en su costo unitario.

## Impacto si se decide tarde

1. Implementar #111 con la opción equivocada reescribe la firma del motor y los tests CA1/CA4/CA5 (y el output tipado).
2. #91 guardaría `is_own_labor` sin haber decidido cómo el motor lo consume: la columna existiría con un uso indefinido.
3. El capítulo 9 del doc funcional (absorción) podría quedar con una regla sin definición operativa.

## Qué se necesita

Decisión del dueño funcional (quien validó el modelo confirmado). Con la respuesta, el alineamiento de #111 se puede resolver en **un solo PR**: se cambia el tipo de `traceability` a `direct | indirect`, se agrega `isOwnLabor` a la firma de entrada y se define si `totalPeriodo` cambia o no.

Referencias: comentario de cierre de PR #97 (maluguiro), cuerpo actual de #91 ("¿el trabajo propio entra en `totalPeriodo`?" — sección decisión), #111 y la historia H4 (`docs/calculation-engine/Motor de cálculo de Innova Lab.md`, cap. 9).
