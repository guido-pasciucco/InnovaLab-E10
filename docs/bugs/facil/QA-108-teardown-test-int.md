# QA-108 — Evitar error secundario al cerrar tests de integración

| Campo | Valor |
| --- | --- |
| ID | QA-108 |
| Issue URL | https://github.com/guido-pasciucco/InnovaLab-E10/issues/108 |
| Severidad inferida | Aviso |
| Estado | Abierto |

## Qué pasa

Al ejecutar la suite de integración sin `.env.test` (`bun run test:int`), la suite informa correctamente `[test] Missing .env.test. Copy .env.test.example to .env.test...`, pero después `lib/services/calculator.int.test.ts` agrega un segundo error: `TypeError: Cannot read properties of undefined (reading '$client')`. La causa es que `beforeAll` falla antes de inicializar `db`, mientras que `afterAll` intenta ejecutar igualmente `await db.$client.end()`. El segundo error no afecta producción, pero ensucia el reporte y puede ocultar o confundir la causa original del fallo de preparación.

El resultado esperado es que el teardown cierre el cliente solo si llegó a inicializarse, conservando como causa principal el error de `.env.test` sin agregar la excepción secundaria.

## Criterios

- [ ] `afterAll` comprueba si el cliente fue inicializado antes de cerrarlo.
- [ ] La referencia global se limpia cuando corresponde.
- [ ] Sin `.env.test`, el reporte muestra la causa original y no el `TypeError` secundario.
- [ ] Con Supabase local configurado, la suite continúa cerrando correctamente el pool.

## Relación con bugs

Sin relación directa con fichas BUG. Hallazgo de validación posterior al merge del PR #102.
