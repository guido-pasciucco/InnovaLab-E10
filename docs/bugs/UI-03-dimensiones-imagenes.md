# UI-03 · Dimensiones intrínsecas de tres imágenes decorativas

- **Estado:** pendiente de valoración
- **Esfuerzo:** XS
- **Ubicación:** `app/layout.tsx:39`, `app/layout.tsx:52`, `app/layout.tsx:65`
- **Origen:** revisión de Web Interface Guidelines, 2026-11-24

## Problema

Las etiquetas `<img>` de las imágenes decorativas (carrito, monedas y calculadora) no declaran `width` ni `height`.

## Impacto

Riesgo de desplazamiento de diseño (CLS) mientras cargan las imágenes.

## Nota para retomar

Las dimensiones reales de los archivos son 208×339 (`carrito.png`), 305×288 (`monedas.png`) y 302×296 (`calculadora.png`). Con `object-contain` no hay distorsión, pero hay que usar los valores reales, no los del contenedor.
