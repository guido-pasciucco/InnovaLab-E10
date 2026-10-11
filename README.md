# 🧮 InnovaLab E10 — Budget Calculator

MVP de la Fase 1 de una calculadora inteligente para **costos, precios y análisis de punto de equilibrio** (`Costos / Precios / Punto de Equilibrio`).

El **borrador del cálculo** de la Fase 1 se persiste **solo en el servidor**, con sesión obligatoria: vive en las tablas de `lib/db` y se guarda al confirmar cada paso. Ver [ADR 02](docs/decisiones/establecidas/02-persistencia-del-calculo-en-servidor.md).

Lo que **ya está en marcha** y no es parte de la Fase 1 pendiente:

- **Autenticación con Supabase funcionando**: login, signup, recuperación y actualización de contraseña, confirmación de email y dashboard. Es el andamiaje de la plataforma, no la parte de historial que se había planeado para la Fase 2.
- **Base de datos con Drizzle**: `drizzle.config.ts`, 4 migraciones aplicadas (RLS con políticas de propietario, FK de `profiles`, trigger de creación de perfil) y stack local de Supabase para los tests.

> [!IMPORTANT]
> Este README describía la Fase 1 como "sin backend" y el cálculo como "local-first". Ya no es cierto: la autenticación con Supabase está implementada, la base tiene migraciones aplicadas y el borrador del cálculo se guarda en servidor ([ADR 02](docs/decisiones/establecidas/02-persistencia-del-calculo-en-servidor.md)). Lo que la Fase 1 tiene que entregar es **el cálculo** sobre esa base.

## 📂 Guías por directorio

Cada sección del código tiene su propia guía en un `AGENTS.md`, para que tanto las personas como los agentes de IA la encuentren al explorar el directorio. Cada guía indica qué rol (Frontend / Backend) toca ese directorio y qué reglas aplican.

| Guía | Contenido | Dueño |
| --- | --- | --- |
| [`lib/AGENTS.md`](lib/AGENTS.md) | Mapa de los módulos de dominio, frontera Frontend/Backend, reglas y checklist de cambios en `lib/` | Backend (Frontend consume) |
| [`lib/errors/AGENTS.md`](lib/errors/AGENTS.md) | Manejo centralizado de errores: catálogo, `AppError`, adaptadores de rutas y actions, convención de códigos | Backend (Frontend consume) |
| [`lib/db/AGENTS.md`](lib/db/AGENTS.md) | Persistencia en servidor con Drizzle: reglas de esquema, migraciones y flujo de escritura | Backend |

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
| App Router | rutas de auth (`login`, `signup`, `reset-password`, `update-password`, `dashboard`, `profile`) + assistant (calculator) | Auth completo con Server Actions; el asistente (`paso-1`, `paso-2`, `resultados`) está en stub |

Scripts disponibles:

| Script | Comando |
| --- | --- |
| Servidor de desarrollo | `bun run dev` |
| Build de producción | `bun run build` |
| Inicio en producción | `bun run start` |
| Lint | `bun run lint` |
| Tests unitarios | `bun run test` (convenciones en [`TEST.md`](TEST.md)) |
| Typecheck | `bunx tsc --noEmit` |
| E2E (Supabase local) | `bun run e2e:up` · `bun run test:e2e` · `bun run e2e:down` |

Dependencias clave:

- **`decimal.js`:** aritmética decimal con precisión y redondeo configurables para los cálculos monetarios de `lib/money` y `lib/calc`.
- **`server-only`:** marca módulos exclusivos del servidor; Next.js detecta como error su importación desde componentes de cliente.
- **`zod` + `react-hook-form`:** validación como fuente única; RHF para los formularios.
- **`@supabase/ssr` + Supabase Auth:** sesión, login, signup y recuperación de contraseña. Ver `lib/supabase/`.
- **`drizzle-orm`:** acceso a la base con tipos. El esquema vive en `lib/db/<dominio>/table.ts` (ver `lib/db/AGENTS.md`).

> [!NOTE]
> La suite de tests corre con `environment: "node"` en `vitest.config.mts`. **No hay `jsdom` ni `@testing-library/*` instalados**, así que los componentes de React no se unit-testean: las reglas se testean en `lib/schemas` y `lib/services`, y la integración se verifica a mano en dev. Agregar esas librerías es un cambio de tooling del repo, no de un ticket de feature.

