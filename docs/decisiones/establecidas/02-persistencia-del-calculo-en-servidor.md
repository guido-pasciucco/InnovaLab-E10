# 02 — La persistencia del cálculo es solo servidor

| Campo | Valor |
| --- | --- |
| **Estado** | ✅ Aceptada |
| **Fecha** | 2026-10-04 |
| **Relacionado** | #90 · #69 · #75 · #91 · #33 · #34 · #63 · `README.md` · `lib/AGENTS.md` · `lib/db/AGENTS.md` |

## Contexto

El repo se contradecía sobre dónde vive el borrador del cálculo:

- `README.md:5` y `README.md:89` decían que el cálculo de la Fase 1 era **local-first**, con el estado en `lib/store` (LocalStorage o IndexedDB, sin resolver) y sin persistencia en servidor. `docs/producto/01-calculadora-inteligente.md:167` repetía "LocalStorage / IndexedDB" como persistencia del MVP.
- `README.md:91` y la pregunta abierta nº 2 (`README.md:184`) reconocían que la definición conceptual del proyecto ya había dado por decidida la "persistencia mediante cuenta de usuario" (`docs/producto/definicion-conceptual-calculadora-costos-emprendedores.md:369`) y que esa contradicción seguía abierta.

Mientras tanto, la persistencia en servidor ya existía:

- Tablas en `lib/db/{profile,business,calculation,costs}/table.ts`, entre ellas `calculations` (con `status`, por defecto `'draft'`), `products`, `costing_setup` y `calc_cost_lines`.
- Migraciones versionadas en `drizzle/`, con RLS por propietario en `drizzle/20260928101613_enable_rls.sql`.
- Un cliente de ejecución, `getDb()` en `lib/db/client.ts`, que se conecta por `DATABASE_URL`.
- Autenticación con Supabase funcionando y un guard de sesión, `requireUser()` en `lib/auth/require-user.ts`.

