# DB — Spike Drizzle (solo evaluación)

Estado: sin conexión a base de datos. El dominio (`lib/calc`, `lib/money`) no importa este módulo.

## Quién toca este directorio

| Rol | Qué hace en `lib/db/` |
| --- | --- |
| **Backend** | Dueño exclusivo. Define tablas, relaciones, esquemas derivados y migraciones. |
| **Frontend** | No lo toca ni lo importa (`server-only`). Recibe los datos ya mapeados a través de Server Components o Server Actions. |

## Reglas

1. Fuente única: las tablas se declaran una vez en `schema.ts`. Los tipos se infieren (`$inferSelect` / `$inferInsert`). No crear interfaces manuales.
2. Validación en ejecución con Zod derivado (`drizzle-zod`). Los esquemas públicos excluyen campos del servidor (`id`, `owner`, timestamps) mediante `.omit()`.
3. Dominio puro: `numeric` llega como `string`. La conversión a objetos de `lib/money` se realiza en el borde, nunca dentro de `lib/calc`.
4. Solo servidor: `lib/db` únicamente desde Server Components, Server Actions o Route Handlers. Prohibido importar desde componentes cliente.
5. Claves 1:1 (`costing_setup`, `pricing_inputs`) usan `calculation_id` como PK y FK con `cascade`. `scenario_id` es anulable en líneas y resultados para permitir nivel cálculo.
6. Timestamps con `defaultNow()` y `updatedAt` con `$onUpdate`. `computed_at` sin valor por defecto (fila pendiente hasta finalizar el cálculo).
7. Reglas de negocio desde `lib/schemas`: los refinamientos de drizzle-zod reutilizan los `*Field` del `fields.ts` de cada contrato (ver `lib/schemas/AGENTS.md`). No se definen reglas ni mensajes nuevos en `validation.ts`.
8. Nombres de columna iguales a las claves del contrato del formulario y sin prefijos que repitan el nombre de la tabla (`costing_setup.unit`, no `costing_unit`). Así guardar no requiere renombrar campos.
9. Pendientes de decisión: `cascade` en `source_business_cost_id` (borra snapshots si se elimina plantilla) y en `scenario_id` (elimina en lugar de desvincular). RLS pendiente en Supabase.

## Flujo

1. El cliente envía entrada mínima (ejemplo: solo `productId`).
2. El servidor valida con el esquema público (`create*InputSchema`).
3. El servidor completa campos controlados (`userId` de sesión, `businessId`, identificadores).
4. Inserción con Drizzle. Lectura de fila y validación con esquema de fila (`*RowSchema`).
5. Mapeo a dominio, ejecución de `lib/calc` y escritura de `computed_results` por el servidor.

## Migraciones

Drizzle no genera migraciones solo: después de cambiar `schema.ts`, se generan a mano y se versionan en el PR.

1. Cambiá `schema.ts`.
2. Corré `bun run db:generate` **en una terminal interactiva**. Si renombraste una columna, drizzle-kit pregunta si es nueva o renombrada: elegí *rename*, porque *create* borra la columna vieja y sus datos.
3. Revisá el `.sql` generado y que no traiga cambios ajenos. Si aparece un desfasaje previo, va en un commit aparte.
   - **Renombre más cambio de tipo en la misma columna:** drizzle-kit 0.45 genera el `RENAME COLUMN` pero omite el `SET DATA TYPE`, aunque el snapshot sí registra el tipo nuevo. Agregá la sentencia al final del `.sql`, sobre el nombre nuevo (ejemplo: `drizzle/20261002095328_costing_setup_columns.sql`). El paso 4 no lo detecta, porque el snapshot ya está al día.
4. Volvé a correr `bun run db:generate`: tiene que responder "No schema changes".

Para lo que drizzle-kit no modela (RLS, triggers, FKs a `auth.users`, carga de datos), generá una migración vacía con `bun run db:generate -- --custom --name <nombre>` y escribí el SQL ahí. Así queda registrada en el journal. Nunca crees archivos en `drizzle/` ni edites `drizzle/meta/` a mano. Los renombres de columnas sí los modela: usá el paso 2, no `--custom`.

Todo `drizzle/`, incluido `meta/`, se versiona: `generate` compara `schema.ts` contra el último snapshot. Cada snapshot es una foto completa del schema (cientos de líneas), y `.gitattributes` los marca como generados para que GitHub los colapse en la revisión. drizzle-kit no tiene comando para unir migraciones. Si dos migraciones de un PR todavía no se aplicaron en ninguna base, se borran (SQL, snapshot y entrada del journal) y se regeneran juntas.

`drizzle-kit push` solo sirve para prototipar en una base local: no deja historial.
