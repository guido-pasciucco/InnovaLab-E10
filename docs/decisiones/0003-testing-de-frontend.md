# 0003 — Estrategia de testing de frontend (componentes React)

| Campo | Valor |
| --- | --- |
| **Estado** | ⏳ Pendiente de decisión |
| **Fecha** | 2026-09-30 |
| **Relacionado** | `vitest.config.mts` · `playwright.config.ts` · `package.json` · `tests/e2e/` |

## Contexto

Hoy el repo cubre dos niveles y **ninguno intermedio**:

- **Vitest 4.1.11** con `environment: "node"` → solo lógica pura (`lib/**`, `app/**/route.test.ts`). Sin DOM, sin componentes.
- **Playwright 1.63** → E2E completos contra Supabase local (Page Objects en `tests/e2e/pages/`).

**No está instalado** `@testing-library/*`, jsdom/happy-dom, ni Storybook. El stack es Next.js 16.3.5 (app router), React 19.2.8, TypeScript 5, Bun 1.4.2, Tailwind 4, react-hook-form 7 + zod 4.

Falta decidir con qué se testean los componentes: la capa entre la lógica pura que ya se testea y el E2E que ya se testea.

## Opciones

### A. Vitest Browser Mode + `vitest-browser-react` (recomendada)

Los tests de componentes corren en Chromium real, vía el provider de Playwright que ya está instalado. Es la recomendación **oficial** de Vitest para componentes.

- **Deps:** `@vitest/browser-playwright@4.1.11` + `vitest-browser-react@2.3.0` (+ `@vitejs/plugin-react` si no está).
- **Setup:** un segundo "project" con `browser.enabled` en `vitest.config.mts` (~20 líneas). El proyecto `node` actual queda intacto.
- ✅ Un solo runner, reporter y comando de test.
- ✅ Fidelidad total: CSS real → evita el problema conocido de jsdom con Tailwind 4 (`@property`, `oklch()`, `color-mix()`).
- ✅ React 19 soportado (peer `^19`); locators con auto-reintento → menos tests flaky; `toMatchScreenshot` y trace view incluidos.
- ❌ **Peer-pin exacto:** `@vitest/browser-playwright@4.1.11` exige `vitest@4.1.11`; hay que subirlos juntos.
- ❌ Más lento que jsdom; hay que aprender el locator API de Vitest en lugar de `screen.getBy*`.
- ❌ `vi.mock` de módulos no tiene la misma semántica en browser que en node.
- 📄 https://v4.vitest.dev/guide/browser/component-testing · https://github.com/vitest-dev/vitest-browser-react

### B. Testing Library + happy-dom / jsdom

El stack clásico: `@testing-library/react` 16.3.3 + `@testing-library/dom` 10 + `@testing-library/jest-dom` 7 + `user-event` 14.6, corriendo en `happy-dom` (20.x) o `jsdom` (30.x).

- **Deps:** 4 paquetes + 1 setup file + cambiar `environment` / agregar un project (~10 líneas). El setup más barato de todos.
- ✅ Menor curva de aprendizaje; React docs lo recomienda explícitamente; el más rápido (en proceso, sin browser).
- ✅ React 19 soportado desde RTL 16.1.
- ❌ **Cero fidelidad de layout/CSS:** bugs de Tailwind, hover, focus rings y portales quedan invisibles.
- ❌ `user-event` simula eventos en vez de dispararlos — Vitest lo desaconseja dentro de Browser Mode.
- ❌ jsdom parsea mal el CSS de Tailwind 4 (ruido de `Could not parse CSS stylesheet`); con Tailwind 4 conviene `happy-dom`.
- 📄 https://testing-library.com/docs/react-testing-library/intro · https://vitest.dev/guide/environment

### C. Playwright component testing (galería de stories)

⚠️ **Cambio respecto a datos de entrenamiento:** `@playwright/experimental-ct-react` **ya no existe**. Desde Playwright 1.62 se reemplazó por un modelo estable de *stories + galería* usando el `mount()` de `@playwright/test` común (los paquetes experimentales dejaron de publicarse en 1.63).

- **Deps:** **cero**. Agrega un project `components` al `playwright.config.ts` ya existente (~10 líneas) + infraestructura de galería en la app (~30-60 líneas) + un `*.story.tsx` por escenario.
- ✅ Un solo toolchain para E2E y componentes; reusa reporters, traces y la disciplina de Page Objects ya adoptada.
- ✅ Fidelidad de browser; `toHaveScreenshot()` y aria snapshots gratis; a11y con Axe.
- ❌ El costo se traslada a código de app: sin JSX por test, los callbacks deben registrarse en el DOM desde la story.
- ❌ El más lento por test; superpone conceptualmente con el E2E (riesgo de doble mantenimiento).
- ❌ API nueva (1.62+): mucho menos material comunitario que RTL.
- 📄 https://playwright.dev/docs/test-components

