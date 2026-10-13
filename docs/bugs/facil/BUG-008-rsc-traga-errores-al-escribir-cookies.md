# BUG-008 — `lib/supabase/rsc.ts` traga incondicionalmente cualquier error al escribir cookies

| Campo | Valor |
| --- | --- |
| ID | BUG-008 |
| Severidad | Aviso |
| Estado | Abierto — pendiente de detalle |
| Origen | Code review de proyecto completo, 2026-10-10 |
| Módulo | `lib/supabase/rsc.ts` |
| Verificación | Lectura de código |

## Qué pasa

El adaptador `setAll` envuelve la escritura de cookies en un `try/catch` cuyo `catch` no distingue entre "estoy en un Server Component y Next prohíbe escribir cookies" y "la escritura falló". El comentario asume siempre lo primero.

En un Server Action `cookies()` es mutable, así que un fallo ahí no es esperado: es un bug. Y hoy no hay forma de notarlo.

Escenario A, login: `app/login/actions.ts` corre `signInWithPassword` y la sesión se escribe por este adaptador. Si la escritura falla, la action devuelve `ok: true`, la UI navega a `/dashboard`, `requireUser()` no encuentra cookie y rebota a `/login`. El usuario se logueó y no.

Escenario B, logout, más grave: `app/dashboard/actions.ts` corre `signOut()`. Si el `setAll` que borra la cookie se traga la excepción, el navegador conserva una sesión viva después de cerrar sesión, y el proxy la refresca en el request siguiente.

El comentario además es impreciso en el fondo: el proxy solo rota una sesión existente; no puede acuñar una que nunca llegó al navegador.

## Dónde está

- `lib/supabase/rsc.ts:29-35` — el `setAll` y su `catch`.
- `app/login/actions.ts:16` — `signInWithPassword`.
- `app/dashboard/actions.ts:12` — `signOut`.
- `lib/supabase/proxy.ts:44` — `getClaims`, que solo rota.

## Evidencia

```ts
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies — the proxy handles refresh.
          // Swallow the error as recommended by Supabase SSR docs for RSC.
        }
      },
```

## Reproducción

No aplica: verificado por lectura del código.

## Impacto

Sesiones que sobreviven a un logout y usuarios que parecen autenticados sin serlo, sin ninguna señal en logs ni en tests.

## Causa raíz

La recomendación de Supabase para el runtime de Server Components se aplicó sin condicionar por runtime, cuando el comportamiento solo corresponde a un caso.

## Dirección del arreglo

 Tragarse únicamente el error específico de Next o condicionar por runtime (Server Action y Route Handler admiten escritura). Relanzar o al menos loguear el resto. Agregar `lib/supabase/rsc.test.ts`, que hoy no existe aunque el módulo sea testeable según `lib/AGENTS.md`.

## Qué NO se verificó

No se observó un fallo real de escritura de cookies; el análisis es sobre la estructura del manejo de errores.