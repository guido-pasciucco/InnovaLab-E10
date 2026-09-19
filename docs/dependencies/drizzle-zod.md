# drizzle-zod — Tablas una vez, tipos y validación derivados

Drizzle ORM (`^0.45.2`) + `drizzle-zod` (`^0.8.3`, `drizzle-kit ^0.31.10` en dev) eliminan la duplicación entre el esquema de base de datos y los tipos de la aplicación. Cada tabla se define una vez y de ella se derivan los tipos TypeScript y los esquemas Zod de validación runtime.

> **Estado: spike de evaluación.** Vive en `lib/db/` (rama `spike/drizzle-evaluacion`, sin pushear), no está cableado a ninguna base ni lo importa el dominio o las rutas. Ver `docs/decisions/pending-orm-persistence.md`.

## Problema que resuelve

Sin esta pieza, cada tabla se refleja a mano en interfaces TypeScript duplicadas: el esquema y los tipos divergen con cada cambio y se pierde la validación en runtime que Zod brinda hoy. El resultado es código que compila pero falla en ejecución ante datos inesperados.

## Cómo se usa en este proyecto

| Aspecto         | Decisión                                                                                                                                                         |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tablas          | `lib/db/schema.ts` con `pgTable`; nombres de tabla `snake_case` en Postgres, campos `camelCase` en TypeScript                                                    |
| Tipos de fila   | Inferidos: `type Business = typeof businesses.$inferSelect`, `NewBusiness = typeof businesses.$inferInsert`. Sin interfaces manuales                             |
| Validación      | `lib/db/validation.ts` con `createSelectSchema` (filas) y `createInsertSchema` (inputs) de `drizzle-zod`                                                         |
| Inputs públicos | Insert schema + `.omit()` de todo lo controlado por el servidor: `id`, FKs (`ownerUserId`, `businessId`, `calculationId`), `status`, `schemaVersion`, timestamps |
| Relaciones      | `lib/db/relations.ts` con la API clásica `fields` / `references` (`many` en padres, `one` en hijos)                                                              |

Flujo de escritura: `input público → validación Zod → el servidor inyecta campos propios (sesión, ruta, defaults) → insert → row`.

## Ejemplo mínimo

```ts
import { createInsertSchema } from "drizzle-zod";
import { businesses } from "./schema";

export const createBusinessInputSchema = createInsertSchema(businesses, {
  name: nameString(120),
}).omit({ id: true, ownerUserId: true, createdAt: true });

export type CreateBusinessInput = z.infer<typeof createBusinessInputSchema>;
```

## Errores comunes

- **Confundir contrato público con fila persistida.** El input del usuario no lleva `id` ni timestamps; esos los pone el servidor. Nunca aceptar un insert sin `.omit()`.
- **Tratar `numeric` como `number`.** Drizzle mapea `numeric` a `string` en TypeScript (dinero `numeric(12,2)`, cantidades `numeric(14,4)`). Validar como string decimal (`moneyString`, `quantityString`) y convertir a `Decimal` en la frontera con `lib/money`.
- **Creer que la inferencia valida en runtime.** `$inferSelect` existe solo en compilación; la barrera de ejecución sigue siendo Zod.
- **Importar `lib/db` desde el dominio.** `lib/calc` y `lib/money` permanecen puros; la conversión fila ↔ dominio ocurre en la frontera, nunca dentro del dominio.
- **Olvidar lo pendiente.** RLS y autorización están sin evaluar y bloquean cualquier aprobación (ver documento de decisión pendiente).

## Paso siguiente

Ver `docs/decisions/pending-orm-persistence.md` para los criterios de aprobación y la alternativa (cliente Supabase con tipos generados).
