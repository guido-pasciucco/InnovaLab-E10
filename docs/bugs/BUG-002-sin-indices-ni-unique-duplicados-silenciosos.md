# BUG-002 — Cero índices y cero restricciones UNIQUE con un check-then-insert

| Campo | Valor |
| --- | --- |
| ID | BUG-002 |
| Severidad | Bloqueante |
| Estado | Abierto — pendiente de detalle |
| Origen | Code review de proyecto completo, 2026-10-10 |
| Módulo | `lib/db/`, `drizzle/`, `lib/services/` |
| Verificación | Lectura de código + análisis de esquema |

## Qué pasa

Se verificó que ninguna de las 6 migraciones contiene un `CREATE INDEX` ni una restricción `UNIQUE`. Postgres no crea índices del lado referenciado de una FK, así que tampoco hay índices implícitos para las columnas por las que se filtra el servicio.

Sobre esa ausencia, `getOrCreateDefaultBusiness` implementa un patrón check-then-insert: primero busca el negocio del usuario y, si no lo encuentra, lo inserta. Sin una restricción que lo respalde, dos transacciones concurrentes pueden observar el mismo estado vacío y las dos insertar.

Escenario: doble click en el botón de confirmar, el usuario abre dos pestañas, o React reintenta la Server Action. Dos transacciones en READ COMMITTED leen cero filas y las dos insertan. Quedan dos negocios, dos productos y dos borradores de cálculo para el mismo usuario, contradiciendo el "un borrador por usuario" documentado en el README.

La consecuencia observable: `getDraftCalculationId` y `getCalculatorSetupService` filtran por `(user_id, status)` con `.limit(1)` sin `orderBy`. En Postgres, `LIMIT 1` sin orden no tiene resultado determinista. Cada request puede resolver un draft distinto, y el `UPDATE` del nombre del producto en `saveCalculatorSetupService` matchea 0 filas cuando el negocio resuelto no es el del producto: la escritura se pierde sin error. `db.transaction` no protege contra esto: no usa nivel serializable ni toma locks.

## Dónde está

- `lib/services/calculator.ts:23-37` — el check-then-insert de `getOrCreateDefaultBusiness`.
- `lib/services/calculator.ts:43-47` — `getDraftCalculationId`, con `.limit(1)` sin `orderBy`.
- `lib/services/calculator.ts:61-65` — búsqueda del draft dentro de la transacción.
- `lib/services/calculator.ts:115-127` — `getCalculatorSetupService`, también sin `orderBy`.
- `lib/db/business/table.ts:15` — `ownerUserId` declarado sin `unique()`.
- `lib/db/calculation/table.ts:41` — `status` como `text` libre con default `'draft'`.
- `drizzle/` — las 6 migraciones, sin una sola declaración `CREATE INDEX` o `UNIQUE`.

## Evidencia

De `lib/services/calculator.ts`:

```ts
async function getOrCreateDefaultBusiness(tx: Tx, userId: string) {
  const [existing] = await tx
    .select()
    .from(businesses)
    .where(eq(businesses.ownerUserId, userId))
    .limit(1);

  if (existing) return existing;

  const [created] = await tx
    .insert(businesses)
    .values({ name: "Mi negocio", ownerUserId: userId })
    .returning();
  return created;
}
```

```ts
  const [row] = await db
    .select({ id: calculations.id })
    .from(calculations)
    .where(and(eq(calculations.userId, userId), eq(calculations.status, "draft")))
    .limit(1);
```

## Reproducción

No aplica: verificado por lectura del código y por búsqueda de `CREATE INDEX|unique` en las 6 migraciones, sin coincidencias.

## Impacto

Pérdida silenciosa de escrituras, alternancia de datos entre navegaciones y degradación de rendimiento por seq scan en las consultas más calientes del servicio.

## Causa raíz

Las invariantes "un negocio por dueño" y "un borrador por usuario" están expresadas como lógica de aplicación en lugar de estar garantizadas por la base. Postgres no indexa el lado referenciado de una FK, por eso la ausencia de índices no es esperable.

## Dirección del arreglo

Agregar `UNIQUE (owner_user_id)` en `businesses` y un índice único parcial `CREATE UNIQUE INDEX ... ON calculations (user_id) WHERE status = 'draft'`, ambos mediante migración custom (`bun run db:generate -- --custom --name <nombre>`).

Reemplazar el check-then-insert por `onConflictDoNothing().returning()` con re-select. Agregar `orderBy(calculations.createdAt)` en las tres lecturas para que el comportamiento sea estable mientras el índice no exista. Agregar índices adicionales en las columnas que las políticas RLS consultan por subconsulta.

## Qué NO se verificó

No se midió el impacto de rendimiento real de los seq scan; el análisis es estructural.