---

## 2. 🏛️ Arquitectura a seguir

Estas decisiones corresponden al acuerdo de equipo. Resumen a continuación.

### Despliegue

- **Monorepo fullstack con Next.js, un solo despliegue en Vercel.** No existe un repositorio de backend separado ni un despliegue de backend independiente.
- **App Router no es un backend.** Hoy no hay Route Handlers (`app/api/*` no existe): el navegador habla con el servidor mediante Server Actions (`app/<feature>/actions.ts`, una por feature). Si se agregan, son bordes HTTP delgados (parsear/validar/delegar), no una capa de servicios.

### Estilo de software

- **Clean pragmático / Hexagonal lite, sin capa de aplicación en el MVP.**
- Dirección de dependencias (una sola dirección):

```text
app -> components -> lib/calc
```

- `lib/calc`, `lib/money`, `lib/schemas`: dominio puro y universal. Sin APIs exclusivas del servidor, sin APIs exclusivas del navegador, sin I/O.
- La infraestructura (p. ej. `lib/db.ts`) es **solo de servidor** (import `server-only`) y nunca se importa desde componentes de cliente.

### División por fases

- **Fase 1 (actual, MVP):** el **borrador del cálculo** se persiste solo en servidor, con sesión obligatoria (`requireUser()`). Un borrador por usuario (`calculations.status = 'draft'`), guardado al "Confirmar" de cada paso mediante Server Actions que llaman a servicios de `lib/services`. Sin `localStorage`, sin IndexedDB, sin híbrido. Ver [ADR 02](docs/decisiones/establecidas/02-persistencia-del-calculo-en-servidor.md).
- **Ya implementado (andamiaje, no Fase 1 pendiente):** autenticación con Supabase (login, signup, reset, update, confirm, dashboard, profile) con Server Actions, y base de datos con Drizzle, 4 migraciones aplicadas y RLS por propietario. Ese andamiaje sostiene la plataforma y la auth; lo que la Fase 1 tiene que agregar es el cálculo.
- **Más adelante:** historial de cálculos y varios borradores por usuario. La persistencia con cuenta de usuario ya no es Fase 2: la contradicción con el "local-first" del README original quedó resuelta en el [ADR 02](docs/decisiones/establecidas/02-persistencia-del-calculo-en-servidor.md).

### Estado real del asistente

El recorrido guiado está en stub. Lo que existe:

```text
app/(calculator)/paso-1/page.tsx      4 líneas: "Step 1 — TODO"
app/(calculator)/paso-2/page.tsx      stub
app/(calculator)/resultados/page.tsx  stub
lib/calc/  lib/money/  lib/store/  solo .gitkeep
lib/schemas/                        auth/, calculator-setup/
```

**`app/(calculator)/layout.tsx` no existe todavía.** Con la persistencia en servidor no hace falta para conservar el borrador entre pasos: cada página lo lee por servicio después de `requireUser()`.

### Estructura objetivo (construir hacia esto, no inventar árboles paralelos)

```text
app/
  (calculator)/          # stub: paso-1, paso-2, resultados. Falta layout.tsx
  auth/              # confirmar email
  dashboard/         # destino tras login
  profile/
  login/  signup/  reset-password/  update-password/
    actions.ts       # Server Action por feature (5 en total)
proxy.ts             # refresh de sesión Supabase en cada request (no bloquea; ver lib/supabase/proxy)
components/
  charts/  forms/  ui/  calculator/
lib/
  calc/          # pure domain math (costs, pricing, break-even) — vacío, solo .gitkeep
  money/         # pure money formatting / rounding — vacío, solo .gitkeep
  schemas/       # THE single Zod source of truth (auth/, calculator-setup/; field rules in <contract>/fields.ts)
  services/      # lógica de negocio del servidor (transport-agnostic), usada por las Server Actions
  supabase/      # clientes Supabase por runtime (proxy, rsc) — server-only
  types/         # tipos compartidos (p. ej. FormState)
  store/         # estado de interfaz en el cliente (no persiste el cálculo, ver ADR 02) — vacío, dueño: Frontend
  errors/        # catálogo central de errores + adaptadores de route y action
  auth/          # guard de sesión para Server Components (requireUser)
  db/            # esquema Drizzle, cliente getDrizzleClient() y reglas de escritura en servidor
  db.ts          # server-only, placeholder
tests/
  e2e/           # Playwright + Supabase local (auth, RLS)
```

