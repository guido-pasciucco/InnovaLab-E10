# 03 — Insumos

Catálogo compartido de insumos y packaging de un negocio. Es el punto de partida del flujo de costos: todas las recetas de productos consumen este catálogo y ningún precio se vuelve a cargar por producto.

## Recorrido

1. El usuario entra a **Insumos** desde el menú persistente, desde la página inicial o desde Productos al armar una receta.
2. Da de alta cada insumo con **nombre, precio de compra, cantidad y unidad de medida**.
3. Corrige o borra insumos; la lista se guarda y queda disponible para todas las recetas del negocio.
4. La pestaña **Packaging** ofrece el mismo CRUD y buscador para materiales de empaque.
5. El usuario sale hacia Productos o cualquier otro destino del menú. No hay pasos obligatorios.

## Datos del insumo

| Campo | Regla |
| --- | --- |
| Nombre | Texto libre. |
| Precio de compra | Monto en ARS de la cantidad completa declarada. Mayor que cero, hasta 2 decimales. |
| Cantidad | Cuánto trae el insumo, como número (ej. 50). |
| Unidad de medida | Se **selecciona** de un catálogo precargado. Nunca texto libre. |

Ejemplo: `Harina 000`, `$ 25.000`, `50 kg`.

No existe el campo "unidad de compra" (bolsa, caja). El envase no aporta al cálculo y dos campos de unidad en el mismo formulario confundían al usuario.

## Catálogo de unidades de medida

11 unidades en 4 familias, cada familia con una unidad base:

| Familia | Base | Unidades |
| --- | --- | --- |
| Masa | `g` | `g`, `kg` |
| Volumen | `ml` | `ml`, `L` |
| Longitud | `mm` | `mm`, `cm`, `m` |
| Unidad/contable | `unidad` | `unidad`, `par` (×2), `media docena` (×6), `docena` (×12) |

- La conversión es **automática dentro de la misma familia**. Mezclar familias es error de validación (por ejemplo, "2 L de harina").
- El catálogo es extensible: se pueden agregar unidades con su equivalencia sin migrar datos.
- Quedan fuera deliberadamente superficie, tiempo y unidades de envase.

## Reglas del catálogo

- El **costo por unidad se calcula una sola vez** (`precio de compra ÷ cantidad`) y todas las recetas comparten ese resultado.
- La lista se puede **buscar por nombre o unidad de medida**.
- Los insumos son **del negocio del usuario**: un usuario no ve ni pisa los insumos de otro.
- **Borrado:** libre mientras ninguna receta viva referencie el insumo. Cuando exista esa referencia, el sistema bloquea el borrado, indica qué recetas lo usan y pide quitarlo primero (D11). Los snapshots cerrados conservan su propia copia.
- Los importes viajan como string decimal y se validan también en el servidor. Nunca `Number`.

## Packaging

Misma alta, corrección, borrado y buscador que Insumos; se diferencia solo por el tipo `kind = 'packaging'`. El precio se carga una sola vez acá: las presentaciones de los productos solo referencian el ítem. Queda pendiente alinear el formulario de packaging (hoy con unidad en texto libre) con el catálogo de unidades.

## Decisiones aplicables

- Catálogo de unidades y equivalencias (registro de decisiones de Fase 2, "General").
- Insumo sin "unidad de compra", con unidad seleccionable (Fase 2, Bloque 1).
- Packaging como pestaña del catálogo (Fase 2, Bloque 1).
- Borrado libre en el MVP y bloqueo cuando haya recetas (D11).
- ADR 01 — Reglas de campo compartidas entre formulario y base.

## Fuentes

- Las decisiones vigentes están aplicadas en este flujo. El material de trabajo de la Fase 2 se conserva en el historial de git.
- `docs/decisiones.md`.
