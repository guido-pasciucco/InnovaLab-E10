# Modelo de datos del cálculo: por qué existe cada tabla

Este documento explica **por qué** la base tiene las tablas que tiene, siguiendo el recorrido de un emprendedor que costea un producto. No reemplaza al esquema (`lib/db/**/table.ts`) ni al diagrama (`erd-calculadora-inteligente.mmd`): los acompaña con un ejemplo concreto para que cualquiera del equipo pueda leerlos sin adivinar.

> **Ejemplo que se usa en todo el documento:** Ana tiene el emprendimiento "Dulces Ana" y quiere saber cuánto le cuesta producir sus alfajores, que vende por caja de 6.

---

## 1. Mapa general

```
profiles ──< businesses ──< products ──< calculations ─┬── costing_setup      (1 a 1)
 (quién)      (negocio)     (qué vende)  (un costeo)   ├── pricing_inputs     (1 a 1)
                  │                                     ├──< scenarios        (1 a N)
                  │                                     ├──< calc_cost_lines  (1 a N)
                  │                                     └──< computed_results (1 a N)
                  └──< business_cost_lines  (catálogo de costos del negocio)
```

`──<` se lee "uno a muchos": un negocio tiene muchos productos, un producto tiene muchos cálculos, etc.

La tabla central es **`calculations`**: casi todo lo que el usuario carga o el sistema calcula cuelga de un cálculo concreto.

---

## 2. El recorrido, paso a paso

### Paso 0 — Ana inicia sesión → `profiles`

Una fila por usuario. Su `id` es el mismo que el del usuario en Supabase Auth, así que la base sabe de quién es cada dato.

| id | display_name |
|---|---|
| u-ana | Ana |

### Paso 1 — Ana tiene un negocio → `businesses`

Un usuario puede tener varios emprendimientos. En la Fase 1 se usa **uno por defecto por usuario**, creado automáticamente.

| id | owner_user_id | name |
|---|---|---|
| b-1 | u-ana | Dulces Ana |

### Paso 2 — El negocio vende algo → `products`

El producto es **la cosa que se vende**. Existe una sola vez, aunque se costee muchas veces.

| id | business_id | name |
|---|---|---|
| p-1 | b-1 | Alfajores |

### Paso 3 — Ana se sienta a costear → `calculations`

Un cálculo es **una vez que Ana se sentó a calcular cuánto le cuesta un producto**. Conviene pensarlo como una **hoja de presupuesto con fecha**: el producto es el tema, la hoja es un ejercicio concreto sobre ese tema.

| id | user_id | business_id | product_id | status | created_at |
|---|---|---|---|---|---|
| c-1 | u-ana | b-1 | p-1 | done | febrero |
| c-2 | u-ana | b-1 | p-1 | draft | marzo |

Un producto, **dos cálculos**. En febrero Ana costeó con un precio de harina; en marzo la harina subió y está haciendo otro cálculo, todavía en borrador. El de febrero queda intacto.

> **Aclaración importante: `calculations` no es una tabla intermedia de muchos a muchos.**
> Cada cálculo apunta a **un solo** producto (`product_id`), y un producto puede tener **muchos** cálculos. Es una relación **uno a muchos** (producto 1 ── N cálculos), no N a N. Una tabla intermedia N a N existiría si un mismo cálculo pudiera costear varios productos a la vez, y eso no es así.
> `calculations` existe porque **el costeo es una entidad con vida propia**, distinta del producto. Ver la sección 3.

### Paso 4 — Ana define las condiciones del cálculo → `costing_setup` (historia H1)

Es la **cabecera de la hoja**: con qué unidad, qué volumen, qué moneda y qué período se hace *este* cálculo.

| calculation_id | unit | volume | currency | period |
|---|---|---|---|---|
| c-1 | caja de 6 | 200 | ARS | Mensual |
| c-2 | caja de 6 | **300** | ARS | Mensual |

En marzo Ana consiguió un cliente nuevo y calcula para 300 cajas. **El volumen no es una propiedad del alfajor: es un supuesto de ese cálculo.** Por eso vive acá y no en `products`.

Es **1 a 1** con el cálculo: su clave primaria es el propio `calculation_id`, así que una hoja tiene como mucho una cabecera.

**¿Por qué es una tabla aparte y no columnas de `calculations`?** Porque no nacen al mismo tiempo: el cálculo existe desde que se empieza, y el setup recién cuando el usuario **confirma** el paso 1. Que la fila exista o no responde directamente "¿ya confirmó las condiciones?", sin columnas a medio llenar.

### Paso 5 — Ana carga sus costos → `calc_cost_lines` (historia H2)

Los **renglones de la hoja**: todo lo que le cuesta hacer el producto en *este* cálculo.

