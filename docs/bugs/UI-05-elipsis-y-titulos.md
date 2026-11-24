# UI-05 · Elipsis, placeholders y equilibrio de línea en títulos

- **Estado:** pendiente de valoración
- **Esfuerzo:** S
- **Ubicación:** `components/auth/logout-button.tsx:47`, formularios y títulos
- **Origen:** revisión de Web Interface Guidelines, 2026-11-24

## Problema

El botón de cierre de sesión usa `"Signing out..."` en lugar del carácter `…`. Varios placeholders no terminan en `…` y ningún título usa `text-wrap: balance`.

## Impacto

Inconsistencia tipográfica y títulos que pueden terminar con una sola palabra en la última línea.

## Nota para retomar

`text-wrap: balance` conviene aplicarlo como regla global en `app/globals.css`, no en cada título. Los placeholders de los catálogos que ya usan `…` sirven de referencia. El texto de cierre de sesión está en inglés dentro de una interfaz en español; se puede aprovechar para unificarlo.
