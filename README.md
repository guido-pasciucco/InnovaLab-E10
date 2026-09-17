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

Dependencias del dominio (ya instaladas). Por qué están, en dos minutos:

**`decimal.js` — porque los floats mienten con plata.**
JavaScript guarda los números en binario con coma flotante: `0.1 + 0.2` da `0.30000000000000004`. Para un jueguito no pasa nada; para presupuestos es un bug de plata real que se acumula en cada suma de costos y rompe el punto de equilibrio. `decimal.js` guarda los números como decimales exactos: `new Decimal(0.1).plus(0.2)` da exactamente `0.3`. Por eso vive en `lib/money` y `lib/calc`: **toda fórmula nueva usa `Decimal`, nunca `number` pelado para plata.** Es matemática pura, testeable con Vitest, sin React ni fetch ni DB.

**`server-only` — el candado contra filtrar secretos al cliente.**
En App Router es muy fácil importar sin querer un módulo de servidor (con la key de Supabase, conexión a DB) desde un componente con `'use client'`: Next lo mete en el bundle del navegador y el secreto queda inspeccionable por cualquiera. Este paquete es un guardián de build: se pone `import "server-only"` arriba de `lib/db.ts` y, si algún componente de cliente lo importa —directa o indirectamente—, **el build explota con error** en vez de filtrar el secreto en silencio. No hace nada en runtime; es una alarma de compilación. Es el complemento técnico de la regla fetch-vs-import: el cliente llega al servidor por `fetch` HTTP, nunca por `import` de `route.ts` o `lib/db.ts`.

Dependencias planificadas (no importar hasta que se agreguen al proyecto): Vitest (unitarias), Playwright (e2e), Supabase (solo Fase 2), Zustand (aún en discusión — ver Preguntas abiertas). Zod y React Hook Form ya están instaladas; su rol se detalla en los contratos.

---

## 2. 🏛️ Arquitectura a seguir

Estas decisiones corresponden al acuerdo de equipo. Resumen a continuación.

### Despliegue

- **Monorepo fullstack con Next.js, un solo despliegue en Vercel.** No existe un repositorio de backend separado ni un despliegue de backend independiente.
- **App Router no es un backend.** Los Route Handlers (`app/api/*`) son bordes HTTP delgados (parsear/validar/delegar), no una capa de servicios.

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
  api/
    calcular/
    precios/
components/
  wizard/
  charts/        # client-only, see below
  ui/
lib/
  calc/          # pure domain math (costs, pricing, break-even)
  money/         # pure money formatting / rounding
  schemas/       # THE single Zod source of truth
  store/         # Phase 1 local-first persistence (LocalStorage vs IndexedDB TBD)
  db.ts          # server-only, Phase 2 (never imported from client)
tests/
  unit/          # Vitest (domain: calc, money, schemas)
  e2e/           # Playwright (wizard flow)
