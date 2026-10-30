# drizzle-scripts — Del esquema a SQL versionado y revisable

Los scripts `db:*` (`drizzle-kit ^0.31.10` sobre `drizzle-orm ^0.45.2`) convierten las tablas de `lib/db/<dominio>/table.ts` en SQL versionado dentro de `./drizzle/`. Generar es local y seguro; aplicar a la base requiere `DIRECT_URL` (conexión directa o session pooler, puerto 5432) y criterio sobre qué comando usar.

> **Estado: spike de evaluación.** Los scripts solo generan y aplican SQL. No crean helpers, no configuran RLS y no están cableados a ninguna base real.

## Qué hace cada script

| Script | Comando | Efecto |
| ------ | ------- | ------ |
| `bun run db:generate` | `drizzle-kit generate` | Compara el esquema con la última instantánea y crea la migración SQL en `./drizzle/` (revisable, sin tocar la base) |
| `bun run db:migrate` | `drizzle-kit migrate` | Aplica las migraciones pendientes con historial (`__drizzle_migrations`), ordenado y repetible |
| `bun run db:push` | `drizzle-kit push` | Sincroniza el esquema directo a la base sin generar archivos ni historial (atajo de prototipado) |
| `bun run db:drift:local` | `bun run scripts/db/drift.ts` | Compara el `sha256` de `drizzle/*.sql` con los hashes aplicados en la base local y falla si hay drift (solo lectura) |

## Cuándo usar cada uno

| Situación | Comando | Por qué |
| --------- | ------- | ------- |
| Cambió el esquema y se quiere revisar el SQL | `db:generate` | Produce un diff legible para code review antes de tocar datos |
| Spike o experimento descartable | `db:push` | Rápido, pero sin historial: imposible auditar o revertir con orden |
| Rama seria o base compartida | `db:migrate` | El historial garantiza que todos aplican los mismos cambios en el mismo orden |
| La base local puede tener migraciones de otra rama | `db:drift:local` | Detecta pendientes y huérfanas por hash antes de confiar en los tests; si hay huérfanas, se resetea |

## Flujo paso a paso

1. Completar `.env.local` desde `.env.example` (`cp .env.example .env.local`) con `DIRECT_URL` real (las migraciones no usan el pooler de `DATABASE_URL`).
2. Ejecutar `bun run db:generate` tras cada cambio en `lib/db/<dominio>/table.ts`.
3. Revisar el SQL generado en `./drizzle/` como cualquier otro código (nombres, tipos, `numeric` para dinero).
4. En spike: `bun run db:push` contra una base descartable. En trabajo serio: `bun run db:migrate`.
5. Verificar con `bun run typecheck` y `bun run lint` antes de pedir revisión.

## Ejemplo mínimo

```bash
# Tras editar lib/db/<dominio>/table.ts: genera la migración revisable
bun run db:generate

# Revisar ./drizzle/0000_supabase_*.sql y luego, solo en spike:
bun run db:push
```

La configuración vive en `drizzle.config.ts` (raíz): `schema` apunta al glob `./lib/db/*/table.ts` (solo las tablas, no los validadores ni los tests), `out` a `./drizzle/` y `migrations.prefix` a `supabase`.

## Detectar drift contra la base local

`drizzle-kit migrate` **no compara hashes**: lee el `created_at` de la última migración aplicada y ejecuta las locales cuyo `when` sea mayor. Si la base local corrió una migración de otra rama que nunca se mergeó, el watermark queda alto y `db:migrate:local` no la desaplica: la base queda más estricta que la rama (políticas RLS e índices) y puede tapar o adelantar resultados de tests. Es el caso del bug abierto [drizzle-orm#5769](https://github.com/drizzle-team/drizzle-orm/issues/5769).

El chequeo confiable es por hash, y es el que corre `db:drift:local`:

```bash
bun run db:drift:local
```

- Compara el `sha256` de cada `drizzle/*.sql` de la rama contra la columna `hash` de `drizzle.__drizzle_migrations`.
- **Pendientes**: archivos de la rama que la base no aplicó. Se resuelven con `bun run db:migrate:local`.
- **Huérfanas**: hashes aplicados que no existen en la rama. Se resuelven con `bun run db:reset:local`: la base local es descartable y Drizzle no tiene rollback automático.
- Es de **solo lectura** y apunta siempre a `127.0.0.1:54322`: nunca usa `DIRECT_URL` ni toca la nube.
- Sale `0` si está alineada, `1` si hay drift (incluida una base sin historial de Drizzle) y `2` si no pudo verificar (stack caído o error de lectura/consulta). Una base sin historial se resuelve con `bun run db:migrate:local`.

`bun run e2e:up` encadena el detector después de migrar, para que los E2E no arranquen sobre una base con drift. Antes de trabajar y al cambiar de rama, corré el detector a mano.

## Qué falta

- **RLS y autorización van aparte.** Estos scripts crean tablas, no políticas. Sin RLS evaluado no hay aprobación posible; la decisión de persistencia y el rol de RLS están en `docs/decisiones/establecidas/desarrollo/02-persistencia-del-calculo-en-servidor.md`.
- **No migrar producción sin revisar.** Todo SQL generado se revisa en el PR; `db:push` está prohibido fuera del spike.

## Errores comunes

- **Usar `db:push` en una base compartida.** Sin historial, dos entornos divergen en silencio y el conflicto aparece tarde.
- **Generar sin revisar el SQL.** El diff puede renombrar o eliminar columnas con datos; el review existe para detectarlo.
- **Confundir `DATABASE_URL` con `DIRECT_URL`.** El pooler (puerto 6543) es para runtime; la directa (puerto 5432) es para tooling que no tolera pooler. Ver `.env.example`.
- **Esperar que el generate valide datos.** Solo produce DDL; la validación en runtime sigue siendo Zod vía `drizzle-zod`.
- **Confiar en `db:migrate:local` para detectar drift.** Solo mira el watermark de `created_at`: puede saltear una migración pendiente e imprimir éxito. La verificación confiable es `bun run db:drift:local` (hash contra hash).

## Paso siguiente

Definir la estrategia de RLS —la decisión de persistencia y el rol de RLS están documentados en `docs/decisiones/establecidas/desarrollo/02-persistencia-del-calculo-en-servidor.md`— y cablear la conexión solo cuando el spike se apruebe.
