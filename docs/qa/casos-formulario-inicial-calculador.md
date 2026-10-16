# Casos de prueba manuales — Formulario inicial del calculador (paso 1)

| Campo | Valor |
| --- | --- |
| **Issue** | [#36 — QA — Casos de prueba del formulario inicial de la calculadora](https://github.com/guido-pasciucco/InnovaLab-E10/issues/36) |
| **Historia / implementación** | [#71 — H1.1.3-form-paso-1](https://github.com/guido-pasciucco/InnovaLab-E10/issues/71) |
| **Referencia de implementación** | [PR #135](https://github.com/guido-pasciucco/InnovaLab-E10/pull/135) (rama de Maga) — **versión no definitiva** |
| **Referencia de código (PR #135)** | `app/(calculator)/paso-1/page.tsx`, `app/(calculator)/paso-1/actions.ts`, `components/calculator/setup-form.tsx` |
| **Contratos y mensajes** | `lib/schemas/calculator-setup/fields.ts`, `lib/schemas/calculator-setup/calculator-setup.ts` |
| **Servicio** | `lib/services/calculator.ts` |
| **Ruta** | `/paso-1` |
| **Fecha de diseño** | 2026-10-16 |
| **Estado global** | **Casos diseñados — ejecución pendiente** |

> **Estado:** Estos casos están **diseñados, no ejecutados**. Su **ejecución queda pendiente** hasta que el PR #135 tenga su **versión definitiva** (aprobada y mergeada a la rama base). Todo valor, texto o comportamiento citado proviene de la implementación de referencia de #135 y de los contratos vigentes en el repositorio; si el PR cambia antes de ejecutar, hay que **revisar los casos** antes de correrlos.
>
> Ningún caso de este documento fue ejecutado todavía. Todos arrancan en estado **Pendiente**.

## Alcance

- Formulario inicial del calculador (`/paso-1`): campos **nombre del producto**, **unidad de venta** y **volumen mensual**, con **moneda ARS** y **período mensual** fijos.
- Guardado por **Server Action**, borrador asociado al usuario, y recuperación al volver a la página.
- Validación de reglas de campo y mensajes al usuario (cliente y servidor).
- Manejo de errores del servidor y de transporte.
- Aislamiento de datos entre usuarios.

**Fuera de alcance:** motor de cálculo, costos, pasos posteriores (`/paso-2`, `/resultados`) y cualquier cálculo de resultados.

## Datos válidos de referencia

| Campo | Valor válido |
| --- | --- |
| Nombre del producto | `Pan lactal de avena` |
| Unidad de venta | `unidad` |
| Volumen mensual | `96` |
| Moneda | `ARS` (fija) |
| Período | `Mensual` (fijo) |

## Mensajes y textos de referencia

Reglas y mensajes definidos **una sola vez** en `lib/schemas/calculator-setup/fields.ts` y compartidos entre formulario y base (ver ADR [`01-reglas-de-campo-compartidas.md`](../decisiones/establecidas/01-reglas-de-campo-compartidas.md)).

| Campo | Regla | Mensaje exacto |
| --- | --- | --- |
| `name` | vacío tras `trim` | `Escribí el nombre de tu producto.` |
| `name` | máximo 120 caracteres | `El nombre del producto debe tener como máximo 120 caracteres.` |
| `unit` | vacío tras `trim` | `Escribí en qué unidad lo vendés (ej: caja, paquete, kilo).` |
| `unit` | máximo 40 caracteres | `La unidad debe tener como máximo 40 caracteres.` |
| `volume` | no entero | `Completá el volumen con un número entero.` |
| `volume` | menor o igual a 0 | `El volumen tiene que ser mayor que 0.` |
| `currency` | valor distinto de `ARS` | `La moneda es ARS y no se puede cambiar.` |
| `period` | valor distinto de `Mensual` | `El período es mensual y no se puede cambiar.` |

Código de error de infraestructura del calculador (`lib/errors/catalog.ts`):

| Código | HTTP | Mensaje | Cuándo |
| --- | --- | --- | --- |
| `CALC_UNAVAILABLE` | 503 | `Calculator unavailable` | El calculador no está disponible (fallo de infraestructura) |

## Leyenda de estado

| Estado | Significado |
| --- | --- |
| **Pendiente** | No ejecutado. Estado inicial de todos los casos. |
| **Pasa** | Ejecutado y el resultado coincide con lo esperado. |
| **Falla** | Ejecutado y el resultado no coincide. Registrar evidencia e issue del defecto. |
| **Bloqueado** | No se pudo ejecutar (falta entorno, dependencia o versión definitiva). |

Cada caso se cierra copiando su fila al registro de evidencia del final, con fecha, SHA, navegador y versión.

---

### CFI-01 — Acceso a `/paso-1` sin sesión

- **Precondición:** No hay sesión iniciada en el navegador.
- **Pasos:**
  1. Abrir `/paso-1` en una ventana sin sesión (o tras cerrar sesión).
- **Resultado esperado:** La página no muestra el formulario; se redirige a `/login`. No se filtran datos de ningún usuario.
- **Trazabilidad:** `lib/auth/require-user.ts`; #71 (página protegida); #36 (acceso sin sesión).
- **Estado:** Pendiente

### CFI-02 — Carga inicial sin borrador guardado

- **Precondición:** Sesión iniciada con un usuario **sin** setup guardado.
- **Pasos:**
  1. Abrir `/paso-1`.
  2. Observar los valores iniciales de los campos y las etiquetas fijas.
- **Resultado esperado:** El formulario aparece vacío en **nombre** y **unidad** y con un **volumen** por defecto. Se ven, fijos y visibles, **moneda ARS** y **período Mensual**. No hay errores de validación al cargar. *(El valor inicial exacto del volumen proviene del PR #135 y debe reconfirmarse contra su versión definitiva.)*
- **Trazabilidad:** `app/(calculator)/paso-1/page.tsx` (PR #135); #71 CA del formulario vacío; #36 (carga inicial sin borrador).
- **Estado:** Pendiente

### CFI-03 — Guardado válido y confirmación

- **Precondición:** Sesión iniciada; formulario en `/paso-1`.
- **Pasos:**
  1. Completar nombre `Pan lactal de avena`, unidad `unidad`, volumen `96`.
  2. Presionar **Guardar**.
- **Resultado esperado:** Mientras se guarda, el envío está en curso (`Guardando…`) y los controles quedan deshabilitados. Al terminar, se confirma el guardado y se muestra la siguiente confirmación: “Vamos a calcular el costo de Pan lactal de avena en unidad, con un volumen de 96 por mes.”
- **Trazabilidad:** `components/calculator/setup-form.tsx`, `app/(calculator)/paso-1/actions.ts` (PR #135); #71 (guardar por Server Action); #36 (guardado válido, estado de carga).
- **Estado:** Pendiente

### CFI-04 — Persistencia al recargar la página

- **Precondición:** CFI-03 ejecutado (setup guardado) en la sesión actual.
- **Pasos:**
  1. Recargar `/paso-1` (F5).
- **Resultado esperado:** El formulario vuelve con `Pan lactal de avena`, `unidad`, `96`, `ARS`, `Mensual`. No se pide volver a completar.
- **Trazabilidad:** `lib/services/calculator.ts` (`getCalculatorSetupService`); #71 (leer el borrador); #36 (persistencia tras recargar).
- **Estado:** Pendiente

### CFI-05 — Persistencia tras cerrar sesión y volver a ingresar

- **Precondición:** CFI-03 ejecutado; se conocen las credenciales del mismo usuario.
- **Pasos:**
  1. Cerrar sesión.
  2. Iniciar sesión con el mismo usuario.
  3. Abrir `/paso-1`.
- **Resultado esperado:** El formulario reaparece con los datos guardados (`Pan lactal de avena`, `unidad`, `96`).
- **Trazabilidad:** `lib/services/calculator.ts`; #71; #36 (persistencia tras logout/re-login).
- **Estado:** Pendiente

### CFI-06 — Descarte de cambios no guardados

- **Precondición:** CFI-03 ejecutado (dato confirmado `Pan lactal de avena` / `unidad` / `96`).
- **Pasos:**
  1. Editar un campo (por ejemplo, cambiar el nombre a `Pan integral`) **sin** presionar Guardar.
  2. Recargar `/paso-1`.
- **Resultado esperado:** El formulario vuelve al **último valor confirmado** (`Pan lactal de avena`). El cambio no confirmado no se persiste.
- **Trazabilidad:** `lib/services/calculator.ts` (solo se guarda al confirmar); #71 ("lo que no se confirmó no se guarda"); #36 (descarte de cambios no guardados).
- **Estado:** Pendiente

### CFI-07 — Nombre y unidad vacíos

- **Precondición:** Sesión iniciada; `/paso-1`.
- **Pasos:**
  1. Dejar **nombre** vacío y **unidad** vacía (o solo con espacios).
  2. Intentar guardar.
- **Resultado esperado:** No se envía nada al servidor. Bajo **nombre** aparece `Escribí el nombre de tu producto.` y bajo **unidad**, `Escribí en qué unidad lo vendés (ej: caja, paquete, kilo).`.
- **Trazabilidad:** `lib/schemas/calculator-setup/fields.ts`; #71 CA3; #36 (campos vacíos).
- **Estado:** Pendiente

### CFI-08 — Volumen igual a cero

- **Precondición:** Sesión iniciada; `/paso-1`; nombre y unidad válidos.
- **Pasos:**
  1. Ingresar volumen `0`.
  2. Intentar guardar.
- **Resultado esperado:** No se guarda. Bajo **volumen** aparece `El volumen tiene que ser mayor que 0.`.
- **Trazabilidad:** `lib/schemas/calculator-setup/fields.ts`; #71 CA3; #36 (volumen 0).
- **Estado:** Pendiente

### CFI-09 — Volumen negativo

- **Precondición:** Sesión iniciada; `/paso-1`; nombre y unidad válidos.
- **Pasos:**
  1. Ingresar volumen `-5`.
  2. Intentar guardar.
- **Resultado esperado:** No se guarda. Bajo **volumen** aparece `El volumen tiene que ser mayor que 0.`.
- **Trazabilidad:** `lib/schemas/calculator-setup/fields.ts`; #71 CA3; #36 (volumen negativo).
- **Estado:** Pendiente

### CFI-10 — Volumen decimal (mensaje de entero en español)

- **Precondición:** Sesión iniciada; `/paso-1`; nombre y unidad válidos.
- **Pasos:**
  1. Ingresar volumen `1.5` (o `1,5` si el campo acepta coma).
  2. Intentar guardar.
- **Resultado esperado:** No se guarda. Bajo **volumen** aparece el mensaje en español `Completá el volumen con un número entero.` (no un mensaje crudo de Zod ni texto en inglés).
- **Trazabilidad:** `lib/schemas/calculator-setup/fields.ts` (`.int()`); #36 (volumen decimal + mensaje español de Zod).
- **Estado:** Pendiente

### CFI-11 — Recorte de espacios en nombre y unidad

- **Precondición:** Sesión iniciada; `/paso-1`.
- **Pasos:**
  1. Ingresar nombre `"  Pan lactal de avena  "` (con espacios al inicio y al final) y unidad `"  unidad  "`.
  2. Volumen `96`. Guardar.
  3. Recargar `/paso-1`.
- **Resultado esperado:** Los valores se guardan **sin** espacios al inicio ni al final (`Pan lactal de avena`, `unidad`), tanto en la confirmación como tras recargar.
- **Trazabilidad:** `lib/schemas/calculator-setup/fields.ts` (`.trim()`); #36 (espacios al inicio o al final).
- **Estado:** Pendiente

### CFI-12 — Error del servidor asociado a un campo

- **Precondición:** Entorno controlado donde el servidor rechaza un valor que el cliente aceptó (p. ej. cliente desactualizado respecto del esquema del servidor, o divergencia forzada en un entorno local). **No** se modifica el formulario en la rama de trabajo.
- **Pasos:**
  1. Enviar un valor que pase la validación del cliente pero que el servidor rechace.
- **Resultado esperado:** El mensaje del servidor se muestra **bajo el campo correspondiente** (vía `useServerFieldErrors` / `getFieldErrors`), el valor ingresado no se pierde y **no** aparece el banner genérico `Invalid input`.
- **Trazabilidad:** `lib/errors/field-errors.ts`, `lib/errors/AGENTS.md`; #71 CA3 (servidor); #36 (error de servidor asociado a un campo).
- **Nota:** Si no es reproducible sin alterar código, marcarlo **Bloqueado** y registrarlo como riesgo/defecto candidato.
- **Estado:** Pendiente

### CFI-13 — Error general `CALC_UNAVAILABLE`

- **Precondición:** Sesión iniciada; entorno donde el guardado falla por infraestructura (por ejemplo, base de datos detenida o DSN inválido), de modo que la action cae en el código de fallback `CALC_UNAVAILABLE`.
- **Pasos:**
  1. Con datos válidos, presionar **Guardar**.
- **Resultado esperado:** No se muestra "Guardado". Aparece un mensaje general al usuario con el texto del catálogo `Calculator unavailable` (banner/alerta), sin exponer detalles internos. Los datos ingresados se conservan para reintentar.
- **Trazabilidad:** `lib/errors/catalog.ts` (`CALC_UNAVAILABLE`), `app/(calculator)/paso-1/actions.ts` (PR #135); #36 (error general `CALC_UNAVAILABLE`).
- **Estado:** Pendiente

### CFI-14 — Fallo de transporte

- **Precondición:** Sesión iniciada; `/paso-1` con datos válidos cargados.
- **Pasos:**
  1. Desconectar la red (por ejemplo, modo *offline* en DevTools) **después** de cargar la página.
  2. Presionar **Guardar**.
- **Resultado esperado:** El guardado **no** se reporta como exitoso (no aparece "Guardado" falso); no hay pérdida silenciosa del dato ingresado; el usuario puede volver a intentar cuando vuelve la conexión. Si la UI no ofrece ningún aviso ni forma de reintentar, registrarlo como **defecto candidato** con evidencia.
- **Trazabilidad:** Server Action (`app/(calculator)/paso-1/actions.ts`, PR #135); #36 (fallo de transporte).
- **Estado:** Pendiente

### CFI-15 — Doble clic / envío repetido

- **Precondición:** Sesión iniciada; `/paso-1` con datos válidos `Pan lactal de avena` / `unidad` / `96`.
- **Pasos:**
  1. Presionar **Guardar** y, mientras está en curso, presionar de nuevo varias veces (o hacer doble clic).
  2. Esperar a que termine. Recargar `/paso-1`.
- **Resultado esperado:** Durante el guardado, el botón y los campos están deshabilitados, por lo que solo se dispara un guardado. Tras recargar hay **un único** setup con los datos indicados (sin duplicados). El reintento/doble envío no genera estados inconsistentes.
- **Trazabilidad:** `components/calculator/setup-form.tsx` (estado pendiente), `lib/services/calculator.ts` (borrador único por usuario); #36 (doble clic / envío repetido, estado de carga).
- **Estado:** Pendiente

### CFI-16 — Aislamiento entre dos usuarios

- **Precondición:** Dos usuarios distintos (A y B), cada uno con su sesión. A tiene guardado `Pan lactal de avena` / `unidad` / `96`.
- **Pasos:**
  1. Iniciar sesión como B y abrir `/paso-1`.
  2. Comprobar que B no ve los datos de A.
  3. Guardar datos distintos como B.
  4. Volver a iniciar sesión como A y abrir `/paso-1`.
- **Resultado esperado:** B arranca sin el setup de A (o con el suyo propio); los datos quedan aislados por usuario; A sigue viendo sus datos sin cambios.
- **Trazabilidad:** `lib/services/calculator.ts` (scope por `userId`), ADR [`02-persistencia-del-calculo-en-servidor.md`](../decisiones/establecidas/02-persistencia-del-calculo-en-servidor.md); #36 (aislamiento entre dos usuarios).
- **Estado:** Pendiente

### CFI-17 — Moneda ARS y período Mensual visibles y no editables

- **Precondición:** Sesión iniciada; `/paso-1`.
- **Pasos:**
  1. Observar los controles de **moneda** y **período**.
  2. Intentar modificarlos (si hay control) o inspeccionar que no admiten cambio.
- **Resultado esperado:** Se muestran **ARS** y **Mensual** de forma visible y **fija**; no se pueden cambiar a otro valor. El guardado conserva siempre `ARS` y `Mensual`.
- **Trazabilidad:** `lib/schemas/calculator-setup/fields.ts` (`z.literal`); #71 CA4; #36 (moneda ARS visible; período mensual visible).
- **Estado:** Pendiente

### CFI-18 — Texto de ayuda y estado de carga visibles

- **Precondición:** Sesión iniciada; `/paso-1`.
- **Pasos:**
  1. Observar la ayuda del **volumen** y el estado del botón antes, durante y después de guardar.
- **Resultado esperado:** El campo de volumen muestra su texto de ayuda; el botón indica el estado de carga durante el guardado y vuelve a su estado normal al terminar.
- **Trazabilidad:** `components/calculator/setup-form.tsx` (PR #135); #71 CA5; #36 (texto de ayuda del volumen, estado de carga).
- **Estado:** Pendiente

### CFI-19 — Límites máximos de nombre y unidad

- **Precondición:** Sesión iniciada; `/paso-1`.
- **Pasos:**
  1. Ingresar un nombre de **más de 120** caracteres e intentar guardar.
  2. Ingresar una unidad de **más de 40** caracteres e intentar guardar.
- **Resultado esperado:** No se guarda en ninguno de los dos casos. Bajo **nombre** aparece `El nombre del producto debe tener como máximo 120 caracteres.`; bajo **unidad**, `La unidad debe tener como máximo 40 caracteres.`. Un nombre de exactamente 120 y una unidad de exactamente 40 son válidos.
- **Trazabilidad:** `lib/schemas/calculator-setup/fields.ts` (`.max(120)`, `.max(40)`); #36 (mensajes de validación vigentes).
- **Estado:** Pendiente

---

## Registro de evidencia

Completar una fila por caso ejecutado. **No** completar filas por casos no ejecutados.

| Campo | Qué registrar |
| --- | --- |
| **Caso** | Identificador (p. ej. `CFI-03`) |
| **Fecha** | Fecha de ejecución |
| **SHA** | Commit de la versión probada (versión definitiva del formulario, no la referencia) |
| **Navegador** | Navegador y **versión** (p. ej. `Chrome 1xx`) |
| **Resultado** | Pasa / Falla / Bloqueado |
| **Evidencia** | Descripción del resultado observado; en caso de falla, pasos de reproducción y captura/log |
| **Defecto** | Número de issue del defecto, si corresponde |

| Caso | Fecha | SHA | Navegador | Resultado | Evidencia | Defecto |
| --- | --- | --- | --- | --- | --- | --- |
| _(sin ejecuciones registradas todavía)_ | — | — | — | — | — | — |
