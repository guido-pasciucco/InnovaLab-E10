# DEPLOY.md — Cómo se despliega la aplicación

Procedimiento operativo para publicar la app. La aplicación es un monorepo fullstack con un **único despliegue** en Vercel: no hay backend separado.

Leé esta guía antes de desplegar. Las reglas de negocio y las decisiones técnicas viven en [`docs/`](docs/README.md); esto es solo cómo se publica.

## Requisitos

| Requisito | Detalle |
| --- | --- |
| Cuenta de Vercel | El proyecto pertenece a quien lo crea; definí eso antes del primer deploy |
| Bun | El repo usa `bun.lock`; Vercel lo detecta solo |
| Base de datos migrada | El build **no** aplica migraciones (ver más abajo) |

## Variables de entorno

Se cargan en Vercel para **Production** y **Preview**. Los valores salen de Supabase (Project Settings) y del entorno local.

| Variable | Obligatoria | Para qué |
| --- | --- | --- |
| `SITE_URL` | Sí, en producción | Origen público de la app. La usa el envío de links por email |
| `DATABASE_URL` | Sí | Consultas de la app en runtime (pooler, puerto 6543) |
| `NEXT_PUBLIC_SUPABASE_URL` | Sí | Cliente de Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Sí | Cliente de Supabase |
| `DIRECT_URL` | Solo para migrar | Conexión directa (puerto 5432) que usa Drizzle para aplicar migraciones |

### Sincronizar las variables desde un archivo local

El CLI de Vercel **no** lee archivos `.env` por su cuenta. Para no cargar cada variable a mano en el dashboard, el repo trae un puente: un archivo `.env.deploy` (ignorado por git) y el comando `bun run deploy:env`, que sube cada variable al proyecto vinculado.

```bash
cp .env.deploy.example .env.deploy   # completá los valores en .env.deploy
bunx vercel login
bunx vercel link                     # vincula el directorio con el proyecto
bun run deploy:env                   # sube las variables a production
bun run deploy:env preview
```

El script valida antes de subir y no imprime valores: rechaza placeholders sin completar, direcciones locales y puertos de pooler equivocados. Se corre una vez por entorno, o cada vez que cambie una credencial.

> El repo guarda **cómo** deployar; Vercel guarda **con qué**. Las credenciales nunca se commitean: el repositorio es público y GitGuardian escanea cada PR.

### `SITE_URL` no es opcional en producción

En producción la app **no** confía en los headers del request para resolver su propio origen: si `SITE_URL` falta, lanza un error explícito en vez de aceptar el `Host` que llegue. Esto es intencional y está cubierto por tests.

La consecuencia práctica es un orden de dos pasadas, porque necesitás la URL de Vercel para setear la variable y la variable para que la app responda:

```bash
vercel link                                   # crea o vincula el proyecto local
vercel env add SITE_URL production            # pegá https://<proyecto>.vercel.app
vercel --prod
```

Si la app devuelve 500 en todas las rutas después del primer deploy, la primera sospechosa es esta variable.

## Migraciones

El script `build` es `next build` y nada más. **Vercel no aplica migraciones.** Si apuntás `DATABASE_URL` a un proyecto de Supabase sin migrar, la app levanta y falla en la primera consulta.

Antes del primer deploy contra una base nueva:

```bash
DIRECT_URL="postgresql://…:5432/postgres" bun run db:migrate
```

Usá siempre la conexión directa o el session pooler (puerto 5432) para migrar. El transaction pooler de `DATABASE_URL` (puerto 6543) puede darle a cada sentencia una conexión distinta y rompe las migraciones de varios pasos.

Si la base ya está migrada —por ejemplo, la del equipo— este paso no hace falta.

## Despliegue

### Desde la CLI

Deploya el árbol de trabajo tal como está en disco: lo que no esté commiteado o mergeado, también sube.

```bash
bun run deploy:preview   # preview  (bunx vercel)
bun run deploy           # producción (bunx vercel --prod)
```

No hay disparador automático: sin integración Git, cada deploy lo corre una persona.

### Con integración Git

Conecta el proyecto de Vercel al repositorio y cada push a la rama de producción deploya solo. Requiere que quien lo configura sea **owner** del repo si es de una cuenta personal, o miembro de la organización con acceso.

## Verificación después de deployar

- [ ] La home responde 200 y no redirige en loop.
- [ ] Login funciona y la sesión persiste al recargar.
- [ ] El link de recuperación de contraseña apunta al dominio correcto (esto es `SITE_URL`).
- [ ] Una lectura de datos devuelve filas y no un error de tabla inexistente (esto son las migraciones).

## Qué no cubre esta guía

- **Dominio propio**: se configura en el proyecto de Vercel, no en el repo.
- **Automatizar las migraciones en el build**: hoy es un paso manual. Automatizarlo obliga a decidir si los previews pueden tocar la base compartida, y esa es una decisión del equipo, no un detalle de despliegue.
- **Quién es dueño del proyecto de Vercel**: definilo antes del primer deploy. Un deploy del equipo con credenciales de una sola persona se cae cuando esa persona se va.
- **CI**: el workflow `E2E` corre en cada PR hacia `main` con Supabase local y no usa secretos de producción. Es independiente del despliegue.
