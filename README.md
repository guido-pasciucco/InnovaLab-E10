# 🧮 InnovaLab E10 — Budget Calculator

MVP de la Fase 1 de una calculadora inteligente para **costos, precios y análisis de punto de equilibrio** (`Costos / Precios / Punto de Equilibrio`).

La Fase 1 es **local-first**: todo el cálculo se ejecuta localmente en el navegador, sin cuenta y sin persistencia en backend (LocalStorage o IndexedDB — decisión aún abierta, ver abajo). Supabase (autenticación + historial) está **desactivado** y llega en la Fase 2.

> [!NOTE]
> Fase 1 sin backend: los cálculos son locales. Supabase llega en la Fase 2 para autenticación e historial.

---

## 1. 🛠️ Tecnologías utilizadas

Stack del proyecto:

| Tecnología | Versión | Propósito |
| --- | --- | --- |
| Next.js | 16.3.5 | Framework fullstack (App Router), despliegue único en Vercel |
| React | 19.2.8 | Renderizado de UI |
| Tailwind CSS | 4 (`@tailwindcss/postcss`) | Estilos mediante el plugin de PostCSS |
| TypeScript | 5, `strict`, `target ES2017`, alias `@/*` | Seguridad de tipos; `@/` apunta a la raíz del repositorio |
| ESLint | 9 + `eslint-config-next` | Linting (reglas de Next.js) |
| `next.config.ts` | stub (vacío) | Reservado para futura configuración de Next.js |
| App Router | solo `app/layout.tsx` + `app/page.tsx` | Estructura base; las rutas del asistente (wizard) y de API se definen en la sección de arquitectura |

Scripts disponibles:

| Script | Comando |
| --- | --- |
| Servidor de desarrollo | `bun run dev` |
| Build de producción | `bun run build` |
| Inicio en producción | `bun run start` |
| Lint | `bun run lint` |

Dependencias clave:

- **`decimal.js`:** aritmética decimal con precisión y redondeo configurables para los cálculos monetarios de `lib/money` y `lib/calc`.
- **`server-only`:** marca módulos exclusivos del servidor; Next.js detecta como error su importación desde componentes de cliente.

---

## 2. 🏛️ Arquitectura a seguir

Estas decisiones corresponden al acuerdo de equipo. Resumen a continuación.

### Despliegue

- **Monorepo fullstack con Next.js, un solo despliegue en Vercel.** No existe un repositorio de backend separado ni un despliegue de backend independiente.
- **App Router no es un backend.** Hoy no hay Route Handlers: el navegador habla con el servidor solo mediante Server Actions. Si se agregan (`app/api/*`), son bordes HTTP delgados (parsear/validar/delegar), no una capa de servicios.

### Estilo de software

- **Clean pragmático / Hexagonal lite, sin capa de aplicación en el MVP.**
- Dirección de dependencias (una sola dirección):

```text
app -> components -> lib/calc
```

- `lib/calc`, `lib/money`, `lib/schemas`: dominio puro y universal. Sin APIs exclusivas del servidor, sin APIs exclusivas del navegador, sin I/O.
- La infraestructura (p. ej. `lib/db.ts`) es **solo de servidor** (import `server-only`) y nunca se importa desde componentes de cliente.

### División por fases

- **Fase 1 (actual, MVP):** local-first. Persistencia en LocalStorage o IndexedDB. Supabase está desactivado.
- **Fase 2:** autenticación + historial con Supabase. Las mutaciones de formularios pasan a Server Actions; las lecturas siguen siendo directas (ver contratos).

### Estructura objetivo (construir hacia esto, no inventar árboles paralelos)

```text
app/
  (wizard)/
    paso-1/
    paso-2/
    resultados/
  login/
    actions.ts     # Server Action del login (colocada por feature; ídem signup, reset-password, ...)
middleware.ts      # refresh de sesión Supabase en cada request (no bloquea; ver lib/supabase/middleware)
components/
  wizard/
  charts/        # client-only, see below
  ui/
lib/
  calc/          # pure domain math (costs, pricing, break-even)
  money/         # pure money formatting / rounding
  schemas/       # THE single Zod source of truth
  services/      # lógica de negocio del servidor (transport-agnostic), usada por las Server Actions
  supabase/      # clientes Supabase por runtime (middleware, rsc) — server-only
  types/         # tipos compartidos (p. ej. FormState)
  store/         # Phase 1 local-first persistence (LocalStorage vs IndexedDB TBD)
  db.ts          # server-only, Phase 2 (never imported from client)
tests/
  unit/          # Vitest (domain: calc, money, schemas)
  e2e/           # Playwright (wizard flow)
```

