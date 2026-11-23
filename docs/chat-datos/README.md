# Chateá con tus datos

Búsqueda sobre la documentación del producto para el agente de la issue #279. La pantalla y el SQL llegan en etapas posteriores. El flujo completo está en `docs/assets/agent/agente-chat-datos-aws.drawio`.

## Qué hay en esta etapa

- La tabla `knowledge_chunks` guarda fragmentos de `docs/producto` con un vector de 1024 dimensiones.
- Los documentos son globales: no tienen dueño.
- La ingesta se corre aparte de las migraciones. Volver a correrla no vuelve a calcular los fragmentos que no cambiaron.

## Variables

Están en `.env.example`. Los valores reales van en `.env.local`, nunca en el repositorio.

| Variable | Uso en esta etapa |
| --- | --- |
| `CHAT_DATOS_AWS_ACCESS_KEY_ID` | Clave del usuario de IAM propio del agente |
| `CHAT_DATOS_AWS_SECRET_ACCESS_KEY` | Secreto de esa clave |
| `CHAT_DATOS_EMBEDDING_MODEL` | Opcional. Por defecto `amazon.titan-embed-text-v2:0` |

`CHAT_DATOS_ENABLED`, `CHAT_DATOS_SHOW_SQL` y `CHAT_DATOS_MODEL` las usa la pantalla, en la etapa 3.

## Ingesta

Contra la base local:

```bash
bun run knowledge:ingest
```

Contra Supabase hay que pasar `--remote`. Sin esa bandera el script se niega a escribir en un host que no sea local.

```bash
bun run knowledge:ingest -- --remote
```

## Tests

Los tests no llaman a AWS. El cliente de Titan se prueba con una respuesta simulada y la búsqueda contra Postgres local usa un embedder falso.
