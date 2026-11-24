# UI-06 · `tabular-nums` en columnas numéricas

- **Estado:** pendiente de valoración
- **Esfuerzo:** S
- **Ubicación:** tablas de gastos del período, insumos y productos
- **Origen:** revisión de Web Interface Guidelines, 2026-11-24

## Problema

Las celdas de importes no usan cifras de ancho fijo.

## Impacto

Las comas no quedan alineadas entre filas y las columnas cambian de ancho cuando cambia un valor, lo que dificulta leer la tabla de un vistazo.

## Nota para retomar

Aplicar de forma explícita en las celdas numéricas. No conviene una regla global sobre `text-right`, porque la columna de acciones también usa esa clase y no contiene números.
