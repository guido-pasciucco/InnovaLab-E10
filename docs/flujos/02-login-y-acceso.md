# 02 — Login y acceso

Cómo entra un usuario, cómo se mantiene su sesión y cómo se garantiza que cada servicio acceda solo a los datos de su dueño.

## Ingreso

La autenticación la resuelve **Supabase Auth (GoTrue)**: alta de cuenta, confirmación por email, login, recuperación y cambio de contraseña. No existe una capa propia de envío de correos: todos los mails salen de Supabase.

- Formularios propios en `app/login`, `app/signup`, `app/reset-password` y `app/update-password`.
- El navegador habla con **Server Actions** (`app/<feature>/actions.ts`). No hay Route Handlers (`app/api/*` no existe).
- Las Server Actions son endpoints HTTP públicos: validan la entrada con el mismo esquema Zod del cliente y toman la identidad de la cookie de sesión, nunca de los argumentos.
- La validación del cliente es UX, nunca seguridad.

## Sesión

- `proxy.ts` refresca la sesión en cada request, sin bloquear.
- Las páginas de la calculadora llaman a `requireUser()` (`lib/auth/require-user.ts`), que redirige a login si no hay sesión.
- `getSessionUserService` es el **único productor** de `VerifiedUserId`. Todo servicio con owner-scoping recibe ese tipo: un `string` cualquiera, incluido un id leído del input, no compila (ADR 03).
- Cada consulta filtra por el `userId` recibido. La autorización por recurso (que un `calculationId` pertenezca al usuario) **no está auditada**: ver los pendientes.

## Persistencia

El borrador del cálculo vive **solo en el servidor**, en las tablas de `lib/db`, y se guarda al confirmar cada paso. No hay `localStorage`, IndexedDB ni modo híbrido (ADR 02).

- Un borrador por usuario, con un negocio implícito creado en el primer guardado.
- Los importes viajan y se guardan como string decimal (`numeric(12,2)`); la conversión a `decimal.js` ocurre en el borde.
- Las reglas de campo se escriben una sola vez en `lib/schemas/<contrato>/fields.ts` y las consume tanto el formulario como la validación de la base (ADR 01).
- RLS **no aplica hoy** a las consultas de Drizzle: la conexión usa un rol con `BYPASSRLS`. La defensa real es el filtro por dueño en el servicio. RLS sí protege al cliente de Supabase que usa las claves `anon`/`authenticated`.

### La hoja de cálculo

Un cálculo es una hoja de presupuesto con fecha: el producto es el tema y la hoja es un ejercicio concreto sobre ese tema. Un producto puede tener muchos cálculos y cada uno conserva su propia versión, sin pisar la anterior.

- Hay **un borrador por usuario** y un negocio implícito creado en el primer guardado.
- Las condiciones de la hoja —unidad, volumen, moneda y período— son del **cálculo**, no del producto: el volumen es un supuesto de ese ejercicio.
- Un renglón de costo no es solo lo que el producto consume: es todo lo que cuesta hacerlo, incluidos alquiler y estructura. Cada renglón responde por separado las tres preguntas de clasificación; no existe una categoría única que las reemplace.
- El catálogo de costos del negocio se guarda **por mes** y el total del período se deriva de las líneas, nunca se guarda aparte. Al usar un ítem del catálogo en un cálculo, el renglón guarda su propia copia: si el precio sube después, los cálculos viejos no cambian. Borrar el ítem del catálogo deja el enlace en `null` y conserva el renglón.

## ¿Cuándo haría falta una API HTTP?

Solo cuando el consumidor **no es el frontend de Next.js**: una app nativa (React Native, Flutter, Swift, Kotlin) o un tercero que se integra por HTTP. Una **PWA no la necesita**: es la misma app web con las mismas cookies y usa los Server Actions igual que el navegador.

Si se agregara, las rutas serían bordes delgados que parsean, validan y delegan al **mismo servicio** que usan las Server Actions. Antes de reactivarlas hay que corregir tres cosas conocidas:

1. **Login CSRF:** exigir `Origin` propio y `Content-Type: application/json` (Next valida el `Origin` en Server Actions, pero no en Route Handlers).
2. **Reset de password:** aplicar las cookies de respuesta para no perder el `code verifier` de PKCE.
3. **Canje del code PKCE:** falta una ruta de callback que llame a `exchangeCodeForSession`.

Las rutas que redirigen (como `app/auth/confirm/route.ts`) tienen contrato de redirección, no JSON: mantienen su propio `try/catch` con `unstable_rethrow` y pasan el código de error por query string.

## Pendientes del flujo

- Auditar las Server Actions de `app/(calculator)/` por autorización de recursos.
- Regla de lint que prohíba `as VerifiedUserId` fuera de los archivos permitidos.
- Alcance del menú persistente frente al asistente legacy.

El detalle y las opciones de estos puntos siguen abiertos.
