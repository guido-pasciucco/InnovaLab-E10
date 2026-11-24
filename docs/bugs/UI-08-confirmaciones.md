# UI-08 · Confirmación antes de eliminar o descartar

- **Estado:** pendiente de valoración
- **Esfuerzo:** M / L
- **Ubicación:** `components/supplies/supplies-table.tsx:37`, `components/tenders/publish-tender-form.tsx:326`
- **Origen:** revisión de Web Interface Guidelines, 2026-11-24

## Problema

Eliminar un insumo y descartar un borrador ejecutan la acción sin confirmación previa. Otros tres puntos usan el `confirm()` nativo del navegador.

## Impacto

Riesgo de pérdida de datos por un clic accidental y experiencia inconsistente entre pantallas.

## Nota para retomar

La opción acotada es un `ConfirmDialog` que reutilice `CatalogModal`. Un undo real exige además cambios en las server actions y un temporizador. El diálogo de insumos en uso aparece después del error, no antes de la acción, así que no cumple esta función.
