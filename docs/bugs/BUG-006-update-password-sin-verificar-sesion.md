# BUG-006 — `/update-password` renderiza el formulario sin verificar sesión

| Campo | Valor |
| --- | --- |
| ID | BUG-006 |
| Severidad | Aviso |
| Estado | **Resuelto** — rama `fix/bug-006-update-password-sesion` |
| Origen | Code review de proyecto completo, 2026-10-10 |
| Módulo | `app/update-password/`, `lib/auth/`, `app/reset-password/` |
| Verificación | Ejecutado (reproducido en runtime contra el stack local) |

## Qué pasa

Es el único formulario de mutación de la aplicación que se renderiza sin ninguna verificación de sesión. Las páginas `/dashboard` y `/profile` llaman a `requireUser()`; esta no.

Escenario: alguien visita `/update-password` sin sesión, por enlace directo o porque expiró la sesión de recuperación. El formulario se monta completo y acepta la contraseña; el error `AUTH_SESSION_MISSING` aparece recién después de que el usuario la escribió y la envió. La contraseña viaja al servidor sin necesidad.

Nota adicional: `updatePasswordService` usa `updateUser({ password })` sobre la sesión ambiente, sin pedir la contraseña actual, así que cualquier usuario con una sesión normal también puede cambiar su contraseña por esta ruta.

Matiz que la revisión original no explicitaba: **no es un fallo de autorización**. Un anónimo no puede cambiar la contraseña de nadie — la identidad sale siempre de la cookie de sesión, nunca del payload, y sin sesión Supabase devuelve `AuthSessionMissingError` → `AUTH_SESSION_MISSING` (401). Lo que faltaba era la verificación *temprana*: la pantalla y el envío existen sin un contexto válido, y el servidor hace de filtro tardío.

## Dónde está

- `app/update-password/page.tsx:3` — la función del componente, sin guard de sesión.
- `lib/services/auth.ts:149` — `updatePasswordService` con `updateUser`.
- `app/dashboard/page.tsx:8` — uno de los dos `requireUser()` que sí existen, como contraste.
- `app/profile/page.tsx:9` — el otro `requireUser()`, como contraste.

## Evidencia

Archivo completo, `app/update-password/page.tsx`:

```tsx
import UpdatePasswordForm from "./update-password-form";

export default function UpdatePasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md">
        <h1 className="text-center text-2xl font-bold text-gray-900">Set new password</h1>
        <p className="mt-2 text-center text-sm text-gray-600">
          Choose a new password for your account
        </p>
        <div className="mt-6">
          <UpdatePasswordForm />
        </div>
      </div>
    </main>
  );
}
```

## Reproducción

Ejecutado contra el stack local (Supabase CLI + `next dev`), no solo por lectura de código.

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3100/update-password   # 200 (formulario completo)
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3100/dashboard          # 307 -> /login
```

Salida real (navegador, sin sesión):

```
URL final: http://127.0.0.1:3100/update-password
¿titulo 'Set new password' visible?  true
¿input 'New password' visible?  true
¿boton 'Update password' visible?  true
mensaje que ve el usuario: "Your session has expired. Please request a new link"
POST de la action (cuerpo enviado al servidor):
    http://127.0.0.1:3100/update-password -> ["$undefined",{"password":"ClaveSinSesion123!"}]
```

La última línea es la evidencia central: **la contraseña viaja al servidor en claro** para que el servidor la rechace después.

Con una **sesión normal** (nunca pasó por un link de recuperación) el formulario también renderiza y el cambio se acepta sin pedir la contraseña actual:

```
sesión iniciada, URL: http://127.0.0.1:3100/
¿formulario visible con sesión normal?  true
cambio de contraseña aceptado SIN pedir la contraseña actual -> redirige a http://127.0.0.1:3100/login
login con la contraseña nueva: OK
```

En el build de producción la página se prerenderizaba como contenido estático (`○ /update-password`), mientras `/dashboard` y `/profile` eran dinámicas (`ƒ`).

## Impacto

Fricción innecesaria en el flujo de recuperación, envío de credenciales a un servidor sin necesidad y ausencia de una garantía de que la pantalla solo exista en un contexto válido.

## Causa raíz

La página se creó como página pública sin considerar que su action sí requiere sesión. La validación existía, pero en la capa equivocada: la action la hace en el submit (la password ya llegó al servidor), y el render no la hace nunca.

## Dirección del arreglo

Proteger la página con `requireUser()` y redirigir a `/login` cuando no hay sesión. La sesión de recuperación que crea `/auth/confirm` sí pasa `getUser()`, así que el guard no rompería el flujo. Tradeoff: la página deja de ser estática y pasa a render dinámico.

## Qué se corrigió

1. **`lib/auth/require-user.ts`** — `requireUser()` acepta un destino de redirect (`redirectTo`), con `/login` como valor por defecto. El destino es la ruta propia de la página, así que puede llevar query string para explicar qué pasó.
2. **`app/update-password/page.tsx`** — la página llama al guard con `redirectTo: "/reset-password?error=AUTH_SESSION_MISSING"`. Sin sesión, el usuario vuelve a pedir un link, con el motivo en pantalla, en vez de caer en `/login` sin contexto.
3. **`app/reset-password/link-error.ts`** — `AUTH_SESSION_MISSING` entra en la allowlist de `?error=`, así que el mensaje del catálogo se renderiza (antes se ignoraba).

Verificación del arreglo:

- Unit: `lib/auth/require-user.test.ts` (redirect al destino dado), `app/reset-password/link-error.test.ts` (mensaje de sesión expirada). 242 tests en verde.
- E2E: nuevo `tests/e2e/auth/update-password.spec.ts` ("an anonymous visitor is redirected from /update-password to the reset request page"). Suite completa: **11 passed**.
- Regresión del flujo de recuperación: `reset-password.spec.ts` sigue en verde — "the reset email exchanges the code and lands on /update-password" y "a user sets a new password from the reset email".
- Build: `/update-password` pasa de `○` (static) a `ƒ` (dynamic), que es el tradeoff aceptado.

## Deuda que queda

1. **La ruta sigue aceptando cualquier sesión, no solo la de recuperación.** Con el alcance de este arreglo, un usuario con una sesión normal (o con una sesión robada) puede cambiar su contraseña por `/update-password` sin la contraseña actual. La protección real exigiría distinguir la sesión de recuperación de una sesión normal (p. ej. una marca que `/auth/confirm` deje al intercambiar el código). Es un arreglo de otra escala: toca `app/auth/confirm/route.ts`, el guard y la page.
2. **`supabase/config.toml:229` — `secure_password_change = false`.** GoTrue no exige re-autenticación para cambiar la contraseña. Es configuración, no código, y en producción debería ir en `true` si se aplica el punto 1.

## Qué NO se verificó

- El comportamiento con la sesión de recuperación **expirada** en un entorno con Supabase real (la sesión local no expira en el minuto de la prueba). El camino está cubierto por el guard, que trata la sesión ausente y la expirada igual.
- El caso de `secure_password_change = true`, que exigiría re-autenticación y cambiaría el flujo de la action.
