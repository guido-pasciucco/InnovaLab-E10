-- "Chateá con tus datos" (#279), etapa 2: acceso de solo lectura para el agente.
--
-- El modelo escribe SQL, pero nunca ve las tablas reales: solo las vistas del
-- esquema `analyst`, y estas solo devuelven las filas del usuario de la sesión.
--
-- Cómo sabe una vista quién pregunta: el servidor escribe el id del usuario en
-- la variable de sesión `app.user_id` (set_config, solo dentro de la
-- transacción) y cada vista la lee con analyst.current_user_id(). Sin
-- variable, la función devuelve NULL y las vistas no devuelven ninguna fila.
--
-- Qué NO hace: no crea tablas, no cambia las existentes y no abre ningún
-- permiso a `anon` ni a `authenticated`. Las vistas bloquean borrar o cambiar
-- el tipo de las columnas que usan: ver docs/chat-datos/README.md ("Regla
-- para el equipo"). Un test consulta cada vista para detectarlo en el PR.
--
-- Limpieza si el agente se abandona (migración nueva, no se edita esta):
--   DROP SCHEMA analyst CASCADE;
--   DROP ROLE analyst_reader;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'analyst_reader') THEN
    CREATE ROLE analyst_reader NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
  END IF;
END
$$;
--> statement-breakpoint
-- Permite a `postgres` (el rol de Drizzle) ejecutar SET LOCAL ROLE analyst_reader.
GRANT analyst_reader TO postgres;
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS analyst;
--> statement-breakpoint
REVOKE ALL ON SCHEMA analyst FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT USAGE ON SCHEMA analyst TO analyst_reader;
--> statement-breakpoint
COMMENT ON SCHEMA analyst IS 'Vistas de solo lectura con los datos del usuario de la sesión, para el agente "Chateá con tus datos".';
--> statement-breakpoint
-- Usuario de la sesión. PostgreSQL comprueba el permiso de las funciones de una
-- vista contra quien consulta (no contra el dueño de la vista), así que
-- analyst_reader necesita EXECUTE. Es inofensiva: solo devuelve el id que el
-- servidor ya escribió para esta sesión.
-- NULLIF cubre el caso de la variable ya cerrada, que queda como '' y no NULL.
CREATE OR REPLACE FUNCTION analyst.current_user_id() RETURNS uuid
  LANGUAGE sql STABLE
  AS $$ SELECT NULLIF(current_setting('app.user_id', true), '')::uuid $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION analyst.current_user_id() FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION analyst.current_user_id() TO analyst_reader;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Productos
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW analyst.products WITH (security_barrier = true) AS
SELECT
  p.id,
  p.name,
  p.sku_or_slug,
  p.monthly_capacity,
  p.yield_quantity,
  p.variable_cost_status,
  p.variable_cost_unit_amount,
  p.variable_cost_recipe_amount,
  p.is_active,
  p.created_at,
  p.updated_at
FROM public.products p
JOIN public.businesses b ON b.id = p.business_id
WHERE b.owner_user_id = analyst.current_user_id();
--> statement-breakpoint
COMMENT ON VIEW analyst.products IS 'Productos del emprendedor, uno por fila.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.products.id IS 'Identificador del producto.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.products.name IS 'Nombre del producto.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.products.sku_or_slug IS 'Código interno del producto. Puede ser NULL.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.products.monthly_capacity IS 'Unidades que planea producir por mes. NULL significa que no las cargó (no es lo mismo que 0).';
--> statement-breakpoint
COMMENT ON COLUMN analyst.products.yield_quantity IS 'Unidades que rinde una receta completa. NULL en productos antiguos sin ese dato.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.products.variable_cost_status IS 'Estado del costo variable derivado de la receta: pending (pendiente), ready (calculado) o unavailable (no disponible). Solo con ready hay montos.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.products.variable_cost_unit_amount IS 'Costo variable por unidad producida, en pesos argentinos (ARS). NULL si variable_cost_status no es ready.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.products.variable_cost_recipe_amount IS 'Costo variable de una receta completa, en pesos argentinos (ARS). NULL si variable_cost_status no es ready.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.products.is_active IS 'true si el producto está activo.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.products.created_at IS 'Fecha y hora de creación (UTC).';
--> statement-breakpoint
COMMENT ON COLUMN analyst.products.updated_at IS 'Fecha y hora de la última modificación (UTC).';
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Insumos y envases
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW analyst.supplies WITH (security_barrier = true) AS
SELECT
  s.id,
  s.kind,
  s.name,
  s.purchase_price,
  s.purchase_quantity,
  s.purchase_unit,
  s.minimum_unit,
  s.conversion_factor,
  s.created_at,
  s.updated_at
FROM public.supplies s
WHERE s.user_id = analyst.current_user_id();
--> statement-breakpoint
COMMENT ON VIEW analyst.supplies IS 'Insumos y envases que el emprendedor compra, uno por fila.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.supplies.id IS 'Identificador del insumo.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.supplies.kind IS 'Tipo: supply (insumo) o packaging (envase).';
--> statement-breakpoint
COMMENT ON COLUMN analyst.supplies.name IS 'Nombre del insumo o envase.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.supplies.purchase_price IS 'Precio pagado por una compra, en pesos argentinos (ARS).';
--> statement-breakpoint
COMMENT ON COLUMN analyst.supplies.purchase_quantity IS 'Cantidad que trae una compra, expresada en purchase_unit.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.supplies.purchase_unit IS 'Unidad en que se compra (por ejemplo kg o caja).';
--> statement-breakpoint
COMMENT ON COLUMN analyst.supplies.minimum_unit IS 'Unidad mínima en que se usa en las recetas (por ejemplo g).';
--> statement-breakpoint
COMMENT ON COLUMN analyst.supplies.conversion_factor IS 'Cuántas minimum_unit hay en una purchase_unit (por ejemplo 1000 g por kg). Costo por unidad mínima = purchase_price / (purchase_quantity * conversion_factor).';
--> statement-breakpoint
COMMENT ON COLUMN analyst.supplies.created_at IS 'Fecha y hora de creación (UTC).';
--> statement-breakpoint
COMMENT ON COLUMN analyst.supplies.updated_at IS 'Fecha y hora de la última modificación (UTC).';
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Recetas: un renglón por insumo de cada producto
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW analyst.recipe_lines WITH (security_barrier = true) AS
SELECT
  pi.id,
  pi.product_id,
  p.name AS product_name,
  pi.supply_id,
  s.name AS supply_name,
  s.kind AS supply_kind,
  pi.unit,
  pi.quantity
FROM public.product_ingredients pi
JOIN public.products p ON p.id = pi.product_id
JOIN public.businesses b ON b.id = p.business_id
JOIN public.supplies s ON s.id = pi.supply_id
WHERE b.owner_user_id = analyst.current_user_id()
  AND s.user_id = analyst.current_user_id();
--> statement-breakpoint
COMMENT ON VIEW analyst.recipe_lines IS 'Receta de cada producto: un renglón por insumo o envase que usa.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.recipe_lines.id IS 'Identificador del renglón de receta.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.recipe_lines.product_id IS 'Producto al que pertenece el renglón (analyst.products.id).';
--> statement-breakpoint
COMMENT ON COLUMN analyst.recipe_lines.product_name IS 'Nombre del producto.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.recipe_lines.supply_id IS 'Insumo o envase usado (analyst.supplies.id).';
--> statement-breakpoint
COMMENT ON COLUMN analyst.recipe_lines.supply_name IS 'Nombre del insumo o envase.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.recipe_lines.supply_kind IS 'Tipo: supply (insumo) o packaging (envase).';
--> statement-breakpoint
COMMENT ON COLUMN analyst.recipe_lines.unit IS 'Unidad en que se expresa la cantidad del renglón.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.recipe_lines.quantity IS 'Cantidad del insumo que usa la receta, en la unidad del renglón.';
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Gastos del período (catálogo del negocio)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW analyst.business_expenses WITH (security_barrier = true) AS
SELECT
  l.id,
  l.period,
  l.concept,
  l.behavior,
  l.traceability,
  l.amount_period,
  l.created_at,
  l.updated_at
FROM public.business_cost_lines l
JOIN public.businesses b ON b.id = l.business_id
WHERE b.owner_user_id = analyst.current_user_id();
--> statement-breakpoint
COMMENT ON VIEW analyst.business_expenses IS 'Gastos del negocio cargados por mes, uno por fila.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.business_expenses.id IS 'Identificador del gasto.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.business_expenses.period IS 'Mes del gasto, en texto con formato AAAA-MM (por ejemplo 2026-11).';
--> statement-breakpoint
COMMENT ON COLUMN analyst.business_expenses.concept IS 'Concepto del gasto (por ejemplo alquiler).';
--> statement-breakpoint
COMMENT ON COLUMN analyst.business_expenses.behavior IS 'Comportamiento: fixed (fijo, no cambia con la producción) o variable (cambia con la cantidad producida).';
--> statement-breakpoint
COMMENT ON COLUMN analyst.business_expenses.traceability IS 'Relación con el producto: direct (directo) o indirect (indirecto).';
--> statement-breakpoint
COMMENT ON COLUMN analyst.business_expenses.amount_period IS 'Monto del gasto en el mes, en pesos argentinos (ARS).';
--> statement-breakpoint
COMMENT ON COLUMN analyst.business_expenses.created_at IS 'Fecha y hora de creación (UTC).';
--> statement-breakpoint
COMMENT ON COLUMN analyst.business_expenses.updated_at IS 'Fecha y hora de la última modificación (UTC).';
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Cálculos: uno por producto y vez que se usó la calculadora
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW analyst.calculations WITH (security_barrier = true) AS
SELECT
  c.id,
  c.product_id,
  p.name AS product_name,
  c.status,
  c.current_step,
  c.created_at,
  c.updated_at,
  cs.period,
  cs.currency,
  cs.unit,
  cs.volume,
  pr.margin_convention,
  pr.expected_margin_pct,
  pr.manual_price
FROM public.calculations c
JOIN public.products p ON p.id = c.product_id
JOIN public.businesses b ON b.id = p.business_id
LEFT JOIN public.costing_setup cs ON cs.calculation_id = c.id
LEFT JOIN public.pricing_inputs pr ON pr.calculation_id = c.id
WHERE c.user_id = analyst.current_user_id()
  AND b.owner_user_id = analyst.current_user_id();
--> statement-breakpoint
COMMENT ON VIEW analyst.calculations IS 'Cálculos de la calculadora, uno por fila, con su configuración y su margen. Un producto puede tener varios.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.calculations.id IS 'Identificador del cálculo.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.calculations.product_id IS 'Producto calculado (analyst.products.id).';
--> statement-breakpoint
COMMENT ON COLUMN analyst.calculations.product_name IS 'Nombre del producto.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.calculations.status IS 'Estado del cálculo. Hoy todos quedan en draft (borrador): no distingue cálculos cerrados.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.calculations.current_step IS 'Paso más avanzado del asistente al que el usuario puede entrar (1 a 7).';
--> statement-breakpoint
COMMENT ON COLUMN analyst.calculations.created_at IS 'Fecha y hora en que se creó el cálculo (UTC). Un cálculo continuado se edita en el lugar, así que esta fecha no cambia.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.calculations.updated_at IS 'Fecha y hora de la última modificación (UTC).';
--> statement-breakpoint
COMMENT ON COLUMN analyst.calculations.period IS 'Período del cálculo. Hoy siempre es Mensual. NULL si el cálculo aún no guardó su configuración.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.calculations.currency IS 'Moneda del cálculo. Hoy siempre es ARS (pesos argentinos).';
--> statement-breakpoint
COMMENT ON COLUMN analyst.calculations.unit IS 'Unidad en que se vende el producto (por ejemplo caja, paquete o kilo).';
--> statement-breakpoint
COMMENT ON COLUMN analyst.calculations.volume IS 'Cantidad estimada de unidades a vender en el período.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.calculations.margin_convention IS 'Convención del margen. Hoy siempre es sobre_precio: el margen se mide sobre el precio de venta. NULL si aún no cargó el margen.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.calculations.expected_margin_pct IS 'Margen esperado sobre el precio de venta, en porcentaje (30 significa 30 %). NULL si aún no lo cargó.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.calculations.manual_price IS 'Precio de venta fijado a mano, en pesos argentinos (ARS). NULL si se usa el precio que sale del margen.';
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Renglones de costo de cada cálculo
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW analyst.calculation_cost_lines WITH (security_barrier = true) AS
SELECT
  l.id,
  l.calculation_id,
  l.scenario_id,
  l.concept,
  l.behavior,
  l.traceability,
  l.amount,
  l.yield_quantity,
  l.is_own_labor,
  l.hours,
  l.hourly_rate,
  l.created_at
FROM public.calc_cost_lines l
JOIN public.calculations c ON c.id = l.calculation_id
WHERE c.user_id = analyst.current_user_id();
--> statement-breakpoint
COMMENT ON VIEW analyst.calculation_cost_lines IS 'Renglones de costo de cada cálculo, uno por fila.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.calculation_cost_lines.id IS 'Identificador del renglón.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.calculation_cost_lines.calculation_id IS 'Cálculo al que pertenece (analyst.calculations.id).';
--> statement-breakpoint
COMMENT ON COLUMN analyst.calculation_cost_lines.scenario_id IS 'Escenario del renglón (analyst.scenarios.id). NULL si el renglón es del cálculo y no de un escenario.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.calculation_cost_lines.concept IS 'Concepto del costo.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.calculation_cost_lines.behavior IS 'Comportamiento: fixed (fijo) o variable.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.calculation_cost_lines.traceability IS 'Relación con el producto: direct (directo) o indirect (indirecto).';
--> statement-breakpoint
COMMENT ON COLUMN analyst.calculation_cost_lines.amount IS 'Monto del renglón, en pesos argentinos (ARS). En un costo variable es lo que cuesta una compra que rinde yield_quantity unidades del producto.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.calculation_cost_lines.yield_quantity IS 'Unidades del producto que rinde una compra de un costo variable. El costo variable por unidad es amount / yield_quantity. En costos fijos no se usa.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.calculation_cost_lines.is_own_labor IS 'true si es el renglón de trabajo propio del emprendedor. Hay como máximo uno por cálculo.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.calculation_cost_lines.hours IS 'Horas dedicadas. Solo el trabajo propio lo usa; NULL en el resto.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.calculation_cost_lines.hourly_rate IS 'Valor de la hora, en pesos argentinos (ARS). Solo el trabajo propio lo usa; NULL en el resto.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.calculation_cost_lines.created_at IS 'Fecha y hora de creación (UTC).';
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Escenarios del paso 7
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW analyst.scenarios WITH (security_barrier = true) AS
SELECT
  s.id,
  s.calculation_id,
  s.name,
  s.is_base,
  s.price_override,
  s.volume_override,
  s.created_at
FROM public.scenarios s
JOIN public.calculations c ON c.id = s.calculation_id
WHERE c.user_id = analyst.current_user_id();
--> statement-breakpoint
COMMENT ON VIEW analyst.scenarios IS 'Escenarios de cada cálculo (paso 7), uno por fila.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.scenarios.id IS 'Identificador del escenario.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.scenarios.calculation_id IS 'Cálculo al que pertenece (analyst.calculations.id).';
--> statement-breakpoint
COMMENT ON COLUMN analyst.scenarios.name IS 'Nombre del escenario.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.scenarios.is_base IS 'true en el escenario base, que usa los valores del cálculo. Hay uno por cálculo.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.scenarios.price_override IS 'Precio de venta alternativo, en pesos argentinos (ARS). NULL mantiene el precio del cálculo.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.scenarios.volume_override IS 'Volumen alternativo, en unidades. NULL mantiene el volumen del cálculo.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.scenarios.created_at IS 'Fecha y hora de creación (UTC).';
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Permisos: solo lectura de estas vistas, nada más.
-- ---------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA analyst FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT SELECT ON ALL TABLES IN SCHEMA analyst TO analyst_reader;
