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
| `analyst.presentations` | Formas de vender cada producto y cuántas unidades entran |
| `analyst.presentation_packaging` | Envase de cada presentación |

Fuera de las vistas: licitaciones, proveedores, órdenes de compra, `profiles` y las notas de texto libre de los gastos. Cálculos, escenarios, precio sugerido y punto de equilibrio no tienen tabla en el esquema vigente: el agente no puede consultarlos. Cada vista y cada columna tienen un comentario en español: es lo que el modelo lee para interpretar los datos, así que se revisa como documentación.

### Regla para el equipo

Las vistas bloquean **borrar una columna o cambiarle el tipo** si alguna vista de `analyst` la usa. Renombrar o agregar columnas no molesta.

Antes de borrar o cambiar el tipo de una de esas columnas, recreá la vista en la misma migración. `lib/db/analyst-views.int.test.ts` consulta cada vista, así que un cambio que la rompa falla en el PR.

### Advertencias

- **Probar la migración en Supabase antes de mergear.** Crear el rol `analyst_reader` y hacer `GRANT analyst_reader TO postgres` funciona en local, pero en Supabase el usuario `postgres` no es superusuario y no se puede probar desde acá. `bun run deploy` aplica las migraciones a producción: si esta falla, el deploy de cualquiera del equipo queda bloqueado. Lo recomendado es ensayarla antes en un proyecto de Supabase aparte (por ejemplo, el de São Paulo) y recién después mergear.
- **`set_config` es el punto sensible.** El filtro por usuario depende de `app.user_id`. Si el SQL del modelo lograra llamar a `set_config('app.user_id', ...)`, podría cambiar de usuario. La defensa es el validador de SQL (ver "Validador de SQL"), que rechaza esa función y cualquiera fuera de una lista permitida, más los tests de aislamiento. Además tendría que conocer el UUID de otro usuario, y ninguna vista lo expone.
- **El rol hereda permisos abiertos de Postgres.** Puede ejecutar funciones de extensiones (por ejemplo `pgcrypto`, `vector`) y leer `extensions.pg_stat_statements`, porque Postgres las deja abiertas a todos los roles. No se pueden cerrar sin afectar a Supabase. Por eso el validador no puede omitirse y el test de permisos lista esas dos vistas de forma explícita.
- **Orden de migraciones.** `20261123121144_chat_datos_analyst_views` queda última en el journal, después de las migraciones de `main` que borran las tablas del cálculo viejo y las columnas `minimum_unit` y `conversion_factor`. Una base vacía aplica primero el esquema vigente y después estas vistas.
- **Límites del primer lanzamiento.** No hay historial de cálculos ni de escenarios. La comparación en el tiempo que sí existe es la de gastos, por la columna `period` (`AAAA-MM`).

### Validador de SQL

`lib/analyst/sql-guard.ts` revisa el SQL del modelo antes de que llegue a la base. Lo lee con el parser real de PostgreSQL ([`libpg-query`](../dependencias/libpg-query.md)) y recorre todo el árbol con una **lista de permitidos**: lo que no se nombra explícitamente se rechaza. La regla de partida es simple: **solo pasa una consulta `SELECT` (o `WITH ... SELECT`); cualquier otra sentencia se rechaza**.

| Se permite | Se rechaza |
| --- | --- |
| Una sola sentencia `SELECT` o `WITH ... SELECT`, con `UNION`, `JOIN`, subconsultas y ventanas | Dos o más sentencias en un mismo texto, y toda sentencia que no sea un `SELECT`: por ejemplo `INSERT`, `UPDATE`, `DELETE`, `DROP`, `TRUNCATE`, `CREATE`, `SET`, `COPY`, `EXPLAIN` y `DO`. También un `DELETE` escondido dentro de un `WITH` |
| Las 6 vistas de `analyst`, con o sin el prefijo `analyst.` | Cualquier otra relación: `pg_catalog`, `information_schema`, `public`, `auth`, `extensions` |
| Agregados, redondeo, fechas, texto y ventanas (lista en `sql-guard.ts`) | `set_config`, `current_setting`, `pg_sleep`, `pg_read_file`, funciones en `FROM` (`generate_series`, `dblink`) y toda función fuera de la lista |
| Conversiones a números, texto, fechas e intervalos | `regclass`, `regproc`, arreglos, `current_user`, `session_user` |
| Operadores aritméticos, de comparación, `LIKE` y `BETWEEN` | `WITH RECURSIVE`, `SELECT INTO`, `FOR UPDATE`, parámetros (`$1`), operadores con esquema |

Las razones del rechazo están escritas en español y para el modelo: dicen qué cambiar, por ejemplo qué vistas existen.

Un nombre sin esquema solo se acepta si es una de las 6 vistas o un `WITH` definido en el mismo alcance. Esto importa: con `search_path = analyst`, Postgres busca primero en `pg_catalog`, así que `select * from pg_roles` llegaría al catálogo si el validador no lo frenara.

