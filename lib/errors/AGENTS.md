# lib/errors/ — Manejo centralizado de errores

Los servicios **lanzan** errores; las puertas (Route Handlers y Server Actions) los **traducen**. El `try/catch` existe en un solo lugar del proyecto: los adaptadores `handleRouteErrors` y `handleActionErrors`. Ningún servicio nuevo necesita escribirlo.

## Quién toca este directorio

| Rol | Qué hace en `lib/errors/` |
| --- | --- |
| **Backend** | Dueño. Agrega códigos al catálogo, lanza `AppError` desde `lib/services/` y envuelve las puertas (`route.ts`, `actions.ts`) con los adaptadores. |
| **Frontend** | Consume, no modifica: usa `getFieldErrors` (vía `useServerFieldErrors`) y el tipo `ErrorEnvelope` en los forms. Si necesita un mensaje o código nuevo, lo pide a Backend. |

## Camino rápido: crear un servicio nuevo

1. Agregá el código de error en `catalog.ts` si todavía no existe.
2. En el servicio, validá con `schema.parse(input)` y lanzá `new AppError("CODIGO")` ante cada fallo esperado. No escribas `try/catch`.
3. Envolvé la puerta:
   - Ruta: `export const POST = handleRouteErrors(async (req) => { ... })`
   - Action: `export const miAction = handleActionErrors(async (prev, data) => miServicio(...))`
4. Testeá el servicio verificando que lanza el código correcto (ver `lib/services/auth.test.ts`, [`TEST.md`](TEST.md) y la guía compartida [`../../TEST.md`](../../TEST.md)).

## Cómo viaja un error

```
servicio ──throw──▶ handleRouteErrors / handleActionErrors ──▶ toAppError() ──▶ respuesta
                                                   │
          AppError   → queda igual                 │   ruta   → fail(code): status + JSON
          ZodError   → VALIDATION (+ details)      │   action → failResult(code): estado del form
          otra cosa  → fallbackCode (se loguea)    │
```

| Pieza | Archivo | Responsabilidad |
| --- | --- | --- |
| `ERROR_CATALOG` | `catalog.ts` | Fuente única de códigos, status HTTP, mensajes y nivel de log |
| `ErrorEnvelope` | `catalog.ts` | Forma del JSON de error de las rutas. Los forms del cliente lo usan para tipar el `fetch` (`data?.error?.message`) |
| `AppError` | `app-error.ts` | Error esperado del dominio. Lleva `code` y `details` opcionales |
| `toAppError` | `app-error.ts` | Convierte cualquier valor lanzado en un `AppError` |
| `getFieldErrors` | `field-errors.ts` | Lee los mensajes por campo de un fallo `VALIDATION`. Es núcleo, así que se puede usar desde el cliente |
| `handleRouteErrors` | `handle-route-errors.ts` | Puerta HTTP: error → `NextResponse` con el status del catálogo |
| `handleActionErrors` | `handle-action-errors.ts` | Puerta action: resultado → `ServiceResult` serializable |

## Reglas

1. **El servicio no traduce.** No devuelve status ni `Response`, y no arma mensajes. Lanza un código.
2. **La action nunca le lanza al cliente.** Next oculta los mensajes de error en producción; `handleActionErrors` siempre devuelve estado.
3. **`unstable_rethrow` va primero en todo `catch`.** `redirect()`, `notFound()` y `unauthorized()` funcionan lanzando. Si un `catch` se los traga, el redirect deja de funcionar sin avisar. Los dos adaptadores ya lo hacen; cualquier `catch` nuevo tiene que hacerlo también.
4. **Los errores desconocidos nunca llegan al cliente.** `toAppError` los loguea como `error` y expone solo el `fallbackCode` genérico. Los conocidos se loguean según el `logLevel` del catálogo.
5. **Los mensajes viven en el catálogo.** El detalle específico (por ejemplo, errores por campo) va en `details`, nunca en un texto armado dentro del servicio.
6. **Los servicios solo importan el núcleo.** Desde `lib/services/` se importa `app-error.ts` (y `catalog.ts` si hace falta el tipo `ErrorCode`), nunca `handle-*-errors.ts`. Los adaptadores dependen de Next (`next/server`, `next/navigation`) y solo los importan las puertas en `app/`.

