# BUG-003 — `formatARS` devuelve cadena vacía para valores que la base sí puede devolver

| Campo | Valor |
| --- | --- |
| ID | BUG-003 |
| Severidad | Crítico |
| Estado | Abierto — pendiente de detalle |
| Origen | Code review de proyecto completo, 2026-10-10 |
| Módulo | `lib/money/`, `lib/db/` |
| Verificación | Ejecutado |

## Qué pasa

`formatARS` valida la entrada con un regex que acepta como máximo 2 decimales. El proyecto tiene columnas `numeric(14,4)` reales, que legítimamente devuelven hasta 4 decimales. Cuando la base devuelve uno de esos valores, el formateador no puede parsearlo y devuelve una cadena vacía en lugar de un número.

El comentario del código afirma que el regex "es exactamente lo que `moneyString` acepta, así que cualquier cosa que la base pueda devolver formatea". La afirmación es falsa: `quantityString` acepta hasta 4 decimales y varias columnas del esquema usan `numeric(14,4)`.

Escenario: un punto de equilibrio de 1234.5678 unidades se renderiza como celda en blanco. Sin símbolo, sin ceros, sin ninguna señal visible de que hay un valor. El usuario percibe que falta un dato que sí existe, y un resultado de negocio que debería disparar una alerta se ve como vacío. El caso es probable en magnitudes que no entran en 2 decimales por la propia aritmética del margen de contribución, no por tipeo del usuario.

## Dónde está

- `lib/money/format.ts:90` — el regex `DECIMAL`.
- `lib/money/format.ts:87-89` — el comentario que afirma la equivalencia con `moneyString`.
- `lib/money/format.ts:135-137` — el `return ""`.
- `lib/db/calculation/table.ts:123` — `break_even_units`.
- `lib/db/costs/table.ts:56-58` — `hours`, `hourly_rate` y `allocationPct`.
- `lib/db/formats.ts:22` — `quantityString`, que admite hasta 4 decimales.

## Evidencia

De `lib/money/format.ts`:

```ts
const DECIMAL = /^(-?)(\d+)(?:\.(\d{1,2}))?$/;
```

```ts
  if (!decimal) {
    return "";
  }
```

Columnas `numeric(14,4)` en el esquema, de `lib/db/calculation/table.ts`:

```ts
  breakEvenUnits: numeric("break_even_units", {
```

y de `lib/db/costs/table.ts`:

```ts
  hours: numeric("hours", { precision: 14, scale: 4 }),
  hourlyRate: numeric("hourly_rate", { precision: 14, scale: 4 }),
  allocationPct: numeric("allocation_pct", { precision: 14, scale: 4 }),
```

## Reproducción

```bash
bun -e 'import { formatARS } from "./lib/money/format.ts"; console.log(JSON.stringify(formatARS("1234.5678"))); console.log(JSON.stringify(formatARS("1234.56")));'
```

Salida real:

```
""
"$ 1.234,56"
```

## Impacto

Celdas en blanco en la pantalla de resultados para valores perfectamente válidos. Pérdida de confianza del usuario en los números y posible lectura de un resultado vacío como "sin resultados".

## Causa raíz

Se unificó el contrato de formato de dinero (2 decimales) con el contrato de magnitud (4 decimales) en un único formateador. Son dos dominios numéricos distintos con escalas distintas y un solo regex.

## Dirección del arreglo

Separar los dos contratos: un formateador por precisión, o un parámetro explícito de escala. Derivar la escala de la declaración de la columna en lugar de hardcodearla en un regex. Considerar que el redondeo a la escala de presentación debería ser explícito y no una consecuencia del regex.

## Qué NO se verificó

`formatARS` no tiene hoy ningún consumidor en el repo (solo su test), así que no se observó el efecto en pantalla.