### Contratos (vinculantes)

1. **Fuente única con Zod.** Todos los esquemas de validación viven en `lib/schemas`. React Hook Form (cliente), los Route Handlers y las Server Actions (servidor) los consumen. **Parsear en el borde**: la validación del servidor vive una sola vez en el servicio de `lib/services` (cubre ambas puertas); cada puerta le pasa la entrada cruda.
2. **Regla fetch-vs-import:**
   - Lógica pura (`lib/calc`, `lib/money`, `lib/schemas`) y servicios (`lib/services`) → `import` directo. Sin HTTP involucrado.
   - Componente de cliente → API (`app/api/*`, si existiera) → **solo mediante `fetch`**. Nunca importar `route.ts`.
   - Mutaciones de formularios propios → Server Actions (se importan, no se hace `fetch`). Las actions **no** hacen `fetch` a las propias rutas: llaman al servicio de `lib/` directo.
   - Los Server Components leen la persistencia directamente mediante `lib/db`, nunca con `fetch` interno a su propia API.
   - Consumidores externos (app nativa, webhooks, terceros) → Route Handlers (contrato HTTP estable). Hoy no hay ninguno; ver [API HTTP de auth](docs/examples/http-auth-api.md) para cómo agregarlos. Una PWA no los necesita.
3. **El dominio se mantiene universal.** Nada en `lib/calc`, `lib/money`, `lib/schemas` puede usar APIs de servidor de Node/Next ni `window`/`localStorage`.
4. **La infraestructura permanece en el servidor.** `lib/db.ts` (y todo lo que toque secretos o Supabase) importa `server-only`.
5. **Los gráficos son solo de cliente.** Cada componente de gráficos usa `'use client'` más `dynamic(..., { ssr: false })`.

> [!IMPORTANT]
> La validación en el cliente es UX, nunca seguridad: todo formulario validado en el cliente debe revalidarse con el mismo esquema Zod en el servidor.

### Dónde va cada cosa

| Responsabilidad | Ubicación |
| --- | --- |
| Páginas del asistente (wizard) | `app/(wizard)/paso-1`, `paso-2`, `resultados` |
| Borde HTTP (adaptar + delegar, sin lógica) | `app/api/*` — hoy no existe; solo para consumidores externos (ver [API HTTP de auth](docs/examples/http-auth-api.md)) |
| Server Actions de formularios propios | `app/<feature>/actions.ts` (colocadas por feature) |
| Lógica de negocio del servidor | `lib/services` (server-only; recibe valores, devuelve datos planos) |
| Clientes Supabase por runtime | `lib/supabase` (server-only) |
| Tipos compartidos | `lib/types` (p. ej. `FormState`) |
| UI del asistente, gráficos, primitivas | `components/wizard`, `components/charts`, `components/ui` |
| Matemática pura / dinero / esquemas | `lib/calc`, `lib/money`, `lib/schemas` |
| Persistencia local-first (Fase 1) | `lib/store` |
| Persistencia en servidor (Fase 2) | `lib/db.ts` (server-only) |
| Pruebas unitarias / e2e | `tests/unit` (Vitest), `tests/e2e` (Playwright) |

### Prohibido

- **Secretos en código de cliente.** Sin claves de servicio, sin service role de Supabase, sin variables de entorno privadas en ningún componente de cliente ni en nada que estos importen.
- **Validación solo en el cliente.** Todo formulario validado en el cliente debe revalidarse con el mismo esquema Zod en el Route Handler / Server Action. La validación del cliente es UX, nunca seguridad.
- **Importar `route.ts`.** Los Route Handlers se alcanzan por HTTP (`fetch`) desde el cliente, nunca con `import`.
- **Llamar a la propia API con `fetch` desde el servidor.** Server Components y Server Actions llaman a `lib/` directo, nunca a sus propias rutas (vuelta HTTP de más).
- **I/O o APIs de plataforma en código de dominio.** `lib/calc`, `lib/money`, `lib/schemas` se mantienen puros y universales.
- **Lógica de negocio dentro de Route Handlers o actions.** Va en `lib/services` (acuerdo de equipo vigente: capa `services/` aprobada para lógica compartida entre actions y routes).

