# BUG-006 — `/update-password` renderiza el formulario sin verificar sesión

| Campo | Valor |
| --- | --- |
| ID | BUG-006 |
| Severidad | Aviso |
| Estado | Abierto — pendiente de detalle |
| Origen | Code review de proyecto completo, 2026-10-10 |
| Módulo | `app/update-password/` |
| Verificación | Lectura de código |

## Qué pasa

Es el único formulario de mutación de la aplicación que se renderiza sin ninguna verificación de sesión. Las páginas `/dashboard` y `/profile` llaman a `requireUser()`; esta no.

Escenario: alguien visita `/update-password` sin sesión, por enlace directo o porque expiró la sesión de recuperación. El formulario se monta completo y acepta la contraseña; el error `AUTH_SESSION_MISSING` aparece recién después de que el usuario la escribió y la envió. La contraseña viaja al servidor sin necesidad.

Nota adicional: `updatePasswordService` usa `updateUser({ password })` sobre la sesión ambiente, sin pedir la contraseña actual, así que cualquier usuario con una sesión normal también puede cambiar su contraseña por esta ruta.

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

No aplica: verificado por lectura del archivo completo.

## Impacto

Fricción innecesaria en el flujo de recuperación, envío de credenciales a un servidor sin necesidad y ausencia de una garantía de que la pantalla solo exista en un contexto válido.

## Causa raíz

La página se creó como página pública sin considerar que su action sí requiere sesión.

## Dirección del arreglo

Proteger la página con `requireUser()` y redirigir a `/login` cuando no hay sesión. La sesión de recuperación que crea `/auth/confirm` sí pasa `getUser()`, así que el guard no rompería el flujo. Tradeoff: la página deja de ser estática y pasa a render dinámico.

## Qué NO se verificó

No se levantó la app para observar el comportamiento real del flujo de confirmación de email.