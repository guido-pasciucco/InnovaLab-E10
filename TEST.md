# TEST.md — Convenciones de testing del repo

Reglas compartidas para escribir y mantener tests en todo el repo. Leé esta guía antes de crear o cambiar un test; después leé la guía específica del directorio que tocás.

## Dónde está cada guía

| Guía | Contenido |
| --- | --- |
| [`TEST.md`](TEST.md) | Esta guía: taxonomía, nombres, estructura, mocks, datos y recursos |
| [`lib/TEST.md`](lib/TEST.md) | Tests de `lib/`: dominio puro, servicios (unit vs integración), módulos de infraestructura |
| [`lib/errors/TEST.md`](lib/errors/TEST.md) | Camino del error: códigos de `AppError`, catálogo y adaptadores |
| [`lib/schemas/TEST.md`](lib/schemas/TEST.md) | Contratos Zod: la regla se testea en el formulario; en la base, el cableado y los campos del servidor |
| [`README.md`](README.md#tests-end-to-end-playwright--supabase-local) | E2E con Playwright + Supabase local: prerrequisitos y comandos |

## Taxonomía de tests

| Tipo | Dónde vive | Qué toca |
| --- | --- | --- |
| **Unit** | `<modulo>.test.ts`, co-localizado junto al módulo | Sin red ni base. Solo se mockean los bordes externos |
| **Integración** | `<modulo>.int.test.ts`, co-localizado junto al módulo | Supabase/Postgres local real (`bun run e2e:up` + `.env.test`) |
| **E2E** | `tests/e2e/<feature>/<flujo>.spec.ts` | La app construida, el navegador y Supabase local |

- Los tests unit e integración van **co-localizados**, nunca en una carpeta aparte.
- Los componentes de React no se unit-testean: las reglas se testean en `lib/`; la UI, en E2E.
- Los specs de Playwright nunca corren bajo Vitest, y Vitest nunca corre specs de Playwright.
- Un test que prueba la base sin navegador (políticas, RLS, consultas) es de integración, no E2E.
- Un test de integración que no pertenece a un módulo sino a las políticas de la base (RLS) vive en `lib/db/` como `*.int.test.ts` (p. ej. `lib/db/rls.int.test.ts`).

## Nombres

| Elemento | Regla | Ejemplo |
| --- | --- | --- |
| Archivo | Sufijo de su tipo: `.test.ts`, `.int.test.ts` o `.spec.ts` | `price.test.ts` al lado de `price.ts` |
| `describe` | Nombre **exacto** de la unidad bajo test: la función, o `MÉTODO /ruta` | `saveDraftService`, `GET /auth/confirm` |
| `it` / `test` | Comportamiento en presente, en inglés, sin "should": `<resultado> when <escenario>` | `throws AUTH_INVALID_CREDENTIALS when the provider rejects the credentials` |

Cada título responde las tres partes (Goldberg): **qué unidad** (el `describe`), **en qué escenario** y **qué resultado se espera** (el `it`).

| Bien | Mal | Por qué |
| --- | --- | --- |
| `describe("loginService")` | `describe("login service: happy path")` | El `describe` es el nombre de la unidad, sin etiquetas en prosa ni prefijos `X: ` |
| `describe("toAppError")` | `describe("error conversion")` | Nombrá la unidad, no el tema |
| `it("does not block the request when the provider throws")` | `it("should handle errors")` | Sin "should"; dice el resultado y el escenario |
| `it("user B cannot read or overwrite user A's draft")` | `it("works with two users")` | El resultado esperado tiene que poder fallar de forma concreta |

- **Un solo nivel** de anidación de `describe`. Si necesitás otro nivel, el escenario va en el título del `it`.
- **E2E:** los títulos pueden ser historias de usuario (`a confirmed user logs in and gets a session`).
- Los **datos** de prueba del dominio pueden estar en español (`"Velas de cera"`); los **títulos**, nunca.

## Estructura de un test

1. **Arrange / Act / Assert** separados por una línea en blanco.
2. **Un comportamiento por test.** Si el título necesita un "and", probablemente son dos tests.
3. **Sin estado mutable compartido entre tests.** Lo que un test necesita, lo crea él (o un `beforeEach` que lo recrea). Nada de datos creados en `beforeAll` y compartidos por varios tests.
4. **Determinismo.** Nada de reloj ni ids reales en las aserciones: usá `vi.useFakeTimers()` / `vi.setSystemTime()` para el tiempo e inyectá los ids. Para tablas de valores, `it.each`.

```ts
it("returns the unit cost when the volume is positive", () => {
  const input = { ...validSetup, volume: 10 };

  const result = unitCost(input);

  expect(result).toBe(150);
});
```

## Qué se mockea

| Se mockea | No se mockea |
| --- | --- |
| Bordes externos: el cliente de Supabase (inyectado o con `vi.mock`), `@supabase/ssr`, la red | Lo que es nuestro en un test de integración (servicios, schemas, `lib/db`) |
| Variables de entorno, con `vi.stubEnv` (y `vi.unstubAllEnvs()` al terminar) | La base de datos en un test de integración: siempre es Postgres real |
| Módulos de Next/infra en unit | Las reglas de Zod: se testean de verdad |

- Preferí **inyectar** la dependencia (el servicio recibe `client` o `db`) antes que `vi.mock`.
- Si mockeás `console`, hacelo con `vi.spyOn(console, "error").mockImplementation(...)` y restaurá.

## Datos y aislamiento

- Cada test **crea sus propios datos** con factories y valores únicos (por ejemplo, email con sufijo UUID).
- Nunca asumas tablas vacías: consultá **solo lo que creaste** (filtrá por el `id` del usuario del test).
- La limpieza borra los usuarios creados y deja que las FK en cascada borren el resto.
- La limpieza **intenta borrar todo** aunque una baja falle, y reporta los fallos juntos al final:

```ts
afterEach(async () => {
  const results = await Promise.allSettled(created.map((user) => deleteUser(user.id)));
  created.length = 0;
  const failures = results.filter((r) => r.status === "rejected");
  if (failures.length > 0) throw new AggregateError(failures.map((f) => f.reason), "cleanup failed");
});
```

- El aislamiento contra Supabase es por **datos únicos**, no por rollback de transacción: el cliente y GoTrue abren sus propias conexiones.
- La `SUPABASE_SECRET_KEY` vive solo en el proceso de tests, y el helper de entorno **se niega a correr** si alguna URL de `.env.test` no es local.
- Factories y helpers compartidos por varios tipos de test viven en `tests/support/`, no dentro de `tests/e2e/`: un test de `lib/` nunca importa desde `tests/e2e/`. En `tests/support/` no hay archivos `*.test.ts`.
- Alcance del código compartido: `tests/support/` lo usan integración y E2E; `tests/e2e/helpers/` es solo de E2E (Playwright, Mailpit, login por la puerta de atrás).

## Recursos

- Los clientes y pools de base se crean **una vez por archivo o worker** y se cierran en `afterAll` (`.end()` del cliente `postgres`).
- Nunca un pool nuevo por test: agota las conexiones de Supabase local y deja sockets abiertos.

## Cómo correr

Node 24 (`package.json` engines): corré `nvm use` antes. Con Node 20, `@supabase/supabase-js` falla al crear el cliente.

```bash
nvm use             # Node 24 (.nvmrc)
bun run test        # Vitest, proyecto unit (*.test.ts): sin red ni base
bun run e2e:up      # levanta Supabase local y aplica migraciones (requisito de integración y E2E)
bun run test:int    # Vitest, proyecto integration (*.int.test.ts): Postgres local, un archivo a la vez
bun run test:e2e    # Playwright: build de la app y specs
bun run e2e:down    # baja el stack (conserva los datos)
```

Lint, typecheck, `bun run test`, `bun run test:int` y E2E se corren **localmente antes de abrir o mergear un PR**.

## Checklist para un test nuevo

- [ ] El archivo está co-localizado y tiene el sufijo de su tipo (`.test.ts`, `.int.test.ts` o `.spec.ts`).
- [ ] El `describe` es el nombre exacto de la unidad; el `it` dice resultado y escenario, en inglés, sin "should".
- [ ] Un comportamiento por test, con Arrange / Act / Assert separados.
- [ ] Solo se mockean bordes externos; en integración, la base es real.
- [ ] Los datos son propios del test (factories, valores únicos) y se limpian aunque una baja falle.
- [ ] Tiempo e ids son deterministas.
- [ ] Ningún pool ni cliente queda abierto.
- [ ] Leíste la guía `TEST.md` del directorio que tocás.

## Fuentes

- Vitest, projects: https://vitest.dev/guide/projects
- Vitest, test context: https://vitest.dev/guide/test-context
- Supabase, testing overview: https://supabase.com/docs/guides/local-development/testing/overview
- Goldberg, JavaScript testing best practices: https://github.com/goldbergyoni/javascript-testing-best-practices
- Node.js integration tests best practices: https://github.com/testjavascript/nodejs-integration-tests-best-practices
- Fowler, The practical test pyramid: https://martinfowler.com/articles/practical-test-pyramid.html
- Playwright, best practices: https://playwright.dev/docs/best-practices
