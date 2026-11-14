# Fase 2 — Registro de decisiones

Centraliza las decisiones de producto/arquitectura del flujo de costos multi-producto: las ya tomadas (con fecha y fuente) y las que siguen abiertas, agrupadas por bloque como en la especificación (`02-`). Cuando una decisión pendiente se resuelva, se mueve a "Decisiones tomadas" y se actualizan la especificación (`02-`) y/o el MVP (`03-`).

## Decisiones tomadas

### Navegación y alcance general

#### 2026-11-11 — Menú de navegación persistente separado del dashboard

- **Decisión:** la navegación tiene dos piezas distintas:
  - **Menú de navegación**: sección persistente presente en todas las pantallas del flujo. Único camino para cambiar de sección; no desaparece al entrar a un destino y no tiene estado.
  - **Página inicial / dashboard**: una vista más del menú (`/dashboard` tentativa). Está **a decidir** si será un dashboard o simplemente una página inicial; su contenido no está definido.
- **Fuente:** conversación de diseño del MVP, 2026-11-11.

#### 2026-11-11 — Navegación por destinos, no por pasos

- **Decisión:** no hay pasos obligatorios ni ventanas bloqueadas. Existen solo **dependencias de datos** (indirectos requieren lista cerrada; tablero requiere datos cargados).
- **Fuente:** `02-especificacion-flujo-costos.md`, "Navegación general".

#### 2026-11-11 — Alcance del MVP: solo bloque 1 (Insumos)

- **Decisión:** la primera entrega del flujo de costos incluye únicamente el catálogo de insumos completo (alta, corrección y borrado) más la navegación del flujo. Productos, costos indirectos y tablero quedan fuera hasta resolver las decisiones de negocio pendientes.
- **Fuente:** conversación de diseño del MVP, 2026-11-11.

### General

#### 2026-11-13 — Catálogo de unidades de medida: 4 familias, equivalencias dentro de la familia

- **Decisión:** el catálogo precargado tiene **11 unidades en 4 familias**, cada una con una unidad base:
  - **Masa** (base `g`): `g`, `kg`
  - **Volumen** (base `ml`): `ml`, `L`
  - **Longitud** (base `mm`): `mm`, `cm`, `m`
  - **Unidad/contable** (base `unidad`): `unidad`, `par` (2), `media docena` (6), `docena` (12)
- **Conversión:** automática solo dentro de la misma familia; equivalencias de masa/volumen/longitud son potencias de 10, contable usa ×2/×6/×12. La receta no puede mezclar familias (ej. "2 L de harina" es error de validación, no conversión).
- **Alcance:** pensado para cualquier emprendimiento de productos físicos (no solo alimenticio): masa y volumen cubren alimentos/bebidas, longitud cubre textiles/marroquinería/carpintería, contable cubre indumentaria/regalería.
- **Queda afuera deliberadamente:** superficie (m²), tiempo, unidades de envase (caja, bolsa, paquete — coherente con la decisión del 2026-11-13 de no tener "unidad de compra"). Si un rubro los necesita, se agregan como familia/unidades nuevas sin migrar datos.
- **Catálogo extensible:** se pueden agregar unidades con su equivalencia sin romper datos existentes.
- **Fuente:** conversación de diseño, 2026-11-13.

### Bloque 1 — Insumos

#### 2026-11-13 — El insumo no lleva "unidad de compra" y la unidad de medida se selecciona

- **Decisión:** se quita el campo "unidad de compra" (bolsa, caja, unidad) del insumo para evitar confusiones, y el contenido se separa en dos campos: **cantidad** (número, se ingresa) + **unidad de medida** (se **selecciona** de un catálogo precargado — kg, g, litro, unidad… — nunca texto libre). El insumo queda en **nombre + precio de compra + cantidad + unidad de medida** (ej. "Harina 000", $25.000, 50 kg).
- **Por qué:** el tipo de envase no aporta al cálculo (la matemática usa cantidad × unidad) y dos campos de "unidad" en el mismo formulario confunden. La unidad precargada garantiza equivalencias válidas para la conversión automática del bloque 2.
- **Ajusta:** la decisión del 2026-11-11 (que incluía unidad de compra + cantidad por envase); el resto —cantidad con unidad de medida y costo por unidad calculado una sola vez— se mantiene.
- **Fuente:** conversación de diseño del MVP, 2026-11-13.

