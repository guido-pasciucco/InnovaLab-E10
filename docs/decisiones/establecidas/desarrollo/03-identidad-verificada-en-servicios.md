# 03 — La identidad del servicio llega verificada desde la puerta

| Campo | Valor |
| --- | --- |
| **Estado** | ✅ Aceptada (revisión de Backend pendiente) |
| **Fecha** | 2026-11-09 |
| **Relacionado** | #124 (BUG-005) · [ADR 02](./02-persistencia-del-calculo-en-servidor.md) · `lib/services/auth.ts` · `lib/auth/require-user.ts` · `lib/services/calculator.ts` |

## Contexto

Los servicios de `lib/services/` recibían `userId: string` como parámetro para el owner-scoping (BUG-005). Quien llamaba declaraba la identidad: cualquier puerta que pasara un `userId` ajeno, o uno leído del input, leía o escribía datos de otro usuario, y el servicio no podía detectarlo. Como Drizzle conecta con un rol con `BYPASSRLS` (ver [ADR 02, "Rol de `DATABASE_URL` y RLS"](./02-persistencia-del-calculo-en-servidor.md)), la base tampoco lo frena.

La primera solución de #124 separó dos capas en `lib/services/calculator.ts`:

- `*ForUser` (`saveCalculatorSetupForUser`, `getDraftSetupForUser`, `getDraftCalculationIdForUser`): reciben `userId` ya validado. Internas, para otros servicios, seeds y tests.
- `*Service`: reciben un `SupabaseClient` de sesión y llaman `getSessionUserService(client)` en cada operación.

Esa solución tenía tres problemas:

1. **Doble verificación.** La puerta llama a `requireUser()` (un `auth.getUser()`) y el servicio vuelve a llamar `auth.getUser()` (otro HTTP a Supabase Auth) en el mismo servidor.
2. **Frontera por convención.** `*ForUser` acepta un `userId` libre. Nada impide que una puerta nueva lo importe.
3. **Cobertura parcial.** Sólo tres servicios de `calculator.ts` pasaron a autenticarse. Unas 35 funciones públicas (costos, escenarios, precios, progreso, resumen, mano de obra, cálculos, perfil) siguieron recibiendo `userId: string`.

## Opciones

### A. Cliente de sesión en cada servicio público

El servicio verifica la identidad sola. Es seguro frente a un llamador que pase un `userId`, pero duplica la llamada de red, obliga a mantener pares `*ForUser`/`*Service` y extenderlo a los 35 servicios multiplica ese costo.

### B. Usuario verificado (objeto con brand) en los servicios

`getSessionUserService` devuelve un `VerifiedUser` con brand y los servicios lo reciben. Elimina la doble verificación, pero cambia la forma de todas las firmas (`user` en lugar de `userId`) y mantiene los `*ForUser` para la composición entre servicios.

### C. `userId: string` plano y la regla como convención

La puerta resuelve la sesión y pasa `user.id` como `string`. Es lo más simple, pero es exactamente el estado que #124 reporta como bug: la frontera vuelve a depender sólo de la disciplina. Si se eligiera, #124 tendría que cerrarse como riesgo aceptado, no como resuelto.

### D. `getClaims()` en el servicio

Valida el JWT localmente, sin HTTP. Pierde la revocación de sesión del lado del servidor, que `lib/supabase/proxy.ts` documenta como elección consciente. Descartada para esta frontera.

### E. Id con brand: `VerifiedUserId` (elegida)

El brand va en el id, no en el objeto. Las firmas conservan la forma `userId`, pero con un tipo que sólo produce la verificación de sesión:

```ts
// lib/services/auth.ts
declare const verifiedUserIdBrand: unique symbol;
export type VerifiedUserId = string & { readonly [verifiedUserIdBrand]: true };

export type SessionUser = { id: VerifiedUserId; email: string | undefined };

export async function getSessionUserService(client: SupabaseClient): Promise<SessionUser> { /* ... */ }
```

## Decisión

Opción E:

1. **Un solo productor.** `getSessionUserService` es el único código de la app que crea un `VerifiedUserId`. `requireUser()` y `getOptionalUser()` devuelven un `SessionUser` cuyo `id` ya es `VerifiedUserId`.
2. **Todo servicio con owner-scoping recibe `userId: VerifiedUserId`.** Un `string` cualquiera, incluido un id leído del input, no compila.
3. **Las puertas pasan `user.id`** de `requireUser()`. Llaman al guard una vez y no crean cliente de sesión para el servicio.
4. **Sin `*ForUser`.** Los servicios componen entre sí pasando el mismo `VerifiedUserId` que recibieron. `getDraftCalculationId`, `saveCalculatorSetupService` y `getCalculatorDraftSetupService` son a la vez la API de las puertas y la de composición.
5. **Casts permitidos sólo donde se crea la cuenta.** Además de `getSessionUserService`, sólo castean a `VerifiedUserId` el seed (`scripts/seed/costs.ts`) y la factory de tests (`tests/support/factories/user.ts`), porque crean el usuario por la Admin API. Cualquier `as VerifiedUserId` fuera de esos tres lugares es una señal de revisión.

## Qué garantiza y qué no

**Garantiza:**

- Un servicio no puede recibir un `string` arbitrario como dueño: el compilador exige un `VerifiedUserId`, que sólo sale del camino de verificación.
- Una puerta que lea el id del input o ensanche `user.id` a `string` falla al compilar. Al introducir el tipo, el compilador encontró helpers de paso-2, paso-3, paso-4 y de la home que ensanchaban `user.id` a `string`.
- Una sesión cerrada se rechaza en `getSessionUserService` (cubierto en `lib/services/calculator.int.test.ts`, con sesión real).

**No garantiza:**

- **Garantía de compilación, no de ejecución.** Un `as VerifiedUserId` o JavaScript sin tipos lo esquiva. Por eso los casts se limitan a tres archivos y el code review los vigila.
- **Que la puerta haya llamado a `requireUser()` en *esta* request.** Un `VerifiedUserId` guardado y reutilizado sigue compilando. Hoy ningún código lo guarda entre requests.
- **Autorización por recurso.** El id verificado no revisa que un `calculationId` o `businessId` recibido en el input pertenezca a ese usuario. Cada consulta debe filtrar por el `userId` recibido.
- **RLS no aplica hoy.** La defensa real es el filtro por dueño en el servicio.

## Server Actions

Los Server Actions son endpoints HTTP públicos: cualquier cliente puede invocarlos con su propia cookie de sesión, sin pasar por la UI. Por eso:

- La identidad sale de la cookie de sesión validada con `auth.getUser()`, nunca de los argumentos.
- Las validaciones del cliente no son seguridad.
- Cada acción debe limitar los ids de recurso a los del usuario autenticado. Esta auditoría no está hecha.

## Pendiente

- Auditar las acciones de `app/(calculator)/` por autorización de recursos.
- Una regla de lint que prohíba `as VerifiedUserId` fuera de los tres archivos permitidos.
- Decidir si se agrega un cache por request de `getUser` en renders (layout + page). Una server action es otro request, así que el cache no une sus llamadas.
