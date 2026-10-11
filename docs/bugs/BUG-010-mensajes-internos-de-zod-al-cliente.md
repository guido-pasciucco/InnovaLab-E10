# BUG-010 — `nameString` y `codeString` son el mismo cuerpo duplicado y filtran mensajes internos de Zod al cliente

| Campo | Valor |
| --- | --- |
| ID | BUG-010 |
| Severidad | Aviso |
| Estado | Abierto — pendiente de detalle |
| Origen | Code review de proyecto completo, 2026-10-10 |
| Módulo | `lib/db/formats.ts`, `lib/errors/` |
| Verificación | Ejecutado |

## Qué pasa

`nameString` y `codeString` tienen exactamente el mismo cuerpo y ninguno declara un mensaje con `error:`. Zod 4 usa por defecto su mensaje interno en inglés, que viaja por el camino que el propio proyecto documenta en `lib/errors/AGENTS.md`: `toAppError` extrae `z.flattenError` y el mensaje sale al cliente por `field-errors.ts` hasta `setError` en el formulario. El usuario ve el string interno de la librería.

El contraste es lo que lo convierte en bug y no en preferencia: el campo con la misma regla semántica, nombre de producto de 1 a 120 caracteres, sí tiene mensaje en español cuando pasa por `productNameField`, porque ese átomo se reutiliza desde `lib/db/business/validation.ts`. Los que quedan con el mensaje por defecto en inglés son `scenarios.name`, `businesses.name`, `businesses.businessType`, `pricing_inputs.margin_convention`, y `behavior` y `traceability` de las líneas de costo.

## Dónde está

- `lib/db/formats.ts:26-27` — los dos helpers duplicados.
- `lib/errors/app-error.ts:48` — la extracción de `z.flattenError`.
- `lib/errors/field-errors.ts:20` — `messages[field] = value[0]`.
- `components/forms/use-server-field-errors.ts:24` — el `setError`.
- `lib/schemas/AGENTS.md:57` — la regla de que los mensajes van en español y solo en el schema.
- `lib/schemas/calculator-setup/fields.ts:11` — el mensaje correcto, como contraste.

## Evidencia

De `lib/db/formats.ts`:

```ts
export const nameString = (max: number) => z.string().trim().min(1).max(max);
export const codeString = (max: number) => z.string().trim().min(1).max(max);
```

Salida real de ejecutar el schema:

```
mensaje que ve el usuario: "Too small: expected string to have >=1 characters"
```

Contraste, de `lib/schemas/calculator-setup/fields.ts`:

```ts
    "Escribí el nombre de tu producto.",
```

## Reproducción

```bash
bun -e 'import { z } from "zod/v4"; import { codeString } from "./lib/db/formats.ts"; const r = z.object({v: codeString(40)}).safeParse({v: "   "}); console.log(JSON.stringify(r.error.issues[0].message));'
```

La salida de ese comando es la que figura en la sección Evidencia.

## Impacto

Mensajes de usuario en inglés y con jerga interna de librería, en una aplicación cuyo `lang` declarado es español.

## Causa raíz

La regla del proyecto es que los mensajes viven en `fields.ts`. Estos dos helpers se definieron en `formats.ts`, que no participa de esa convención, y quedaron sin `error:`.

## Dirección del arreglo

Colapsar `codeString` y `nameString` en un único átomo derivado de un `fields.ts` con `error:` explícito, como ya hace `productNameField`. Tradeoff: `formats.ts` es de Backend y `fields.ts` también, así que no hay conflicto de propiedad.

## Qué NO se verificó

No se ejercitó ningún flujo real que alcance estos campos, porque los schemas de costos, escenarios y pricing todavía no tienen consumidor.