### D. Storybook 10 + `@storybook/addon-vitest`

⚠️ `@storybook/test` es de Storybook **8**; en 9/10 los utilities viven en `storybook/test` y los tests corren por el addon de Vitest (Browser Mode por debajo). El `test-runner` quedó **legacy**.

- **Deps:** `storybook@10.6.x` + framework `@storybook/nextjs-vite` + addons. El setup más pesado.
- ✅ Interacción + a11y (addon-a11y/axe) + cobertura en una sola pieza; las stories sirven además como documentación viva del design system.
- ❌ **Adoptar una plataforma de documentación entera solo para testear.** Si no se quiere el workshop, el valor colapsa a "Vitest Browser Mode con más pasos".
- ❌ La capa visual (Chromatic) es **paga**; Next 16 no está documentado explícitamente (los docs dicen "Next 14+").
- 📄 https://storybook.js.org/docs/writing-tests/integrations/vitest-addon

### Capa transversal: MSW (mocking de red)

`msw` sigue siendo el estándar para el boundary de red (`setupServer` en un `setupFiles` de Vitest).

- **MSW 3.0.0** salió 2026-09-28 (hace 2 días): ESM-only, Node ≥ 22, TypeScript ≥ 5.9, `graphql` se movió a `msw/graphql`, `worker.stop()` ahora es async.
- **MSW 2.15.x** es la opción conservadora y probada.
- Las **server actions** no pasan por MSW: `'use server'` compila a una función async exportada; se importa y se llama directo con `FormData`, mockeando `next/navigation` (`redirect`) y `next/cache` (`revalidatePath`) con `vi.mock`. ⚠️ Patrón de consenso de comunidad, **no documentado oficialmente** por Next.js.

## Tabla comparativa

| Criterio | A: Vitest Browser | B: RTL + happy-dom | C: PW galería | D: Storybook |
| --- | --- | --- | --- | --- |
| Curva de aprendizaje | Media | **Baja** | Media-alta | **Alta** |
| Velocidad | Media | **Rápida** | Lenta | Lenta |
| React 19 | ✅ peer `^19` | ✅ RTL ≥16.1 | ✅ | ✅ (Next 16 ⚠️ no documentado) |
| Overlap con el E2E | Bajo | Mínimo | **Alto** | Alto |
| Fidelidad browser/CSS | **Total** | Ninguna | Total | Total |
| Tailwind 4 | **Seguro** | ⚠️ ruido CSS | Seguro | Seguro |
| Extras a11y/visual | `toMatchScreenshot`, traces | solo matchers de jest-dom | `toHaveScreenshot`, aria snapshots, Axe | a11y + interacción + cobertura; visual **pago** |
| Estado de mantenimiento | Activo (4.1.11 / 5.0.3) | Muy activo (RTL 16.3.3) | Activo, API nueva (1.62-1.63) | Activo (10.6.1); test-runner legacy |
| Setup estimado | 2 deps + ~20 líneas | 4 deps + ~10 líneas | 0 deps + galería/stories | Muchos deps + migración de framework |

## Decisión

_Pendiente._ A resolver antes de instalar cualquier dependencia de test.

## Consecuencias a evaluar

- **Si se elige A:** fijar `vitest@4.1.11` y el provider en la misma versión; tratar el salto a **Vitest 5.0.3** (publicado 2026-09-30; requiere Vite ≥ 6.4 y Node ≥ 22.12, con cambios de estrictitud en locators) como un work unit aparte, no como parte de esta decisión.
- **Si se elige B:** usar `happy-dom` y no `jsdom` por el CSS de Tailwind 4; si A y B coexisten, elegir **una sola API de interacción por capa** (`user-event` solo en B, `vitest/browser`'s `userEvent` solo en A).
- **Si se elige C:** asumir la disciplina de story-por-escenario y el costo de mantener la galería dentro de la app.
- **Si se elige D:** justificarlo por el valor de documentación/design system, nunca solo por los tests.
- **MSW:** decidir 3.0.0 vs 2.15.x según el runtime de CI (que aún no existe) — hoy, 2.15.x es el pick conservador.
- **Cualquier opción:** Bun 1.4.2 como host de Vitest no está documentado oficialmente; hay que validar el setup local antes de darlo por bueno.
- Todas las versiones y estados de esta decisión fueron verificados contra fuentes primarias el **2026-09-30**; conviene re-verificar al momento de decidir, porque el ecosistema se movió mucho en la última semana.
