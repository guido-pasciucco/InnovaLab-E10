# lib/ — Lógica y contratos del dominio

Todo lo que no es UI vive acá. Si es un cálculo, una validación o un tipo del negocio, va en `lib/`; si renderiza algo, va en `app/` o `components/`.

## Quién toca este directorio

| Rol | Qué hace en `lib/` |
| --- | --- |
| **Backend** | Dueño. Escribe y modifica todos los módulos salvo `store/` (ver "Frontera de responsabilidad"). |
| **Frontend** | Consume: importa `schemas/`, `calc/`, `money/` y `types/` desde `components/` y `app/`. Solo modifica `schemas/` para agregar un campo puramente cosmético del formulario. `store/` está en investigación y no tiene dueño asignado (nota 4). |

Guías de submódulos: [`schemas/AGENTS.md`](schemas/AGENTS.md), [`errors/AGENTS.md`](errors/AGENTS.md) y [`db/AGENTS.md`](db/AGENTS.md).

## Mapa rápido

La columna **Dueño** indica qué rol del equipo es responsable del módulo (ver "Frontera de responsabilidad" más abajo).

| Módulo | Rol | Estado | Dueño |
| --- | --- | --- | --- |
| `auth/` | Guards de sesión para Server Components (`requireUser`) — solo servidor | Activa | Backend |
| `calc/` | Motor de cálculo: funciones puras (entra config + costos, salen resultados) | Esqueleto (ver #14) | **Backend** |
| `money/` | Aritmética decimal exacta con `decimal.js` | Esqueleto | **Backend** |
| `schemas/` | Contratos Zod compartidos entre cliente y servidor | Esqueleto | **Backend** (define las reglas) |
| `store/` | Estado del calculator en el cliente | Esqueleto | **En investigación** (nota 4) |
| `errors/` | Manejo centralizado de errores: catálogo, `AppError` y adaptadores `handleRouteErrors`/`handleActionErrors` (ver `errors/AGENTS.md`) | Activa | **Backend** (adaptadores de transporte) |
| `db.ts` | Placeholder `server-only` | Temporal | Backend |
| `db/` | Persistencia en servidor (Drizzle) | Spike en evaluación (ver #15) | Backend |
| `services/` | Lógica de negocio del servidor compartida por Server Actions y Route Handlers (transport-agnostic: recibe valores, devuelve datos planos) | Nueva (acuerdo vigente) | Backend |
| `supabase/` | Clientes Supabase por runtime (`proxy`, `rsc`) — solo servidor | Activa | Backend |
| `types/` | Tipos compartidos (p. ej. `FormState` del estado de forms) | Activa | **Backend** (si son del dominio) |

## Frontera de responsabilidad

> **Regla de una línea: en `lib/` va todo lo que es cálculo, validación o regla de negocio, y su dueño es Backend. `lib/store/` es la única excepción, y está en investigación (nota 4). Fuera de `lib/`, `app/` y `components/` son de Frontend.**

| Zona | Dueño |
| --- | --- |
| `lib/calc/`, `lib/money/`, `lib/schemas/`, `lib/services/`, `lib/db/`, `lib/errors/`, `lib/types/`, `lib/auth/`, `lib/supabase/` | **Backend** |
| `lib/store/` | **En investigación** — ver la nota 4 |
| `app/`, `components/` | **Frontend** |

Tres aclaraciones que evitan las confusiones más comunes:

1. **Dominio no es servidor.** `calc/` y `money/` son código puro: se testean sin renderizar nada y pueden ejecutarse en el navegador, en un Server Action o en un script. Que Backend sea su dueño **no** implica que corran en un servidor. La arquitectura es local-first y eso no cambia: lo que cambia es quién escribe la fórmula.
2. **Una regla, dos consumidores.** `schemas/` pertenece a Backend porque ahí vive la REGLA (qué es válido, qué mensaje ve el usuario). El formulario de `components/` es Frontend y consume ese schema. Si el formulario y el schema discrepan, **la regla gana**: se arregla el schema, nunca el mensaje en el JSX.
3. **Esto difiere del plan de sprints.** El plan listaba las funciones puras del motor bajo el rol Frontend. Esa asignación se corrige acá: las fórmulas y las validaciones son dominio, no interfaz. El plan se ajusta a esta frontera.

4. **`lib/store/` está en investigación y por eso no tiene dueño asignado.** La pregunta abierta es una sola, y es **de Frontend**: **¿se adopta una librería que abstraiga el estado y la persistencia, o se resuelve con React Context + `useState`?** La candidata sobre la mesa es `zustand`, que aparece en los tickets viejos del proyecto. **No está adoptada.**

   Lo que ya se verificó con evidencia, y que **no** hay que volver a investigar:

   - `zustand` **no está en `package.json`** y tiene cero apariciones en el repo: adoptarla es una dependencia nueva, no un default del proyecto.
   - Su middleware `persist` tiene **el mismo problema de hidratación** que esta capa resuelve con `hasHydrated`; usarlo exigiría `skipHydration: true` + `rehydrate()` en un efecto, o sea terminarías reimplementando lo mismo a mano, pero con dependencia permanente.
   - El repo tiene **cero** `createContext`, `useContext`, `Provider` y `localStorage`: no hay precedente que empuje en ninguna dirección.

   Para la **Semana 1** se resuelve con Context + `useState`, que es lo más chico que resuelve el problema. Eso cierra *esta* semana, no la pregunta de fondo. Por eso la capa de storage se construye con el `Storage` **inyectado por parámetro**: si más adelante se decide adoptar la librería, se reescribe sin cambiar la forma de los tests.

   **Pendiente: cerrar esta investigación con una decisión explícita antes de la Semana 2.** Hasta entonces, no clasificar tickets por `store/` dando por hecho que el dueño está resuelto.

**Consecuencia práctica:** una issue etiquetada `BACKEND` puede tocar `lib/store/` si el storage necesita consumir un schema, y una etiquetada `FRONTEND` puede tocar `lib/schemas/` solo si agrega un campo puramente cosmético al formulario. Lo que **nunca** se reparte es la fórmula: `lib/calc/` y `lib/money/` tienen un solo dueño.

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
- [ ] Hay al menos un test que cubre el cambio, co-localizado junto al módulo (`<modulo>.test.ts`). No va en `tests/unit/`: esa carpeta está vacía y la práctica real del repo es la co-ubicación.
- [ ] Los montos usan `decimal.js`, no `number` con decimales.
- [ ] Si el cambio toca persistencia, respeta `db/AGENTS.md`.

## Siguiente paso

Ver issues #12 (tipos), #13 (librerías), #14 (motor) y #15 (persistencia).
