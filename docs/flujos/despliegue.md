# Deploy en Vercel

## Pasos

### 1. Completar las credenciales

```bash
cp .env.deploy.example .env.deploy
```

Editá `.env.deploy` con:

- `SITE_URL`: la URL pública del proyecto. Se conoce después de vincularlo: está en el dashboard del proyecto, en Settings → Domains. Si el nombre ya estaba tomado, Vercel le agrega un sufijo y esa es la que va.
- `DATABASE_URL`: connection string del transaction pooler (puerto 6543).
- `DIRECT_URL`: connection string del session pooler (puerto 5432). Opcional para deployar.
- `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: los del proyecto de Supabase.

`.env.deploy` está en `.gitignore` y no se commitea nunca.

### 2. Vincular el proyecto

```bash
bunx vercel login
bunx vercel link
```

Una sola vez por máquina. Crea el vínculo local con el proyecto de Vercel.

### 3. Subir las variables

```bash
bun run deploy:env            # production
bun run deploy:env preview    # preview
```

Se repite solo cuando cambia una credencial.

### 4. Deployar

```bash
bun run deploy            # producción
bun run deploy:preview    # preview
```

### 5. Verificar

- La home responde y no redirige en loop.
- El login funciona y la sesión persiste al recargar.
- El link de recuperación de contraseña apunta al dominio correcto.
- Una lectura de datos devuelve filas y no un error de tabla inexistente.

## Consideraciones serias

### `SITE_URL` es obligatoria en producción

La app no confía en los headers del request para resolver su propio origen: si `SITE_URL` falta, lanza un error en vez de aceptar el host que llegue. El deploy compila y el resto del sitio anda, pero el registro y la recuperación de contraseña devuelven 500: son las dos únicas rutas que resuelven el origen.

Como la URL se conoce recién después de crear el proyecto, el orden es: `vercel link` → leer el dominio en el dashboard → cargar `SITE_URL` → deployar. Si deployaste antes de saberla, el primer deploy sirve para descubrirla: corregí `SITE_URL`, volvé a correr `deploy:env` y redeployá. La variable no se aplica hasta el build siguiente.

### El build no aplica migraciones

Vercel corre `next build` y nada más. Si `DATABASE_URL` apunta a una base sin migrar, la app levanta y falla en la primera consulta.

`bun run deploy` ya corre `bun run deploy:migrate` antes de subir (lee `DIRECT_URL` de `.env.deploy`), así que las migraciones pendientes se aplican en cada deploy a producción. `deploy:preview` no migra. Si deployás por otra vía (push con Git conectado, dashboard), migrá a mano.

Para migrar usá la conexión del puerto 5432 (session pooler o directa), nunca el pooler de transacciones del 6543: le asigna una conexión distinta a cada sentencia y rompe las migraciones de varios pasos.

```bash
DIRECT_URL="postgresql://…:5432/postgres" bun run db:migrate
```

Si la base ya está migrada, este paso no hace falta.

### Las funciones corren en la misma región que la base

`vercel.json` fija la región de las funciones en `gru1` (São Paulo), que es la misma región de AWS (`sa-east-1`) donde está el proyecto de Supabase. Sin ese archivo, Vercel usa `iad1` (Washington) y cada consulta cruza el continente.

Las dos regiones se mueven juntas. Si el proyecto de Supabase cambia de región, `regions` cambia en el mismo deploy: una función lejos de su base es más lenta que una función lejos del usuario. El plan Hobby admite una sola región.

Supabase no permite cambiar la región de un proyecto existente: hay que crear uno nuevo, volver a cargar las credenciales en `.env.deploy`, correr `deploy:env` y repetir la configuración de Auth.

### Supabase Auth valida los redirects

Los links de confirmación de cuenta y de recuperación de contraseña se generan con `SITE_URL`, pero Supabase los valida contra una lista blanca del proyecto. Si el dominio deployado no está ahí, el flujo falla aunque `SITE_URL` esté bien cargada.

Se agrega en Authentication → URL Configuration → Redirect URLs, con el patrón del dominio deployado.

### Las credenciales no van al repo

El repositorio es público y cada PR pasa por un escáner de secretos. El repo guarda **cómo** deployar; Vercel guarda **con qué**.

### Los previews pueden escribir en la base real

Si `DATABASE_URL` apunta a la base del equipo, cualquier preview escribe ahí. Si eso no es aceptable, los previews necesitan su propia base o no se deployan.

### `.gitignore` no filtra el contexto de build

El CLI sube el directorio completo y solo respeta `.vercelignore`. Un archivo local que no esté ahí puede abortar el deploy aunque git lo esté ignorando: un socket, un archivo bloqueado o una carpeta de estado de herramientas.

### Quién es dueño del proyecto de Vercel

Un deploy del equipo con credenciales de una sola persona se cae cuando esa persona se va. Definilo antes del primer deploy.

## Asistente de ayuda

El botón aparece solo si `HELP_ENABLED=true` y el resto de las variables están completas. `HELP_MODEL` tiene que ser el ARN de un perfil de inferencia de aplicación, no el id del modelo. Ese perfil lleva la etiqueta `Project=InnovaLab-E10`. En Billing hay que activar esa etiqueta como cost allocation tag. Recién después Cost Explorer puede agrupar el gasto de Bedrock por `Project`. La activación no es retroactiva y puede tardar hasta 24 horas. El perfil en sí no se factura: se factura cada invocación que lo usa.

Con el asistente apagado, `HELP_PREVIEW=true` muestra el botón y el panel en modo vista previa: las consultas quedan deshabilitadas y no se llama a AWS. Sirve para revisar el diseño sin credenciales; no se usa en producción.

La clave de la aplicación solo necesita `bedrock:InvokeModel` y `bedrock:InvokeModelWithResponseStream` sobre ese perfil y sobre el modelo al que apunta.

Para probar una respuesta sin abrir el panel, con las variables en el entorno:

```bash
bun --conditions=react-server scripts/help-ask.ts "¿Qué es el margen?"
```

Una segunda ejecución sigue el hilo de esa terminal. `--reset` lo borra. El hilo queda en el directorio temporal del sistema.

### Cómo se apaga

1. Poner `HELP_ENABLED=false` y volver a desplegar. El botón desaparece y la ruta no llama al modelo.
2. Borrar `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY` del entorno de Vercel.
3. En Cost Explorer, filtrar por la etiqueta `Project` = `InnovaLab-E10` y confirmar que no hay invocaciones nuevas.

No queda una base de conocimiento, un agente ni capacidad reservada. Un aviso de presupuesto en AWS, por ejemplo a los 5 USD sobre el gasto de Amazon Bedrock, avisa aunque el crédito cubra la factura.
