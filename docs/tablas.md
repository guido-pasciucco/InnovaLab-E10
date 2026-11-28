# Base de datos — tablas

PostgreSQL en Supabase, accedida con Drizzle ORM desde el servidor (`lib/db/`). La definición canónica de cada tabla está en `lib/db/<dominio>/table.ts`; las migraciones SQL versionadas viven en `drizzle/`. Las relaciones de consulta se declaran en `lib/db/relations.ts`.

## Convenciones

- **Motor:** Postgres con `pgvector` (embeddings del chat con datos) y `gen_random_uuid()`. No hay `pgEnum`: los "enums" son `text` + `CHECK` o tipos inferidos de Drizzle.
- **Numeros:** dinero `numeric(12,2)`, cantidades `numeric(14,4)`, porcentajes `numeric(7,2)`/`numeric(5,2)`; llegan a TypeScript como `string`, nunca `float`.
- **Timestamps:** `created_at`/`updated_at` con `defaultNow()` y `$onUpdate`.
- **Propietario:** las tablas de dominio cuelgan de `profiles` (que espeja `auth.users`) o de `businesses`; el aislamiento real lo hace el filtro por `userId` de los servicios (un `VerifiedUserId`), no RLS.
- **Data API cerrada:** PostgREST (PostgREST roles `anon`/`authenticated`) tiene los grants revocados; la app solo entra por Drizzle con el rol `postgres`.

## Perfil y negocio

| Tabla | Propósito | Claves y notas |
| --- | --- | --- |
| `profiles` | Perfil del usuario; `id` = `auth.users.id` | `id uuid PK` (lo pone un trigger de auth), `display_name`, `created_at`. La mayoría de las tablas de dominio cuelga de acá con `ON DELETE CASCADE`. RLS habilitado con políticas por dueño. |
| `businesses` | Negocio del emprendedor (varios por usuario) | `owner_user_id → profiles.id`, `name`, `business_type`, `default_markup_percent`. |
| `products` | Producto con capacidad mensual, markup propio y costo variable cacheado | `business_id → businesses.id`. Receta en `product_ingredients`; presentaciones en `presentations`. Guarda `variable_cost_*` (status `pending`/`ready`/`unavailable`, montos y numeradores/denominadores exactos como `text`) como cache calculado con CHECKs de coherencia. |
| `business_cost_lines` | Gastos del negocio por mes (fijos/indirectos del equilibrio) | `business_id → businesses.id`, `period` (`'YYYY-MM'`), `concept`, `behavior` (`fixed`/`variable`), `traceability` (`direct`/`indirect`), `amount_period`. Índice `(business_id, period)`. RLS habilitado. |
| `calc_closures` | Cierres mensuales append-only: varias versiones por mes, nunca se editan | `business_id`, `period`, `version`, `snapshot jsonb`, `snapshot_schema_version`. Único `(business_id, period, version)`. RLS solo SELECT. |

## Recetas y presentaciones

| Tabla | Propósito | Claves y notas |
| --- | --- | --- |
| `product_ingredients` | Renglones de receta: insumo × producto | `product_id → products.id`, `supply_id → supplies.id` (DEFERRABLE para permitir borrado en cascada de cuenta). Único `(product_id, supply_id)`. |
| `presentations` | Forma comercial de venta (pack de N unidades) | `product_id → products.id`, `units_per_presentation` (>0 y entero), `monthly_capacity`, `markup_percent`. Único `(product_id, name)`. |
| `presentation_packaging` | Envases de cada presentación | `presentation_id → presentations.id`, `supply_id → supplies.id` (precio siempre referenciado, nunca copiado). Único `(presentation_id, supply_id)`. |

## Catálogo de insumos

| Tabla | Propósito | Claves y notas |
| --- | --- | --- |
| `supplies` | Insumos y envases del usuario en una sola tabla | `user_id → profiles.id`, `kind` (`'supply'`/`'packaging'`), `name`, `purchase_price`, `purchase_quantity`, `purchase_unit`. La conversión de unidades se deriva del catálogo en `lib/calc`, no se guarda. |

## Licitaciones (tenders)