| Capa | Archivos | Depende de Next | Quién lo importa |
| --- | --- | --- | --- |
| Núcleo | `catalog.ts`, `app-error.ts` | No | Servicios, adaptadores |
| Adaptadores | `handle-route-errors.ts`, `handle-action-errors.ts` | Sí | Solo puertas (`route.ts`, `actions.ts`) |

> **Deuda conocida:** el catálogo guarda el `status` HTTP, que es conocimiento del transporte dentro del núcleo. Se deja así para mantener una fuente única. Si aparece otra puerta (un worker o un webhook), el primer paso es mover el mapeo código → status a `handle-route-errors.ts`.

## Convención de códigos y mensajes

> **Regla:** un código por cada situación que el usuario necesite distinguir. Si el mensaje cambia según el caso, se crea un código nuevo; el texto nunca se arma en el servicio.

### Dos tipos de código

| Tipo | Formato | Mensaje | Ejemplos |
| --- | --- | --- | --- |
| **Genérico** | Sin prefijo | Neutro: nunca menciona una funcionalidad | `VALIDATION`, `UNAUTHORIZED`, `INTERNAL` |
| **De dominio** | `DOMINIO_CASO` | Específico del caso, listo para mostrarle al usuario | `AUTH_INVALID_CREDENTIALS`, `AUTH_UNAVAILABLE` |

¿Por qué separar? Un código genérico se reutiliza en todo el proyecto. Si su mensaje dice algo de login, un error de cupones terminaría mostrando "Invalid email or password".

### Qué va en cada lugar

| Necesito comunicar... | Dónde va | Ejemplo |
| --- | --- | --- |
| Qué tipo de fallo ocurrió | `code` | `AUTH_INVALID_CREDENTIALS` |
| El texto para el usuario | `message`, en el catálogo | `"Invalid email or password"` |
| El detalle por campo o datos extra | `details` | `{ fieldErrors: { email: [...] } }`, que sale automático de un `ZodError` |
| La causa técnica (stack, error de Supabase) | Solo el log del servidor | Nunca viaja al cliente |

### Cómo agregar un error nuevo

1. ¿Alcanza con un genérico? Si el mensaje neutro sirve (por ejemplo, input inválido con `details` por campo), usá el genérico.
2. Si el usuario necesita un mensaje propio, agregá `DOMINIO_CASO` en `catalog.ts`, bajo el comentario de su dominio.
3. Elegí el `status` HTTP y el `logLevel`: `silent` para errores rutinarios del usuario, `warn` para fallos esperados que conviene seguir y `error` para fallos de infraestructura. `toAppError` loguea cada error según ese nivel; la causa técnica (`new AppError(code, details, { cause })`) solo va al log.
4. Lanzalo desde el servicio con `throw new AppError("DOMINIO_CASO")`.

`catalog.test.ts` hace cumplir el formato: todo código que no esté en la lista de genéricos debe tener prefijo de dominio.

### Errores de validación (Zod)

Los mensajes **por campo** se definen una sola vez en el schema (`lib/schemas/`), no en el catálogo ni en el servicio:

```ts
const email = z.email({ error: "Enter a valid email address" });
```

| Paso | Dónde | Qué pasa |
| --- | --- | --- |
| 1 | Form (cliente) | RHF valida con el contrato del formulario (mismas reglas de `fields.ts`) y muestra el mensaje. Si falla, no se envía nada |
| 2 | Servicio | `schema.parse(input)` con el schema de `lib/db/<dominio>/validation.ts` lanza un `ZodError`. El servicio no lo atrapa |
| 3 | Adaptador | `toAppError` lo convierte en `VALIDATION` con `details = z.flattenError(err)` |
| 4 | Respuesta | `{ code: "VALIDATION", message: "Invalid input", details: { fieldErrors: { email: [...] } } }` |
| 5 | Form (cliente) | `useServerFieldErrors` lee `details` con `getFieldErrors` y los pone en cada input con `setError` |

Si el servidor marca al menos un campo que el form conoce, el form no muestra el banner genérico "Invalid input". Si solo hay errores en campos que no se ven (por ejemplo `origin` en reset-password), el banner genérico sí aparece.

### Por qué no un mensaje libre en `AppError`

`new AppError("VALIDATION", { message: "Cupón vencido" })` parece cómodo, pero:

