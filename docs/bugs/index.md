# Bugs detectados en el code review

Este directorio agrupa los bugs detectados en el code review de proyecto completo del 2026-10-10. Cada ficha tiene su propia evidencia y, cuando el hallazgo se reprodujo, su comando de reproducción con la salida real; cuando la evidencia es de lectura, la ficha lo dice explícitamente. Los estados se actualizan a medida que se profundice en cada bug.

## Fichas

| ID | Título | Severidad | Módulo | Archivo | Estado |
| --- | --- | --- | --- | --- | --- |
| BUG-001 | Las políticas RLS de INSERT no atan las claves foráneas al dueño | Bloqueante | `drizzle/`, `lib/db/` | [BUG-001](BUG-001-rls-insert-no-ata-fks-al-dueno.md) | Abierto |
| BUG-002 | Cero índices y cero restricciones UNIQUE con un check-then-insert | Bloqueante | `lib/db/`, `drizzle/`, `lib/services/` | [BUG-002](BUG-002-sin-indices-ni-unique-duplicados-silenciosos.md) | Abierto |
| BUG-003 | `formatARS` devuelve cadena vacía para valores que la base sí puede devolver | Crítico | `lib/money/`, `lib/db/` | [BUG-003](BUG-003-format-ars-devuelve-cadena-vacia.md) | Abierto |
| BUG-004 | El validador de dinero acepta más dígitos enteros de los que la columna soporta | Crítico | `lib/db/formats.ts` | [BUG-004](BUG-004-money-string-acepta-mas-digitos-que-la-columna.md) | Abierto |
| BUG-005 | Los servicios reciben `userId` como parámetro, y la única frontera de autorización depende de la disciplina | Crítico | `lib/services/` | [BUG-005](BUG-005-servicios-reciben-userid-como-parametro.md) | Abierto |
| BUG-006 | `/update-password` renderiza el formulario sin verificar sesión | Aviso | `app/update-password/` | [BUG-006](BUG-006-update-password-sin-verificar-sesion.md) | Abierto |
| BUG-007 | El RLS está probado en 2 de 10 tablas | Aviso | `lib/db/rls.int.test.ts` | [BUG-007](BUG-007-rls-solo-testeado-en-2-de-10-tablas.md) | Abierto |
| BUG-008 | `lib/supabase/rsc.ts` traga incondicionalmente cualquier error al escribir cookies | Aviso | `lib/supabase/rsc.ts` | [BUG-008](BUG-008-rsc-traga-errores-al-escribir-cookies.md) | Abierto |
| BUG-009 | No existe ningún error boundary en `app/` | Aviso | `app/` | [BUG-009](BUG-009-no-existe-error-tsx.md) | Abierto |
| BUG-010 | `nameString` y `codeString` son el mismo cuerpo duplicado y filtran mensajes internos de Zod al cliente | Aviso | `lib/db/formats.ts`, `lib/errors/` | [BUG-010](BUG-010-mensajes-internos-de-zod-al-cliente.md) | Abierto |
| BUG-011 | `handleRouteErrors` no tiene ningún consumidor en producción | Aviso | `lib/errors/` | [BUG-011](BUG-011-handle-route-errors-sin-consumidores.md) | Abierto |
| BUG-012 | El journal de drizzle tiene 6 entradas pero solo 4 snapshots | Aviso | `drizzle/` | [BUG-012](BUG-012-journal-de-drizzle-sin-snapshots.md) | Abierto |
| BUG-013 | La suite e2e no tiene ninguna señal de estado | Aviso | `playwright.config.ts`, `tests/e2e/` | [BUG-013](BUG-013-e2e-sin-senal-de-estado-en-ci.md) | Abierto |
| BUG-014 | Un fallo de transporte deja el submit muerto y sin mensaje | Aviso | `components/forms/dispatch-in-transition.ts`, `app/` | [BUG-014](BUG-014-fallo-de-transporte-deja-submit-mudo.md) | Abierto |

## Resumen

- 2 bloqueantes: BUG-001 y BUG-002.
- 3 críticos: BUG-003, BUG-004 y BUG-005.
- 9 avisos: BUG-006 a BUG-014.

El review base tuvo `tsc` y ESLint limpios y 216 tests en verde. Es decir, ninguno de estos defectos es detectable con las herramientas actuales del proyecto: o bien son errores de permisos y de invariantes que solo se manifiestan en ejecución, o bien son dimensiones que ni el type checker, ni el linter, ni la suite actual cubren todavía.