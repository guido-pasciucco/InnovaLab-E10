# libpg-query — El parser real de PostgreSQL para validar el SQL del agente

`libpg-query` (`17.8.3`, versión exacta) convierte un texto SQL en su árbol sintáctico con el mismo parser que usa el servidor de PostgreSQL. Lo usa `lib/analyst/sql-guard.ts` para decidir si una consulta escrita por el modelo se puede ejecutar.

## Problema que resuelve

El agente de "Chateá con tus datos" (#279) escribe SQL libre. Antes de ejecutarlo hay que asegurar que sea un único `SELECT` sobre las vistas del esquema `analyst`, sin funciones ni construcciones peligrosas (`set_config`, `pg_sleep`, `INSERT`, varias sentencias, comentarios que esconden una segunda sentencia).

Validar con expresiones regulares es frágil: un `;` dentro de un comentario o de un texto entre comillas parece una segunda sentencia pero no lo es, y al revés. Un parser con gramática propia puede interpretar algo distinto de lo que interpreta la base. Con el parser real, lo que el validador acepta es lo que la base entiende.

## Cómo se usa en este proyecto

| Aspecto | Decisión |
| --- | --- |
| Versión | `17.8.3`, la línea de PostgreSQL 17 (la base local es 17.6). Un parser de otra versión mayor puede aceptar sintaxis que la base no entiende, o al revés |
| Formato | WebAssembly puro (1,1 MB), sin binarios nativos: corre igual en Windows, en CI y en Vercel |
| Cómo se valida | Lista de permitidos sobre el árbol: lo que no está nombrado explícitamente se rechaza |
| Next.js | Está en `serverExternalPackages` de `next.config.ts`. Empaquetado, pierde la ruta de su archivo `.wasm` y falla con `ENOENT` |
| Dónde corre | Solo en el servidor. Ninguna pantalla lo importa |

## Errores comunes

- **Quitarlo de `serverExternalPackages`.** El build compila pero falla al cargar con `ENOENT ... libpg-query.wasm`. Se comprobó con un build de producción.
- **Cortar el texto por posiciones de caracteres.** El parser devuelve posiciones en **bytes** UTF-8. Con tildes o `ñ` un `slice` común corta mal; el validador convierte a bytes primero.
- **Cambiar de versión mayor sin revisar.** Subir a la 18 deja el parser más nuevo que la base; hacerlo junto con la base de Supabase, no antes.
- **Confiar solo en este validador.** Es una capa. La base también limita: el rol `analyst_reader` solo lee las vistas, cada vista filtra por el usuario de la sesión y la transacción es de solo lectura (ver `docs/chat-datos/README.md`).

## Paso siguiente

Ver `docs/chat-datos/README.md`, sección "Validador de SQL".