Los tickets de H1 (#69) y H2 (#75) se habían escrito sobre la premisa local-first (clave `calc:wizard:v1`, `lineKey`, Provider con `hasHydrated`). El dueño del producto decidió que la persistencia del cálculo es solo servidor. Este documento registra esa decisión y lo que deja cerrado; no la vuelve a discutir.

## Opciones

### A. Solo servidor (elegida)

El borrador se guarda en las tablas existentes, con sesión obligatoria. El cliente no guarda el cálculo.

### B. Local-first con `localStorage`

El borrador vive en el navegador y no se guarda en la base. Descartada:

- Contradice la definición conceptual del producto ("persistencia mediante cuenta de usuario").
- El borrador se pierde al cambiar de navegador o de dispositivo, o al borrar los datos del sitio.
- Exige resolver la hidratación en el cliente (`hasHydrated`, Provider en `app/(calculator)/layout.tsx`) para un estado que después habría que migrar a la base igual.
- Deja sin uso las tablas, migraciones y políticas RLS que ya existen.

### C. Híbrido: borrador local con sincronización al servidor

El borrador se edita en el navegador y se sincroniza con la base. Descartada:

- Suma lo peor de A y B: hidratación en el cliente **y** escritura en servidor.
- Obliga a resolver conflictos entre la copia local y la del servidor, e identidades de fila temporales (`lineKey`) que después hay que reconciliar con el `id` de la base.
- Es la opción más cara de construir y de testear, y el MVP no necesita trabajar sin conexión.

## Decisión

Opción A, con estas nueve reglas:

1. **Persistencia solo servidor.** Nada de borrador en `localStorage`, nada de híbrido, nada de IndexedDB. El borrador vive en las tablas existentes (`calculations`, `products`, `costing_setup`, `calc_cost_lines`).
2. **La calculadora requiere sesión.** Toda página de `app/(calculator)/` llama a `requireUser()` (`lib/auth/require-user.ts`). El id de usuario sale **siempre de la sesión** (`requireUser()` / `getSessionUserService`), **nunca** del input del cliente. Los servicios reciben `userId` como parámetro.
3. **Se guarda al "Confirmar" de cada paso**, no en cada tecla. El feedback rápido se da con `useActionState` (pendiente → "Guardando…", ok → "Guardado") y con `useOptimistic` para editar y eliminar filas de costo.
4. **Un borrador por usuario** (`calculations.status = 'draft'`). H1 deja fuera "varias fichas". Como `calculations` exige `business_id` y `product_id`, cada usuario tiene un **negocio implícito por defecto**, creado en el primer guardado.
5. **El catálogo reutilizable `business_cost_lines` sigue fuera de alcance.** Por eso `calc_cost_lines.source_business_cost_id` tiene que pasar a ser anulable (migración en H0.2, #91).
6. **La identidad de una fila es su `id` de la base (uuid).** `lineKey` y `createCostLineKey()` desaparecen. La regla 6 de `lib/AGENTS.md` ("`id`, dueño y timestamps los pone el servidor") vuelve a valer sin excepciones.
7. **Los servicios filtran por dueño.** Cada consulta de servicio filtra por el `userId` de la sesión, directo o vía `calculations.user_id`. RLS queda como segunda red, no como la única (ver "Rol de `DATABASE_URL` y RLS").
8. **Plata como string decimal.** Los importes viajan y se guardan como string decimal (`numeric(12,2)`, `moneyString` en `lib/db/formats.ts`). La conversión a `decimal.js` se hace en el borde (regla 3 de `lib/AGENTS.md`). Nunca `Number`.
9. **Reparto de roles, calcado del flujo de auth:**

   | Pieza | Dónde | Dueño |
   | --- | --- | --- |
   | Servicio (valida con Zod, filtra por dueño, lanza `AppError`) | `lib/services/<dominio>.ts` (molde: `lib/services/auth.ts`) | BACKEND |
   | Tipo del estado del form (`ServiceResult<...> \| undefined`) | `lib/types/<dominio>.ts` (molde: `lib/types/auth.ts`) | BACKEND |
   | Códigos `CALC_*` | `lib/errors/catalog.ts` | BACKEND |
   | Schemas, tablas, migraciones | `lib/schemas/`, `lib/db/`, `drizzle/` | BACKEND |
   | Server Action (`"use server"` + `handleActionErrors` que llama al servicio) | `app/(calculator)/<ruta>/actions.ts` (molde: `app/login/actions.ts`) | FRONTEND |
   | Página (Server Component con `requireUser()` que lee por servicio) | `app/(calculator)/<ruta>/page.tsx` | FRONTEND |
   | Formulario (`useActionState` + `useServerFieldErrors`) | `components/calculator/*` (molde: `app/login/login-form.tsx`) | FRONTEND |

   Frontend **no importa `lib/db`** (`lib/db/AGENTS.md`). Los servicios obtienen la base con `getDb()` por dentro, como parámetro `db` con valor por defecto, para poder testearlos.

## Rol de `DATABASE_URL` y RLS

RLS solo filtra filas cuando la conexión usa un rol sujeto a las políticas. Las políticas de `drizzle/20260928101613_enable_rls.sql` están declaradas `TO authenticated` y comparan contra `auth.uid()`.

- **Verificado en local.** `.env.test.example` usa `postgresql://postgres:postgres@127.0.0.1:54322/postgres`, o sea el rol `postgres`. En el stack local de Supabase ese rol tiene el atributo `BYPASSRLS` y es dueño de todas las tablas de `public` (consultado en `pg_roles` y `pg_tables`), y ninguna tabla tiene `FORCE ROW LEVEL SECURITY`. Las consultas de Drizzle en local nunca pasan por RLS.
- **Producción.** `.env.example` usa el usuario del pooler `postgres.<project-ref>`, que según la documentación de Supabase corresponde al mismo rol `postgres`: dueño de las tablas (las migraciones corren con `DIRECT_URL` y ese usuario) y con `BYPASSRLS`. Mientras no se configure un rol restringido, RLS no aplica a las consultas de Drizzle. Esto no se verificó contra el proyecto en la nube.

Consecuencia: un servicio que omite el filtro por `userId` le muestra a un usuario los datos de otro. El filtro por dueño es regla del servicio (punto 7). RLS sigue siendo la protección del cliente de Supabase que usa las claves `anon` / `authenticated` (PostgREST).

## Estrategia de tests de los servicios con base

**Tests de integración contra la base local de Supabase**, con `db` inyectado por parámetro:

- `bun run e2e:up` ya levanta el stack (`supabase:start`) y aplica las migraciones de `drizzle/` (`db:migrate:local`), así que no hace falta infraestructura nueva.
- El servicio recibe `db: Db = getDb()`. El test le pasa una conexión a la base local y prueba lo que importa en este tipo de código: el filtro por dueño, las restricciones de las tablas, las cascadas y el formato de `numeric`.
- Se descarta un doble de la base (mock de Drizzle): no prueba ni el SQL ni las restricciones, que son justamente donde están los riesgos (un `where` faltante, una FK, un `numeric` mal redondeado).

Las reglas puras (schemas, cálculo) siguen con tests unitarios sin base.

## Destino de #33, #34 y #63

`README.md:184` ataba estos tickets a la pregunta de la persistencia. Este documento no los cierra; deja escrito qué pasa con cada uno.

| Ticket | Qué pedía | Qué pasa |
| --- | --- | --- |
| #33 | Si se usa API, crear el modelo de cálculo/borrador y endpoints para crear, consultar y actualizar | **Superado.** La condición se cumple (hay persistencia en servidor), pero sin endpoints: el navegador habla con Server Actions, y no hay Route Handlers mientras no exista un consumidor externo. El modelo ya existe en `lib/db/`; los servicios son #70 (setup), #77 (alta y listado de costos) y #80 (edición y baja), y la migración pendiente es #91. Puede cerrarse como superado por esos tickets. |
| #34 | Validaciones de esquema equivalentes a las del frontend | **Superado.** La equivalencia ya es una convención: reglas compartidas en `lib/schemas/<contrato>/fields.ts` ([ADR 01](01-reglas-de-campo-compartidas.md)) y validación con Zod una sola vez en cada servicio (#70, #77, #80, con el schema de #76). Puede cerrarse como superado por esos tickets. |
| #63 | Tipos y contrato base del borrador, `validateDraftBase` sin auth, y un ADR "el cálculo vive en el cliente en esta fase" | **Superado y contradicho.** El ADR que pedía queda reemplazado por este, con la decisión opuesta. El resto choca con los puntos 1, 2 y 9: el borrador requiere sesión y la validación vive en el servicio, no en una función suelta sin auth. Los contratos ya existen o están en curso (`lib/schemas/calculator-setup/`, #76). Puede cerrarse como superado. |

## Consecuencias

- **Tickets reescritos** sobre la persistencia en servidor: #70, #71, #76, #77, #78, #80 y #81.
- **Tickets cerrados por superados:** #79 y #82.
- **Migración H0.2 (#91):** `calc_cost_lines.source_business_cost_id` pasa a anulable, se define cómo se guarda la categoría del costo y se decide la regla de cascada (`source_business_cost_id`, `scenario_id`).
- **Riesgo conocido para #91:** `categoryToAxes` (PR #83) mapea `variable` y `own_labor` a los mismos ejes (`behavior: "variable"`, `traceability: "direct"`). La traducción pierde información: al leer la fila no se puede saber cuál de las dos categorías eligió el usuario. Cómo se guarda la categoría lo decide #91.
- **Queda sin objeto:**
  - `lib/store/` como capa de persistencia del cálculo. Si vuelve a hacer falta estado de cliente, es estado de interfaz, no persistencia.
  - La pregunta Context vs `zustand` para H1 y H2. Se reabre solo si aparece una necesidad real de estado global de cliente.
  - LocalStorage vs IndexedDB.
- **Lo que sigue para más adelante** es el **historial** de cálculos y **varios borradores** por usuario, no la persistencia. El "retomar el proyecto otro día (Semana 6)" de #69 queda cubierto por esta decisión.
- **Tests de integración:** hoy `bun run test` corre `vitest run` con un solo proyecto `environment: "node"`, sin `DATABASE_URL` cargado y sin depender de Docker. El primer servicio con base va a necesitar un proyecto o script de Vitest separado (por ejemplo, `test:integration`) que cargue la URL de la base local y requiera `bun run e2e:up`, para que `bun run test` siga corriendo sin el stack levantado. Queda para el primer ticket de servicio (#70).
- **Documentación actualizada en el mismo cambio:** `README.md`, `lib/AGENTS.md` y `lib/db/AGENTS.md` dejan de presentar la persistencia local como plan vigente y `lib/db/` deja de figurar como spike.
