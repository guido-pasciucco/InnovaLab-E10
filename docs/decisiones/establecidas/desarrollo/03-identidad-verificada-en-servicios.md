# 03 — La identidad del servicio llega verificada desde la puerta

| Campo | Valor |
| --- | --- |
| **Estado** | ✅ Aceptada (revisión de Backend pendiente) |
| **Fecha** | 2026-11-08 |
| **Relacionado** | #124 (BUG-005) · [ADR 02](./02-persistencia-del-calculo-en-servidor.md) · `lib/services/auth.ts` · `lib/auth/require-user.ts` · `lib/services/calculator.ts` |

## Contexto

Los servicios de `lib/services/` recibían `userId` como parámetro para el owner-scoping (BUG-005). Quien llamaba declaraba la identidad: cualquier puerta que pasara un `userId` ajeno leía o escribía datos de otro usuario, y el servicio no podía detectarlo.

La primera solución de #124 separó dos capas en `lib/services/calculator.ts`:

- `*ForUser` (`saveCalculatorSetupForUser`, `getDraftSetupForUser`, `getDraftCalculationIdForUser`): reciben `userId` ya validado. Son internas, las usan otros servicios, seeds y tests.
- `*Service`: reciben un `SupabaseClient` de sesión y llaman `getSessionUserService(client)` en cada operación.

Esa solución tiene dos problemas:

1. **Doble verificación.** La puerta llama a `requireUser()` (un `auth.getUser()`) y el servicio vuelve a llamar `auth.getUser()` (otro HTTP a Supabase Auth). Ambas llamadas ocurren en el mismo servidor.
2. **Frontera por convención.** `*ForUser` acepta un `userId` libre y está exportado desde un módulo `server-only`. Nada impide que una ruta nueva lo importe. Hoy sólo lo protege el comentario "las puertas públicas no deben importarlas" y el code review.

## Opciones

### A. Cliente de sesión en cada servicio público (estado previo)

El servicio verifica la identidad sola. Es seguro frente a un llamador que pase un `userId`, pero duplica la llamada de red.

### B. Servicio recibe el usuario verificado (elegida)

`getSessionUserService(client)` devuelve un tipo `VerifiedUser`. La puerta lo obtiene de `requireUser()` y lo pasa al servicio. El servicio usa `user.id` y no verifica de nuevo.

```ts
// lib/services/auth.ts
declare const verifiedUserBrand: unique symbol;
export type VerifiedUser = SessionUser & { readonly [verifiedUserBrand]: true };

export async function getSessionUserService(client: SupabaseClient): Promise<VerifiedUser> { /* ... */ }
```

### C. `getClaims()` en el servicio

Valida el JWT localmente, sin HTTP. Pierde la revocación de sesión del lado del servidor, que `lib/supabase/proxy.ts` ya documenta como elección consciente. Descartada para esta frontera.

## Decisión

Opción B:

1. Sólo `getSessionUserService` produce un `VerifiedUser`. `requireUser()` y `getOptionalUser()` lo devuelven.
2. Los servicios públicos del flujo de setup y borrador (`saveCalculatorSetupService`, `getCalculatorDraftSetupService`, `getDraftCalculationId`) reciben `VerifiedUser`, no `SupabaseClient`.
3. Las puertas llaman a `requireUser()` una vez y pasan el resultado. No crean cliente de sesión para el servicio.
4. `*ForUser` se mantiene para composición entre servicios, seeds y tests que ya tienen un `userId` validado.

## Qué garantiza y qué no

**Garantiza:**

- Un servicio público no puede recibir un `userId` libre: su única identidad es `user.id` de un `VerifiedUser`.
- El tipo sólo se obtiene por el camino de verificación, así que un error de firma se detecta al compilar.
- Una sesión cerrada se rechaza en `getSessionUserService` (cubierto en `lib/services/calculator.int.test.ts`, con sesión real).

**No garantiza:**

- **Garantía de compilación, no de ejecución.** Un `as VerifiedUser` o JavaScript sin tipos lo esquiva. Por eso el brand no reemplaza el code review.
- **Autorización por recurso.** Pasar el usuario verificado no revisa que un `calculationId` o `businessId` recibido en el input pertenezca a ese usuario. Cada consulta debe filtrar por `user.id`.
- **Frontera de `*ForUser`.** Sigue siendo convención. Una regla de lint (`no-restricted-imports`) que los limite a `lib/services/`, `scripts/` y tests queda como trabajo pendiente.
- **RLS no aplica hoy.** Drizzle conecta con `DATABASE_URL` usando un rol con `BYPASSRLS` (ver [ADR 02, "Rol de `DATABASE_URL` y RLS"](./02-persistencia-del-calculo-en-servidor.md)). La defensa real es el filtro por dueño en el servicio.

## Server Actions

Los Server Actions son endpoints HTTP públicos: cualquier cliente puede invocarlos con su propia cookie de sesión, sin pasar por la UI. Por eso:

- La identidad sale de la cookie de sesión validada con `auth.getUser()`, nunca de los argumentos.
- Las validaciones del cliente no son seguridad.
- Cada acción debe limitar los ids de recurso a los del usuario autenticado. Esta auditoría no está hecha.

## Pendiente

- Migrar a `VerifiedUser` las funciones que todavía reciben `userId` desde las páginas: `getCalculatorProgressService`, `listVariableCalcCostLinesService`, `getCalculatorCostSummaryService`, `advanceCalculatorProgressService`.
- Auditar las acciones de `app/(calculator)/` por autorización de recursos.
- Regla de lint para `*ForUser`.
- Decidir si se agrega un cache por request de `getUser` en renders (layout + page). Una server action es otro request, así que el cache no une sus llamadas.
