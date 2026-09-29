# drizzle-scripts — Del esquema a SQL versionado y revisable

Los scripts `db:*` (`drizzle-kit ^0.31.10` sobre `drizzle-orm ^0.45.2`) convierten `lib/db/schema.ts` en SQL versionado dentro de `./drizzle/`. Generar es local y seguro; aplicar a la base requiere `DATABASE_URL` y criterio sobre qué comando usar.

> **Estado: spike de evaluación.** Los scripts solo generan y aplican SQL. No crean helpers, no configuran RLS y no están cableados a ninguna base real.

## Qué hace cada script

| Script | Comando | Efecto |
| ------ | ------- | ------ |
| `bun run db:generate` | `drizzle-kit generate` | Compara el esquema con la última instantánea y crea la migración SQL en `./drizzle/` (revisable, sin tocar la base) |
| `bun run db:migrate` | `drizzle-kit migrate` | Aplica las migraciones pendientes con historial (`__drizzle_migrations`), ordenado y repetible |
| `bun run db:push` | `drizzle-kit push` | Sincroniza el esquema directo a la base sin generar archivos ni historial (atajo de prototipado) |

## Cuándo usar cada uno

| Situación | Comando | Por qué |
| --------- | ------- | ------- |
| Cambió el esquema y se quiere revisar el SQL | `db:generate` | Produce un diff legible para code review antes de tocar datos |
| Spike o experimento descartable | `db:push` | Rápido, pero sin historial: imposible auditar o revertir con orden |
| Rama seria o base compartida | `db:migrate` | El historial garantiza que todos aplican los mismos cambios en el mismo orden |

## Flujo paso a paso

1. Completar `.env.local` desde `.env.example` (`cp .env.example .env.local`) con `DATABASE_URL` real.
2. Ejecutar `bun run db:generate` tras cada cambio en `lib/db/schema.ts`.
3. Revisar el SQL generado en `./drizzle/` como cualquier otro código (nombres, tipos, `numeric` para dinero).
4. En spike: `bun run db:push` contra una base descartable. En trabajo serio: `bun run db:migrate`.
5. Verificar con `bunx tsc --noEmit` y `bun run lint` antes de pedir revisión.

## Ejemplo mínimo

```bash
# Tras editar lib/db/schema.ts: genera la migración revisable
bun run db:generate

# Revisar ./drizzle/0000_supabase_*.sql y luego, solo en spike:
bun run db:push
```

La configuración vive en `drizzle.config.ts` (raíz): `schema` apunta a `./lib/db/schema.ts`, `out` a `./drizzle/` y `migrations.prefix` a `supabase`.

## Qué falta

- **RLS y autorización van aparte.** Estos scripts crean tablas, no políticas. Sin RLS evaluado no hay aprobación posible (ver `docs/decisions/pending-orm-persistence.md`).
- **No migrar producción sin revisar.** Todo SQL generado se revisa en el PR; `db:push` está prohibido fuera del spike.

## Errores comunes

- **Usar `db:push` en una base compartida.** Sin historial, dos entornos divergen en silencio y el conflicto aparece tarde.
- **Generar sin revisar el SQL.** El diff puede renombrar o eliminar columnas con datos; el review existe para detectarlo.
- **Confundir `DATABASE_URL` con `DIRECT_URL`.** El pooler (puerto 6543) es para runtime; la directa (puerto 5432) es para tooling que no tolera pooler. Ver `.env.example`.
- **Esperar que el generate valide datos.** Solo produce DDL; la validación en runtime sigue siendo Zod vía `drizzle-zod`.

## Paso siguiente

Definir la estrategia de RLS y los criterios de aprobación en `docs/decisions/pending-orm-persistence.md`, y cablear la conexión solo cuando el spike se apruebe.