**Los tests unitarios no viven en `tests/unit/`.** Esa carpeta está vacía salvo un `.gitkeep`: los 19 archivos `*.test.ts` del repo están **co-localizados** junto a su módulo (`catalog.test.ts` al lado de `catalog.ts`). Las convenciones de testing están en [`TEST.md`](TEST.md). La policy de review es 400 líneas por PR.

### Contratos (vinculantes)

1. **Fuente única con Zod.** Todos los esquemas de validación viven en `lib/schemas`. React Hook Form (cliente), los Route Handlers y las Server Actions (servidor) los consumen. **Parsear en el borde**: la validación del servidor vive una sola vez en el servicio de `lib/services` (cubre ambas puertas); cada puerta le pasa la entrada cruda.
2. **Regla fetch-vs-import:**
   - Lógica pura (`lib/calc`, `lib/money`, `lib/schemas`) y servicios (`lib/services`) → `import` directo. Sin HTTP involucrado.
   - Componente de cliente → API (`app/api/*`, si existiera) → **solo mediante `fetch`**. Nunca importar `route.ts`.
   - Mutaciones de formularios propios → Server Actions (se importan, no se hace `fetch`). Las actions **no** hacen `fetch` a las propias rutas: llaman al servicio de `lib/` directo.
   - Los Server Components leen la persistencia mediante los servicios de `lib/services` (que usan `lib/db` por dentro), nunca importando `lib/db` ni con `fetch` interno a su propia API.
   - Consumidores externos (app nativa, webhooks, terceros) → Route Handlers (contrato HTTP estable). Hoy no hay ninguno; ver [API HTTP de auth](docs/examples/http-auth-api.md) para cómo agregarlos. Una PWA no los necesita.
3. **El dominio se mantiene universal.** Nada en `lib/calc`, `lib/money`, `lib/schemas` puede usar APIs de servidor de Node/Next ni `window`/`localStorage`.
4. **La infraestructura permanece en el servidor.** `lib/db.ts` (y todo lo que toque secretos o Supabase) importa `server-only`.
5. **Los gráficos son solo de cliente.** Cada componente de gráficos usa `'use client'` más `dynamic(..., { ssr: false })`.

> [!IMPORTANT]
> La validación en el cliente es UX, nunca seguridad: todo formulario validado en el cliente debe revalidarse con el mismo esquema Zod en el servidor.

### Dónde va cada cosa

| Responsabilidad | Ubicación |
| --- | --- |
| Páginas del assistant (calculator) | `app/(calculator)/paso-1`, `paso-2`, `resultados` |
| Borde HTTP (adaptar + delegar, sin lógica) | `app/api/*` — hoy no existe; solo para consumidores externos (ver [API HTTP de auth](docs/examples/http-auth-api.md)) |
| Server Actions de formularios propios | `app/<feature>/actions.ts` (colocadas por feature) |
| Lógica de negocio del servidor | `lib/services` (server-only; recibe valores, devuelve datos planos) |
| Clientes Supabase por runtime | `lib/supabase` (server-only) |
| Tipos compartidos | `lib/types` (p. ej. `FormState`) |
| UI del asistente, gráficos, primitivas | `components/calculator`, `components/charts`, `components/ui` |
| Matemática pura / dinero / esquemas | `lib/calc`, `lib/money`, `lib/schemas` |
| Persistencia del cálculo (borrador) | `lib/db/` (server-only, Drizzle), accedida solo desde `lib/services` — ver [ADR 02](docs/decisiones/establecidas/02-persistencia-del-calculo-en-servidor.md) |
| Estado de interfaz en el cliente (no persiste el cálculo) | `lib/store` |
| Pruebas unitarias | co-locadas con el módulo (`<modulo>.test.ts`), se corren con `bun run test`; convenciones en [`TEST.md`](TEST.md) |
| Pruebas e2e | `tests/e2e` (Playwright contra Supabase local) |
| Quién es dueño de qué en `lib/` | [`lib/AGENTS.md`](lib/AGENTS.md) — "Frontera de responsabilidad" |

