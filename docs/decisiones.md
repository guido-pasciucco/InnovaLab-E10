# Decisiones tomadas

Decisiones vigentes de negocio y de técnica, resumidas en un solo lugar. Si una regla cambia, se agrega una línea nueva con la fecha del cambio y qué cambió; la anterior se conserva. No hay enlaces a otros documentos: el contenido está acá.

## Todas las decisiones, en orden de fecha

| Fecha | Tipo | Decisión | Por qué y límites |
| --- | --- | --- | --- |
| 2026-10-02 | Técnica | Cada regla de campo y su mensaje se escriben una sola vez y los consumen el formulario y la base. | Antes la base aceptaba `USD` y el formulario no, y un mismo campo se llamaba `unit` en un lado y `costingUnit` en el otro. No aplica con un solo consumidor, en esquemas de lectura ni en entradas internas del servidor; una tabla puede declarar una excepción. |
| 2026-10-04 | Técnica | El borrador del cálculo se persiste **solo en el servidor**, con sesión obligatoria. | Se guarda al confirmar cada paso, en las tablas existentes. Un borrador por usuario y un negocio implícito creado en el primer guardado. Los importes viajan como string decimal. Se descartaron local-first e híbrido: el borrador se perdería al cambiar de dispositivo o exigiría resolver conflictos. |
| 2026-10-04 | Técnica | El filtro por dueño vive en el servicio; RLS es una red secundaria. | La conexión de Drizzle usa un rol con `BYPASSRLS`, así que RLS no filtra esas consultas. Un servicio que omita el filtro muestra datos de otro usuario. |
| 2026-10-17 / 2026-10-19 | Negocio | El trabajo propio se registra como dato aparte del concepto. | Es un booleano, no se deduce del texto: "mi tiempo", "horas amasando" o un error de escritura no se pueden clasificar por el nombre. Es una tercera dimensión independiente: ese renglón también es fijo o variable y directo o indirecto. No define cuánto vale la hora. |
| 2026-10-19 | Negocio | El trabajo propio **entra en `totalPeriodo`**. | Entra por su comportamiento fijo o variable, como cualquier otro costo. La vista de trabajo propio es informativa y no se suma de nuevo. La fórmula `totalPeriodo = fijo + variable` no cambia. |
| 2026-11-03 | Negocio | El margen se mide sobre el **precio de venta**: `precio = costo ÷ (1 − margen)`. | Con 30 % sobre un costo de $1.000 el precio es $1.428,57, no $1.300. El recargo equivalente (`margen ÷ (1 − margen)`) se muestra solo como información. Un margen de 100 % o más no tiene precio posible. No define qué componentes integran el costo base. |
| 2026-11-09 | Técnica | La identidad del servicio llega verificada desde la puerta como `VerifiedUserId`. | Solo `getSessionUserService` crea ese tipo; un `string` leído del input no compila. La puerta valida la sesión una vez y pasa `user.id`. No hay funciones paralelas con sufijo `ForUser`; los casts se permiten solo donde se crea la cuenta y en la factory de tests. No comprueba que un id de recurso pertenezca al usuario ni reemplaza el filtro por dueño. |
| 2026-11-23 | Técnica | Desarrollo usa el mismo Supabase local que los E2E y Mailpit captura los mails de auth; la app no envía correos por sí misma. | `.env` ya apunta al stack local y `supabase/config.toml` ya habilita los redirects de `:3000`, así que el helper `mailpit.ts` sirve igual para tests que para revisión manual. Se descartaron SMTP custom y Auth Hook con túnel público (exponen el local y piden credenciales) y el interceptor de `fetch` (no cubre el límite de signup y deja deuda PKCE). El `email_sent = 2` del config exige `auth.email.smtp`, que está comentado: con el proveedor inbuilt no aplica según el contrato del propio config; no probado empíricamente. |
| 2026-11-23 | Técnica | En E2E, borrar el usuario al terminar el test limpia por cascada todo su dominio; el registro explícito queda solo para lo que no cuelga de él. | Los bloqueos del análisis original ya no existen: `profiles.id` tiene FK a `auth.users` con `ON DELETE CASCADE` y `source_business_cost_id` es `ON DELETE SET NULL`, así que borrar catálogo no reescribe cálculos históricos. Las dos FKs `NO ACTION` de recetas y packaging son `DEFERRABLE INITIALLY DEFERRED` justamente para permitir la cascada en la misma transacción. Las factories siguen usando `track` para un segundo usuario proveedor, que no cuelga del usuario principal. No hizo falta migración. |
| 2026-11-23 | Técnica | No se agrega una capa de testing de componentes React por ahora: alcanza con los unitarios y los E2E existentes. | La cobertura actual ya tiene las dos puntas, lógica pura en Vitest modo `node` y recorridos completos en Playwright contra Supabase local. No hay una necesidad concreta que justifique instalar dependencias ni mantener una galería o Storybook. Si aparece, por tests flaky, componentes que se rompen sin detectarse o riesgo al tocar la UI, se reevalúa y se elige la herramienta en ese momento. Se evaluaron Vitest Browser Mode, Testing Library con happy-dom, la galería de Playwright y Storybook 10; ninguna se adopta hoy. |
| 2026-11-24 | Negocio | La base del reparto de indirectos es la **capacidad normal planeada** de cada producto, no la producción real ni un campo separado de producción esperada. | El usuario ya carga esa capacidad como "¿Cuántas unidades pensás fabricar este mes?" y el motor prorratea con ella. La producción real no existe en el catálogo y quedó fuera de alcance; un campo de "producción esperada" sería equivalente y no cambiaría ningún número. D3 y D9 siguen vigentes: esta decisión solo fija el significado del número. La foto mensual de "Cerrar cálculo" cubre las desviaciones. Cierra P-15. |

