# BUG-004 — El validador de dinero acepta más dígitos enteros de los que la columna soporta

| Campo | Valor |
| --- | --- |
| ID | BUG-004 |
| Severidad | Crítico |
| Estado | Abierto — pendiente de detalle |
| Origen | Code review de proyecto completo, 2026-10-10 |
| Módulo | `lib/db/formats.ts` |
| Verificación | Ejecutado |

## Qué pasa

`moneyString` limita la escala (decimales) pero no la precisión (dígitos enteros). Las columnas que valida son `numeric(12, 2)`, que admiten como máximo 10 dígitos enteros. Un valor con 11 dígitos enteros pasa la validación de Zod y falla recién en Postgres.

Como el error que produce Postgres no es un `ZodError`, `toAppError` lo reduce al código genérico y la respuesta es un 500 en lugar de un error de campo. El usuario pierde la línea de costo completa y no recibe ningún mensaje en el campo.

## Dónde está

- `lib/db/formats.ts:15-17` — `moneyString`.
- `lib/db/formats.ts:19-24` — `quantityString`.
- `lib/db/costs/table.ts:29` — `amount_period` como `numeric(12, 2)`.
- `lib/db/calculation/table.ts:80` — `manual_price` como `numeric(12, 2)`.
- `lib/errors/app-error.ts:48` — el fallback a `INTERNAL`.
- `lib/errors/handle-route-errors.ts:34` — el `fallbackCode`.

## Evidencia

De `lib/db/formats.ts`:

```ts
export const moneyString = z
  .string()
  .regex(/^-?\d+(\.\d{1,2})?$/, "Expected a decimal string with up to 2 decimals");
```

```ts
export const quantityString = z
  .string()
  .regex(
    /^-?\d+(\.\d{1,4})?/,
    "Expected a decimal string with up to 4 decimals",
  );
```

Declaración de la columna, de `lib/db/costs/table.ts`:

```ts
  amountPeriod: numeric("amount_period", { precision: 12, scale: 2 }).notNull(),
```

## Reproducción

```bash
bun -e 'import { moneyString, quantityString } from "./lib/db/formats.ts"; console.log(moneyString.safeParse("99999999999.99").success); console.log(quantityString.safeParse("1234.5678").success);'
```

Salida real:

```
true
true
```

## Impacto

Un error de validación de entrada se presenta como una caída del servidor. Pérdida del dato y mensaje inaccionable para el usuario.

## Causa raíz

El formato se define con un regex independiente de la declaración de la columna, así que la precisión real nunca se comunica al validador. El comentario de `lib/db/formats.ts:7-10` dice que el mapeo ocurre en el borde, pero la escala de la columna vive únicamente en el `table.ts`.

## Dirección del arreglo

Derivar el límite de dígitos enteros de la misma declaración que ya existe en el `table.ts`, o acotar explícitamente el regex al rango de cada columna (`numeric(12, 2)` admite 10 dígitos enteros; `numeric(14, 4)` admite 10 también). Tradeoff: derivarlo automáticamente de `precision` requiere una abstracción sobre `pgTable`; la opción simple es acotar los regex y agregar un test que los cruce con las columnas.

## Qué NO se verificó

El error `22003 numeric field overflow` se dedujo de la declaración de la columna, no de un error real de Postgres observado.