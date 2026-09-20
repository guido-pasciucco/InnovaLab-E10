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

## Aclaración: cliente no significa navegador

"Cliente" designa dos conceptos distintos que conviene no mezclar:

| Sentido | Significado |
| --- | --- |
| Biblioteca cliente | El objeto creado con `createClient`. Es código JavaScript que puede ejecutarse en el navegador o en el servidor. "Cliente" significa aquí "quien habla con el servidor de Supabase". |
| Cliente como front | El navegador del usuario. |

Cuando esta documentación dice "cliente Supabase", se refiere a la biblioteca, salvo que indique expresamente el navegador.

La biblioteca es además una abstracción (wrapper) sobre HTTP: `supabase.from("businesses").select("*")` no es SQL, sino que construye una petición REST que PostgREST traduce a SQL del otro lado:

```ts
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://your-project.supabase.co", // a dónde hablo
  "sb_publishable_your_key_here",     // con qué permiso hablo
);
// GET https://your-project.supabase.co/rest/v1/businesses?select=*
// Authorization: Bearer <JWT> · apikey: <publishable key>
```

En ese sentido funciona como un ORM liviano sobre la API: expone métodos tipados (`from`, `auth`, `storage`) y oculta los detalles HTTP. Drizzle es la abstracción complementaria sobre SQL directo (protocolo wire de Postgres). Ninguna de las dos es magia: una envuelve REST, la otra envuelve SQL.

## Topología de este proyecto: backend mediado

La arquitectura Clean lite exige borde delgado que valida y delega. Hay dos topologías posibles:

- Directa: navegador → Supabase (RLS como única guardia). Rápida, pero el navegador habla con la base.
- Mediada (la adoptada): navegador → `/api/*` propia → Supabase/Drizzle. El navegador jamás importa el cliente Supabase ni ve una query. Los Route Handlers validan con Zod, obtienen el usuario desde la cookie en el servidor y recién entonces hablan con Supabase o Drizzle.

En la topología mediada, `createBrowserClient` no se utiliza: todo vive en el servidor (`createServerClient` + Drizzle). Las variables podrían incluso dejar de usar el prefijo `NEXT_PUBLIC_*`, ya que el navegador nunca las lee.

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

## Conclusión: por qué Auth pasa por Supabase (pregunta cerrada)

Supabase Auth abstrae la capa completa de identidad: guarda usuarios en `auth.users` (hash, confirmaciones), emite JWT firmados y gestiona su renovación. Los Route Handlers la consumen para login, pero los Server Components y el middleware —que no son endpoints— necesitan leer y refrescar esa sesión desde las cookies; para eso existe `@supabase/ssr`. Drizzle ejecuta SQL pero nunca identifica: el `userId` que filtra `owner_user_id` siempre proviene de la sesión validada. Por eso ambas dependencias se conservan aunque todos los datos pasen por Drizzle.

## Ejemplo de implementación: cálculo protegido (topología mediada, ilustrativo)

Flujo completo con login vía API propia, refresh en middleware y escritura con Drizzle. El navegador solo habla con `/api/*`; nunca importa el cliente Supabase. Estos fragmentos son ilustrativos, los helpers reales aún no existen.

Paso 1 — Login mediado (`app/api/auth/login/route.ts`):

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: Request) {
  const input = loginSchema.parse(await req.json()); // validate at the edge
  const cookieStore = await cookies();
  const supabase = createServerClient(URL, KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
    },
  });
  const { error } = await supabase.auth.signInWithPassword(input);
  if (error) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  return NextResponse.json({ ok: true }); // session persisted via setAll cookies
}
```

Paso 2 — El middleware refresca la sesión en cada request con `getClaims` (ver sección de uso previsto). Sin este paso, el token vence y el servidor ve al usuario como anónimo.

Paso 3 — Ruta protegida con Drizzle (`app/api/calculations/route.ts`):

```ts
// 1. Identify: validate session, obtain userId (never trust client-sent ids)
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
// 2. Validate: public Zod input carries only productId
const input = createCalculationInputSchema.parse(await req.json());
// 3. Execute: server fills userId/businessId, Drizzle writes
await db.insert(calculations).values({ userId: user.id, businessId, productId: input.productId });
```

Paso 4 — RLS como red de seguridad: aunque el handler ya filtra por `userId`, la política `auth.uid() = owner_user_id` rechaza en la base cualquier fila ajena si el código se equivoca.

Orden del flujo: navegador → `/api/auth/login` (cookie) → middleware (refresh) → `/api/calculations` (sesión + Zod + Drizzle) → Postgres con RLS.
