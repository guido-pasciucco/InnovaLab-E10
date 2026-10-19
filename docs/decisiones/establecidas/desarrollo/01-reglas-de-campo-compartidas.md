# 01 — Reglas de campo compartidas entre formulario y base

| Campo | Valor |
| --- | --- |
| **Estado** | ✅ Aceptada (PR #84) |
| **Fecha** | 2026-10-02 |
| **Relacionado** | `lib/schemas/AGENTS.md` · `lib/db/AGENTS.md` · `lib/schemas/calculator-setup/` · `lib/db/<dominio>/validation.ts` |

## Contexto

Cada campo tenía dos validaciones escritas por separado: una en el contrato del formulario (`lib/schemas/`) y otra en el schema de la base (`lib/db/validation.ts`, con drizzle-zod; hoy `lib/db/<dominio>/validation.ts`). Las dos divergían sin que nadie lo notara:

- La base aceptaba `currency: "USD"` y el formulario no.
- El formulario guardaba el volumen como entero y la base como decimal de 4 posiciones.
- Los mensajes estaban en español en un lado y en inglés en el otro.

Además, las claves tenían nombres distintos (`unit` contra `costingUnit`), así que guardar requería un mapper que solo renombraba campos.

## Opciones

### A. Reglas compartidas en `fields.ts` (elegida)

Cada regla y su mensaje se escriben una vez en `lib/schemas/<contrato>/fields.ts`. El formulario y los schemas de drizzle-zod las importan. Las claves del formulario coinciden con las columnas.

### B. Derivar el formulario desde las tablas

`createInsertSchema(products).shape.name` usado directo en el formulario. Descartada: obliga al cliente a importar `lib/db` (prohibido, es solo de servidor), mete Drizzle en el bundle y ata la UI a cada migración.

### C. Dejar las dos validaciones separadas

Sin costo de refactor, pero las divergencias siguen apareciendo y cada cambio de regla hay que hacerlo dos veces.

## Decisión

Opción A. La guía operativa (estructura, pasos, checklist) está en `lib/schemas/AGENTS.md` y `lib/db/AGENTS.md`. Este documento registra por qué, cuánto cuesta y cuándo no conviene.

## Qué se gana y qué no

| Aspecto | Efecto | Evidencia |
| --- | --- | --- |
| **Navegación** | ✅ "Buscar referencias" sobre un `*Field` muestra todos los consumidores. "Ir a la definición" lleva a la regla desde cualquier lugar. | Antes: `codeString(40)` y `.min(1)` sin relación visible. |
| **Búsqueda por nombre** | ✅ El mismo nombre (`unit`) aparece en el formulario, la base y la migración. | Antes: `unit` y `costingUnit` eran lo mismo y había que saberlo. |
| **Cambiar una regla** | ✅ Se toca 1 lugar en vez de 2. | La divergencia de `"USD"` ya no puede ocurrir. |
| **Mapeo al guardar** | ✅ Desaparece el renombre de campos; solo se reparten por tabla. | No hizo falta escribir el mapper del setup. |
| **Cantidad de código** | ❌ No se reduce con un solo consumidor; aumenta. | Setup: 20 líneas antes, 45 después (`fields.ts` 28 + contrato 17). |
| **Lectura de un contrato** | ❌ Un salto más: para ver la regla completa hay que abrir `fields.ts`. | — |

**El código se reduce solo cuando hay dos o más consumidores de la misma regla.** En costos hay tres (el formulario, `business_cost_lines` y `calc_cost_lines`), y hoy `concept`, `behavior` y `traceability` están escritos dos veces en la base.

## Costos

1. **La base queda atada al contrato del formulario.** Si un seed, un script o un panel de administración necesita una regla distinta (por ejemplo, importes negativos para un ajuste), hay que declarar una excepción explícita en el `lib/db/<dominio>/validation.ts` de esa tabla. Es a propósito, pero suma rigidez.
2. **Renombrar columnas deja de ser barato cuando hay datos.** Alinear nombres es gratis antes de producción. Después, cada renombre es una migración con riesgo: drizzle-kit 0.31 omite los cambios de tipo de una columna renombrada en la misma generación ([drizzle-orm#3826](https://github.com/drizzle-team/drizzle-orm/issues/3826)).
3. **Más archivos para contratos chicos.** Un contrato de uno o dos campos con su propio `fields.ts` es estructura sin beneficio.
4. **Los mensajes de UI viajan a la base.** Los errores de `lib/db/<dominio>/validation.ts` quedan en español y orientados al usuario, también cuando quien escribe es un script.

## Cuándo no aplicar la convención

| Situación | Qué hacer |
| --- | --- |
| La regla tiene **un solo consumidor** y no hay una columna que la refleje (por ejemplo, `confirm` en el cambio de contraseña, o reglas de auth que valida Supabase) | Dejar la regla dentro del contrato. Extraerla a `fields.ts` recién cuando aparezca el segundo consumidor. |
| Schemas de **lectura** (`*RowSchema`) | Validan el formato de lo que devuelve la base (`moneyString`, `quantityString`), no reglas de negocio. No usan `*Field`. |
| Entradas **internas del servidor** (seeds, jobs, `computed_results`) | No pasan por el formulario. Pueden usar reglas de formato propias. |
| Una tabla necesita una **regla más permisiva** que el formulario | Escribir la excepción en el `lib/db/<dominio>/validation.ts` de la tabla, con un comentario que diga por qué. No relajar el `*Field` compartido. |
| La columna **ya tiene datos en producción** y el nombre no coincide | Evaluar el costo de la migración antes de renombrar. Si no vale la pena, mapear esa clave en el servicio y dejarlo documentado. |
| Un campo del formulario **no se guarda** (checkbox de términos, campos de confirmación) | Va solo en el contrato. No hay columna con la que alinear el nombre. |

## Consecuencias a evaluar

- Revisar esta decisión cuando exista el primer flujo de guardado real: confirmar que repartir el objeto por tabla alcanza y que no hace falta un mapper.
- Si los mensajes en español empiezan a molestar en scripts o logs, separar los mensajes de UI de las reglas de formato.
