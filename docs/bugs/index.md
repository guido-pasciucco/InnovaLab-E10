# Bugs por dificultad

Este directorio agrupa los bugs detectados en el code review de proyecto completo del 2026-10-10, reorganizados por dificultad de resolución en `dificil/`, `media/` y `facil/`. Cada ficha tiene su propia evidencia y, cuando el hallazgo se reprodujo, su comando de reproducción con la salida real; cuando la evidencia es de lectura, la ficha lo dice explícitamente. Los estados se actualizan a medida que se profundice en cada bug.

## Dificil

| ID | Título | Dificultad | Severidad | Módulo | Archivo |
| --- | --- | --- | --- | --- | --- |
| BUG-001 | Las políticas RLS de INSERT no atan las claves foráneas al dueño | dificil | Bloqueante | `drizzle/`, `lib/db/` | [ficha](dificil/BUG-001-rls-insert-no-ata-fks-al-dueno.md) |
| BUG-002 | Cero índices y cero restricciones UNIQUE con un check-then-insert | dificil | Bloqueante | `lib/db/`, `drizzle/`, `lib/services/` | [ficha](dificil/BUG-002-sin-indices-ni-unique-duplicados-silenciosos.md) |

## Media

| ID | Título | Dificultad | Severidad | Módulo | Archivo |
| --- | --- | --- | --- | --- | --- |
| BUG-005 | Los servicios reciben `userId` como parámetro, y la única frontera de autorización depende de la disciplina | media | Crítico | `lib/services/` | [ficha](media/BUG-005-servicios-reciben-userid-como-parametro.md) |
| BUG-007 | El RLS está probado en 2 de 10 tablas | media | Aviso | `lib/db/rls.int.test.ts` | [ficha](media/BUG-007-rls-solo-testeado-en-2-de-10-tablas.md) |
| BUG-011 | `handleRouteErrors` no tiene ningún consumidor en producción | media | Aviso | `lib/errors/` | [ficha](media/BUG-011-handle-route-errors-sin-consumidores.md) |
| BUG-013 | La suite e2e no tiene ninguna señal de estado | media | Aviso | `playwright.config.ts`, `tests/e2e/` | [ficha](media/BUG-013-e2e-sin-senal-de-estado-en-ci.md) |
| BUG-014 | Un fallo de transporte deja el submit muerto y sin mensaje | media | Aviso | `components/forms/dispatch-in-transition.ts`, `app/` | [ficha](media/BUG-014-fallo-de-transporte-deja-submit-mudo.md) |

## Facil

| ID | Título | Dificultad | Severidad | Módulo | Archivo |
| --- | --- | --- | --- | --- | --- |
| BUG-003 | `formatARS` devuelve cadena vacía para valores que la base sí puede devolver | facil | Crítico | `lib/money/`, `lib/db/` | [ficha](facil/BUG-003-format-ars-devuelve-cadena-vacia.md) |
| BUG-004 | El validador de dinero acepta más dígitos enteros de los que la columna soporta | facil | Crítico | `lib/db/formats.ts` | [ficha](facil/BUG-004-money-string-acepta-mas-digitos-que-la-columna.md) |
| BUG-006 | `/update-password` renderiza el formulario sin verificar sesión | facil | Aviso | `app/update-password/` | [ficha](facil/BUG-006-update-password-sin-verificar-sesion.md) |
| BUG-008 | `lib/supabase/rsc.ts` traga incondicionalmente cualquier error al escribir cookies | facil | Aviso | `lib/supabase/rsc.ts` | [ficha](facil/BUG-008-rsc-traga-errores-al-escribir-cookies.md) |
| BUG-009 | No existe ningún error boundary en `app/` | facil | Aviso | `app/` | [ficha](facil/BUG-009-no-existe-error-tsx.md) |
| BUG-010 | `nameString` y `codeString` son el mismo cuerpo duplicado y filtran mensajes internos de Zod al cliente | facil | Aviso | `lib/db/formats.ts`, `lib/errors/` | [ficha](facil/BUG-010-mensajes-internos-de-zod-al-cliente.md) |
| BUG-012 | El journal de drizzle tiene 6 entradas pero solo 4 snapshots | facil | Aviso | `drizzle/` | [ficha](facil/BUG-012-journal-de-drizzle-sin-snapshots.md) |

## QA (facil)

| ID | Título | Dificultad | Ficha | Issue |
| --- | --- | --- | --- | --- |
| QA-107 | Hacer reproducible el typecheck en un clon limpio | facil | [ficha](facil/QA-107-typecheck-clon-limpio.md) | [#107](https://github.com/guido-pasciucco/InnovaLab-E10/issues/107) |
| QA-108 | Evitar error secundario al cerrar tests de integración | facil | [ficha](facil/QA-108-teardown-test-int.md) | [#108](https://github.com/guido-pasciucco/InnovaLab-E10/issues/108) |
| QA-109 | Alinear README y convenciones con el estado actual | facil | [ficha](facil/QA-109-readme-convenciones.md) | [#109](https://github.com/guido-pasciucco/InnovaLab-E10/issues/109) |

## Resumen

- 2 dificil: BUG-001 y BUG-002 (bloqueantes).
- 5 media: BUG-005 (crítico), BUG-007, BUG-011, BUG-013 y BUG-014 (avisos).
- 7 facil + 3 QA: BUG-003 y BUG-004 (críticos), BUG-006, BUG-008, BUG-009, BUG-010 y BUG-012 (avisos), más QA-107, QA-108 y QA-109.

El review base tuvo `tsc` y ESLint limpios y 216 tests en verde. Es decir, ninguno de estos defectos es detectable con las herramientas actuales del proyecto: o bien son errores de permisos y de invariantes que solo se manifiestan en ejecución, o bien son dimensiones que ni el type checker, ni el linter, ni la suite actual cubren todavía.