### Preguntas abiertas (sin decidir, no asumir)

1. Zustand: ¿sí o no para el estado del asistente (wizard)?
2. Proceso de cambios de esquemas: ¿cómo se proponen y migran los cambios en `lib/schemas`?
3. LocalStorage vs IndexedDB para la persistencia de la Fase 1.

---

## 3. 🗺️ Próximos pasos

1. **Base del dominio** — `lib/schemas` (Zod, fuente única), `lib/calc` (costos/precios/punto de equilibrio), `lib/money`, más pruebas unitarias con Vitest.
2. **Pasos del asistente** — `app/(wizard)/paso-1` y `paso-2` con RHF vinculado a `lib/schemas`, `components/wizard` + `components/ui`.
3. **Vista de resultados** — `app/(wizard)/resultados`, gráficos solo de cliente (`components/charts`, `'use client'` + `dynamic ssr:false`).
4. **Borde del servidor** — Server Actions delgadas de validar-y-delegar (a `lib/services`) para lo que necesite servidor. Sin Route Handlers mientras no haya un consumidor externo.
5. **Persistencia local-first** — `lib/store` (resolver LocalStorage vs IndexedDB) conectada al asistente.
6. **Cobertura E2E** — flujo con Playwright sobre el asistente en `tests/e2e`.
7. **Pulido + despliegue** — lint/build limpios, despliegue único en Vercel verificado.
8. **Fase 2 (fuera del alcance del MVP)** — autenticación + historial con Supabase, `lib/db.ts` solo de servidor, mutaciones de formularios mediante Server Actions.

---

## 4. 🚀 Primeros pasos

