# lib/ — Lógica y contratos del dominio

Todo lo que no es UI vive acá. Si es un cálculo, una validación o un tipo del negocio, va en `lib/`; si renderiza algo, va en `app/` o `components/`.

## Mapa rápido

| Módulo | Rol | Estado |
| --- | --- | --- |
| `calc/` | Motor de cálculo: funciones puras (entra config + costos, salen resultados) | Esqueleto (ver #14) |
| `money/` | Aritmética decimal exacta con `decimal.js` | Esqueleto |
| `schemas/` | Contratos Zod compartidos entre cliente y servidor | Esqueleto |
| `store/` | Estado del wizard en el cliente | Esqueleto |
| `db.ts` | Placeholder `server-only` | Temporal |
| `db/` | Persistencia en servidor (Drizzle) | Spike en evaluación (ver #15) |

## Reglas (no negociables)

1. **Dominio puro.** `calc/` y `money/` no importan React, Next ni `db/`. Se testean sin renderizar nada.
2. **Zod en el borde.** Toda entrada se valida al entrar (formulario o API). Adentro del cálculo no se valida, se calcula.
3. **Plata con `decimal.js`.** Nunca `float` para dinero o cantidades (ver `0.1 + 0.2`).
4. **Servidor queda en el servidor.** Lo marcado `server-only` (incluido `db/`) solo se importa desde Server Components, Server Actions o Route Handlers. Nunca desde un componente cliente.
5. **Fuente única.** Cada fórmula vive en un solo lugar (`lib/calc`); los tipos se infieren (`z.infer`, `$inferSelect`), no se duplican a mano.
6. **El servidor completa lo suyo.** `id`, dueño y timestamps los pone el servidor, nunca el cliente.

## Checklist para verificar un cambio en `lib/`

- [ ] `calc/` y `money/` no importan nada de `app/`, `components/` ni `db/`.
- [ ] Hay al menos un test que cubre el cambio (`tests/unit/`).
- [ ] Los montos usan `decimal.js`, no `number` con decimales.
- [ ] Si el cambio toca persistencia, respeta `db/README-spike.md`.

## Siguiente paso

Ver issues #12 (tipos), #13 (librerías), #14 (motor) y #15 (persistencia).
