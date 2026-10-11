# BUG-012 — El journal de drizzle tiene 6 entradas pero solo 4 snapshots

| Campo | Valor |
| --- | --- |
| ID | BUG-012 |
| Severidad | Aviso |
| Estado | Abierto — pendiente de detalle |
| Origen | Code review de proyecto completo, 2026-10-10 |
| Módulo | `drizzle/` |
| Verificación | Lectura de código |

## Qué pasa

`drizzle/meta/_journal.json` declara 6 entradas, pero `drizzle/meta/` contiene 4 snapshots. No existen para `20260928101613_enable_rls` ni para `20260928101614_add_profiles_fk`.

La evidencia de que el camino correcto sí genera snapshot es el propio repo: `20260924041522_add_profile_trigger` también es una migración custom (un trigger no se modela en el schema) y sí tiene su snapshot encadenado.

Escenario: hoy `generate` y `migrate` funcionan, porque la cadena de snapshots es continua y el snapshot final coincide con los `table.ts`. Lo que se rompe es cualquier operación que confíe en que journal y snapshots están pareados 1 a 1, que es exactamente lo que documentan `drop` y `drizzle-kit check`. Nada valida una entrada escrita a mano, así que un `.sql` borrado o renombrado a mano dejaría el journal apuntando a un archivo inexistente y `migrate` fallaría en producción sin avisar en el repo.

## Dónde está

- `drizzle/meta/_journal.json:23` — entrada `20260928101613_enable_rls`, sin snapshot.
- `drizzle/meta/_journal.json:30` — entrada `20260928101614_add_profiles_fk`, sin snapshot.
- `lib/db/AGENTS.md:65` — la regla que prohíbe crear archivos en `drizzle/` a mano.
- `lib/db/AGENTS.md:67` — las operaciones que confían en el pareo 1 a 1.

## Evidencia

Contenido de `drizzle/meta/_journal.json` (tags, en orden):

```json
"20260919211838_demonic_sleeper"
"20260924041522_add_profile_trigger"
"20260928101613_enable_rls"
"20260928101614_add_profiles_fk"
"20261002092620_sync_profiles_id_default"
"20261002095328_costing_setup_columns"
```

Archivos presentes en `drizzle/meta/`:

```
20260919211838_snapshot.json
20260924041522_snapshot.json
20261002092620_snapshot.json
20261002095328_snapshot.json
_journal.json
```

## Reproducción

No aplica: verificado por lectura del journal y del directorio `drizzle/meta/`.

## Impacto

Riesgo de fallo en producción en una operación de mantenimiento, y una desviación silenciosa del procedimiento documentado.

## Causa raíz

Las dos migraciones se escribieron a mano en lugar de generarse con el procedimiento documentado para SQL que drizzle-kit no modela.

## Dirección del arreglo

Regenerar esas dos entradas con `bun run db:generate -- --custom --name <nombre>` para que produzcan su snapshot encadenado. Verificar antes que las migraciones no se aplicaron en ninguna base; si ya se aplicaron, el repositorio queda como está y se documenta la excepción.

## Qué NO se verificó

No se corrió `drizzle-kit check` ni `db:generate` porque ambos escriben archivos y la revisión era de solo lectura.