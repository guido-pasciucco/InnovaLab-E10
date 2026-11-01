# server-only — La base de datos nunca llega al cliente

`server-only` (`^0.0.1`) marca módulos como exclusivos del servidor. Si algún componente de cliente los importa, Next.js falla en el build en lugar de filtrar secretos al bundle del navegador.

## Problema que resuelve

En Next.js es fácil importar por accidente un helper de base de datos o un cliente con service role desde un componente de cliente. El resultado es grave: credenciales y acceso directo a la base terminan en el JavaScript enviado al navegador. Sin esta barrera, el error solo se descubre por inspección manual.

## Cómo se usa en este proyecto

| Aspecto | Decisión |
| --- | --- |
| Dónde aplica | Los módulos que tocan la base o Supabase: `lib/db/` (el cliente `getDrizzleClient()` vive en `lib/db/client.ts`), `lib/services/`, `lib/supabase/` y `lib/auth/` |
| Cómo se marca | Primera línea del módulo: `import "server-only"` |
| Qué garantiza | Error de build ante cualquier `import` transitivo desde código de cliente |
| Lectura de datos | Los Server Components leen la persistencia a través de los servicios de `lib/services` (que usan `lib/db` por dentro). Nunca importan `lib/db` ni hacen `fetch` a su propia API |

Regla de importación (ver README raíz, sección 2, "Contratos (vinculantes)"): la lógica pura (`lib/calc`, `lib/money`, `lib/schemas`) se importa directo; la persistencia del servidor se alcanza llamando a un servicio de `lib/services` (nunca importando `lib/db`, que es un detalle interno de los servicios); y un componente de cliente solo llega al servidor por `fetch`, jamás importando `route.ts`.

> [!IMPORTANT]
> No confundir dos reglas distintas, ambas vigentes. La **frontera cliente/servidor**: lo marcado `server-only` solo se importa desde el servidor (Server Components, Server Actions y Route Handlers), nunca desde un componente de cliente. La **regla de capas**: `lib/db` es un detalle interno y solo lo consumen los servicios de `lib/services`, aun del lado del servidor. Un Server Component cumple la primera regla y, por la segunda, igual lee la base a través de un servicio.

## Ejemplo mínimo

```ts
// lib/db/client.ts
import "server-only";

// ... getDrizzleClient() sobre DATABASE_URL, helpers con secretos ...
```

```tsx
// app/(calculator)/paso-1/page.tsx (Server Component)
import { requireUser } from "@/lib/auth/require-user";
import { getCalculatorSetupService } from "@/lib/services/calculator";

export default async function Paso1Page() {
  const user = await requireUser();
  const setup = await getCalculatorSetupService(user.id);
  // ...
}
```

## Clientes de sesi?n y cookies

En `lib/supabase/rsc.ts`, `createRscSupabaseClient()` es de lectura: no intenta escribir cookies durante el render. El proxy conserva la renovaci?n y el reenv?o de cookies a la p?gina y al navegador.

Las Server Actions y los Route Handlers que cambian autenticaci?n usan `createWritableSupabaseClient()`. Sus escrituras son obligatorias, incluidas las del verificador PKCE; un fallo se propaga a la puerta existente y nunca se informa como ?xito. El error de persistencia se sanitiza antes de llegar al SDK o al logger para excluir valores de cookies; el control de flujo de Next se relanza intacto. No usar el cliente de lectura para login, logout o recuperaci?n.

## Errores comunes

- **Olvidar el `import "server-only"`.** Sin esa línea no hay protección: el módulo parece de servidor pero nada impide importarlo desde el cliente.
- **Importar `lib/db` fuera de `lib/services`.** `lib/db` es un detalle interno: aun del lado del servidor solo lo consumen los servicios de `lib/services`. Un Server Component, una Server Action o un Route Handler leen la base llamando a un servicio, no importando `lib/db`.
- **Reexportar a través de un módulo compartido.** Si un módulo `server-only` se reexporta desde un barrel que importa el cliente, el build falla igual (es lo correcto) pero el mensaje confunde.
- **Poner secretos en variables públicas.** Las variables `NEXT_PUBLIC_*` viajan al cliente por diseño; las claves privadas viven solo en variables de entorno de servidor.
- **Hacer `fetch` a la propia API desde un Server Component.** Latencia y salto HTTP innecesarios; se llama al servicio de `lib/services` directo.

## Paso siguiente

Ver README raíz, sección 2, "Contratos (vinculantes)": fuente única Zod, regla fetch-vs-import y lista de prohibiciones.
