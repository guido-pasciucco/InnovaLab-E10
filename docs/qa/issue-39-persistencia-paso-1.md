# QA #39 — Persistencia de `/paso-1`

Base auditada: `61386175f49ecb9b0c1fdc1df8aaa394f6148626`.
Ejecución local: 2026-10-27, Node 24.20.0, Bun 1.4.2, Chromium,
Docker Engine 28.4.0 y Supabase CLI 2.118.0.

## Alcance y aislamiento

La suite reutiliza `authedPage`, `user`, `loginPage` y `dashboardPage`.
Cada caso tiene un usuario temporal distinto, limpiado por los fixtures existentes.
No consulta tablas directamente ni reemplaza servicios de producción.

Se utilizó el stack descartable `innova-issue39-e2e`, con un `project_id`
exclusivo en una copia runtime de `supabase/config.toml`, fuera del repositorio.
Todas las URLs de `.env.test` se verificaron como locales y las claves se
obtuvieron del stack. No se reutilizó el volumen anterior de InnovaLab.

## Casos automatizados

1. Guardar y recuperar nombre, unidad y volumen tras recargar.
2. Guardar, cerrar sesión por la UI, iniciar sesión por la UI y recuperar valores.
3. Editar sin guardar y recuperar el estado anterior al recargar.
4. Guardar A y luego B; recuperar B al recargar.
5. Retener la petición real de la Server Action, comprobar inputs y botón
   deshabilitados, liberar la petición y comprobar la persistencia al recargar.
6. Comprobar por separado el mensaje visible de confirmación tras guardar.

Los primeros cinco casos pasaron. El sexto conserva un defecto observado;
no está marcado `skip`, `fixme` ni como fallo esperado. La suite completa queda roja.
No se usan esperas de duración fija ni respuestas de guardado simuladas.

## Defecto observado: falta la confirmación visible

Pasos: iniciar sesión con un usuario confirmado, abrir `/paso-1`, ingresar
`Pan de avena`, `docena`, `96` y pulsar `Guardar`.

Esperado: un estado visible con `Guardado` y
`Vamos a calcular el costo de Pan de avena en docena, con un volumen de 96 por mes.`

Observado: la petición devuelve HTTP 200 con `ok: true`, el botón vuelve a
`Guardar`, los valores persisten, pero no existe el `role="status"` esperado.
Playwright falla en `Paso1Page.expectSaved`, esperando `Guardado`.

La condición `hasSuccess && !isDirty` de `components/calculator/setup-form.tsx`
y el retorno temprano del efecto cuando `isDirty` es verdadero son una hipótesis
de causa; no se modificaron ni se implementó una corrección.
Este defecto debe registrarse y resolverse por separado antes de considerar verde la suite.

Las trazas y contextos se conservan localmente bajo `test-results/persistence-final/`.
Contienen evidencia cruda de pruebas y no deben publicarse: siguen ignorados.

## Validación reproducible

Con Supabase local iniciado, migraciones aplicadas y `.env.test` local válido:

```bash
bun run test:e2e tests/e2e/calculator/paso-1-persistence.spec.ts --workers=1 --output=test-results/persistence-final
bun run test:e2e tests/e2e/auth --workers=1 --output=test-results/auth-regression
bun run test:int
bun run test
bun run lint:e2e
bun run lint
bun run typecheck
git diff --check
```

| Comando | Resultado |
| --- | --- |
| `bun install --frozen-lockfile` | Código 0 |
| `bun run db:migrate:local` | Código 0, stack descartable |
| E2E persistencia y confirmación | 5 aprobados, 1 fallido; código 1 |
| E2E auth | 10 aprobados; código 0 |
| Integración | 102 aprobados, 2 archivos; código 0 |
| Unitarios | 311 aprobados, 24 archivos; código 0 |
| Lint E2E | Código 0 |
| Lint general | Código 1: `react-hooks/refs` en `setup-form.tsx:76`, presente en la base |
| Typecheck | Código 0 |
| Diff check | Código 0 |

La primera versión del helper esperaba confirmación visual antes de continuar y
los cinco casos fallaban allí. Se separó esa aserción en el sexto caso para
verificar la persistencia sin ocultar el defecto visual. Las peticiones de los
cinco fallos iniciales devolvieron HTTP 200 y `ok: true`, según sus trazas locales.

## Criterios pendientes

- Volver desde paso 2 al anterior: no se inventa un flujo todavía pendiente.
- Aislamiento entre usuarios: no se agrega un nuevo E2E para ese criterio en esta
  entrega; las pruebas de integración existentes no sustituyen esa validación UI.
- Corrección de la confirmación visual y del lint preexistente, fuera del alcance QA.

El issue #39 permanece abierto. Esta evidencia no acredita todos sus criterios
ni autoriza cerrar el issue o integrar una suite con fallos.
