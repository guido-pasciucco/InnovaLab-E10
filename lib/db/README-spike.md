# DB — Spike Drizzle (solo evaluación)

Estado: sin conexión a base de datos. El dominio (`lib/calc`, `lib/money`) no importa este módulo.

## Reglas

1. Fuente única: las tablas se declaran una vez en `schema.ts`. Los tipos se infieren (`$inferSelect` / `$inferInsert`). No crear interfaces manuales.
2. Validación en ejecución con Zod derivado (`drizzle-zod`). Los esquemas públicos excluyen campos del servidor (`id`, `owner`, timestamps) mediante `.omit()`.
3. Dominio puro: `numeric` llega como `string`. La conversión a objetos de `lib/money` se realiza en el borde, nunca dentro de `lib/calc`.
4. Solo servidor: `lib/db` únicamente desde Server Components, Server Actions o Route Handlers. Prohibido importar desde componentes cliente.
5. Claves 1:1 (`costing_setup`, `pricing_inputs`) usan `calculation_id` como PK y FK con `cascade`. `scenario_id` es anulable en líneas y resultados para permitir nivel cálculo.
6. Timestamps con `defaultNow()` y `updatedAt` con `$onUpdate`. `computed_at` sin valor por defecto (fila pendiente hasta finalizar el cálculo).
7. Pendientes de decisión: `cascade` en `source_business_cost_id` (borra snapshots si se elimina plantilla) y en `scenario_id` (elimina en lugar de desvincular). RLS pendiente en Supabase.

## Flujo

1. El cliente envía entrada mínima (ejemplo: solo `productId`).
2. El servidor valida con el esquema público (`create*InputSchema`).
3. El servidor completa campos controlados (`userId` de sesión, `businessId`, identificadores).
4. Inserción con Drizzle. Lectura de fila y validación con esquema de fila (`*RowSchema`).
5. Mapeo a dominio, ejecución de `lib/calc` y escritura de `computed_results` por el servidor.
