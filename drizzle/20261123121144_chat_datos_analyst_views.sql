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
  p.variable_cost_unavailable_code,
  p.variable_cost_calculated_at,
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
COMMENT ON COLUMN analyst.products.variable_cost_unavailable_code IS 'Motivo por el que el costo variable no se pudo calcular. NULL si el estado es pending o ready.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.products.variable_cost_calculated_at IS 'Fecha y hora del último cálculo del costo variable (UTC). NULL si todavía no se calculó.';
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
-- Presentaciones: una forma de vender cada producto
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW analyst.presentations WITH (security_barrier = true) AS
SELECT
  pr.id,
  pr.product_id,
  p.name AS product_name,
  pr.name,
  pr.units_per_presentation,
  pr.created_at,
  pr.updated_at
FROM public.presentations pr
JOIN public.products p ON p.id = pr.product_id
JOIN public.businesses b ON b.id = p.business_id
WHERE b.owner_user_id = analyst.current_user_id();
--> statement-breakpoint
COMMENT ON VIEW analyst.presentations IS 'Formas de vender un producto, una por fila. El precio y el punto de equilibrio no están en esta vista.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.presentations.id IS 'Identificador de la presentación.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.presentations.product_id IS 'Producto al que pertenece (analyst.products.id).';
--> statement-breakpoint
COMMENT ON COLUMN analyst.presentations.product_name IS 'Nombre del producto.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.presentations.name IS 'Nombre de la presentación (por ejemplo caja de 6).';
--> statement-breakpoint
COMMENT ON COLUMN analyst.presentations.units_per_presentation IS 'Cantidad de unidades del producto que entran en esta presentación.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.presentations.created_at IS 'Fecha y hora de creación (UTC).';
--> statement-breakpoint
COMMENT ON COLUMN analyst.presentations.updated_at IS 'Fecha y hora de la última modificación (UTC).';
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Envase de cada presentación
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW analyst.presentation_packaging WITH (security_barrier = true) AS
SELECT
  pp.id,
  pp.presentation_id,
  pr.name AS presentation_name,
  pr.product_id,
  p.name AS product_name,
  pp.supply_id,
  s.name AS supply_name,
  pp.unit,
  pp.quantity
FROM public.presentation_packaging pp
JOIN public.presentations pr ON pr.id = pp.presentation_id
JOIN public.products p ON p.id = pr.product_id
JOIN public.businesses b ON b.id = p.business_id
JOIN public.supplies s ON s.id = pp.supply_id
WHERE b.owner_user_id = analyst.current_user_id()
  AND s.user_id = analyst.current_user_id();
--> statement-breakpoint
COMMENT ON VIEW analyst.presentation_packaging IS 'Envases que usa cada presentación, uno por fila.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.presentation_packaging.id IS 'Identificador del renglón de envase.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.presentation_packaging.presentation_id IS 'Presentación a la que pertenece (analyst.presentations.id).';
--> statement-breakpoint
COMMENT ON COLUMN analyst.presentation_packaging.presentation_name IS 'Nombre de la presentación.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.presentation_packaging.product_id IS 'Producto de esa presentación (analyst.products.id).';
--> statement-breakpoint
COMMENT ON COLUMN analyst.presentation_packaging.product_name IS 'Nombre del producto.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.presentation_packaging.supply_id IS 'Envase del catálogo (analyst.supplies.id).';
--> statement-breakpoint
COMMENT ON COLUMN analyst.presentation_packaging.supply_name IS 'Nombre del envase.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.presentation_packaging.unit IS 'Unidad en que se expresa la cantidad.';
--> statement-breakpoint
COMMENT ON COLUMN analyst.presentation_packaging.quantity IS 'Cantidad del envase que usa la presentación, en esa unidad.';
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Permisos: solo lectura de estas vistas, nada más.
-- ---------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA analyst FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT SELECT ON ALL TABLES IN SCHEMA analyst TO analyst_reader;
