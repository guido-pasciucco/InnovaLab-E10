# DB — Spike Drizzle (solo evaluación)

Estado: sin conexión a base de datos. El dominio (`lib/calc`, `lib/money`) no importa este módulo.

## Quién toca este directorio

| Rol | Qué hace en `lib/db/` |
| --- | --- |
| **Backend** | Dueño exclusivo. Define tablas, relaciones, esquemas derivados y migraciones. |
| **Frontend** | No lo toca ni lo importa (`server-only`). Recibe los datos ya mapeados a través de Server Components o Server Actions. |

## Estructura

Una carpeta por dominio. Las tablas y los validadores del mismo dominio van juntos; `relations.ts` queda central porque cruza dominios.

```
lib/db/
├── profile/        # profiles
├── business/       # businesses, products
├── calculation/    # calculations, costing_setup, pricing_inputs, scenarios, computed_results
├── costs/          # business_cost_lines, calc_cost_lines
│   ├── table.ts        # en cada dominio: tablas (pgTable) y tipos inferidos
│   └── validation.ts   # en cada dominio: esquemas drizzle-zod (*RowSchema, *InputSchema) y tipos
├── formats.ts      # formatos compartidos (uuid, dinero, cantidades, nombres, códigos)
└── relations.ts    # relaciones de consulta entre todas las tablas
```

Las claves foráneas entre dominios se importan de `table.ts` a `table.ts`, en el orden `profile ← business ← calculation ← costs`, sin ciclos. Una tabla nueva va en la carpeta del dominio que le corresponde y, cuando se pueda, con el mismo nombre que el contrato de `lib/schemas` que la alimenta.

## Reglas

1. Fuente única: cada tabla se declara una vez en el `table.ts` de su dominio (`lib/db/<dominio>/table.ts`). Los tipos se infieren (`$inferSelect` / `$inferInsert`). No crear interfaces manuales.
2. Validación en ejecución con Zod derivado (`drizzle-zod`). Los esquemas públicos excluyen campos del servidor (`id`, `owner`, timestamps) mediante `.omit()`.
3. Dominio puro: `numeric` llega como `string`. La conversión a objetos de `lib/money` se realiza en el borde, nunca dentro de `lib/calc`.
4. Solo servidor: `lib/db` únicamente desde Server Components, Server Actions o Route Handlers. Prohibido importar desde componentes cliente.
5. Claves 1:1 (`costing_setup`, `pricing_inputs`) usan `calculation_id` como PK y FK con `cascade`. `scenario_id` es anulable en líneas y resultados para permitir nivel cálculo.
6. Timestamps con `defaultNow()` y `updatedAt` con `$onUpdate`. `computed_at` sin valor por defecto (fila pendiente hasta finalizar el cálculo).
7. Reglas de negocio desde `lib/schemas`: los refinamientos de drizzle-zod reutilizan los `*Field` del `fields.ts` de cada contrato (ver `lib/schemas/AGENTS.md`). No se definen reglas ni mensajes nuevos en `<dominio>/validation.ts`.
8. Nombres de columna iguales a las claves del contrato del formulario y sin prefijos que repitan el nombre de la tabla (`costing_setup.unit`, no `costing_unit`). Así guardar no requiere renombrar campos.
9. Pendientes de decisión: `cascade` en `source_business_cost_id` (borra snapshots si se elimina plantilla) y en `scenario_id` (elimina en lugar de desvincular). RLS pendiente en Supabase.

## Flujo

1. El cliente envía entrada mínima (ejemplo: solo `productId`).
2. El servidor valida con el esquema público (`create*InputSchema`).
3. El servidor completa campos controlados (`userId` de sesión, `businessId`, identificadores).
4. Inserción con Drizzle. Lectura de fila y validación con esquema de fila (`*RowSchema`).
5. Mapeo a dominio, ejecución de `lib/calc` y escritura de `computed_results` por el servidor.

## Migraciones

Drizzle no genera migraciones solo: después de cambiar un `table.ts`, se generan a mano y se versionan en el PR.

1. Cambiá el `table.ts` del dominio.
2. Corré `bun run db:generate` **en una terminal interactiva**. Si renombraste una columna, drizzle-kit pregunta si es nueva o renombrada: elegí *rename*, porque *create* borra la columna vieja y sus datos.
3. Revisá el `.sql` generado y que no traiga cambios ajenos. Si aparece un desfasaje previo, va en un commit aparte.
   - **Renombre más cambio en la misma columna:** drizzle-kit 0.31 genera el `RENAME COLUMN` pero omite los cambios de esa columna (`SET DATA TYPE`, `NOT NULL`, largo), aunque el snapshot sí los registra. Agregá la sentencia al final del `.sql`, sobre el nombre nuevo (ejemplo: `drizzle/20261002095328_costing_setup_columns.sql`). Ni el paso 4 ni `drizzle-kit check` lo detectan, porque el snapshot ya está al día. Bug conocido: [drizzle-orm#3826](https://github.com/drizzle-team/drizzle-orm/issues/3826), corregido recién en drizzle-kit v1 (`rc`).
4. Volvé a correr `bun run db:generate`: tiene que responder "No schema changes".

Para lo que drizzle-kit no modela (RLS, triggers, FKs a `auth.users`, carga de datos), generá una migración vacía con `bun run db:generate -- --custom --name <nombre>` y escribí el SQL ahí. Así queda registrada en el journal. Nunca crees archivos en `drizzle/` ni edites `drizzle/meta/` a mano. Los renombres de columnas sí los modela: usá el paso 2, no `--custom`.

Todo `drizzle/`, incluido `meta/`, se versiona: `generate` compara los `lib/db/*/table.ts` contra el último snapshot. Cada snapshot es una foto completa del schema (cientos de líneas), y `.gitattributes` los marca como generados para que GitHub los colapse en la revisión. drizzle-kit no tiene comando para unir migraciones. Si dos migraciones de un PR todavía no se aplicaron en ninguna base, se borran con `bunx drizzle-kit drop` (elimina el `.sql`, el snapshot y la entrada del journal) y se regeneran juntas. `drop` no verifica si la migración ya se aplicó: nunca la uses sobre una migración que ya está en `main` o en alguna base.

`drizzle-kit push` solo sirve para prototipar en una base local: no deja historial.