| calculation_id | concept | category | behavior | traceability | amount |
|---|---|---|---|---|---|
| c-2 | alquiler del taller | fixed | fixed | direct | 150000.00 |
| c-2 | harina | variable | variable | direct | 30000.00 |
| c-2 | horas de amasado | own_labor | variable | direct | 40000.00 |
| c-2 | contador | indirect | fixed | indirect | 20000.00 |

Cada renglón cuelga del **cálculo**, no del producto. Para saber de qué producto es un costo: renglón → cálculo → producto.

No es solo "lo que el producto consume". Es **todo lo que cuesta hacerlo**: el alquiler y el contador no se "usan" en el alfajor, pero hay que repartirlos entre las cajas.

Dos formas de clasificar el mismo costo:

- **`category`** (fijos, variables, trabajo propio, indirectos): el lenguaje del usuario. Es lo que eligió y es lo que la UI usa para agruparlo. *Columna propuesta en #91.*
- **`behavior`** (¿cambia si hago más unidades?) y **`traceability`** (¿es solo de este producto o de todo el negocio?): el lenguaje del motor de cálculo. Hoy se completan **por convención** a partir de la categoría; son un supuesto, no un dato que haya dado el usuario.

Otros campos:

- `scenario_id` (opcional): si está vacío, el renglón vale para todo el cálculo; si tiene valor, solo para ese escenario (ver paso 7).
- `source_business_cost_id` (opcional desde #91): si el renglón salió del catálogo del negocio (ver sección 4).
- `hours`, `hourly_rate`, `allocation_pct`: reservados para cargar trabajo propio como horas × valor por hora, o para prorratear indirectos. No los usa H2.

### Paso 6 — Ana define cómo quiere ponerle precio → `pricing_inputs` (futuro)

Otra cabecera 1 a 1 del cálculo.

| calculation_id | margin_convention | expected_margin_pct | manual_price |
|---|---|---|---|
| c-2 | sobre costo | 30 | — |

- `expected_margin_pct`: "quiero ganar un 30 %".
- `margin_convention`: sobre qué se calcula ese 30 % (sobre el costo o sobre el precio de venta, que dan resultados distintos).
- `manual_price`: opcional, para la pregunta "ya vendo a $8000, ¿me conviene?".

### Paso 7 — Ana prueba "¿y si…?" → `scenarios` (futuro)

Variantes del mismo cálculo, sin duplicar la hoja.

| id | calculation_id | name | is_base |
|---|---|---|---|
| s-1 | c-2 | Base | true |
| s-2 | c-2 | Si la harina sube 20 % | false |

Un renglón de costo con `scenario_id = s-2` (por ejemplo, la harina a 36000) solo aplica en ese escenario.

### Paso 8 — El sistema calcula → `computed_results` (futuro)

No son datos que cargue el usuario: es **la respuesta del motor**, guardada junto al cálculo (y opcionalmente por escenario).

| calculation_id | scenario_id | total_fixed | variable_unit | unit_cost | break_even_units |
|---|---|---|---|---|---|
| c-2 | s-1 | 170000 | 350 | 1200 | 262 |

Un resultado como "costo unitario: 1200" solo tiene sentido **junto a las condiciones y los costos con los que se calculó**. Por eso se ata al cálculo y no al producto.

---

## 3. Por qué el cálculo es una tabla propia

Si los costos y las condiciones colgaran directamente del producto, todo funcionaría con un solo costeo… hasta el segundo. `calculations` resuelve cuatro cosas:

1. **Historial.** Febrero y marzo conviven sin pisarse. Rehacer el costeo no destruye el anterior.
2. **Alternativas en paralelo.** El mismo producto puede tener dos cálculos vivos a la vez: "caja de 6" contra "caja de 12". No es historia, es comparación.
3. **Ciclo de vida.** El `status` (`draft` → terminado) es del cálculo. El alfajor no está "en borrador"; la hoja de marzo sí.
4. **Ancla.** Condiciones, costos, precio, escenarios y resultados se atan a *un* cálculo concreto, así que siempre se sabe con qué datos salió cada número.

### ¿Qué pasaría si los costos colgaran directo del producto?

Supongamos el modelo sin `calculations`: `products ──< cost_lines`. Funciona mientras haya un solo costeo para siempre; con el primer "volvamos a calcular" aparecen tres problemas.

**1. Se pierde el antes y el después.** Todos los renglones del producto quedan en una sola bolsa:

```
Alfajores
  alquiler ........ 150000   (febrero)
  harina ........... 30000   (febrero)
  packaging ........ 15000   (agregado en marzo)
```

¿Cuánto costaba el alfajor en febrero? No se puede saber: el packaging ya está mezclado. Filtrar por fecha de creación no alcanza, porque se rompe en cuanto alguien edita o borra un renglón viejo.

**2. Editar pisa el pasado.** Si la harina sube de 30000 a 36000 y se edita el renglón, el valor de febrero desaparece. No hay forma de conservar las dos versiones.

**3. Las condiciones no cierran con los costos.** El volumen (200 o 300 cajas) es del costeo, no del producto. Si pasa a 300 cajas, ya no se sabe con qué volumen se calcularon los costos anteriores, y ningún resultado viejo se puede reconstruir.

**Con `calculations` en el medio**, cada hoja es una foto completa y coherente:

```
Alfajores
  ├─ cálculo febrero (200 cajas): alquiler 150000 · harina 30000
  └─ cálculo marzo   (300 cajas): alquiler 150000 · harina 36000 · packaging 15000
```

Cambiar marzo no toca febrero.

### ¿Y agregar un costo nuevo más adelante?

Agregar renglones siempre es posible, con o sin `calculations`: la relación con los renglones es **uno a muchos** y admite tantos como haga falta. Lo que aporta `calculations` es decidir **dónde cae** el renglón nuevo:

| Situación | Qué pasa con el renglón nuevo |
|---|---|
| El cálculo está en **borrador** (`draft`) | Se agrega a ese mismo cálculo: se sigue armando la misma hoja. |
| El cálculo ya está **terminado** | No se toca: se crea un **cálculo nuevo** con el renglón agregado y el anterior queda como estaba. |

> **Estado en la Fase 1 (H1/H2):** hay **un solo borrador por usuario** y el historial está fuera de alcance (Semana 6), así que todo renglón nuevo va al borrador. La regla "cálculo terminado → cálculo nuevo" todavía no está definida en ninguna historia. Hoy estas ventajas no se aprovechan, pero estar en el modelo desde el principio evita una migración de datos cuando lleguen.

---

## 4. El catálogo del negocio: `business_cost_lines`

Algunos costos son del **negocio**, no de un producto: el alquiler del taller se paga una vez y se reparte entre alfajores, tortas y budines. El catálogo permite cargarlo **una vez** y reutilizarlo en cada cálculo.

| id | business_id | concept | amount_period |
|---|---|---|---|
| bc-1 | b-1 | alquiler del taller | 150000.00 |

Cuando un renglón de un cálculo sale del catálogo, `calc_cost_lines.source_business_cost_id` apunta a él (`bc-1`). El renglón guarda **su propia copia** del concepto y el importe: si el alquiler sube en el catálogo, los cálculos viejos no cambian.

> **Estado en la Fase 1:** el catálogo está **fuera de alcance** de H2. Los costos se cargan sueltos en cada cálculo, por eso #91 hace opcional `source_business_cost_id` y cambia su borrado a `set null` (borrar un ítem del catálogo no debe borrar renglones de cálculos ya hechos).

---

## 5. Qué usa cada historia

| Tabla | H1 | H2 | Futuro |
|---|---|---|---|
| `profiles` | ✔ | ✔ | |
| `businesses` | ✔ (uno por defecto) | ✔ | elegir/administrar negocios |
| `products` | ✔ | ✔ | varios productos |
| `calculations` | ✔ (un borrador) | ✔ | historial, varios cálculos |
| `costing_setup` | ✔ | | |
| `calc_cost_lines` | | ✔ | horas × valor, prorrateo |
| `business_cost_lines` | | | catálogo reutilizable |
| `pricing_inputs` | | | precio y margen |
| `scenarios` | | | "¿y si…?" |
| `computed_results` | | | motor de cálculo |

---

## 6. La hoja completa

```
CÁLCULO c-2 · Alfajores · marzo · borrador          ← calculations
────────────────────────────────────────────
Condiciones: caja de 6 · 300 por mes · ARS          ← costing_setup     (H1)
────────────────────────────────────────────
Costos:                                              ← calc_cost_lines   (H2)
  [Fijos]          alquiler del taller ... 150000
  [Variables]      harina ................. 30000
  [Trabajo propio] horas de amasado ....... 40000
  [Indirectos]     contador ............... 20000
────────────────────────────────────────────
Precio: margen 30 % sobre costo                      ← pricing_inputs    (futuro)
Resultado: costo unitario 1200 · equilibrio 262 cajas← computed_results  (futuro)
```

## Referencias

- Glosario de términos y nombres: [04 — Definiciones](./04-definiciones.md)
- Esquema: `lib/db/profile/table.ts`, `lib/db/business/table.ts`, `lib/db/calculation/table.ts`, `lib/db/costs/table.ts`
- Diagrama: `erd-calculadora-inteligente.mmd`
- Decisión de persistencia: [ADR 02](../decisiones/establecidas/02-persistencia-del-calculo-en-servidor.md)
- Conceptos de costos: [02 — Conceptos básicos](./02-Conceptos%20básicos%20para%20comprender%20el%20cálculo%20de%20costos.md)
- Historias: H1 (#69), H2 (#75); migración de `calc_cost_lines` (#91)