Prerrequisitos: [Bun](https://bun.sh) 1.4.2+ (gestor de paquetes) y Node.js 24 LTS (runtime). La versión de Bun está fijada en `package.json` (`packageManager`) y la de Node en `.nvmrc` (con [nvm](https://github.com/nvm-sh/nvm): `nvm install && nvm use`).

```bash
bun install
bun run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

Otros comandos:

```bash
bun run build   # production build (must pass before merging)
bun run start   # serve the production build
bun run lint    # ESLint with eslint-config-next
bunx tsc --noEmit  # type check
```

> [!NOTE]
> Este proyecto usa **Bun como gestor de paquetes** (`bun.lock` es la única fuente de verdad; no usar `npm install`). El bundler sigue siendo Turbopack (default de Next.js 16) y el runtime sigue siendo Node.js.

> [!NOTE]
> No incluir secretos en los commits. La Fase 1 no necesita variables de entorno; la Fase 2 (Supabase) documentará sus propias variables solo de servidor.

### Tests end-to-end (Playwright + Supabase local)

Los tests E2E corren contra un Supabase local en Docker (con Mailpit para capturar los mails de auth), nunca contra el proyecto de Supabase en la nube.

> [!NOTE]
> No hay CI configurado por ahora: lint, typecheck, tests unitarios y E2E se corren localmente antes de abrir o mergear un PR. Las referencias a `CI` en `playwright.config.ts` quedan inactivas hasta que exista un pipeline.

Prerrequisitos, una vez por máquina:

1. Docker instalado y corriendo. En Linux, tu usuario tiene que estar en el grupo `docker` (`sudo usermod -aG docker $USER` y volver a iniciar sesión).
2. El navegador de Playwright. `bun install` instala el paquete, pero no el navegador:

   ```bash
   bun run e2e:setup
   ```

3. Copiar `.env.test.example` a `.env.test` y completar las keys `Publishable` y `Secret` que muestra `bunx supabase status`. La `Secret` solo la usa el proceso de tests (factories y fixtures); nunca llega a la app.

Cada vez que quieras correrlos:

```bash
bun run e2e:up      # starts local Supabase and applies drizzle migrations
bun run test:e2e    # builds the app and runs the specs on port 3100
bun run e2e:down    # stops the local stack (keeps the db data)
```

Si la base queda con datos basura: `bun run db:reset:local` (la vacía y vuelve a migrar).

> [!TIP]
> Si Chromium no arranca por librerías del sistema faltantes (típico en WSL o Linux mínimo, error del estilo `error while loading shared libraries`), instalalas con `bunx playwright install --with-deps chromium` (pide `sudo`). En macOS y Windows nunca hace falta. Cuando se actualiza `@playwright/test`, volver a correr `bun run e2e:setup`.

#### Imágenes y contenedores de Supabase local

No hay `docker-compose.yml` en el repo: el CLI de Supabase (`supabase`, devDependency) es el que descarga las imágenes y crea los contenedores, según `supabase/config.toml`. No hace falta correr `docker pull` ni `docker run` a mano.

`bun run e2e:up` hace dos cosas: `supabase:start` (levantar el stack) y `db:migrate:local` (aplicar las migraciones de `drizzle/`). Migrar es idempotente: si no hay migraciones nuevas, no hace nada, así que se puede correr siempre.

- **Primera vez:** descarga las imágenes (~1–1.5 GB, tarda unos minutos), crea los contenedores y un volumen para los datos de Postgres, y aplica todas las migraciones.
- **Las veces siguientes:** las imágenes ya están, arranca en segundos y la base conserva los datos; solo se aplican las migraciones nuevas, si las hay.

El script levanta solo lo que usan los tests y excluye el resto con `-x` (studio, realtime, storage, edge-runtime, etc.). Quedan 5 contenedores, llamados `supabase_<servicio>_innovalab-e10`:

| Contenedor | Servicio | Puerto local |
| --- | --- | --- |
| `supabase_db_innovalab-e10` | Postgres (tablas de la app y schema `auth`) | `54322` |
| `supabase_kong_innovalab-e10` | API gateway: la URL única de Supabase | `54321` |
| `supabase_auth_innovalab-e10` | GoTrue: signup, login, reset, mails | detrás de kong (`/auth/v1`) |
| `supabase_rest_innovalab-e10` | PostgREST: las tablas como API REST | detrás de kong (`/rest/v1`) |
| `supabase_inbucket_innovalab-e10` | Mailpit: atrapa los mails de auth | `54324` (UI web) |

Comandos útiles:

```bash
bunx supabase status                  # URLs, ports and keys of the running stack
docker ps --filter name=innovalab-e10  # the project's containers
bun run supabase:stop                 # stops the containers, KEEPS the db data
bunx supabase stop --no-backup        # stops them and DELETES the db volume
bun run db:reset:local                # empties the db and re-applies drizzle migrations
```

> [!NOTE]
> Conectarse a la base con un cliente (DBeaver, TablePlus, etc.): host `127.0.0.1`, puerto **`54322`**, usuario `postgres`, password `postgres`, base `postgres`, sin SSL. Son credenciales por defecto del stack local, no secretos.

> [!WARNING]
> Los servicios escuchan en `0.0.0.0`: cualquiera en tu misma red puede conectarse con esas credenciales. Bajá el stack con `bun run supabase:stop` cuando no lo uses.

Estructura de `tests/e2e/` (principio: preparar por la puerta de atrás, actuar por la de adelante; cada flujo se recorre por la UI solo en su propio spec):

```text
tests/e2e/
  fixtures/index.ts   # `test` y `expect`; todos los specs importan de acá
  factories/          # crean y borran datos vía Admin API (p. ej. user.ts)
  pages/              # Page Objects: los selectores viven solo acá
  helpers/            # env, Mailpit y clientes de Supabase
  <feature>/          # specs agrupados por feature (p. ej. auth/)
  global-setup.ts
```

- Los specs piden precondiciones como fixtures: `user` (usuario confirmado que se borra al terminar el test) y `authedPage` (la `page` ya logueada como `user`). Si un spec crea datos por la UI, los registra en `cleanup` para que se borren igual.
- Para agregar una entidad nueva: sumar una factory en `factories/` (crear y borrar) y un fixture en `fixtures/index.ts` que la cree antes del test y la borre en el teardown.

Notas:

- Hasta que se resuelvan las preguntas abiertas anteriores, mantener el estado del asistente (wizard) local al asistente y la persistencia detrás de la frontera de `lib/store` para que la elección siga siendo intercambiable.
