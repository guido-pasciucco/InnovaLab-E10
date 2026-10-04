# 01 — Limpieza de datos de dominio en los tests E2E

| Campo | Valor |
| --- | --- |
| **Estado** | ⏳ Pendiente de decisión |
| **Fecha** | 2026-09-28 |
| **Relacionado** | Issue #49 · PR #50 · `tests/e2e/` · `lib/db/schema.ts` |

## Contexto

La suite E2E (`tests/e2e/`) sigue la regla *Arrange por la puerta de atrás, Act por la puerta de adelante*:

- Las **precondiciones genéricas** (un usuario confirmado, una sesión iniciada) viven como **fixtures** en `tests/e2e/fixtures/index.ts` (`user`, `authedPage`), con setup y teardown juntos.
- El **escenario específico** de cada test se arma **dentro del test**, en su sección Arrange, llamando a una factory (ej. `createBusiness({ owner: user })`).
- No se crea una fixture por página: los page objects (`tests/e2e/pages/`) son uno por página; las fixtures de datos son solo para precondiciones que se repiten entre specs.

Hoy la única entidad con factory es el usuario, y la fixture `user` lo borra al terminar (junto con su fila de `profiles`). Cuando lleguen las factories de dominio (`businesses`, `products`, `calculations`, ...), hay que definir **quién borra esos datos** al terminar cada test, para que la base local compartida no acumule basura.

## Opciones

### A. Cascada en la base de datos

Las FKs del dominio usan `onDelete: "cascade"` hasta el usuario. Cuando la fixture `user` borra al usuario, todo lo que cuelga de él se borra solo.

- ✅ Cleanup gratis: ninguna factory necesita lógica de borrado.
- ✅ Refleja el comportamiento real de la app (borrar una cuenta borra sus datos).
- ❌ **Bloqueante hoy:** `profiles.id` no tiene FK a `auth.users` (tiene `defaultRandom()`), así que la cascada se corta en el primer eslabón. Requiere corregir el schema y generar una migración.
- ❌ No cubre entidades que no cuelguen del usuario.

### B. Fixture `factories` que registra lo que crea

Una fixture expone las factories y guarda los ids de todo lo creado; en el teardown los borra en orden inverso (hijos antes que padres).

- ✅ Funciona con el schema actual, sin migraciones.
- ✅ Cubre cualquier entidad, cuelgue o no del usuario.
- ❌ Cada factory nueva suma su lógica de borrado.
- ❌ Si el proceso muere a mitad de camino, la basura queda igual (mitigable con un reset periódico de la base local).

### C. Combinación

Cascada (A) para todo lo que pertenece al usuario, y registro (B) solo para las entidades que no cuelgan de él.

## Decisión

_Pendiente._ A resolver cuando se escriba la primera factory de dominio.

## Consecuencias a evaluar

- Si se elige A o C: corregir `profiles.id` (FK a `auth.users` con `onDelete: "cascade"`, sin `defaultRandom()`) y revisar el `onDelete` de cada FK del dominio. Ojo con `calc_cost_lines.source_business_cost_id`: una cascada ahí reescribiría cálculos históricos (ver `lib/db/AGENTS.md`).
- Con cualquier opción: mantener un script de reset de la base local (`supabase db reset` + `db:migrate:local`) para limpiar lo que quede de corridas interrumpidas.
