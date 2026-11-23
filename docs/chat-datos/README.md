# Chateá con tus datos

Búsqueda sobre la documentación del producto y acceso de solo lectura a los datos del usuario, para el agente de la issue #279. La pantalla llega en una etapa posterior. El flujo completo está en `docs/assets/agent/agente-chat-datos-aws.drawio`.

## Etapa 1: búsqueda en documentos

### Qué hay

- La tabla `knowledge_chunks` guarda fragmentos de `docs/producto` con un vector de 1024 dimensiones.
- Los documentos son globales: no tienen dueño.
- La ingesta se corre aparte de las migraciones. Volver a correrla no vuelve a calcular los fragmentos que no cambiaron.

### Variables

Están en `.env.example`. Los valores reales van en `.env.local`, nunca en el repositorio.

| Variable | Uso en esta etapa |
| --- | --- |
| `CHAT_DATOS_AWS_ACCESS_KEY_ID` | Clave del usuario de IAM propio del agente |
| `CHAT_DATOS_AWS_SECRET_ACCESS_KEY` | Secreto de esa clave |
| `CHAT_DATOS_EMBEDDING_MODEL` | Opcional. Por defecto `amazon.titan-embed-text-v2:0` |

`CHAT_DATOS_ENABLED`, `CHAT_DATOS_SHOW_SQL` y `CHAT_DATOS_MODEL` las usa la pantalla, en la etapa 3.

### Ingesta

Contra la base local:

```bash
bun run knowledge:ingest
```

Contra Supabase hay que pasar `--remote`. Sin esa bandera el script se niega a escribir en un host que no sea local.

```bash
bun run knowledge:ingest -- --remote
```

### Tests

Los tests no llaman a AWS. El cliente de Titan se prueba con una respuesta simulada y la búsqueda contra Postgres local usa un embedder falso.

## Etapa 2: acceso de solo lectura a los datos del usuario

### Cómo funciona

El modelo escribe SQL, pero nunca ve las tablas reales. Solo puede consultar las vistas del esquema `analyst`, con el rol `analyst_reader` (sin login, sin `BYPASSRLS`, sin permisos de escritura).

1. El servidor escribe el id del usuario de la sesión en la variable `app.user_id`, solo dentro de la transacción.
2. Cada vista lee esa variable con `analyst.current_user_id()` y devuelve únicamente las filas de ese usuario.
3. Sin variable, con la variable vacía o con un id desconocido, las vistas no devuelven ninguna fila.

Las vistas llevan `security_barrier`, para que una función escrita por el modelo en un `WHERE` no pueda ver filas antes de que se aplique el filtro del usuario.

| Vista | Qué contiene |
| --- | --- |
| `analyst.products` | Productos, capacidad mensual y costo variable |
| `analyst.supplies` | Insumos y envases, con precio y unidades de compra |
| `analyst.recipe_lines` | Recetas: un renglón por insumo de cada producto |
| `analyst.business_expenses` | Gastos del negocio por mes (`AAAA-MM`) |
| `analyst.calculations` | Cálculos con su configuración y su margen |
| `analyst.calculation_cost_lines` | Renglones de costo de cada cálculo |
| `analyst.scenarios` | Escenarios del paso 7 |

Fuera de las vistas: licitaciones, proveedores, órdenes de compra, `profiles`, las notas de texto libre de los gastos y `computed_results` (está vacía: el equilibrio se calcula con `lib/calc`). Cada vista y cada columna tienen un comentario en español: es lo que el modelo lee para interpretar los datos, así que se revisa como documentación.

### Regla para el equipo

Las vistas bloquean **borrar una columna o cambiarle el tipo** si alguna vista de `analyst` la usa. Renombrar o agregar columnas no molesta.

Antes de borrar o cambiar el tipo de una de esas columnas, recreá la vista en la misma migración. `lib/db/analyst-views.int.test.ts` consulta cada vista, así que un cambio que la rompa falla en el PR.

### Advertencias

- **Probar la migración en Supabase antes de mergear.** Crear el rol `analyst_reader` y hacer `GRANT analyst_reader TO postgres` funciona en local, pero en Supabase el usuario `postgres` no es superusuario y no se puede probar desde acá. `bun run deploy` aplica las migraciones a producción: si esta falla, el deploy de cualquiera del equipo queda bloqueado. Lo recomendado es ensayarla antes en un proyecto de Supabase aparte (por ejemplo, el de São Paulo) y recién después mergear.
- **`set_config` es el punto sensible.** El filtro por usuario depende de `app.user_id`. Si el SQL del modelo lograra llamar a `set_config('app.user_id', ...)`, podría cambiar de usuario. La defensa es el validador de SQL (etapa 2, bloque siguiente), que rechaza esa función y cualquiera fuera de una lista permitida, más los tests de aislamiento. Además tendría que conocer el UUID de otro usuario, y ninguna vista lo expone.
- **El rol hereda permisos abiertos de Postgres.** Puede ejecutar funciones de extensiones (por ejemplo `pgcrypto`, `vector`) y leer `extensions.pg_stat_statements`, porque Postgres las deja abiertas a todos los roles. No se pueden cerrar sin afectar a Supabase. Por eso el validador no puede omitirse y el test de permisos lista esas dos vistas de forma explícita.
- **Orden de migraciones.** Esta migración se genera sobre la última de la etapa 1. Si otro PR con migraciones se mergea antes (por ejemplo el #259), hay que regenerarla para que quede después en el orden de Drizzle.
- **Límites del primer lanzamiento.** Hoy `calculations.status` siempre es `draft`, y un cálculo continuado se edita en el lugar, así que su `created_at` no cambia. Cualquier comparación mensual depende de esa convención.

### Si se abandona el agente

Se quita con una migración nueva, nunca editando esta:

```sql
DROP SCHEMA analyst CASCADE;
DROP ROLE analyst_reader;
```

### Tests

`lib/db/analyst-views.int.test.ts` (Postgres local) comprueba que cada vista devuelve solo las filas del usuario de la sesión, que sin usuario no devuelve nada, que cada vista y columna tiene comentario, y que `analyst_reader`, `anon` y `authenticated` no pueden leer tablas reales, escribir ni crear objetos.
