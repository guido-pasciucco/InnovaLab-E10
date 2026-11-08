# 0003 — El margen se mide sobre el precio de venta

| Campo | Valor |
| --- | --- |
| **Estado** | ✅ Decidida |
| **Fechas** | 2026-10-17 (planteada como pendiente) · 2026-11-03 (decidida) |
| **Opción elegida** | A — Margen sobre el precio de venta, mostrando además el recargo equivalente sobre el costo |

## La regla

El margen que ingresa el usuario es la parte del precio de venta que le queda como ganancia. El precio sugerido se obtiene con:

`precio = costo unitario / (1 − margen)`

Junto al margen se muestra, como dato informativo, el **recargo equivalente sobre el costo**: cuánto hay que sumarle al costo para llegar al mismo precio (`recargo = margen / (1 − margen)`). El recargo no se ingresa ni se elige: solo se muestra.

## Por qué

El mismo porcentaje da precios distintos según sobre qué se lo calcule. Con un costo de $1.000 y un 30 %:

| Convención | Precio | Ganancia | Ganancia sobre lo que cobra |
| --- | --- | --- | --- |
| Margen sobre el precio | $1.428,57 | $428,57 | 30 % |
| Recargo sobre el costo | $1.300 | $300 | 23,08 % |

1. **El número que ingresa es el que se lleva.** Con el recargo, el emprendedor cree que gana 30 % y en realidad gana 23 % de cada venta. La calculadora existe para evitar ese error.
2. **Usa la misma base que el resto de los cargos.** Comisiones, impuestos y descuentos se miden sobre lo que se cobra. Si el margen también, se pueden sumar y comparar: "de cada $100, $30 son ganancia y $5 comisión".
3. **Coincide con el motor de cálculo y la definición conceptual**, que ya recomendaban esta convención.

## Por qué se muestra el recargo equivalente

Mucha gente piensa en recargo: "le sumo un 30 % a lo que me costó". Sin otra explicación, ese usuario esperaría $1.300 y vería $1.428,57. La línea *"Equivale a sumarle un 42,9 % a tu costo"* explica la diferencia sin obligarlo a elegir una convención.

## Opciones descartadas

- **B — Recargo sobre el costo:** más fácil de explicar, pero entrega una ganancia real menor a la que el usuario ingresó.
- **C completa — Elegir la convención con un selector:** más interfaz para el MVP, y el usuario igual tiene que entender la diferencia para elegir. De esta opción solo se toma mostrar el recargo equivalente.

## Límites

- Un margen de 100 % o más no tiene precio posible: se pide al usuario que lo cambie.
- No define qué componentes integran el costo unitario que se usa como base.
- No define cómo se suman impuestos y comisiones al precio.
- No define el tratamiento de un precio manual distinto al sugerido.

## Ejemplo

Ana produce 200 unidades al mes con $320.000 de costos fijos y $2.500 de costo variable por unidad. Su costo unitario es $4.100. Quiere ganar un 30 %:

- Precio sugerido: $4.100 / 0,70 = **$5.857,14**.
- De cada $5.857,14 que cobra, $1.757,14 (30 %) son ganancia.
- Equivale a sumarle un **42,9 %** a su costo.
