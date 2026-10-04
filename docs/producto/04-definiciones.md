# Definiciones

Glosario corto de las palabras que aparecen en el código, el esquema y las issues, y **por qué se llaman así**. Para el recorrido completo de las tablas, ver [03 — Modelo de datos del cálculo](./03-modelo-de-datos-del-calculo.md).

Cada entrada: **qué es** · *por qué el nombre*.

---

## Nombres de tablas y entidades

**`line` (en `calc_cost_lines`, `business_cost_lines`)**
Un **renglón**: una fila de costo con concepto e importe.
*Viene de* line item, *la convención contable para cada renglón de una factura o pedido (como `order_lines` o `invoice_line_items`).*

**`calc`**
Abreviatura de *calculation* (cálculo).
*Se usa para acortar nombres largos; `calc_cost_lines` = renglones de costo de un cálculo.*

**`calc_cost_lines`**
Los costos de **un cálculo concreto** (alquiler, harina, horas de amasado…).
*"Renglones de costo del cálculo".*

**`business_cost_lines`**
El **catálogo de costos del negocio**, cargados una vez para reutilizarlos en varios cálculos. Fuera de alcance en la Fase 1.
*"Renglones de costo del negocio".*

**`calculation` (cálculo)**
Una vez que el usuario costea un producto: una "hoja de presupuesto" con fecha. Un producto puede tener muchos.
*Se separa del producto para poder tener historial y alternativas sin pisar datos.*

**`costing_setup`**
Las condiciones de un cálculo: unidad, volumen, moneda y período (paso 1, H1).
*Setup = configuración inicial; costing = costeo.*

**`pricing_inputs`**
Los datos para fijar el precio: margen esperado, convención de margen, precio manual.
*Inputs = datos de entrada; pricing = fijación de precio.*

**`scenario` (escenario)**
Una variante "¿y si…?" del mismo cálculo (por ejemplo, "si la harina sube 20 %").
*`is_base` marca el escenario original contra el que se comparan los demás.*

**`computed_results`**
Lo que **calcula el sistema**, no lo que carga el usuario: costo unitario, punto de equilibrio, etc.
*Computed = calculado por el motor, para distinguirlo de los datos ingresados.*

**`profile` (perfil)**
Los datos propios de la app para un usuario de Supabase Auth.
*Auth guarda la cuenta (email, contraseña); el perfil guarda lo que la app necesita sobre esa persona.*

---

## Columnas y valores

**`status: "draft"`**
**Borrador**: un cálculo todavía en edición. En la Fase 1 hay uno por usuario.

**`category`**
La categoría que elige el usuario: `fixed` (fijos), `variable` (variables), `own_labor` (trabajo propio), `indirect` (indirectos).
*Es el lenguaje del usuario; la UI agrupa los costos por esto. Propuesta en #91.*

**`behavior` (comportamiento)**
Si el costo **cambia con la cantidad producida**: `fixed` o `variable`.
*Término clásico de costos: cómo se "comporta" el costo frente al volumen.*

**`traceability` (trazabilidad)**
Si el costo **se puede atribuir directamente a este producto**: `direct` o `indirect`.
*Que se pueda "rastrear" hasta el producto. Lo indirecto hay que repartirlo con un criterio.*

**`own_labor` (trabajo propio)**
El valor del tiempo que el emprendedor pone él mismo.
*Labor = mano de obra; own = propia. Se separa porque es el costo que más se olvida.*

**`amount` vs `amount_period`**
`amount`: importe del renglón en el cálculo. `amount_period`: importe del catálogo, expresado por período (ej. por mes).

**`allocation_pct`**
Porcentaje de un costo indirecto que se le asigna a este producto.
*Allocation = asignación/prorrateo.*

**`hours`, `hourly_rate`**
Horas y valor por hora, para cargar trabajo propio como horas × tarifa. No los usa H2.

**`margin_convention`**
Sobre qué se calcula el margen: sobre el costo (*markup*) o sobre el precio de venta. El mismo 30 % da precios distintos según la convención.

**`contribution_margin_unit` (margen de contribución unitario)**
Lo que deja cada unidad después de pagar sus costos variables; con eso se cubren los fijos.

**`break_even_units` / `break_even_sales` (punto de equilibrio)**
Cuántas unidades (o cuánta plata) hay que vender para no ganar ni perder.

**`schema_version`**
Versión del formato con que se guardó el cálculo, para poder migrar datos viejos si el formato cambia.

**`source_business_cost_id`**
Si un renglón salió del catálogo del negocio, apunta al ítem de origen. Opcional desde #91.

---

## Términos técnicos

**Uno a uno (1 a 1)**
Cada fila de A tiene como mucho una fila en B. Ej.: un cálculo tiene un solo `costing_setup`.

**Uno a muchos (1 a N)**
Una fila de A tiene muchas en B; cada fila de B pertenece a una sola de A. Ej.: un producto tiene muchos cálculos.

**Muchos a muchos (N a N)**
Muchas filas de A se relacionan con muchas de B; requiere una **tabla intermedia**. *`calculations` no es una de ellas: cada cálculo es de un solo producto.*

**FK (foreign key, clave foránea)**
Columna que apunta al `id` de otra tabla (ej. `calculation_id`).

**`onDelete: cascade` / `set null`**
Qué pasa con las filas hijas al borrar la madre: `cascade` las borra; `set null` las conserva y vacía la referencia.

**`uuid`**
Identificador único aleatorio. Se usa en vez de números correlativos para que los ids no se puedan adivinar.

**`numeric(12,2)`**
Número decimal exacto: hasta 12 dígitos, 2 de ellos decimales. En TypeScript llega como **string**, nunca como `number`, para no perder centavos por redondeo.

**Upsert**
*Update + insert*: actualiza la fila si existe, la crea si no.

**RLS (Row Level Security)**
Reglas de Postgres que limitan qué filas puede ver cada usuario. Igual, los servicios filtran siempre por el usuario de la sesión.

**`snake_case` / `camelCase`**
En Postgres las columnas van en `snake_case` (`calculation_id`); en TypeScript, en `camelCase` (`calculationId`). Drizzle traduce entre ambos.

**Service (servicio)**
Función de servidor en `lib/services/` que valida y aplica una regla de negocio. No sabe si la llamó una página, una Server Action o un test.

**Server Action**
Función de servidor que un formulario llama directamente. Es una "puerta delgada": obtiene el usuario y delega en el servicio.