### Prohibido

- **Secretos en código de cliente.** Sin claves de servicio, sin service role de Supabase, sin variables de entorno privadas en ningún componente de cliente ni en nada que estos importen.
- **Validación solo en el cliente.** Todo formulario validado en el cliente debe revalidarse con el mismo esquema Zod en el Route Handler / Server Action. La validación del cliente es UX, nunca seguridad.
- **Importar `route.ts`.** Los Route Handlers se alcanzan por HTTP (`fetch`) desde el cliente, nunca con `import`.
- **Llamar a la propia API con `fetch` desde el servidor.** Server Components y Server Actions llaman a `lib/` directo, nunca a sus propias rutas (vuelta HTTP de más).
- **I/O o APIs de plataforma en código de dominio.** `lib/calc`, `lib/money`, `lib/schemas` se mantienen puros y universales.
- **Lógica de negocio dentro de Route Handlers o actions.** Va en `lib/services` (acuerdo de equipo vigente: capa `services/` aprobada para lógica compartida entre actions y routes).

### Preguntas abiertas (sin decidir, no asumir)

1. ~~**Estado del asistente: librería o Context.**~~ **Sin objeto para H1/H2**: el borrador vive en servidor ([ADR 02](docs/decisiones/establecidas/02-persistencia-del-calculo-en-servidor.md)), así que no hace falta estado global de cliente. Se reabre si vuelve a hacer falta — ver `lib/AGENTS.md` nota 4.
2. ~~**Persistencia del cálculo: ¿local o en la base?**~~ **Resuelta: solo servidor, ver [ADR 02](docs/decisiones/establecidas/02-persistencia-del-calculo-en-servidor.md).** El ADR también registra qué pasa con `#33`, `#34` y `#63`.
3. ~~LocalStorage vs IndexedDB para la persistencia de la Fase 1.~~ **Sin objeto**: el cálculo no se persiste en el cliente ([ADR 02](docs/decisiones/establecidas/02-persistencia-del-calculo-en-servidor.md)).
4. Proceso de cambios de esquemas: ¿cómo se proponen y migran los cambios en `lib/schemas`?

---

## 3. 🗺️ Próximos pasos

1. **Base del dominio** — `lib/schemas` (Zod, fuente única), `lib/calc` (costos/precios/punto de equilibrio), `lib/money`, con sus tests co-locados. Todo vacío hoy.
2. **Pasos del asistente** — `paso-1` y `paso-2` como páginas protegidas con `requireUser()` que leen el borrador por servicio, con formularios vinculados a `lib/schemas` que guardan por Server Action (`components/calculator` + `components/ui`).
3. **Vista de resultados** — `app/(calculator)/resultados`, gráficos solo de cliente (`components/charts`, `'use client'` + `dynamic ssr:false`).
4. **Borde del servidor** — Server Actions delgadas de validar-y-delegar (a `lib/services`) para lo que necesite servidor. Sin Route Handlers mientras no haya un consumidor externo.
5. **Persistencia del borrador en servidor** — servicios de `lib/services` sobre `lib/db` (setup y costos) y la migración H0.2 (#91). Ver [ADR 02](docs/decisiones/establecidas/02-persistencia-del-calculo-en-servidor.md).
6. **Cobertura E2E** — flujo del asistente con Playwright en `tests/e2e` (hoy solo hay specs de auth y RLS).
7. **Pulido + despliegue** — lint/build limpios, despliegue único en Vercel verificado.
8. **Fuera del alcance del MVP** — historial de cálculos y varios borradores por usuario.

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
> No incluir secretos en los commits. Las variables de entorno de Supabase son **solo de servidor**; nunca en componentes de cliente ni en nada que estos importen. Ver `.env.example` y la sección de contratos.

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

- El borrador del cálculo se persiste solo en servidor ([ADR 02](docs/decisiones/establecidas/02-persistencia-del-calculo-en-servidor.md)): no guardar el cálculo en `lib/store`, `localStorage` ni IndexedDB.
