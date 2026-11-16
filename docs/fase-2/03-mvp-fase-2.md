# MVP de la Fase 2 — alcance de la primera entrega

> **Documento de alcance** para la primera versión del flujo multi-producto. Deriva de la especificación del flujo de costos y la completa donde esa especificación dejó "Alcance de esta versión" pendiente.
>
> Estructura: **qué entra → cómo se recorre → qué queda afuera → qué falta decidir**. Las decisiones pendientes del documento de especificación siguen pendientes acá: el MVP no las resuelve, las esquiva.

## Regla del MVP en una frase

El usuario puede **entrar, cargar su catálogo de insumos y ver que el resto del flujo existe**, sin que ninguna decisión de negocio pendiente lo bloquee. Cada dato que edita recalcula lo dependiente en vivo: no hay que cerrar productos para calcular.

## Qué entra

| Bloque de la especificación | Entra al MVP | Alcance dentro del bloque |
| --- | --- | --- |
| Navegación general | Sí | Menú con destinos visibles (las secciones que aún no existen se muestran como tales, no se ocultan) + página inicial/dashboard con contenido a decidir |
| Bloque 1 — Insumos | **Completo** | Alta, corrección y borrado de insumos (nombre + precio de compra + cantidad + unidad de medida seleccionable) y de packaging (pestaña del mismo catálogo, diferenciada por `kind`; ver registro de decisiones), lista compartida por todo el catálogo |
| Bloque 2 — Productos | Parcial | La pantalla `/productos` está prevista; el alta de producto con receta, rendimiento y capacidad ya tiene decisiones tomadas (D1–D3) y recálculo en vivo (D4), pero faltan las reglas aún pendientes del bloque |
| Bloque 3 — Costos indirectos, precio y equilibrio | No | Depende del bloque 2 y de las fórmulas pendientes de validación |
| Bloque 4 — Tablero | No | Se alimenta del bloque 3 |

### Por qué este recorte

- **El bloque 1 no tiene decisiones abiertas.** La Opción B (insumo con precio de compra + cantidad + unidad de medida seleccionable del catálogo, sin unidad de compra) ya está decidida y el borrado sin recetas es trivial mientras no existan recetas.
- **El bloque 2 tiene decisiones tomadas** (D1–D3: rendimiento, renglón sin "modo de compra" y capacidad en el formulario del producto; D4: recálculo en vivo; D5–D8: snapshot y histórico; D9: regla de capacidad), pero aún quedan reglas pendientes (validaciones, ciclo de vida, UX, formato/redondeo). El MVP no las resuelve.
- **El bloque 3 hereda las ambigüedades pendientes** (cuota, equilibrio en pesos, "importancia de cada gasto"). Sin la planilla de validación no hay oráculo para validar ninguna fórmula.
- El MVP deja la arquitectura de navegación y persistencia del catálogo probada con el bloque más simple, para que los bloques siguientes solo agreguen pantallas.

## Navegación

La navegación tiene dos piezas distintas, igual que en la especificación:

- **Menú de navegación**: sección persistente presente en todas las pantallas del flujo. Es el único camino para cambiar de sección; no desaparece al entrar a un destino.
- **Página inicial / dashboard**: una vista más del menú (`/dashboard` tentativa). Está **a decidir** si será un dashboard (resumen del estado del catálogo) o simplemente una página inicial; su contenido no está definido.

Todas las ventanas son accesibles en cualquier momento desde el menú: no hay pasos obligatorios. En el MVP solo dos destinos tienen contenido; los otros dos figuran en el menú como pendientes para mostrar el mapa completo del flujo.

| Destino | Ruta | Estado en el MVP |
| --- | --- | --- |
| Página inicial (dashboard?) | `/dashboard` | A decidir: dashboard o página inicial simple |
| Insumos | `/insumos` | Completo: lista editable con alta, corrección y borrado |
| Productos | `/productos` | Existe, vacío: página de espera de la sección |
| Costos indirectos | `/costos-indirectos` | No entra al MVP (bloque 3) |
| Tablero | `/tablero` | No entra al MVP (bloque 4) |

> **Nota:** las rutas son las propuestas por la especificación; si la implementación define otras, este menú se actualiza.

## Cómo se recorre el MVP

1. El usuario ingresa con el login existente y cae en la **página inicial/dashboard**.
2. Su contenido está **a decidir** (ver "Contenido de la página inicial" más abajo); en el MVP solo se sabe que existe como destino del menú, sin orden forzado ni secciones bloqueadas.
3. Desde **Insumos** (`/insumos`) el usuario:
   - Da de alta un insumo con **nombre + precio de compra + cantidad + unidad de medida** (ej. "Harina 000", $ 12.500,50, 50 kg; la unidad se elige de la lista precargada).
   - Corrige nombre o precio de cualquier insumo ya cargado.
   - Borra insumos libremente (todavía ningún los referencia).
