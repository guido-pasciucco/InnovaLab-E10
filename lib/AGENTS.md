# lib/ — Lógica y contratos del dominio

Todo lo que no es UI vive acá. Si es un cálculo, una validación o un tipo del negocio, va en `lib/`; si renderiza algo, va en `app/` o `components/`.

## Quién toca este directorio

| Rol | Qué hace en `lib/` |
| --- | --- |
| **Backend** | Dueño. Escribe y modifica todos los módulos salvo `store/` (ver "Frontera de responsabilidad"). |
| **Frontend** | Dueño de `store/`. Fuera de ahí consume: importa `schemas/`, `calc/`, `money/` y `types/` desde `components/`, `app/` y `store/`. Solo modifica `schemas/` para agregar un campo puramente cosmético del formulario. |

Guías de submódulos: [`schemas/AGENTS.md`](schemas/AGENTS.md), [`errors/AGENTS.md`](errors/AGENTS.md) y [`db/AGENTS.md`](db/AGENTS.md).

Guías de testing: [`TEST.md`](TEST.md) (casos de `lib/`) y la compartida del repo, [`../TEST.md`](../TEST.md).

## Mapa rápido

La columna **Dueño** indica qué rol del equipo es responsable del módulo (ver "Frontera de responsabilidad" más abajo).

