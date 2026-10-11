# BUG-007 — El RLS está probado en 2 de 10 tablas

| Campo | Valor |
| --- | --- |
| ID | BUG-007 |
| Severidad | Aviso |
| Estado | Abierto — pendiente de detalle |
| Origen | Code review de proyecto completo, 2026-10-10 |
| Módulo | `lib/db/rls.int.test.ts` |
| Verificación | Lectura de código + análisis de esquema |

## Qué pasa

La migración de RLS define 40 políticas sobre 10 tablas. El test de integración solo declara dos bloques `describe`: `public.businesses` y `public.products`. Las 8 restantes no tienen ninguna prueba.

Las tablas sin cubrir son `profiles`, `business_cost_lines`, `calculations`, `scenarios`, `calc_cost_lines`, `computed_results`, `costing_setup` y `pricing_inputs`. Es decir, todas las que guardan el borrador y los resultados.

Las dos más delicadas son `costing_setup` y `pricing_inputs`: no tienen columna de dueño y resuelven la pertenencia con una subconsulta indirecta, `USING (calculation_id IN (SELECT id FROM calculations WHERE user_id = auth.uid()))`. Un `WITH CHECK` ausente o un `FOR ALL` mal colocado ahí es indistinguible de un test verde.

Escenario: alguien agrega `pricing_inputs` a un flujo de lectura vía cliente Supabase, o una migración futura recrea la tabla y pierde el `WITH CHECK` del INSERT. El test de servicio no lo detecta porque el rol de `DATABASE_URL` tiene `BYPASSRLS`. El usuario A lee el borrador del usuario B con la publishable key y la suite sigue verde.

Lo que el archivo hace bien, y conviene preservar al extenderlo: usa un cliente Supabase con el JWT de cada usuario, el admin solo para el arrange, y verifica el borrado real con `expect(error).toBeNull()` más un re-chequeo como admin, porque el RLS filtra en silencio.

## Dónde está

- `lib/db/rls.int.test.ts:96` — el primer `describe`, `public.businesses`.
- `lib/db/rls.int.test.ts:138` — el segundo `describe`, `public.products`.
- `drizzle/20260928101613_enable_rls.sql:2-11` — las 10 tablas con RLS habilitado.
- `drizzle/20260928101613_enable_rls.sql` — las 40 declaraciones `CREATE POLICY` del mismo archivo.

## Evidencia

La migración declara RLS sobre 10 tablas y 40 políticas; el archivo de test solo declara 2 bloques `describe`. La lista de tablas sin cubrir es la que figura en la sección anterior.

## Reproducción

No aplica: verificado por lectura del archivo de test y de la migración.

## Impacto

La "segunda red" queda sin verificar en el 80% del esquema. Una regresión de RLS llega a producción con la suite en verde.

## Causa raíz

El test se escribió tabla por tabla cuando se implementó el RLS, y no se extendió con el esquema.

## Dirección del arreglo

Extender `rls.int.test.ts` con un `describe` por tabla reutilizando el esqueleto existente (`arrangeTwoOwners` más `userClient`). Para `costing_setup` y `pricing_inputs`, la afirmación debe ser sobre cálculos del usuario A sembrados vía admin. Ver además `bun run test:int`, que es el proyecto que los corre.

## Qué NO se verificó

No se ejecutó la suite de integración; requiere Supabase local (`bun run e2e:up`).