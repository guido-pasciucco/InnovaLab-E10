# BUG-013 — La suite e2e no tiene ninguna señal de estado

| Campo | Valor |
| --- | --- |
| ID | BUG-013 |
| Severidad | Aviso |
| Estado | Abierto — pendiente de detalle |
| Origen | Code review de proyecto completo, 2026-10-10 |
| Módulo | `playwright.config.ts`, `tests/e2e/` |
| Verificación | Lectura de código |

## Qué pasa

La última corrida e2e registrada dice `"status": "failed"` y el directorio `test-results/` contiene artefactos de specs que deberían pasar sin más, incluyendo flows de autenticación. Esos artefactos están correctamente ignorados por git, y el repositorio no tiene CI.

El resultado es que un fallo de la suite e2e no deja ninguna señal en el árbol, y las protecciones de Playwright que lo detectarían están condicionadas a `process.env.CI`, que nunca se define localmente.

Escenario: alguien commitea un `test.only` en `tests/e2e/auth/login.spec.ts`. Playwright sale con éxito local, la regla de correr e2e antes de mergear se cumple, y 9 de los 10 flujos de auth nunca se ejecutan. `bun run test` tampoco lo ve, porque el proyecto unit excluye `tests/e2e/**`.

## Dónde está

- `test-results/.last-run.json:2` — el estado fallido.
- `playwright.config.ts:26-28` — la ausencia de CI, reconocida en el propio archivo.
- `playwright.config.ts:29` — los retries condicionales.
- `.gitignore:18` — el ignore de `/test-results/`.
- `vitest.config.mts:17` — la exclusión de `tests/e2e/**` del proyecto unit.
- `TEST.md:114` — la convención de correr e2e localmente antes de mergear.

## Evidencia

Estado de la última corrida, de `test-results/.last-run.json`:

```json
{
  "status": "failed",
  "failedTests": [
```

Configuración de retries y `forbidOnly`, de `playwright.config.ts`:

```ts
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
```

## Reproducción

No aplica: verificado por lectura de los artefactos y de la configuración. No se ejecutó la suite: requiere Supabase local (`bun run e2e:up`).

## Impacto

La suite e2e puede estar rota o incompleta sin que nadie lo sepa.

## Causa raíz

No hay un mecanismo que convierta el estado de la suite en una señal visible en el repositorio.

## Dirección del arreglo

Poner `forbidOnly: true` sin condición, que no cuesta nada sin CI; dar a `retries` un piso local de al menos 1 contra un stack compartido; y decidir si los artefactos de la última corrida se borran en el próximo `test:e2e` o se commitean. Agregar CI es la solución de fondo pero excede el alcance de este bug.

## Qué NO se verificó

No se pudo determinar si los directorios de `test-results/` corresponden a la corrida actual o a una antigua; `.last-run.json` no tiene timestamp.