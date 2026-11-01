# Deploy en Vercel

## Pasos

### 1. Completar las credenciales

```bash
cp .env.deploy.example .env.deploy
```

Editá `.env.deploy` con:

- `SITE_URL`: la URL pública del proyecto en Vercel.
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

La app no confía en los headers del request para resolver su propio origen: si `SITE_URL` falta, lanza un error en vez de aceptar el host que llegue. El deploy compila bien y después devuelve 500 en todas las rutas.

Como la URL de Vercel se conoce recién después de crear el proyecto, el orden obligatorio es: `vercel link` → cargar `SITE_URL` → deployar.

### El build no aplica migraciones

Vercel corre `next build` y nada más. Si `DATABASE_URL` apunta a una base sin migrar, la app levanta y falla en la primera consulta.

Para migrar usá la conexión del puerto 5432 (session pooler o directa), nunca el pooler de transacciones del 6543: le asigna una conexión distinta a cada sentencia y rompe las migraciones de varios pasos.

```bash
DIRECT_URL="postgresql://…:5432/postgres" bun run db:migrate
```

Si la base ya está migrada, este paso no hace falta.

### Supabase Auth valida los redirects

Los links de confirmación de cuenta y de recuperación de contraseña se generan con `SITE_URL`, pero Supabase los valida contra una lista blanca del proyecto. Si el dominio deployado no está ahí, el flujo falla aunque `SITE_URL` esté bien cargada.

Se agrega en Authentication → URL Configuration → Redirect URLs, con el patrón del dominio deployado.

### Las credenciales no van al repo

El repositorio es público y cada PR pasa por un escáner de secretos. El repo guarda **cómo** deployar; Vercel guarda **con qué**.

### Los previews pueden escribir en la base real

Si `DATABASE_URL` apunta a la base del equipo, cualquier preview escribe ahí. Si eso no es aceptable, los previews necesitan su propia base o no se deployan.

### Quién es dueño del proyecto de Vercel

Un deploy del equipo con credenciales de una sola persona se cae cuando esa persona se va. Definilo antes del primer deploy.
