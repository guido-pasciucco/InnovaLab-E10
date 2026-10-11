# BUG-011 — `handleRouteErrors` no tiene ningún consumidor en producción

| Campo | Valor |
| --- | --- |
| ID | BUG-011 |
| Severidad | Aviso |
| Estado | Abierto — pendiente de detalle |
| Origen | Code review de proyecto completo, 2026-10-10 |
| Módulo | `lib/errors/` |
| Verificación | Lectura de código |

## Qué pasa

`handleRouteErrors` solo tiene un llamador en todo el repositorio: su propio archivo de test. Ni en `app/`, ni en `components/`, ni en `lib/` hay ninguna otra referencia. `fail` y `ok`, sus ayudantes, tampoco.

La única Route Handler existente no pasa por el adaptador: escribe su propio `try/catch` y llama a `toAppError` directamente.

Consecuencia: los valores de status que el catálogo codifica con cuidado nunca se leen fuera de los tests. Solo se ejercita la mitad de la traducción, la de actions. El día que aparezca el primer Route Handler JSON, el mapeo status↔código corre por primera vez en producción sin ninguna puerta real que lo haya validado.

## Dónde está

- `lib/errors/handle-route-errors.ts:25` — la definición.
- `lib/errors/handle-route-errors.test.ts:11` — el único llamador.
- `app/auth/confirm/route.ts:30` — la Route Handler que no usa el adaptador.
- `lib/errors/catalog.ts:38` — status 401.
- `lib/errors/catalog.ts:43` — status 403.
- `lib/errors/catalog.ts:81` — status 422.
- `lib/errors/catalog.ts:53` — status 503.

## Evidencia

De `app/auth/confirm/route.ts`:

```ts
    failure = toAppError(err, "AUTH_UNAVAILABLE").code;
```

## Reproducción

No aplica: verificado por lectura y por búsqueda de `handleRouteErrors` en el árbol.

## Impacto

Deuda documentada que se vuelve deuda viva, y un mapeo de status a código sin ejercitar en el único lugar donde importa.

## Causa raíz

El adaptador se construyó junto con el catálogo, antes de que existiera la primera puerta HTTP que lo consumiera.

## Dirección del arreglo

Es una decisión de alcance, no un fix puntual. Conectar la primera Route Handler real al adaptador y verificar el status con un test de integración, o dejar de mantener en el catálogo una columna que nada lee. Nota: `unstable_rethrow` está presente en ambos adaptadores pero solo el de actions tiene test del passthrough de `redirect()`.

## Qué NO se verificó

Sin llamadores no hay forma de verificar empíricamente los status HTTP.