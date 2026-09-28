# Ejemplo: API HTTP de autenticación (`/api/auth/*`)

> [!NOTE]
> Este código **no está en el proyecto**. Se eliminó porque ningún consumidor lo usaba: los formularios de auth llaman a Server Actions (`app/*/actions.ts`). Este documento deja registro de cómo reactivarlo si alguna vez hace falta.

## ¿Cuándo haría falta?

Solo cuando quien consume la autenticación **no es el frontend de Next.js**:

- Una app **nativa** (React Native, Flutter, Swift, Kotlin), que no puede invocar Server Actions.
- Un **tercero** que se integre por HTTP.

**No** hace falta para una PWA: una PWA es la misma app web instalada, corre en el mismo dominio con las mismas cookies y usa los Server Actions igual que el navegador.

## Cómo recuperar el código completo

La última versión funcional está en el commit `cd44590` (rama `feat/central-error-catalog`, PR #48):

```bash
git show cd44590:app/api/auth/login/route.ts
git checkout cd44590 -- app/api/auth lib/supabase/server.ts
```

Si la rama ya no existe, GitHub conserva el commit en la referencia del PR: `git fetch origin pull/48/head`.

Incluía seis rutas (`login`, `logout`, `signup`, `reset-password`, `update-password`, `session`) y el cliente `lib/supabase/server.ts`.

## Cómo está armado

Las rutas son **puertas HTTP delgadas**: no tienen lógica propia. Reciben el input crudo, crean un cliente de Supabase atado a las cookies del request y llaman al **mismo service** que usan los Server Actions (`lib/services/auth.ts`). Los errores los traduce `handleRouteErrors` (`lib/errors/handle-route-errors.ts`), que sigue en el proyecto.

```
Server Action (app/login/actions.ts) ──┐
                                       ├──► loginService(client, input)
Route Handler (app/api/auth/login) ────┘
```

### El cliente (`lib/supabase/server.ts`)

En un Route Handler no se usa `cookies()` de `next/headers`: las cookies nuevas (por ejemplo, la sesión que crea `signInWithPassword`) se acumulan y después se copian al `NextResponse` que devuelve la ruta.

```ts
import "server-only";

import { type NextRequest, type NextResponse } from "next/server";
import { createServerClient, parseCookieHeader, type CookieOptions } from "@supabase/ssr";

type PendingCookie = { name: string; value: string; options?: CookieOptions };

export function createServerSupabaseClient(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase environment variables");
  }

  const pendingCookies: PendingCookie[] = [];

  const client = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => parseCookieHeader(request.cookies.toString()),
      setAll: (cookiesToSet) => {
        pendingCookies.push(...cookiesToSet);
      },
    },
  });

  function applyCookies(response: NextResponse): NextResponse {
    for (const { name, value, options } of pendingCookies) {
      response.cookies.set(name, value, options);
    }
    return response;
  }

  return { client, applyCookies };
}
```

### Una ruta (`app/api/auth/login/route.ts`)

```ts
import { type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loginService } from "@/lib/services/auth";
import { ok, handleRouteErrors } from "@/lib/errors/handle-route-errors";

export const POST = handleRouteErrors(async (request: NextRequest) => {
  const body: unknown = await request.json().catch(() => null);

  const { client, applyCookies } = createServerSupabaseClient(request);
  await loginService(client, body);

  // signInWithPassword creates a new session: copy its cookies onto this response.
  return applyCookies(ok({ ok: true }));
}, "AUTH_UNAVAILABLE");
```

El resto de las rutas sigue el mismo patrón y solo cambia el service que llaman.

## Qué corregir antes de reactivarlo

El código eliminado tenía problemas conocidos. Si se reactiva, hay que resolverlos:

1. **Login CSRF.** Next valida el `Origin` en los Server Actions, pero **no** en los Route Handlers. Además, `request.json()` ignora el `Content-Type`, así que un formulario de otro sitio con `text/plain` podía loguear a la víctima en la cuenta del atacante o desloguearla. Corrección: rechazar requests cuyo `Origin` no sea el propio sitio y exigir `Content-Type: application/json`.
2. **Reset de password sin cookies.** `reset-password` descartaba `applyCookies`, así que se perdía la cookie del *code verifier* de PKCE. Tiene que aplicarlas como las demás rutas.
3. **Canje del code PKCE.** Igual que en los Server Actions, falta una ruta de callback que canjee el `code` del mail por una sesión (`exchangeCodeForSession`).
4. **Consumidores nativos y cookies.** Una app nativa no maneja cookies como un navegador. Probablemente convenga que reciba el token de acceso en el body y lo mande en `Authorization: Bearer`, en vez de reutilizar tal cual estas rutas pensadas para cookies.
