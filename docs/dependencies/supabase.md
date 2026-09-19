# supabase — Postgres + Auth conectados a Next.js App Router

`@supabase/supabase-js` (`^2.116.0`) + `@supabase/ssr` (`^0.12.7`) conectan Next.js 16 App Router con Supabase (Postgres + autenticación). El primer paquete aporta los clientes de datos y auth; el segundo los adapta al modelo de cookies y runtimes de Next.js.

> **Estado: solo instalación.** Los helpers de conexión aún no existen. Este documento describe el uso previsto, no módulos ya creados.

## Problema que resuelve

Un cliente Supabase plano no entiende los tres runtimes de Next.js (navegador, servidor, middleware) ni el almacenamiento de sesión en cookies con refresh automático. Sin la capa SSR, la sesión expira, los Server Components no ven al usuario autenticado y el código termina duplicando lógica de cookies a mano.

| Paquete                | Qué aporta                                                                                          | Rol en Next.js                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `@supabase/supabase-js` | Clientes PostgREST, GoTrue (auth), Storage y Realtime para queries y autenticación                   | Base: consultas, login, storage, suscripciones              |
| `@supabase/ssr`        | `createBrowserClient` (singleton en navegador, flujo PKCE) y `createServerClient` (`getAll`/`setAll`) | Adapta la sesión a cookies de Next.js en cada runtime       |
| Patrón middleware      | Refresh con `getClaims` / `getUser`, sesión perezosa (lazy), cookies en base64url                    | Mantiene la sesión vigente en cada request sin recargarla de más |

## Cómo se usará en este proyecto

| Aspecto          | Decisión                                                                                                                |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Helper servidor  | Uso previsto: `lib/supabase/server` con `import "server-only"` y `createServerClient` con `getAll`/`setAll` (aún no creado) |
| Helper cliente   | Uso previsto: helper separado solo para componentes de cliente con `createBrowserClient` singleton (aún no creado)         |
| Middleware       | Uso previsto: `middleware.ts` en la raíz con `matcher` que excluye estáticos, refrescando sesión con `getClaims`/`getUser` (aún no creado) |
| Lectura de datos | Los Server Components leerán directo con el helper de servidor. Nunca con `fetch` interno a la propia API               |
| Dominio          | `lib/calc` y `lib/money` permanecen puros; la conversión fila ↔ dominio ocurre en la frontera, nunca dentro del dominio  |

## Ejemplo mínimo

```ts
import { createBrowserClient } from "@supabase/ssr";

// Client Component: singleton in the browser with PKCE flow
export const browserClient = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);
```

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server context: cookie adapter with getAll / setAll
export async function serverClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (list) => list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } }
  );
}
```

## Errores comunes

- **Usar `@supabase/auth-helpers-nextjs` (deprecado).** El paquete vigente para Next.js App Router es `@supabase/ssr`. Los auth-helpers ya no reciben soporte.
- **Reutilizar el mismo cliente en los tres runtimes.** Navegador, servidor y middleware necesitan fábricas separadas; compartir instancias mezcla sesiones y rompe las cookies.
- **Olvidar el refresh en el middleware.** Sin middleware que renueve la sesión, el token expira y los Server Components ven al usuario como anónimo aunque haya iniciado sesión.
- **Exponer `service_role` en el cliente.** La clave con bypass de RLS vive solo en el servidor (variable sin prefijo `NEXT_PUBLIC_*`). En el navegador solo viaja la clave publicable.

## Paso siguiente

Crear los helpers (`lib/supabase/server` y helper de cliente) más `middleware.ts` raíz, y configurar `.env.local` desde `.env.example`. Ver `.env.example` para las variables requeridas.