- los textos quedan repartidos por los servicios y se pierde la fuente única;
- es fácil filtrar detalles internos al cliente (por ejemplo, el mensaje crudo de Supabase);
- el cliente no puede reaccionar ni traducir a partir del código, porque el mismo código tendría mensajes distintos.

## Riesgo conocido: atrapar errores entre servicios

> **Resumen:** lanzar errores es seguro. El riesgo aparece al **atrapar** un error dentro de un servicio.

### Qué perdimos al elegir `throw` en vez de `Result`

Con el patrón Result, el error formaba parte del tipo de retorno:

```ts
// Result: TypeScript obliga a chequear `ok` antes de usar `data`
loginService(...): Promise<{ ok: true; data: T } | { ok: false; code: ErrorCode }>

// Throw: la firma solo muestra el camino feliz
loginService(...): Promise<T>
```

TypeScript no tiene *checked exceptions* (como el `throws` de Java). Mirando la firma no hay forma de saber qué códigos puede lanzar un servicio, y el compilador no avisa si nadie los maneja.

Esto está bien **mientras quien llama sea una puerta**, porque `handleRouteErrors` y `handleActionErrors` garantizan el manejo por arquitectura.

### Caso seguro: un servicio llama a otro y deja que el error suba

```ts
async function checkoutService(client, input) {
  const user = await getUserService(client); // lanza AppError("UNAUTHORIZED")
  // si falla, no se llega acá: el error sube solo hasta la puerta
}
```

Es el comportamiento correcto y cubre la gran mayoría de los casos: si B falló, A no puede seguir. No hace falta ningún `catch`.

### Caso riesgoso: un servicio quiere reaccionar a un error puntual de otro

```ts
async function checkoutService(client, input) {
  try {
    await applyCouponService(client, input.coupon);
  } catch (err) {
    if (err instanceof AppError && err.code === "COUPON_INVALID") {
      // cupón inválido → seguir sin descuento
    } else {
      throw err; // todo lo demás tiene que seguir subiendo
    }
  }
}
```

Hay tres riesgos concretos:

| Riesgo | Qué pasa | Consecuencia |
| --- | --- | --- |
| **Contrato invisible** | La firma de `applyCouponService` dice `Promise<Discount>`. No muestra que puede lanzar `COUPON_INVALID`. | Hay que leer el código de B para saber qué atrapar. Si B cambia sus códigos, A se rompe sin error de compilación. |
| **`catch` demasiado amplio** | Falta el `else { throw err }`, o se atrapa sin filtrar por `code`. | Un Supabase caído o un bug pasa **en silencio** como "cupón inválido". No hay log ni 500, solo datos incorrectos. |
| **`catch` sin `unstable_rethrow`** | B (o algo que llama) usa `redirect()`/`notFound()` y A lo atrapa. | La navegación se pierde sin ningún aviso. |

### Cómo mitigarlo

1. **Por defecto, no atrapes.** Usá `catch` en un servicio solo cuando vayas a hacer algo **distinto** con un código específico.
2. **Filtrá siempre por `instanceof AppError` y por `code`.** Nunca decidas mirando `err.message`.
3. **Relanzá todo lo que no manejes** (`throw err`), y llamá a `unstable_rethrow(err)` antes de cualquier otra lógica.
4. **Documentá los códigos que lanza cada servicio** con un comentario en la firma cuando otro servicio dependa de ellos:
   ```ts
   /** @throws AppError COUPON_INVALID si el cupón no existe o expiró */
   export async function applyCouponService(...) { ... }
   ```
5. **Testeá el camino del error**: un test para el código que se maneja y otro que verifique que un error distinto **sigue subiendo**. Cómo escribirlos: [`TEST.md`](TEST.md) y [`../../TEST.md`](../../TEST.md).
6. **Si el patrón se repite, extraé un helper** (por ejemplo `catchCode(promise, "COUPON_INVALID", fallback)`) para que el re-throw no dependa de acordarse.

### Checklist para revisar un `catch` dentro de `lib/services/`

- [ ] ¿Hace falta de verdad? Si solo va a relanzar, borralo.
- [ ] Llama a `unstable_rethrow(err)` primero.
- [ ] Filtra por `err instanceof AppError && err.code === "..."`.
- [ ] Todo lo demás se relanza con `throw err`.
- [ ] El servicio atrapado documenta el código con `@throws`.
- [ ] Hay un test para el código manejado y otro para uno que no se maneja (ver [`TEST.md`](TEST.md)).

