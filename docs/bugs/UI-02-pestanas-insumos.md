# UI-02 · Patrón ARIA completo en las pestañas de insumos

- **Estado:** pendiente de valoración
- **Esfuerzo:** M
- **Ubicación:** `components/supplies/supplies-catalog.tsx:84`
- **Origen:** revisión de Web Interface Guidelines, 2026-11-24

## Problema

El control usa `role="tablist"` y `role="tab"`, pero no responde a las flechas del teclado ni declara el panel asociado mediante `aria-controls`.

## Impacto

Funciona con Tab y Enter, pero contradice el comportamiento esperado de un conjunto de pestañas para teclado y lectores de pantalla.

## Nota para retomar

No es solo agregar `onKeyDown`. Requiere *roving tabindex*, flechas izquierda y derecha, Home y End, `aria-controls`, `role="tabpanel"` y `aria-labelledby`.
