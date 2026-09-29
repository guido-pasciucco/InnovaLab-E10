# decimal.js — Aritmética exacta para dinero

`decimal.js` (`^10.6.0`) es la base de todo cálculo monetario del proyecto. Garantiza que costos, precios, impuestos y punto de equilibrio sean exactos y auditables.

## Problema que resuelve

Los `number` de JavaScript son floats binarios (IEEE 754) y mienten con dinero: `0.1 + 0.2` da `0.30000000000000004`. En una calculadora de costos eso se traduce en centavos fantasma, redondeos inconsistentes e impuestos mal calculados. El error se acumula en cada suma, multiplicación por cantidad o aplicación de porcentaje.

## Cómo se usa en este proyecto

| Aspecto       | Decisión                                                                                                  |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| Dónde vive    | `lib/money` (formato y redondeo) y `lib/calc` (costos, precios, punto de equilibrio)                      |
| Qué es        | Dominio puro y universal: sin I/O, sin APIs de servidor, sin `window`                                     |
| Configuración | Precisión y modo de redondeo explícitos en la frontera de `lib/money`                                     |
| Regla de oro  | **Nunca usar `number` para dinero.** Todo monto entra como `string` decimal o `Decimal` y sale redondeado |

El flujo es: los inputs llegan como strings decimales (validados con Zod) → se operan como `Decimal` → se redondean una sola vez al salir hacia la UI o la persistencia.

## Ejemplo mínimo

```ts
import Decimal from "decimal.js";

const subtotal = new Decimal("0.1").plus("0.2"); // "0.3", no 0.30000000000000004
const conIva = subtotal.mul("1.21").toDecimalPlaces(2); // redondeo explícito
```

## Errores comunes

- **Mezclar `number` y `Decimal`.** Convertir a `number` en el medio reintroduce el error. Mantener `Decimal` hasta el redondeo final.
- **Redondear en cada paso intermedio.** Redondear solo al final (o donde la regla de negocio lo exija); el redondeo prematuro acumula desvíos.
- **Construir `Decimal` desde un float.** `new Decimal(0.1)` ya arrastra el error binario. Construir siempre desde `string`: `new Decimal("0.1")`.
- **Poner esta lógica fuera del dominio.** Nada de `Decimal` en componentes o Route Handlers; vive en `lib/money` y `lib/calc` y se importa directo (sin `fetch`).

## Paso siguiente

Ver `drizzle-zod.md`: las columnas `numeric` llegan como `string` desde la base y se convierten a `Decimal` en la frontera con `lib/money`.
