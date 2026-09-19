# server-only — La base de datos nunca llega al cliente

`server-only` (`^0.0.1`) marca módulos como exclusivos del servidor. Si algún componente de cliente los importa, Next.js falla en el build en lugar de filtrar secretos al bundle del navegador.

## Problema que resuelve

En Next.js es fácil importar por accidente un helper de base de datos o un cliente con service role desde un componente de cliente. El resultado es grave: credenciales y acceso directo a la base terminan en el JavaScript enviado al navegador. Sin esta barrera, el error solo se descubre por inspección manual.

## Cómo se usa en este proyecto

| Aspecto          | Decisión                                                                                                               |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Dónde aplica     | `lib/db.ts` y todo lo que toque secretos o Supabase (helpers de servidor, clientes con service role)                   |
| Cómo se marca    | Primera línea del módulo: `import "server-only"`                                                                       |
| Qué garantiza    | Error de build ante cualquier `import` transitivo desde código de cliente                                              |
| Lectura de datos | Los Server Components leen la persistencia directo con `import` de `lib/db`. Nunca con `fetch` interno a la propia API |

Regla de importación (ver README, sección de contratos): lógica pura (`lib/calc`, `lib/money`, `lib/schemas`) por `import` directo; cliente → API solo por `fetch`; Server Component → persistencia por `import` de `lib/db`.

## Ejemplo mínimo

```ts
// lib/db.ts
import "server-only";

// ... cliente de base de datos, helpers con secretos ...
```

```tsx
// app/(wizard)/resultados/page.tsx (Server Component)
import { getCalculation } from "@/lib/db"; // directo, sin fetch
```

## Errores comunes

- **Olvidar el `import "server-only"`.** Sin esa línea no hay protección: el módulo parece de servidor pero nada impide importarlo desde el cliente.
- **Reexportar a través de un módulo compartido.** Si `lib/db` se reexporta desde un barrel importado por el cliente, el build falla igual (es lo correcto) pero el mensaje confunde. Importar `lib/db` solo desde Server Components, Route Handlers y Server Actions.
- **Poner secretos en variables públicas.** Las variables `NEXT_PUBLIC_*` viajan al cliente por diseño; las claves privadas viven solo en variables de entorno de servidor.
- **Hacer `fetch` a la propia API desde un Server Component.** Latencia y salto HTTP innecesarios; leer directo con `lib/db`.

## Paso siguiente

Ver README raíz, sección 2 (contratos): fuente única Zod, regla fetch-vs-import y lista de prohibiciones.
