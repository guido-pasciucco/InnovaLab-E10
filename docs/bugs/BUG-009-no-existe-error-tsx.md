# BUG-009 — No existe ningún error boundary en `app/`

| Campo | Valor |
| --- | --- |
| ID | BUG-009 |
| Severidad | Aviso |
| Estado | Abierto — pendiente de detalle |
| Origen | Code review de proyecto completo, 2026-10-10 |
| Módulo | `app/` |
| Verificación | Lectura de código |

## Qué pasa

No hay `error.tsx` ni `global-error.tsx` en ninguna parte de `app/`. Cualquier error de render en un Server Component sube hasta el boundary raíz de Next y el usuario ve la pantalla de error por defecto: sin el shell de la aplicación, sin navegación y sin forma de reintentar.

Esto no es solo buena práctica de la documentación de Next: el proyecto ya tiene la infraestructura necesaria para que el error se traduzca a algo presentable (`lib/errors/` con `AppError` y un catálogo), y `app/layout.tsx` define el shell. El boundary es el puente que falta entre ambos.

Escenario: en `/profile`, el render del Server Component falla por un motivo no cubierto por `requireUser`, por ejemplo un módulo que existe pero falla al evaluarse en el bundle de RSC. Sin `error.tsx`, el usuario pierde la navegación.

## Dónde está

- `app/error.tsx` — ausente (verificado con `find app -name "error.tsx" -o -name "global-error.tsx"`, sin resultados).
- `app/global-error.tsx` — ausente (misma búsqueda).
- `app/layout.tsx` — el shell que se pierde cuando no hay boundary.

## Evidencia

La búsqueda en el árbol de archivos no devuelve resultados:

```bash
find app -name "error.tsx" -o -name "global-error.tsx"
```

## Reproducción

No aplica: verificado por búsqueda en el árbol de archivos.

## Impacto

Cualquier error de render produce una pantalla muerta sin salida para el usuario.

## Causa raíz

El proyecto concentra el esfuerzo en el manejo de errores de dominio y no se estableció el equivalente para errores de render.

## Dirección del arreglo

Crear `app/error.tsx` (obligatoriamente cliente, con botón de reintento) cubriendo `app/` entero, y evaluar `global-error.tsx` como último recurso. Nota: Next documenta `error.tsx` y `global-error.tsx` por separado, y el primero no captura errores del layout raíz.

## Qué NO se verificó

No se levantó la app para provocar un error de render y observar la pantalla exacta que ve el usuario.