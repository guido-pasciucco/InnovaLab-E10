# BUG-001 — Las políticas RLS de INSERT no atan las claves foráneas al dueño

| Campo | Valor |
| --- | --- |
| ID | BUG-001 |
| Severidad | Bloqueante |
| Estado | Abierto — pendiente de detalle |
| Origen | Code review de proyecto completo, 2026-10-10 |
| Módulo | `drizzle/`, `lib/db/` |
| Verificación | Lectura de código + análisis de esquema |

## Qué pasa

Las políticas de INSERT de `calculations` y `calc_cost_lines` verifican la pertenencia del usuario solo de forma directa. `calculations_owner_insert` comprueba únicamente `user_id = auth.uid()`, sin validar que `business_id` y `product_id` pertenezcan a ese mismo usuario. `calc_cost_lines_owner_insert` comprueba únicamente que `calculation_id` esté en una lista de cálculos propios, sin validar `source_business_cost_id`, que apunta a una fila de `business_cost_lines` de otro dueño.

La clave foránea no corrige el problema: los triggers de integridad referencial de Postgres se ejecutan con privilegios de sistema y no consultan el RLS de la tabla referenciada.

Escenario: el usuario B, con su cliente Supabase autenticado, inserta `calculations { user_id: B, business_id: <negocio de A>, product_id: <producto de A> }`. Pasa el `WITH CHECK`, pasa la FK y la fila queda. B no puede leer el producto de A, pero sí puede escribir instantáneas de costos en su propio cálculo. Cuando el motor de cálculo lea ese snapshot por join del lado servidor, los costos de A quedan embebidos en un resultado que B sí puede leer.

Es bloqueante porque `lib/db/AGENTS.md:31` define el RLS como la segunda red de seguridad. En estas dos tablas no hay segunda red.

## Dónde está

- `drizzle/20260928101613_enable_rls.sql:90-92` — política de INSERT de `calculations`, que solo valida `user_id = auth.uid()`.
- `drizzle/20260928101613_enable_rls.sql:126-128` — política de INSERT de `calc_cost_lines`, que solo valida el `calculation_id`.
- `lib/db/AGENTS.md:31` — donde el RLS queda declarado como segunda red de seguridad.

## Evidencia

De `drizzle/20260928101613_enable_rls.sql`:

```sql
CREATE POLICY "calculations_owner_insert" ON "calculations"
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
```

```sql
CREATE POLICY "calc_cost_lines_owner_insert" ON "calc_cost_lines"
  FOR INSERT TO authenticated
  WITH CHECK (calculation_id IN (SELECT id FROM calculations WHERE user_id = auth.uid()));
```

## Reproducción

No aplica: verificado por lectura del código y por lectura de la migración de RLS.

## Impacto

Fuga de datos de costos entre inquilinos cuando exista un cliente Supabase con la publishable key leyendo o escribiendo esas tablas. Hoy el alcance es limitado porque la aplicación escribe solo por Drizzle, que según `lib/db/AGENTS.md:31` usa un rol con `BYPASSRLS`.

## Causa raíz

Las políticas se escribieron por tabla, validando el enlace directo con el dueño pero no la transitividad. Cada FK de la cadena `businesses → products → calculations → costing_setup` debería validar que el padre pertenezca al mismo `auth.uid()`.

## Dirección del arreglo

Extender el `WITH CHECK` de ambas políticas para validar la pertenencia del padre: `business_id IN (SELECT id FROM businesses WHERE owner_user_id = auth.uid())` y `product_id` de forma equivalente; en `calc_cost_lines`, validar `source_business_cost_id` contra el `business_id` del cálculo.

Evaluar además un helper o función `SECURITY DEFINER` para evitar repetir subconsultas en 40 políticas. Tradeoff: políticas más verbosas y con coste de planificación en cada INSERT.

## Qué NO se verificó

No se ejecutaron las políticas contra una base real. La conclusión sobre el comportamiento del trigger de RI de Postgres —no consultando el RLS de la tabla referenciada— no se comprobó de forma empírica.