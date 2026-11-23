# Backend del Tablero del catálogo (#247) — propuesta de implementación

| Campo | Valor |
| --- | --- |
| **Issue** | #247 — Tablero del catálogo (bloque 4) |
| **Rama** | `feat/issue-247-tablero-backend` |
| **Depende de** | #242 (capacidad y rendimiento), #243 (gastos del período), #244 (prorrateo), #245 (precio sugerido), **#246 (equilibrio multi-producto)** |
| **Estado** | Propuesta actualizada al 2026-11-23. **PR 1 implementado**: motor puro `calculatePortfolioBreakEven` + tests. Falta precio (#245), servicio de lectura, página y validación con #250. |
| **Fecha** | 2026-11-18 · actualizado 2026-11-23 |

> Este documento describe la implementación del backend y lo que falta para llegar a una solución completa. No reemplaza al registro de decisiones de Fase 2 (`docs/fase-2/04-decisiones.md`, ya en `main`).

---

## 1. Contexto: qué pide la historia y de qué depende

La historia pide un tablero que:

- muestre, por producto, **costo total, contribución y margen**;
- muestre del negocio la **cuota mínima de cada producto** y el **equilibrio en unidades y en pesos**;
- dibuje un **gráfico en pesos** con los **gastos del mes** y la **contribución de la mezcla**, cruzados en el equilibrio;
- acompañe el gráfico con la **cuota de cada producto**.

Es una pantalla **solo lectura**: no introduce datos nuevos.

### Estado real del repo (verificado al 2026-11-23, `main` = `23d8a31`)

| Pieza | Estado |
| --- | --- |
| Catálogo de insumos (#239) | ✅ En `main` |
| Productos + recetas (#240) | ✅ En `main`, con unidad por renglón (#265) y rendimiento |
| CVU persistido (#241) | ✅ En `main`: `variableCostUnitAmount` + **numerador/denominador exactos** y `calculateVariableCosts` |
| Capacidad mensual (#242) | ✅ En `main` (implementada en #269): `products.monthlyCapacity` (`integer`, nullable) |
| Gastos del período (#243) | ✅ En `main`: `business_cost_lines.period` y `listPeriodCostsService()` devuelve `total` |
| Prorrateo / costo total (#244) | 🟡 Solo en `origin/feat/244-costo-total-frontend` (`lib/calc/prorateCosts.ts` + tests). Rama abierta, no mergeada y desactualizada respecto de `main` |
| Precio sugerido (#245) | ❌ No implementado en ninguna rama. No hay precio, margen ni recargo en el dominio de producto |
| Equilibrio multi-producto (#246) | 🟡 **Motor puro implementado en este PR** (`lib/calc/calculatePortfolioBreakEven.ts`). Sin persistencia ni servicio todavía |
| Tablero (#247) | ❌ No existe la ruta, el servicio ni el DTO |
| `computed_results` | La tabla existe (`lib/db/calculation/table.ts`), pero está atada a `calculation_id` (wizard mono-producto) y no sirve para la mezcla |

**Conclusión:** el camino A sigue siendo el correcto, pero con una corrección importante: el tablero **calcula en vivo** (D4/D7), no lee un snapshot de #246. El snapshot es solo el registro histórico de "Cerrar cálculo" (D5–D8), una feature aparte.

---

## 2. Arquitectura propuesta (camino A)

### 2.1 Dominio puro: `lib/calc/calculatePortfolioBreakEven.ts` — ✅ implementado

Función pura, `Decimal`, sin DB ni React, con contrato `Result` (`ok: true/false`) como `calculateCostTotals` y `calculateBreakEven`.

Entrada:

```ts
type PortfolioProductInput = {
  id: string;
  name: string;
  capacity: number;       // unidades/mes, entero ≥ 0 (0 = D9: no participa)
  variableUnit: string;   // CVU exacto de #241 (receta / rendimiento)
  price: string;          // precio sugerido ya resuelto (#245)
};

type PortfolioInput = {
  products: readonly PortfolioProductInput[];
  periodFixedCosts: string; // Σ business_cost_lines.amount_period del período
};
```

Salida por producto y totales:

```ts
{
  products: [{
    id, name, capacity,
    mixPct,                 // % de la capacidad total, 4 decimales
    variableUnit,           // dinero, 2 decimales
    indirectUnit,           // gastos / Σ capacidad (igual para todos)
    unitCost,               // variableUnit + indirectUnit
    fixedShare,             // gastos × mix (lo que absorbe el producto)
    price,
    contributionUnit,       // price − variableUnit
    marginPct,              // (price − unitCost) / price × 100   ← ADR 0003
    breakEvenUnits,         // cuota exacta, 4 decimales
    breakEvenSales
  }],
  totals: {
    capacity, periodFixedCosts, indirectUnit,
    weightedContribution,   // Σ(mix × contribución), 4 decimales
    weightedPrice,          // Σ(mix × precio), 4 decimales
    contributionRatio,      // contribución ponderada / precio ponderado
    breakEvenUnits, breakEvenUnitsWhole,
    breakEvenSales,         // = gastos / ratio = Σ(cuota × precio)
    closingContribution     // Σ(cuota × contribución) = gastos
  },
  excludedProductIds,       // capacidad 0 (D9), no se pierden silenciosamente
  hasNegativeContribution   // algún producto vende bajo su CVU; no aborta
}
```

Fórmulas (bloque 3, confirmadas en la especificación):

```text
mix_i               = capacidad_i / Σ capacidad
contribución_i      = precio_i − CVU_i
contribuciónPond.   = Σ (mix_i × contribución_i)
unidadesEquilibrio  = gastosDelMes / contribuciónPond.
cuota_i             = unidadesEquilibrio × mix_i
equilibrioPesos     = Σ (cuota_i × precio_i) = gastos / ratioContribución
prueba de cierre    = Σ (cuota_i × contribución_i) = gastosDelMes
```

Decisiones de implementación tomadas en el motor:

- **Capacidad entera y ≥ 0** (coincide con la columna `integer` de #269 y con `prorateCosts` de #244). Los productos con capacidad 0 se excluyen del prorrateo y se devuelven en `excludedProductIds` (D9), sin validarles precio ni CVU.
- **Gastos del mes en 0 no es un error del motor**: devuelve equilibrio 0, igual que `calculateBreakEven` cuando `totalFixed` es 0. El estado vacío `missing-period-costs` lo decide el servicio al ver que el período no tiene líneas cargadas.
- **Precio vacío o ≤ 0** → `NO_PRICE`; precio malformado → `INVALID_AMOUNT`. Contribución ponderada ≤ 0 → `NO_CONTRIBUTION`.
- **Una contribución individual negativa no aborta**: se marca `hasNegativeContribution` para que el tablero advierta (el total de la mezcla todavía puede cubrir los gastos).
- **Redondeo único**: todo se calcula con `Decimal` y se redondea al salir (dinero 2, porcentajes 4, unidades 4). La prueba de cierre usa valores sin redondear; por eso `Σ` de cuotas redondeadas puede diferir en centavos del total y el total se calcula desde los valores exactos.
- **Costo variable desde la receta**: ya no hay que construirlo acá. #241 deja el CVU persistido con numerador/denominador exactos; el servicio debe usar esos pares, no el `amount` redondeado.

Tests (`lib/calc/calculatePortfolioBreakEven.test.ts`, 22 casos): ejemplo del §6, regresión mono-producto contra `calculateBreakEven`, cierre exacto con mezcla periódica, gastos 0, capacidad 0, contribución negativa, y todos los códigos de error.

### 2.2 Persistencia: **no** crear `catalog_runs` para #247

La versión anterior de este documento proponía dos tablas (`catalog_runs` / `catalog_run_products`) y que el tablero leyera el último run de #246. Eso **contradice D4 y D7**:

- **D4:** cualquier cambio en insumos, receta, capacidad, gastos o precio recalcula todo en vivo. No hay cierre de lista.
- **D7:** el prorrateo y los cálculos corren en vivo sobre el catálogo actual; el snapshot es el registro histórico del mes, **no la base del cálculo**.

Por lo tanto:

- **#247 no necesita tabla nueva.** El servicio de lectura consulta `products` + `business_cost_lines` y llama al motor puro.
- **`catalog_runs` solo tendría sentido para "Datos históricos" (D5–D8):** el botón manual "Cerrar cálculo" congela entradas y salidas, con auditoría de cambios (D6). Es otra issue, no #247.
- No reutilizar `computed_results`: está atada a `calculation_id` y no tiene `mix`, `cuota` ni `margin_pct`.

Si más adelante se decide persistir el tablero para performance, el esquema propuesto sigue siendo válido, pero debe quedar claro que es una **caché del cálculo en vivo**, no la fuente de verdad.

### 2.3 Servicio de lectura: `lib/services/catalog-dashboard.ts`

```ts
getCatalogDashboardService(
  userId: VerifiedUserId,
  opts?: { period?: string },
  db?: Db
): Promise<CatalogDashboard>
```

Responsabilidades:

- Resolver el negocio del usuario y el período (default: mes actual, `currentPeriodKey()` de #243).
- Leer productos activos con su capacidad y su CVU exacto, y el total de gastos del período. **Una consulta por fuente, sin N+1.**
- Llamar a `calculatePortfolioBreakEven` y mapear el resultado a un DTO plano con **strings decimales** para dinero y `number` solo para coordenadas del gráfico.
- No recalcular en la puerta: el servicio es el único lugar que llama al motor.
- Estados de negocio como `status`, no como error:

```ts
type CatalogDashboardStatus =
  | "ready"
  | "missing-products"        // 0 productos activos
  | "missing-capacity"        // todos con capacidad 0/null
  | "missing-variable-cost"   // CVU pending/unavailable en algún producto
  | "missing-period-costs"    // el período no tiene líneas cargadas
  | "missing-price"           // falta el precio sugerido (#245)
  | "no-contribution";        // la mezcla no deja contribución
```

Los estados `missing-variable-cost` y `missing-price` no estaban en la versión anterior y son necesarios: `products.variableCostStatus` puede ser `pending` / `unavailable` (`MISSING_YIELD`, `UNSUPPORTED_RECIPE_UNIT`) y hoy no existe ningún precio.

DTO orientativo en `lib/types/catalog-dashboard.ts`:

```ts
{
  status, period, computedAt, currency: "ARS",
  products: [{ productId, name, capacity, unitCost, contributionUnit,
               marginPct, mixPct, breakEvenUnits, breakEvenSales }],
  totals: { fixedCosts, breakEvenUnits, breakEvenSales, weightedContribution },
  chart: { points: [{ sales, fixedCosts, contribution }], breakEvenSales },
  warnings: { excludedProductIds, hasNegativeContribution }
}
```

### 2.4 Puerta (Server Component)

El tablero es solo lectura: no necesita Server Action. La página `/tablero` (Frontend) llama al servicio desde un RSC y renderiza. Si luego se quiere refresco por cliente, se agrega un Route Handler `GET` con `handleRouteErrors`; el servicio no cambia.

Reglas de `lib/AGENTS.md` que aplican:

- `calc/` y `money/` puros, sin imports de `app/`, `components/` ni `db/`.
- Validación Zod en el borde; el servicio recibe valores planos.
- Dinero con `decimal.js`, nunca `float`.
- El dueño llega como `VerifiedUserId` (ADR 03).
- Los servicios no reciben `Request` ni devuelven `Response`; lanzan `AppError` y cada puerta traduce.

---

## 3. El gráfico: la decisión más delicada

La issue dice: *"en pesos: los gastos del mes y la contribución de la mezcla, cruzados en el equilibrio"* y *"el cruce coincide con el equilibrio en pesos"*. Eso solo cierra si **el eje X está en pesos vendidos**:

```text
X = ventas en $
gastosDelMes(x)   = constante = gastos del período
contribución(x)   = x × ratioContribución
ratioContribución = Σ(mix_i × contribución_i) / Σ(mix_i × precio_i)

cruce: x × ratio = gastos  →  x = gastos / ratio
                                = Σ (cuota_i × precio_i)
                                = equilibrio en pesos ✓
Y del cruce = gastos del mes
```

El motor ya devuelve `totals.contributionRatio` (6 decimales) y `totals.breakEvenSales`, así que el servicio puede armar los puntos sin recalcular:

```ts
points = [
  { sales: 0, fixedCosts, contribution: 0 },
  { sales: breakEvenSales, fixedCosts, contribution: fixedCosts },
  { sales: breakEvenSales × 1.25, fixedCosts, contribution: fixedCosts × 1.25 },
]
```

**Contradicción pendiente:** `docs/fase-2/02-especificacion-flujo-costos.md` (línea 184) propone **X = unidades totales**. Con ese eje el cruce cae en unidades, no en pesos, y no cumple el criterio de aceptación. Se recomienda X = pesos y corregir la especificación. El motor devuelve ambos (unidades y pesos), así que la decisión no bloquea el backend; bloquea el gráfico y el E2E.

---

## 4. Decisiones: qué está cerrado y qué falta

### Cerradas (no volver a discutirlas)

| Tema | Decisión |
| --- | --- |
| Recálculo | **En vivo** ante cualquier edición (D4). No hay cierre de lista |
| Snapshot | Botón manual "Cerrar cálculo"; congela todo el estado y es solo histórico (D5–D8). **No** es la base del tablero (D7) |
| Capacidad 0 | El producto se guarda, se excluye del prorrateo y se avisa qué falta (D9) |
| Margen | Sobre el **precio de venta**: `precio = costo / (1 − margen)` (ADR 0003) |
| Capacidad | Campo del producto, entero ≥ 0 (D3/D14, #269) |
| Período de gastos | `business_cost_lines.period` (`YYYY-MM`, #243) |
| CVU | Receta ÷ rendimiento, persistido con fracción exacta (#241) |

### Abiertas (bloquean la solución completa)

| # | Tema | Por qué bloquea | Recomendación |
| --- | --- | --- | --- |
| 1 | **Dónde vive el precio / recargo (#245)** | Sin precio no hay contribución, margen ni equilibrio en pesos. La especificación dice recargo **global** (`costo × (1 + %)`), la issue #245 dice **por producto** y el ADR 0003 dice **margen sobre precio** | Margen por producto con default global, guardado en `products` o en una tabla de precios del período; `precio = costo / (1 − margen)` |
| 2 | **Recargo vs margen** | Cambia todos los precios y el equilibrio | ADR 0003 (margen sobre precio) y mostrar el recargo equivalente |
| 3 | **Eje X del gráfico** | Pesos (criterio de aceptación) vs unidades (especificación) | Pesos, y corregir la especificación |
| 4 | **Precio sugerido vs precio real** | El equilibrio en pesos necesita uno de los dos; el real quedó fuera de #245 | Precio sugerido |
| 5 | **Cuota** | `unidadesTotales × mix` (la que cierra) vs cantidad propia | La del motor: `unidadesTotales × mix` |
| 6 | **Fixture #250 / ejemplo DATA** | Es el oráculo de QA. Sin él no se puede validar "los números son los de #246" | Pedirlo y versionarlo en `tests/fixtures/` |
| 7 | **Presentaciones (#265 / D13)** | Si el CVU pasa a ser por presentación, hay que decidir si el tablero muestra productos o presentaciones | Definir antes de la página; el motor puede recibir una "unidad vendible" |
| 8 | **Capacidad 0 en la tabla** | D9 decidió excluirla del prorrateo, pero no si se muestra con aviso o se oculta | Mostrarla con aviso (`excludedProductIds`) |

---

## 5. Plan de trabajo y estado

| PR | Contenido | Estado |
| --- | --- | --- |
| 1 | `calculatePortfolioBreakEven` + tests puros | ✅ **Este PR** |
| 2 | Precio sugerido (#245): contrato, persistencia y servicio; mergear #244 actualizado | ⛔ Bloqueado por decisiones 1 y 2 |
| 3 | `getCatalogDashboardService` + DTO + estados vacíos (lectura en vivo) | ⛔ Depende de PR 1 y 2 |
| 4 | Página `/tablero` (Frontend) + gráfico 2 series | ⛔ Depende de PR 3 y decisión 3 |
| 5 | Snapshot "Cerrar cálculo" + "Datos históricos" (D5–D8) | Fuera de #247 |

Tests obligatorios según `TEST.md` y `lib/AGENTS.md`: unitarios co-localizados, integración `<modulo>.int.test.ts` con dos usuarios, montos como strings, sin floats. Para el PR 1 alcanza con unitarios puros (el motor no toca red ni base).

---

## 6. Ejemplo numérico para tests (ilustrativo)

Estos números **no** son el ejemplo de DATA (#250); fijan el comportamiento esperado del motor y ya están en `calculatePortfolioBreakEven.test.ts`.

Datos:

- Gastos del período: `150000.00`
- Productos:

| Producto | Capacidad | CVU | Precio |
| --- | ---: | ---: | ---: |
| A | 200 | 800 | 1400 |
| B | 100 | 500 | 900 |
| C | 300 | 1200 | 2000 |

Cálculo:

```text
Σ capacidad = 600
mix: A 33.3333 % · B 16.6667 % · C 50 %
indirecto unitario = 150000 / 600 = 250 (igual para los tres)
costo total: A 1050 · B 750 · C 1450
contribución: A 600 · B 400 · C 800
contribución ponderada = 666.6667
unidades de equilibrio = 150000 / 666.6667 = 225
cuotas: A 75 · B 37.5 · C 112.5
equilibrio en pesos = 75×1400 + 37.5×900 + 112.5×2000 = 363750
margen: A 25 % · B 16.6667 % · C 27.5 %
prueba de cierre = 75×600 + 37.5×400 + 112.5×800 = 150000 ✓
ratio de contribución = 666.6667 / 1616.6667 = 0.412371
cruce del gráfico (X en pesos) = 150000 / 0.412371 = 363750 ✓
```

---

## 7. Referencias

- Issue del tablero: #247. Historia previa que define el motor: #246.
- Documentación de Fase 2 (ya en `main`):
  - `docs/fase-2/02-especificacion-flujo-costos.md` (bloques 3 y 4)
  - `docs/fase-2/04-decisiones.md` (D4–D14)
  - `docs/fase-2/03-mvp-fase-2.md`
- Dominio y reglas:
  - `docs/producto/05-Motor de cálculo de Innova Lab.md` (§11–12)
  - `docs/decisiones/establecidas/negocio/0003-el-margen-se-mide-sobre-el-precio-de-venta.md`
  - `docs/producto/02-modelo-de-datos-del-calculo.md`
- Código de referencia:
  - `lib/calc/calculatePortfolioBreakEven.ts` (motor de este PR)
  - `lib/calc/prorateCosts.ts` (rama #244, pendiente de merge)
  - `lib/calc/calculateBreakEven.ts` y `calculatePricing.ts` (wizard mono-producto)
  - `lib/services/business-cost.ts` (#243, total del período)
  - `lib/services/products.ts` (#241/#269, capacidad y CVU)
  - `lib/db/business/table.ts`, `lib/db/costs/table.ts`
  - `components/charts/break-even-chart.tsx`
- Convenciones: `lib/AGENTS.md`, `lib/db/AGENTS.md`, `TEST.md`.