#### 2026-11-11 — Insumo con cantidad y unidad de medida (Opción B)

- **Decisión:** el insumo se da de alta con **nombre + precio de compra + unidad de compra + cantidad por envase** (ej. "Harina 000", $25.000, bolsa, 50 kg). El precio es del envase completo. *(Ajustada el 2026-11-13: ver decisión anterior — queda nombre + precio + cantidad + unidad de medida seleccionable.)*
- **Por qué:** la receta consume cantidades ("1000 g de harina") en unidades de medida relacionadas con las del envase. El sistema trabaja con un catálogo precargado de unidades de medida y hace la conversión por detrás (kg ↔ g, L ↔ ml): el usuario nunca hace la reducción a la unidad a mano. El costo por unidad se calcula una sola vez a partir del envase declarado en el insumo y todas las recetas lo comparten.
- **Revierte:** la Opción A anterior (insumo = nombre + precio, unidades en la receta), que queda documentada como descartada.
- **Fuente:** conversación de diseño del MVP, 2026-11-11.

#### 2026-11-11 — Borrado libre de insumos en el MVP

- **Decisión:** en el MVP se puede borrar cualquier insumo porque ninguna receta los referencia todavía.
- **Regla pendiente:** cuando existan recetas (bloque 2), el borrado de un insumo referenciado debe bloquearse hasta quitarlo de la receta.
- **Fuente:** `03-mvp-fase-2.md`, sección "Borrado".

## Decisiones pendientes

### General

#### Contenido de la página inicial/dashboard

- No está definido si la vista inicial será un **dashboard** (resumen del estado del catálogo con accesos a cada bloque) o una **página inicial** simple. El contenido está a decidir.
- **Contexto:** la propuesta de "hub de estado con una tarjeta por bloque" (Insumos, Productos, Costos indirectos, Tablero, cada una con estado y CTA) quedó en pausa; no es decisión tomada.
- **Bloquea:** qué se construye en `/dashboard` (ruta tentativa) y su criterio de aceptación en el MVP.

#### Alcance del menú persistente

- ¿El menú aplica a **todo el producto** o solo a las rutas del catálogo de fase 2 (`/insumos`, `/productos`, `/costos-indirectos`, `/tablero`, `/dashboard`)?
- **Contexto:** el flujo actual del producto es un wizard (`/paso-1` a `/paso-8`). Si el menú es global, convive o reemplaza esa navegación; si es solo del catálogo, hay que definir cómo se alternan.
- **Bloquea:** layout y navegación compartida.

### Bloque 2 — Productos y recetas

- Base de cálculo de la receta: ¿cantidades por unidad de producto (1 pan) o por lote (1 bandeja de 12)? Cambia por completo el costo variable unitario. Propuesta tentativa: por unidad de producto; pendiente de confirmar con la planilla #250.
- **¿Dónde vive la capacidad mensual?** Dos opciones:
  - **A (lo que dicen las issues #240–#242):** la capacidad es el paso final del alta de cada producto, dentro del bloque 2. Un solo recorrido, pero mezcla catálogo con plan del mes: para otro mes hay que editar cada producto.
  - **B (propuesta tentativa):** separar catálogo (insumos + productos + recetas, permanente) de "plan del mes" (capacidad + costos indirectos + recargo, por período). El bloque 3 absorbe la capacidad; resuelve de paso el hueco del período y habilita histórico. Cuesta una entidad nueva y desvío de la redacción de #242.
- Lista cerrada: ¿definitiva o reabrible? ¿Se puede corregir o borrar un producto después de cerrar? Propuesta tentativa: cerrar es definitivo dentro del catálogo activo.
- Destino del cálculo de un solo producto ya existente (fase 1): decisión de producto aparte; el catálogo lo reemplazaría.
- Cómo se cierran las listas de productos/insumos y qué implica.

### Bloque 3 — Costos indirectos

- Fórmulas de prorrateo y reparto (hereda ambigüedades de #246, #244: cuota, equilibrio en pesos, "importancia de cada gasto").
- La planilla #250 es el oráculo para validar las fórmulas; sin ella no hay cómo verificar.

### Bloque 4 — Tablero

- Qué resultados se muestran (precio sugerido, contribución, punto de equilibrio, recargo) y con qué fórmulas.
- Histórico de períodos y comparación de escenarios quedaron fuera del alcance original — confirmar si aplican.