| Tabla | Propósito | Claves y notas |
| --- | --- | --- |
| `suppliers` | Cuenta de proveedor | `user_id uuid PK → profiles.id` (una fila por cuenta), `business_name`, `cuit` único, `contact_name`, `phone`, `email`, `categories text[]`. |
| `supplier_links` | Relación "registrado con ese emprendedor" | `owner_user_id → profiles.id`, `supplier_user_id → suppliers.user_id`. Único `(owner_user_id, supplier_user_id)`. |
| `supplier_invites` | Links de invitación personales | Solo se guarda `token_hash` (SHA-256). `owner_user_id → profiles.id`, `used_by_supplier_user_id → suppliers.user_id SET NULL`, `expires_at`, `used_at`. |
| `tenders` | Licitación publicada una vez (solo `cancelled_at`); las rondas se derivan de `round_hours`/`round_count`/`starts_at` | `owner_user_id → profiles.id`, `number` correlativo por owner, CHECKs de rondas y decremento. Único `(owner_user_id, number)`. |
| `tender_items` | Ítems publicados con datos copiados del catálogo | `tender_id → tenders.id`, `supply_id → supplies.id SET NULL` (historial preservado), `position`, `quantity`, `specs`, `starting_price`, `reference_price`. Único `(tender_id, position)`. |
| `tender_invitations` | Proveedores invitados por licitación | `tender_id`, `supplier_user_id` (ambas cascade). Único `(tender_id, supplier_user_id)`. |
| `tender_offers` | Ofertas por ronda, append-only | `tender_item_id`, `invitation_id` (cascade), `round`, `unit_price`. |
| `tender_awards` | Elección del emprendedor por ítem, append-only | `tender_item_id`, `invitation_id`, `unit_price` (precio acordado). |
| `purchase_orders` | Orden de compra final por proveedor adjudicado | `owner_user_id`, `tender_id`, `invitation_id`, `number` correlativo, `delivery_terms`, `payment_terms`, `total`. Único `(tender_id, invitation_id)`: una OC por proveedor por licitación. |
| `purchase_order_lines` | Líneas copiadas al emitir la OC | `order_id → purchase_orders.id`, `tender_item_id`, `position`, datos de la línea (`supply_name`, `unit`, `quantity`, `unit_price`, `line_total`). |
| `tender_drafts` | Borrador del formulario de licitación | `owner_user_id uuid PK → profiles.id`, `content jsonb`, `updated_at`. |

## Asistente y agente

| Tabla | Propósito | Claves y notas |
| --- | --- | --- |
| `help_usage` | Contadores de consumo del asistente de ayuda (rate limit + lease) | `user_id uuid PK → auth.users(id)` (no a `profiles`), `window_started_at`, `request_count`, `active_lease_id`, `active_until`. Sin políticas RLS ni grants a roles de API. |
| `knowledge_chunks` | Fragmentos de documentación con embedding para el chat con datos | `source_path`, `heading`, `content`, `content_hash` (SHA-256, idempotencia), `embedding vector(1024)` con índice HNSW. Global, sin owner. RLS sin políticas y grants revocados. |

## Esquema `analyst` (vistas, no tablas)

Seis vistas `security_barrier` de solo lectura filtradas por usuario (`analyst.products`, `analyst.supplies`, `analyst.recipe_lines`, `analyst.business_expenses`, `analyst.presentations`, `analyst.presentation_packaging`), para el agente "Chateá con tus datos". El rol `analyst_reader` es `NOLOGIN`; el agente escribe SQL validado por `lib/analyst/sql-guard`.

## Tablas eliminadas (legacy)

Las tablas del asistente por pasos de Fase 1 —`active_calculations`, `calculations`, `costing_setup`, `pricing_inputs`, `scenarios`, `calc_cost_lines`, `computed_results`— fueron **dropeadas** (`drizzle/20261123202736_drop_legacy_calculator_tables.sql`): el borrador del cálculo ya no persiste en tablas propias. `erd-calculadora-inteligente.mmd` quedó desactualizado (describe ese esquema viejo) y no incluye las tablas actuales de licitaciones, supplies ni cierres.