Devuelve el SQL sin el `;` final, listo para que el ejecutor lo envuelva como `SELECT * FROM (...) LIMIT n`. Las posiciones que da el parser son en **bytes**; el validador lo tiene en cuenta para que las tildes y la `ñ` no corten la consulta. El ejecutor debe poner un salto de línea antes del paréntesis de cierre, para que un comentario `--` al final no se lo coma.

**Cómo cambiar la lista.** Agregar una función es una línea en `ALLOWED_FUNCTIONS` y un caso en `sql-guard.fixtures.ts`. El test de integración ejecuta cada consulta aceptada con el rol real, así que una función que no existe se detecta. Agregar una vista es una migración más una entrada en `lib/analyst/views.ts`.

### Ejecutor

`runAnalystQueryService` (`lib/services/analyst-query.ts`) es la única puerta por la que el SQL del modelo llega a la base. Recibe el id verificado del usuario y el texto de la consulta. Hace esto, en orden:

1. Valida las opciones y pasa el SQL por el validador. Si lo rechaza, lanza `ANALYST_QUERY_REJECTED` con la razón en español.
2. Abre una transacción `READ ONLY`.
3. Dentro de ella escribe `app.user_id`, el `statement_timeout` y el `search_path = analyst`, y cambia al rol `analyst_reader` con `SET LOCAL ROLE`. Todo vale solo hasta el final de la transacción, así que ninguna conexión del pool queda con un usuario o rol puestos.
4. Ejecuta la consulta envuelta como `select * from (<sql>) limit n+1`. El `n+1` sirve para saber si había más filas sin traerlas todas.

Devuelve `{ sql, columns, rows, truncated, durationMs }`. Si hay más de `n` filas, devuelve las primeras `n` y `truncated: true`; el agente debe decir que el listado está cortado y usar `count`, `sum` o `avg` para los totales, que no se ven afectados por el límite.

| Opción | Valor por defecto | Rango |
| --- | --- | --- |
| `maxRows` (`ANALYST_MAX_ROWS`) | 30 | 1 a 1000 |
| `statementTimeoutMs` (`ANALYST_STATEMENT_TIMEOUT_MS`) | 3000 | 10 a 30000 |

Para cambiar el valor por defecto se edita la constante. Con pocos datos ninguno de los dos límites se nota; el tiempo máximo importa cuando una consulta cruza varias vistas sobre muchos registros.

| Código | Cuándo | Qué hace el agente |
| --- | --- | --- |
| `ANALYST_QUERY_REJECTED` | El validador no la aceptó | Reescribe la consulta con la razón recibida |
| `ANALYST_QUERY_FAILED` | Postgres la rechazó por un error de la consulta (columna inexistente, división por cero, nombres de columna repetidos) | Corrige y reintenta, con la razón recibida |
| `ANALYST_QUERY_TIMEOUT` | Pasó el tiempo máximo | Acota la consulta (un mes, menos cruces) |

Cualquier otro error (conexión caída, por ejemplo) se propaga sin tocar: es un fallo del servidor, no de la consulta.

Si una consulta devuelve dos columnas con el mismo nombre (por ejemplo `select *` de un `JOIN` entre vistas que comparten `id`), se rechaza con un mensaje que pide poner alias, porque las filas se devuelven como objetos y una columna pisaría a la otra.

### Si se abandona el agente

Se quita con una migración nueva, nunca editando esta:

```sql
DROP SCHEMA analyst CASCADE;
DROP ROLE analyst_reader;
```

### Tests

`lib/analyst/sql-guard.test.ts` cubre el validador con consultas válidas y con más de 60 casos de rechazo, cada uno con el motivo esperado. `lib/analyst/sql-guard.int.test.ts` ejecuta en Postgres, con el rol real, cada consulta que el validador acepta.

`lib/db/analyst-views.int.test.ts` (Postgres local) comprueba que cada vista devuelve solo las filas del usuario de la sesión, que sin usuario no devuelve nada, que cada vista y columna tiene comentario, y que `analyst_reader`, `anon` y `authenticated` no pueden leer tablas reales, escribir ni crear objetos.

`lib/services/analyst-query.int.test.ts` prueba el recorrido completo, sin el modelo: cada vista devuelve solo las filas del usuario (incluso con 24 consultas simultáneas de dos usuarios), 16 intentos de ataque se rechazan (cambiar de usuario con `set_config`, leer el catálogo, tablas reales, `reset role`, varias sentencias), el límite de filas y el `truncated`, el tiempo máximo, los errores de la consulta y que el pool no queda con usuario ni rol. Incluye un test que muestra que, sin el validador, `set_config` sí cambiaría de usuario: deja a la vista que el validador es una barrera obligatoria.
