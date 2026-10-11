# lib/TEST.md — Tests de `lib/`

Casos específicos de `lib/` (dueño: Backend). Las reglas compartidas (taxonomía, nombres, mocks, datos, recursos) están en [`../TEST.md`](../TEST.md); leela primero.

Guías relacionadas: [`errors/TEST.md`](errors/TEST.md) (camino del error) y [`schemas/TEST.md`](schemas/TEST.md) (contratos Zod).

## Qué test le toca a cada módulo

| Módulo | Tipo | Cómo se aísla |
| --- | --- | --- |
| `calc/`, `money/` (dominio puro) | Unit | Funciones puras: sin renderizar, sin mocks, sin importar `db/` |
| `schemas/` | Unit | Se parsea input real con Zod (ver [`schemas/TEST.md`](schemas/TEST.md)) |
| `services/` con cliente externo | Unit | Cliente falso **inyectado** como parámetro |
| `services/` con persistencia | Integración (`.int.test.ts`) | Postgres local real; `db` se pasa como parámetro |
| `auth/`, `supabase/` | Unit | `vi.mock` de los módulos de Next/infra + `vi.stubEnv` |
| `db/` | Unit | Cliente real con URL falsa: `postgres()` no abre socket hasta la primera query |
| `errors/` | Unit | Ver [`errors/TEST.md`](errors/TEST.md) |

## Servicios: unit vs integración

Un servicio **recibe sus dependencias por parámetro** (`client`, `db`); el test decide qué le pasa.

**Unit con cliente inyectado.** El test arma un cliente falso con `vi.fn`, sin `vi.mock`:

```ts
function clientWith(signIn: () => Promise<unknown>) {
  return { auth: { signInWithPassword: vi.fn(signIn) } } as unknown as SupabaseClient;
}
```

**Integración contra la base real.** El test le pasa al servicio un cliente de Drizzle conectado al Postgres local:

- El archivo se llama `<modulo>.int.test.ts` y corre con `bun run test:int`, nunca con `bun run test`.
- El cliente se crea una vez en `beforeAll` y se cierra en `afterAll` con `db.$client.end()` (el pool de `postgres`).
- La factory de usuarios y el entorno (`loadTestEnv`) se importan desde `tests/support/`, nunca desde `tests/e2e/`.
- Cada test crea su usuario con una factory y lo registra para borrarlo en `afterEach`.
- Las consultas de verificación filtran por el `id` de ese usuario.
- El aislamiento por dueño se prueba con **dos usuarios**: B no lee ni pisa lo de A (`it("user B cannot read or overwrite user A's draft")`).

## `auth/` y `supabase/`

- Un `redirect()` se afirma leyendo el `digest` del error que lanza Next (`NEXT_REDIRECT;...;<destino>`).
- Los módulos que se mockean con `vi.mock` se importan **después**, con `await import("./modulo")`.
- Limpiá con `mockReset()` en `beforeEach` y `vi.unstubAllEnvs()` / `vi.restoreAllMocks()` en `afterEach`.

## `db/`

- Un test del cliente recarga el módulo con `vi.resetModules()` y limpia el singleton global en `afterEach`.
- `db/<dominio>/validation.test.ts` verifica que los schemas de la base usen las mismas reglas y mensajes que el formulario (un caso por campo) y que el input público descarte los campos del servidor (ver [`schemas/TEST.md`](schemas/TEST.md)).

## Soporte de tests

- Para importar módulos `server-only` en Vitest, el alias de `vitest.config.mts` lo resuelve al `empty.js` que trae el propio paquete; no lo esquives en el módulo.
- Las contraseñas de prueba se generan en runtime con `faker` (`faker.internet.password(...)`), para que los scanners de secretos no las marquen. Nunca un literal en el test.

## Checklist

- [ ] El test está co-localizado junto al módulo, con el sufijo de su tipo.
- [ ] El dominio puro se testea sin renderizar, sin mocks y sin importar `db/`.
- [ ] Un servicio con dependencia externa la recibe inyectada y el test le pasa un falso (unit) o la base real (integración).
- [ ] Un test de integración crea sus usuarios, filtra por ellos, los borra y cierra su cliente.
- [ ] Si probás un error, seguiste [`errors/TEST.md`](errors/TEST.md); si probás un schema, [`schemas/TEST.md`](schemas/TEST.md).