| Módulo | Rol | Estado | Dueño |
| --- | --- | --- | --- |
| `auth/` | Guards de sesión para Server Components (`requireUser`) — solo servidor | Activa | Backend |
| `calc/` | Motor de cálculo: funciones puras (entra config + costos, salen resultados) | Esqueleto (ver #14) | **Backend** |
| `money/` | Aritmética decimal exacta con `decimal.js` | Esqueleto | **Backend** |
| `schemas/` | Contratos Zod compartidos entre cliente y servidor; reglas de campo en `<contrato>/fields.ts` (ver `schemas/AGENTS.md`) | Activa (`auth/`, `calculator-setup/`) | **Backend** (define las reglas) |
| `store/` | Estado de interfaz en el cliente. **No** persiste el cálculo: el borrador vive en servidor ([ADR 0005](../docs/decisiones/0005-persistencia-del-calculo-en-servidor.md)) | Esqueleto | **Frontend** (nota 4) |
| `errors/` | Manejo centralizado de errores: catálogo, `AppError` y adaptadores `handleRouteErrors`/`handleActionErrors` (ver `errors/AGENTS.md`) | Activa | **Backend** (adaptadores de transporte) |
| `db.ts` | Placeholder `server-only` | Temporal | Backend |
| `db/` | Persistencia en servidor (Drizzle): tablas, migraciones y cliente `getDrizzleClient()`; la consumen los servicios de `services/` ([ADR 0005](../docs/decisiones/0005-persistencia-del-calculo-en-servidor.md)) | Activa | Backend |
| `services/` | Lógica de negocio del servidor compartida por Server Actions y Route Handlers (transport-agnostic: recibe valores, devuelve datos planos) | Nueva (acuerdo vigente) | Backend |
| `supabase/` | Clientes Supabase por runtime (`proxy`, `rsc`) — solo servidor | Activa | Backend |
| `types/` | Tipos compartidos (p. ej. `FormState` del estado de forms) | Activa | **Backend** (si son del dominio) |

## Frontera de responsabilidad

> **Regla de una línea: en `lib/` va todo lo que es cálculo, validación o regla de negocio, y su dueño es Backend. `lib/store/` es la única excepción: es de Frontend (nota 4). Fuera de `lib/`, `app/` y `components/` son de Frontend.**

| Zona | Dueño |
| --- | --- |
| `lib/calc/`, `lib/money/`, `lib/schemas/`, `lib/services/`, `lib/db/`, `lib/errors/`, `lib/types/`, `lib/auth/`, `lib/supabase/` | **Backend** |
| `lib/store/` | **Frontend** — ver la nota 4 |
| `app/`, `components/` | **Frontend** |

Tres aclaraciones que evitan las confusiones más comunes:

1. **Dominio no es servidor.** `calc/` y `money/` son código puro: se testean sin renderizar nada y pueden ejecutarse en el navegador, en un Server Action o en un script. Que Backend sea su dueño **no** implica que corran en un servidor: lo que define es quién escribe la fórmula. Dónde se guarda el borrador es otra decisión, y ya está tomada: solo en servidor ([ADR 0005](../docs/decisiones/0005-persistencia-del-calculo-en-servidor.md)).
2. **Una regla, dos consumidores.** `schemas/` pertenece a Backend porque ahí vive la REGLA (qué es válido, qué mensaje ve el usuario). El formulario de `components/` es Frontend y consume ese schema. Si el formulario y el schema discrepan, **la regla gana**: se arregla el schema, nunca el mensaje en el JSX.
3. **Esto difiere del plan de sprints.** El plan listaba las funciones puras del motor bajo el rol Frontend. Esa asignación se corrige acá: las fórmulas y las validaciones son dominio, no interfaz. El plan se ajusta a esta frontera.

4. **`lib/store/` es de Frontend.** Es estado de la interfaz en el cliente, no regla de negocio: consume los schemas de `lib/schemas/`, pero nunca define reglas ni mensajes de validación. **No persiste el cálculo**: el borrador se guarda solo en servidor ([ADR 0005](../docs/decisiones/0005-persistencia-del-calculo-en-servidor.md)).

   La pregunta "¿librería que abstraiga estado y persistencia (`zustand`) o React Context + `useState`?" **queda sin objeto para H1 y H2**, porque el borrador no vive en el cliente. Se reabre solo si aparece una necesidad real de estado global de cliente. `zustand` **no está adoptada**.

   Lo que ya se verificó con evidencia, por si la pregunta se reabre:

   - `zustand` **no está en `package.json`** y tiene cero apariciones en el repo: adoptarla es una dependencia nueva, no un default del proyecto.
   - Su middleware `persist` tiene **el mismo problema de hidratación** que cualquier estado persistido en el cliente; usarlo exigiría `skipHydration: true` + `rehydrate()` en un efecto, o sea reimplementar a mano un `hasHydrated`, pero con dependencia permanente.
   - El repo tiene **cero** `createContext`, `useContext`, `Provider` y `localStorage`: no hay precedente que empuje en ninguna dirección.

   El dueño ya está resuelto: un ticket que toca `lib/store/` se clasifica `FRONTEND`.

**Consecuencia práctica:** una issue etiquetada `FRONTEND` puede tocar `lib/store/` y consumir cualquier schema, pero solo modifica `lib/schemas/` si agrega un campo puramente cosmético al formulario. Si el storage necesita una regla nueva, la agrega Backend en `lib/schemas/`. Lo que **nunca** se reparte es la fórmula: `lib/calc/` y `lib/money/` tienen un solo dueño.

## Reglas (no negociables)

1. **Dominio puro.** `calc/` y `money/` no importan React, Next ni `db/`. Se testean sin renderizar nada.
2. **Zod en el borde.** Toda entrada se valida al entrar (formulario o API). La validación del servidor vive una sola vez en el servicio (`lib/services`), que cubre Server Actions y Route Handlers; las puertas le pasan la entrada cruda. Adentro del cálculo no se valida, se calcula.
3. **Plata con `decimal.js`.** Nunca `float` para dinero o cantidades (ver `0.1 + 0.2`).
4. **Servidor queda en el servidor.** Lo marcado `server-only` (incluido `db/`) solo se importa desde Server Components, Server Actions o Route Handlers. Nunca desde un componente cliente.
5. **Fuente única.** Cada fórmula vive en un solo lugar (`lib/calc`); los tipos se infieren (`z.infer`, `$inferSelect`), no se duplican a mano.
6. **El servidor completa lo suyo.** `id`, dueño y timestamps los pone el servidor, nunca el cliente.
7. **Servicios agnósticos al transporte.** `services/` no recibe `Request` ni devuelve `Response`/status codes: recibe valores y devuelve datos planos. Ante un fallo lanzan `AppError`, sin `try/catch`; cada puerta traduce con `handleRouteErrors` (status HTTP) o `handleActionErrors` (estado del form). Ver `errors/AGENTS.md`.

## Checklist para verificar un cambio en `lib/`

- [ ] `calc/` y `money/` no importan nada de `app/`, `components/` ni `db/`.
- [ ] Hay al menos un test que cubre el cambio, co-localizado junto al módulo (`<modulo>.test.ts`, o `<modulo>.int.test.ts` si toca la base). El test sigue [`TEST.md`](TEST.md) y [`../TEST.md`](../TEST.md).
- [ ] Los montos usan `decimal.js`, no `number` con decimales.
- [ ] Si el cambio toca persistencia, respeta `db/AGENTS.md`.

## Siguiente paso

Ver issues #12 (tipos), #13 (librerías) y #14 (motor). La persistencia del cálculo está decidida en el [ADR 0005](../docs/decisiones/0005-persistencia-del-calculo-en-servidor.md) (cierra lo que abría #15).
