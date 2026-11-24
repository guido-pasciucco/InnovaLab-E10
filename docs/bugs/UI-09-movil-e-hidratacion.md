# UI-09 · Ajustes globales de móvil e hidratación

- **Estado:** pendiente de valoración
- **Esfuerzo:** XS
- **Ubicación:** `components/ui/catalog-modal.tsx:130`, `app/globals.css`, `app/layout.tsx:28`
- **Origen:** revisión de Web Interface Guidelines, 2026-11-24

## Problema

Falta `overscroll-behavior: contain` en el diálogo desplazable, no hay `touch-action: manipulation` global y `suppressHydrationWarning` se usa sin una razón documentada.

## Impacto

En móvil el scroll puede propagarse al contenido de fondo. El aviso de hidratación silenciado puede ocultar fallos reales.

## Nota para retomar

Son cambios pequeños, pero conviene confirmar que existe una causa concreta antes de quitar `suppressHydrationWarning`.
