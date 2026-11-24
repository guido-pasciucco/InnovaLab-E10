# UI-01 · Enlace de salto y destino del contenido principal

- **Estado:** pendiente de valoración
- **Esfuerzo:** S
- **Ubicación:** `app/layout.tsx:74`
- **Origen:** revisión de Web Interface Guidelines, 2026-11-24

## Problema

No existe un enlace que permita a quien navega con teclado saltar directo al contenido. El contenedor de `app/layout.tsx:74` tampoco declara un destino de anclaje.

## Impacto

Hay que recorrer con Tab todo el encabezado antes de llegar al contenido de la página.

## Nota para retomar

Alcanza con `id="main-content"` en el contenedor y un enlace `sr-only` que se haga visible al enfocarse. Conviene `tabIndex={-1}` en el destino para que el foco se desplace de verdad. No hace falta tocar los `<main>` de cada página.