## Decisiones del flujo de costos (Fase 2)

| ID | Decisión |
| --- | --- |
| D1 | La receta tiene un `rendimiento` único, default `1` y mayor que cero; el CVU se normaliza a una unidad. |
| D2 | El renglón de receta es insumo + cantidad usada + unidad de la misma familia. No hay "modo de compra". |
| D3 | La capacidad mensual es un campo editable del producto: no tiene pantalla propia ni entidad "plan del mes". |
| D4 | Cualquier edición recalcula lo derivado en vivo. No hay cierre de lista para calcular. |
| D5 | "Cerrar cálculo" congela todo el estado: insumos, recetas, capacidades, indirectos, margen y resultados. |
| D6 | La foto se puede corregir, pero cada cambio queda auditado. |
| D7 | Cada cierre se etiqueta con un mes; el prorrateo sigue en vivo sobre el catálogo actual. |
| D8 | El histórico se consulta en "Datos históricos", solo lectura. |
| D9 | Solo entran al reparto los productos con capacidad mayor que cero; el CVU se calcula igual. |
| D10 | Validaciones estrictas al cargar un renglón: insumo válido, familia compatible, cantidad positiva y sin duplicados. |
| D11 | No se puede borrar un insumo referenciado por una receta viva. |
| D12 | Productos y recetas se borran de forma lógica: se marcan, se pueden restaurar y no afectan las fotos cerradas. |
| D13 | Vigente desde 2026-11-23: cada producto puede tener presentaciones con nombre único, unidades enteras > 0 y packaging del catálogo con cantidad y unidad de su familia. Costo = receta × unidades ÷ rendimiento + Σ packaging, con pantalla P12 y protección del packaging en uso. Antes estuvo descartada de momento. |
| D14 | La capacidad va en el bloque principal del formulario y el CVU se recalcula ahí mismo. |
| D15 | Los gastos del período usan el mes actual sin selector, permiten conceptos repetidos y no exponen notas. |

## Cómo se registra una decisión nueva

1. Escribir la regla en una fila nueva, con la fecha en que se tomó y el tipo.
2. Si cambia una regla anterior, dejar la fila vieja y agregar qué cambió y cuándo.
3. Si la regla afecta el recorrido del usuario, reflejarla también en el flujo correspondiente.
