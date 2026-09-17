# InnovaLab E10 — Budget Calculator

MVP Phase 1 of a smart calculator for **costs, pricing, and break-even analysis** (`Costos / Precios / Punto de Equilibrio`).

Phase 1 is **local-first**: all calculation runs locally in the browser with no account and no backend persistence (LocalStorage or IndexedDB — decision still open, see below). Supabase (auth + history) is **off** and arrives in Phase 2.

> Status: stock `create-next-app` scaffold on `main` (commit `6747320`). No domain code yet. This README is the contract the team builds against.

---

## 1. Technologies Used

Current, verified stack (nothing else installed yet):

| Technology | Version | Purpose |
| --- | --- | --- |
| Next.js | 16.3.5 | Fullstack framework (App Router), single deploy on Vercel |
| React | 19.2.8 | UI rendering |
| Tailwind CSS | 4 (`@tailwindcss/postcss`) | Styling via the PostCSS plugin |
| TypeScript | 5, `strict`, `target ES2017`, alias `@/*` | Type safety; `@/` maps to repo root |
| ESLint | 9 + `eslint-config-next` | Linting (Next.js rules) |
| `next.config.ts` | stub (empty) | Reserved for future Next.js config |
| App Router | only `app/layout.tsx` + `app/page.tsx` | Current scaffold; wizard and API routes do not exist yet |

Available scripts:

| Script | Command |
| --- | --- |
| Dev server | `npm run dev` |
| Production build | `npm run build` |
| Production start | `npm run start` |
| Lint | `npm run lint` |

Planned, **not installed yet** (do not import until added): Zod (single schema source), React Hook Form, Vitest (unit), Playwright (e2e), Supabase (Phase 2 only), Zustand (still under discussion — see Open Questions).

---

## 2. Architecture to Follow

Source of truth: the 10 architecture docs in `obsidian-vault/calculadora-presupuestos/infraestructura/arquitectura`. Summary below; the vault wins on conflict.

### Deployment

- **Next.js fullstack monorepo, one deploy on Vercel.** There is no separate backend repo or backend deploy.
- **App Router is not a backend.** Route Handlers (`app/api/*`) are thin HTTP edges (parse/validate/delegate), not a service layer.

### Software style

- **Pragmatic Clean / Hexagonal lite, no application layer in the MVP.**
- Dependency direction (one way only):

```text
app -> components -> lib/calc
```

- `lib/calc`, `lib/money`, `lib/schemas`: pure, universal domain. No server-only APIs, no browser-only APIs, no I/O.
- Infrastructure (e.g. `lib/db.ts`) is **server-only** (`server-only` import) and never imported by client components.

### Phase split

- **Phase 1 (current, MVP):** local-first. Persistence in LocalStorage or IndexedDB. Supabase is off.
- **Phase 2:** Supabase auth + history. Form mutations move to Server Actions; reads stay direct (see contracts).

### Target structure (build toward this, do not invent parallel trees)

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

### Contracts (binding)

1. **Single Zod source.** All validation schemas live in `lib/schemas`. React Hook Form (client) and Route Handlers (server) both consume them. **Parse at the edge**: every Route Handler parses/validates input at its boundary before delegating.
2. **Fetch-vs-import rule:**
   - Pure logic (`lib/calc`, `lib/money`, `lib/schemas`) → plain `import`. No HTTP involved.
   - Client component → API (`app/api/*`) → **only via `fetch`**. Never import `route.ts`.
   - Form mutations (Phase 2) → Server Actions.
   - Server Components read persistence directly via `lib/db` — never via internal `fetch` to their own API.
3. **Domain stays universal.** Nothing in `lib/calc`, `lib/money`, `lib/schemas` may touch Node/Next server APIs or `window`/`localStorage`.
4. **Infra stays on the server.** `lib/db.ts` (and anything touching secrets or Supabase) imports `server-only`.
5. **Charts are client-only.** Every chart component uses `'use client'` plus `dynamic(..., { ssr: false })`.

### Where things go

| Concern | Location |
| --- | --- |
| Wizard pages | `app/(wizard)/paso-1`, `paso-2`, `resultados` |
| HTTP edge (validate + delegate) | `app/api/calcular`, `app/api/precios` |
| Wizard UI, charts, primitives | `components/wizard`, `components/charts`, `components/ui` |
| Pure math / money / schemas | `lib/calc`, `lib/money`, `lib/schemas` |
| Local-first persistence (Phase 1) | `lib/store` |
| Server persistence (Phase 2) | `lib/db.ts` (server-only) |
| Unit / e2e tests | `tests/unit` (Vitest), `tests/e2e` (Playwright) |

### Forbidden

- **Secrets in client code.** No service keys, no Supabase service role, no private env vars in any client component or anything it imports.
- **Client-only validation.** Every client-validated form must be re-validated with the same Zod schema in the Route Handler / Server Action. Client validation is UX, never security.
- **Importing `route.ts`.** Route Handlers are reached via HTTP (`fetch`) from the client, never via `import`.
- **Fetching your own API from a Server Component.** Read via `lib/db` directly.
- **I/O or platform APIs in domain code.** `lib/calc`, `lib/money`, `lib/schemas` stay pure and universal.
- **New top-level layers** (e.g. an `application/` or `services/` folder) without an architecture decision recorded in the vault.

### Open questions (undecided, do not assume)

1. Zustand — yes or no for wizard state?
2. Schema change process — how are `lib/schemas` changes proposed and migrated?
3. LocalStorage vs IndexedDB for Phase 1 persistence.

---

## 3. Current State

On `main` at commit `6747320`:

- Stock `create-next-app` scaffold only: `app/layout.tsx` + `app/page.tsx`, `next.config.ts` stub, default styling.
- None of the target tree exists yet: no `(wizard)` routes, no `app/api/*`, no `components/{wizard,charts,ui}`, no `lib/{calc,money,schemas,store}`, no `lib/db.ts`, no `tests/`.
- No Zod, RHF, Vitest, Playwright, Supabase, or Zustand installed.

## 4. Roadmap / What's Missing

1. **Domain foundation** — `lib/schemas` (Zod, single source), `lib/calc` (costs/pricing/break-even), `lib/money`, plus Vitest unit tests.
2. **Wizard steps** — `app/(wizard)/paso-1` and `paso-2` with RHF bound to `lib/schemas`, `components/wizard` + `components/ui`.
3. **Results view** — `app/(wizard)/resultados`, client-only charts (`components/charts`, `'use client'` + `dynamic ssr:false`).
4. **API edge** — `app/api/calcular` and `app/api/precios` as thin validate-and-delegate handlers parsing with `lib/schemas` at the boundary.
5. **Local-first persistence** — `lib/store` (resolve LocalStorage vs IndexedDB) wired to the wizard.
6. **E2E coverage** — Playwright flow over the wizard in `tests/e2e`.
7. **Polish + deploy** — lint/build clean, single Vercel deploy verified.
8. **Phase 2 (out of MVP scope)** — Supabase auth + history, `lib/db.ts` server-only, form mutations via Server Actions.

---

## 5. Getting Started

Prerequisites: Node.js LTS and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Other commands:

```bash
npm run build   # production build (must pass before merging)
npm start       # serve the production build
npm run lint    # ESLint with eslint-config-next
```

Notes:

- Do not commit secrets. Phase 1 needs no env vars; Phase 2 (Supabase) will document its own server-only variables.
- Until the open questions above are decided, keep wizard state local to the wizard and persistence behind the `lib/store` boundary so the choice stays swappable.
