# BUG-001 — Las políticas RLS de INSERT no atan las claves foráneas al dueño

| Campo | Valor |
| --- | --- |
| ID | BUG-001 |
| Severidad | Bloqueante |
| Estado | Cerrado — verificado en local (RED→GREEN) |
| Origen | Code review de proyecto completo, 2026-10-10 |
| Módulo | `drizzle/`, `lib/db/` |
| Verificación | Ejecutado contra Supabase local |

## Qué pasa

La tabla `calculations` tiene tres columnas importantes: `user_id` ("esta fila es mía"), `business_id` ("apunta al negocio X") y `product_id` ("apunta al producto Y"). La política de INSERT revisa solo la primera: deja insertar la fila si dice que es tuya, y no mira a qué apunta. Es como un sobre con tu nombre escrito afuera —eso lo revisan— pero con una carta adentro que dice "vivo en la casa de otro" —eso no lo leen.

Escenario: el usuario B, con su cliente Supabase autenticado, inserta `calculations { user_id: B, business_id: <negocio de A>, product_id: <producto de A> }`. La regla pregunta "¿`user_id` es B?" y como la respuesta es sí, la fila queda. Nadie pregunta si el negocio y el producto son de B. B no puede leer el producto de A, pero sí puede escribir instantáneas de costos en su propio cálculo; cuando el motor de cálculo lea ese snapshot por join del lado servidor, los costos de A quedan embebidos en un resultado que B sí puede leer.

La clave foránea no impide esto, por dos motivos. Primero, la FK no pregunta "¿es tuyo?", pregunta "¿existe?": verifica que el id exista en la tabla de negocios, y el negocio de A existe. Es como mostrar el DNI y dar una dirección: miran que seas vos, y de la dirección solo chequean que la calle exista en el mapa, no que vivas ahí. Segundo, ese chequeo interno lo ejecuta Postgres con privilegios de sistema, sin pasar por el RLS: es el propio motor el que confirma que el id existe, sin preguntarle a nadie si el usuario puede verlo.

En `calc_cost_lines` se repite el mismo patrón: `calc_cost_lines_owner_insert` valida que el `calculation_id` sea de un cálculo propio, pero ignora `source_business_cost_id`, que apunta a una fila de `business_cost_lines` de otro dueño.

En resumen, dos piezas: (1) la política revisa de quién es la fila, pero no a qué apunta la fila; (2) la FK solo confirma que esos ids existen, con un chequeo que no respeta el RLS.

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

Reproducido con tests de integración contra Supabase local
(`lib/db/rls.int.test.ts`, commit `524903e`): antes del arreglo, el INSERT
cruzado de Beto (fila propia apuntando a negocio/producto/línea de Ana) pasaba
en ambas tablas — 2 failed / 8 passed. Después de la migración
(`drizzle/20261015102837_rls_transitive_policies.sql`, commit `b051f19`), el
cruzado falla por violación de RLS y el propio pasa — 10/10.

## Impacto

Fuga de datos de costos entre inquilinos cuando exista un cliente Supabase con la publishable key leyendo o escribiendo esas tablas. Hoy el alcance es limitado porque la aplicación escribe solo por Drizzle, que según `lib/db/AGENTS.md:31` usa un rol con `BYPASSRLS`.

## Causa raíz

Las políticas se escribieron por tabla, validando el enlace directo con el dueño pero no la transitividad. Cada FK de la cadena `businesses → products → calculations → costing_setup` debería validar que el padre pertenezca al mismo `auth.uid()`.

## Dirección del arreglo

Propuesta: extender el `WITH CHECK` de ambas políticas para validar la pertenencia de forma transitiva, en una migración nueva versionada en `drizzle/` (las políticas ya aplicadas no se editan a mano; la migración hace `DROP POLICY IF EXISTS` antes de cada `CREATE POLICY`).

Para `calculations_owner_insert`, exigir que el negocio y el producto pertenezcan al usuario y que sean coherentes entre sí (el producto pertenece a ese negocio):

```sql
CREATE POLICY "calculations_owner_insert" ON "calculations"
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (business_id, product_id) IN (
      SELECT b.id, p.id
      FROM products p
      JOIN businesses b ON b.id = p.business_id
      WHERE b.owner_user_id = auth.uid()
    )
  );
```

Para `calc_cost_lines_owner_insert`, exigir que la línea fuente pertenezca a un negocio del usuario:

```sql
CREATE POLICY "calc_cost_lines_owner_insert" ON "calc_cost_lines"
  FOR INSERT TO authenticated
  WITH CHECK (
    calculation_id IN (SELECT id FROM calculations WHERE user_id = auth.uid())
    AND source_business_cost_id IN (
      SELECT l.id
      FROM business_cost_lines l
      JOIN businesses b ON b.id = l.business_id
      WHERE b.owner_user_id = auth.uid()
    )
  );
```

Aplicar el mismo `WITH CHECK` extendido a las políticas de UPDATE de ambas tablas (`calculations_owner_update`, `calc_cost_lines_owner_update`): el `USING` ya restringe tocar filas propias, pero el `WITH CHECK` actual permitiría cambiar `business_id`, `product_id` o `source_business_cost_id` a ids ajenos dentro de una fila propia.

Verificación de la propuesta: reproducir contra el Supabase local con dos usuarios, donde el insert cruzado debe fallar por violación de RLS, y correr la suite de integración existente (`bun run test:int`) para confirmar que el flujo legítimo sigue en verde.

Evaluar además un helper o función `SECURITY DEFINER` para evitar repetir subconsultas en 40 políticas. Tradeoff: políticas más verbosas y con coste de planificación en cada INSERT.

## Qué NO se verificó

El comportamiento interno del trigger de RI de Postgres (no consultar el RLS
de la tabla referenciada) no se comprobó de forma aislada; con las políticas
transitivas el INSERT cruzado se rechaza en el `WITH CHECK` antes de que el
trigger importe, así que dejó de ser load-bearing para este bug.