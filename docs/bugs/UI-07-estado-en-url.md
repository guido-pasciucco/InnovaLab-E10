# UI-07 · Sincronizar búsquedas y pestañas con la URL

- **Estado:** pendiente de valoración
- **Esfuerzo:** L
- **Ubicación:** catálogos de productos, insumos y gastos del período; pestaña insumos/packaging
- **Origen:** revisión de Web Interface Guidelines, 2026-11-24

## Problema

Los filtros de búsqueda y la pestaña activa viven solo en `useState`, sin reflejarse en la URL.

## Impacto

El estado se pierde al recargar, no se puede compartir por enlace y el botón Atrás del navegador no lo restaura.

## Nota para retomar

`nuqs` no está instalado. Hay que decidir entre agregar la dependencia o usar `useSearchParams` con `router.replace(..., { scroll: false })`. El trabajo incluye debounce, navegación hacia atrás y adelante, y el límite entre componentes de servidor y de cliente. Es el ítem de mayor esfuerzo del backlog.