4. Desde el menú de navegación (o desde la página inicial) el usuario entra a **Productos** (`/productos`), que existe pero muestra el estado vacío de la sección.
5. El usuario puede volver a la página inicial o saltar a otra sección desde el menú en cualquier momento. No hay pasos obligatorios.

### Pantallas

| Pantalla | Ruta | Contenido en el MVP |
| --- | --- | --- |
| Página inicial (dashboard?) | `/dashboard` | Contenido a decidir |
| Insumos | `/insumos` | Lista editable + alta inline + buscador por nombre o unidad |
| Productos | `/productos` | Página de espera: explica qué va a tener la sección |

### Contenido de la página inicial/dashboard (a decidir)

Está **a decidir** si la vista inicial será un **dashboard** (resumen del estado del catálogo y accesos a cada bloque) o simplemente una **página inicial**. La especificación no define su contenido y el equipo todavía no decidió; la ruta `/dashboard` es tentativa.

Lo que sí está decidido: existe como destino del menú, no bloquea secciones y convive con el menú persistente. Hasta que se defina su contenido, el MVP solo contempla que la pantalla exista; qué muestra y su criterio de aceptación quedan abiertos.

### Datos del insumo (Opción B, ya decidida)

> **Packaging:** misma carga y reglas que el insumo, en una pestaña separada del mismo catálogo (`kind = 'packaging'`).

- **Nombre** del insumo (texto).
- **Precio de compra**: monto en ARS de esa cantidad completa, mayor que cero, hasta 2 decimales.
- **Cantidad**: cuánto producto trae el insumo, como número (ej. 50).
- **Unidad de medida**: se **selecciona** de un catálogo precargado (kg, g, litro, unidad…), no se escribe libre (ej. kg → "50 kg"). De precio ÷ (cantidad × unidad) se calcula el costo por unidad de medida, una sola vez para todo el catálogo.
- En la receta (bloque 2) el producto consume cantidades del insumo ("1000 g de harina"); la interpretación del precio ya no se repite por producto.
- El catálogo es **del usuario** (vía su negocio): solo ve sus propios insumos; otros usuarios no acceden.

### Borrado

- En el MVP se puede borrar cualquier insumo.
- **Regla pendiente para el bloque 2**: cuando existan recetas, borrar un insumo que está en alguna receta debe bloquearse y pedir quitarlo de la receta primero.

## Qué queda afuera

- Productos, recetas, costo variable unitario y capacidad mensual: las decisiones (D1–D3, más D4 de recálculo en vivo) ya están tomadas, pero su implementación queda fuera del MVP.
- Costos indirectos, prorrateo, recargo, precio sugerido, contribución, equilibrio, tablero.
- Unidades de medida fuera del insumo: la cantidad y la unidad del insumo ya se cargan en el bloque 1 (la unidad se selecciona del catálogo precargado); las unidades de la receta (cantidad usada y su unidad, de la misma familia) llegan con el bloque 2.
- Histórico de períodos, comparación de escenarios, precio de venta real.
- Qué pasa con el cálculo de un solo producto de la fase 1 (decisión de producto aparte).

## Decisiones que el MVP no toma (siguen pendientes)

1. ~~Detalles del snapshot "Cerrar cálculo"~~ **Resueltos** (D5–D8)
2. ~~Regla de capacidad~~ **Resuelta (D9)**
3. Validaciones de receta y formato de `rendimiento`/redondeo (bloque 2)
4. Regla de "importancia de cada gasto" en el prorrateo (bloque 3)
5. Interpretación final de cuota, equilibrio en pesos y prueba de cierre (bloque 3)
6. Recargo global vs. por producto (bloque 3)
7. Modelo de período: ¿un cálculo activo o histórico? (bloque 3)
8. Destino del cálculo de un solo producto ya existente (global)
9. Contenido de la página inicial/dashboard: ¿dashboard o página inicial simple? Bloquea qué se construye en `/dashboard` y su criterio de aceptación
10. Planilla de validación: sigue siendo el bloqueante de QA para todo lo que calcula

## Criterios de aceptación del MVP

- Un usuario nuevo puede crear su primer insumo sin ayuda y verlo persistido al recargar.
- Puede corregir y borrar insumos; los cambios se reflejan en la lista.
- Dos usuarios no ven ni pisan los insumos del otro.
- La página inicial/dashboard existe como destino del menú (`/dashboard` tentativa); su contenido está a decidir (ver arriba).
- `/productos` responde (no 404) y comunica que la sección está en construcción.
- Los montos se manejan sin pérdida de centavos y validan en el servidor, no solo en el formulario.
