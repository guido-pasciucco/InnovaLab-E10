# BUG-005 — Los servicios reciben `userId` como parámetro, y la única frontera de autorización depende de la disciplina

| Campo | Valor |
| --- | --- |
| ID | BUG-005 |
| Severidad | Crítico |
| Estado | Abierto — pendiente de detalle |
| Origen | Code review de proyecto completo, 2026-10-10 |
| Módulo | `lib/services/` |
| Verificación | Lectura de código + análisis de esquema |

## Qué pasa

Los servicios del dominio reciben `userId` como primer parámetro y construyen con él el filtro de todas sus consultas. Ese `userId` no está atado a la sesión dentro del servicio: es un valor que el llamador provee.

Esto importa porque `lib/db/AGENTS.md:31` declara que el rol de `DATABASE_URL` tiene `BYPASSRLS` y que, por lo tanto, "RLS no filtra las consultas de Drizzle. Cada consulta de servicio filtra por el `userId` de la sesión". Es decir: el filtro por `userId` es la única frontera de autorización real, y la regla 6 de `lib/AGENTS.md` ("el servidor completa lo suyo") queda apoyada en que quien escriba la action pase el valor correcto.

Estado actual: NO es explotable. Se verificó que no hay ningún llamador de `saveCalculatorSetupService`, `getCalculatorSetupService` ni `getDraftCalculationId` en `app/` ni en `components/`; los únicos llamadores son los tests de integración.

Escenario: cuando se escriba la primera Server Action del calculador, el camino natural es `saveCalculatorSetupService(data.userId, data)`. Eso compila, pasa ESLint y deja los 216 tests en verde. Si el `userId` proviene del payload del formulario en lugar de la sesión, el atacante envía `{ name, unit, volume, currency, period, userId: "<uuid-de-B>" }` y el servicio escribe sobre el borrador de B.

Agravante: `app/dashboard/page.tsx:38` le enseña al equipo que "RLS additionally enforces `auth.uid()` = `owner_user_id` as safety net". Para las consultas de Drizzle esa afirmación es falsa.

## Dónde está

- `lib/services/calculator.ts:51-55` — `saveCalculatorSetupService`, que recibe `userId: string` como primer parámetro.
- `lib/services/calculator.ts:40` — `getDraftCalculationId`.
- `lib/services/calculator.ts:112` — `getCalculatorSetupService`.
- `lib/db/AGENTS.md:31` — la declaración de `BYPASSRLS`.
- `lib/AGENTS.md:70` — la regla 6.
- `app/dashboard/page.tsx:38` — el comentario engañoso sobre RLS.

## Evidencia

De `lib/services/calculator.ts`:

```ts
export async function saveCalculatorSetupService(
  userId: string,
  input: unknown,
  db: Db = getDrizzleClient(),
): Promise<SaveCalculatorSetupInput> {
```

## Reproducción

No aplica: verificado por lectura del código y por búsqueda de los nombres de los servicios en `app/` y `components/`, sin coincidencias.

## Impacto

Un IDOR futureño, con la propiedad de que ningún control automático lo detecta: ni los tipos, ni el linter, ni la suite actual.

## Causa raíz

La identidad de usuario es un dato, no una capacidad. Al pasarla como argumento de tipo `string`, nada impide que venga del cliente.

## Dirección del arreglo

Que el servicio derive la identidad en lugar de recibirla: recibir el cliente de Supabase y llamar a `getSessionUserService`, o usar un tipo opaco de dueño que un payload de formulario no pueda producir. Agregar un test que afirme que una identidad no derivada de sesión es rechazada. Corregir el comentario de `app/dashboard/page.tsx`.

## Qué NO se verificó

No se midió si el rol del pooler de producción tiene realmente `BYPASSRLS`; la afirmación proviene de `lib/db/AGENTS.md:31` y de la documentación de Supabase.