```

### Contratos (vinculantes)

1. **Fuente única con Zod.** Todos los esquemas de validación viven en `lib/schemas`. React Hook Form (cliente) y los Route Handlers (servidor) los consumen. **Parsear en el borde**: cada Route Handler parsea/valida la entrada en su frontera antes de delegar.
2. **Regla fetch-vs-import:**
   - Lógica pura (`lib/calc`, `lib/money`, `lib/schemas`) → `import` directo. Sin HTTP involucrado.
   - Componente de cliente → API (`app/api/*`) → **solo mediante `fetch`**. Nunca importar `route.ts`.
   - Mutaciones de formularios (Fase 2) → Server Actions.
   - Los Server Components leen la persistencia directamente mediante `lib/db`, nunca con `fetch` interno a su propia API.
3. **El dominio se mantiene universal.** Nada en `lib/calc`, `lib/money`, `lib/schemas` puede usar APIs de servidor de Node/Next ni `window`/`localStorage`.
4. **La infraestructura permanece en el servidor.** `lib/db.ts` (y todo lo que toque secretos o Supabase) importa `server-only`.
5. **Los gráficos son solo de cliente.** Cada componente de gráficos usa `'use client'` más `dynamic(..., { ssr: false })`.

> [!IMPORTANT]
> La validación en el cliente es UX, nunca seguridad: todo formulario validado en el cliente debe revalidarse con el mismo esquema Zod en el servidor.

### Dónde va cada cosa

| Responsabilidad | Ubicación |
| --- | --- |
| Páginas del asistente (wizard) | `app/(wizard)/paso-1`, `paso-2`, `resultados` |
| Borde HTTP (validar + delegar) | `app/api/calcular`, `app/api/precios` |
| UI del asistente, gráficos, primitivas | `components/wizard`, `components/charts`, `components/ui` |
| Matemática pura / dinero / esquemas | `lib/calc`, `lib/money`, `lib/schemas` |
| Persistencia local-first (Fase 1) | `lib/store` |
| Persistencia en servidor (Fase 2) | `lib/db.ts` (server-only) |
| Pruebas unitarias / e2e | `tests/unit` (Vitest), `tests/e2e` (Playwright) |

### Prohibido

- **Secretos en código de cliente.** Sin claves de servicio, sin service role de Supabase, sin variables de entorno privadas en ningún componente de cliente ni en nada que estos importen.
- **Validación solo en el cliente.** Todo formulario validado en el cliente debe revalidarse con el mismo esquema Zod en el Route Handler / Server Action. La validación del cliente es UX, nunca seguridad.
- **Importar `route.ts`.** Los Route Handlers se alcanzan por HTTP (`fetch`) desde el cliente, nunca con `import`.
- **Llamar a la propia API con `fetch` desde un Server Component.** Leer directamente mediante `lib/db`.
- **I/O o APIs de plataforma en código de dominio.** `lib/calc`, `lib/money`, `lib/schemas` se mantienen puros y universales.
- **Nuevas capas de nivel superior** (p. ej. una carpeta `application/` o `services/`) sin un acuerdo de equipo previo.

### Preguntas abiertas (sin decidir, no asumir)

1. Zustand: ¿sí o no para el estado del asistente (wizard)?
2. Proceso de cambios de esquemas: ¿cómo se proponen y migran los cambios en `lib/schemas`?
3. LocalStorage vs IndexedDB para la persistencia de la Fase 1.

---

## 3. 🗺️ Próximos pasos

1. **Base del dominio** — `lib/schemas` (Zod, fuente única), `lib/calc` (costos/precios/punto de equilibrio), `lib/money`, más pruebas unitarias con Vitest.
2. **Pasos del asistente** — `app/(wizard)/paso-1` y `paso-2` con RHF vinculado a `lib/schemas`, `components/wizard` + `components/ui`.
3. **Vista de resultados** — `app/(wizard)/resultados`, gráficos solo de cliente (`components/charts`, `'use client'` + `dynamic ssr:false`).
4. **Borde de API** — `app/api/calcular` y `app/api/precios` como handlers delgados de validar-y-delegar que parsean con `lib/schemas` en la frontera.
5. **Persistencia local-first** — `lib/store` (resolver LocalStorage vs IndexedDB) conectada al asistente.
6. **Cobertura E2E** — flujo con Playwright sobre el asistente en `tests/e2e`.
7. **Pulido + despliegue** — lint/build limpios, despliegue único en Vercel verificado.
8. **Fase 2 (fuera del alcance del MVP)** — autenticación + historial con Supabase, `lib/db.ts` solo de servidor, mutaciones de formularios mediante Server Actions.

---

## 4. 🚀 Primeros pasos

Prerrequisitos: [Bun](https://bun.sh) 1.4.2+ (gestor de paquetes) y Node.js LTS (runtime). La versión de Bun está fijada en `package.json` (`packageManager`).

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

Notas:

- Hasta que se resuelvan las preguntas abiertas anteriores, mantener el estado del asistente (wizard) local al asistente y la persistencia detrás de la frontera de `lib/store` para que la elección siga siendo intercambiable.
