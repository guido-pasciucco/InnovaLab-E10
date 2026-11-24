# UI-10 · Formato de período con `Intl`

- **Estado:** pendiente de valoración
- **Esfuerzo:** S / M
- **Ubicación:** `components/period-costs/period-costs-values.ts:38`
- **Origen:** revisión de Web Interface Guidelines, 2026-11-24

## Problema

`formatPeriodLabel` arma el nombre del mes con un arreglo escrito a mano en lugar de usar `Intl.DateTimeFormat`.

## Impacto

El formato queda atado a un idioma y a un orden fijo de meses.

## Nota para retomar

`new Date("2026-11")` depende de la zona horaria y puede resolver al mes anterior. Hay que construir la fecha de forma segura en UTC y verificar que el resultado siga siendo `noviembre de 2026`. Es posible que haya que actualizar pruebas.
