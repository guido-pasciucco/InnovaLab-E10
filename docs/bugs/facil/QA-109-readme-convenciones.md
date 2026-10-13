# QA-109 — Alinear README y convenciones con el estado actual

| Campo | Valor |
| --- | --- |
| ID | QA-109 |
| Issue URL | https://github.com/guido-pasciucco/InnovaLab-E10/issues/109 |
| Severidad inferida | Aviso |
| Estado | Abierto |

## Qué pasa

La revisión posterior a los PR #99, #102, #103, #104 y #105 encontró diferencias entre el estado actual de `main` y la documentación que se presenta como guía de arquitectura y testing. En el README: indica que `lib/money` está vacío y contiene solo `.gitkeep`, pero ya existen `format.ts` y `format.test.ts`; en "Próximos pasos" afirma que `lib/schemas`, `lib/calc` y `lib/money` están vacíos, aunque `lib/schemas` está activo y `lib/money` ya tiene implementación; informa 18 archivos unitarios cuando Vitest ejecuta 19 archivos y 216 tests unitarios; documenta `bunx tsc --noEmit`, que depende de que Next haya generado antes `.next/types`. En convenciones de schemas y tests: `lib/schemas/AGENTS.md` establece mensajes en español pero los tests de `createBusinessInputSchema` fijan mensajes predeterminados de Zod en inglés; la misma guía indica que `fields.ts` no necesita tests propios cuando el campo ya está expuesto por un contrato, pero continúa existiendo `lib/schemas/auth/fields.test.ts` además de `auth.test.ts`; `TEST.md` establece "un comportamiento por test", mientras algunos tests de integración agrupan varias entradas inválidas en un solo caso.

Este issue no busca modificar reglas funcionales ni la asignación de responsabilidades entre áreas; esas decisiones necesitan conversación y acuerdo del equipo.

## Criterios

- [ ] Actualizar en el README el estado real de `lib/money`, `lib/schemas` y las suites.
- [ ] Reemplazar el comando de typecheck cuando se resuelva el issue técnico correspondiente.
- [ ] Definir mensajes en español para las validaciones de negocio o ajustar explícitamente la convención si existen excepciones.
- [ ] Eliminar la cobertura duplicada de `fields.ts` o documentar por qué Auth constituye una excepción.
- [ ] Alinear los tests de integración con la regla "un comportamiento por test", usando `it.each` cuando corresponda.

## Relación con bugs

Menciona a BUG-010 ([BUG-010](BUG-010-mensajes-internos-de-zod-al-cliente.md)) por los mensajes predeterminados de Zod en inglés que llegan al cliente.
