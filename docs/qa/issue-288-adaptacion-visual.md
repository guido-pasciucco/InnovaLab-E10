# #288 — Adaptación visual del formulario de Producto y Receta

Registro de decisiones de diseño propias (la issue pide documentarlas) y guía de
verificación visual. No cambia cálculos, unidades, rendimiento ni persistencia.

## Decisiones de diseño

| Decisión | Por qué |
| --- | --- |
| Los tabs `Datos / Receta / Costeo` de la maqueta se expresan como **secciones consecutivas** de un único formulario, no como pestañas. | Las pestañas son una interacción nueva y la issue excluye cambios funcionales; las secciones conservan el orden de foco y el submit actual. |
| La receta pasa a un **bloque tipo tabla** (encabezado de columnas en escritorio, filas apiladas en móvil), manteniendo las etiquetas `Insumo`, `Cantidad` y `Unidad`. | Es la presentación de la maqueta y mejora la alineación sin tocar los campos ni sus nombres accesibles. |
| El **costo variable unitario** se muestra en un bloque `Resultado calculado / Solo lectura`, con fondo tonal y mono destacado. | Separa los datos editables del resultado del motor, tanto al editar como en el detalle de la receta. |
| La **capacidad mensual (P13)** sigue siendo un campo del bloque `Datos del producto` y además se muestra como dato de solo lectura en el detalle. | Evita duplicarla o crear otra pantalla, y aclara que no es lo mismo que el rendimiento. |
| Se reutilizan `FormGrid`, `HelpTooltip`, `TextField`, `SelectField`, `PrimaryButton` y `CatalogModal`. | Coherencia con Insumos y con los tokens de #201/#222; el modal compartido solo acepta una descripción opcional. |
| El `VariableCostResult` es un componente presentacional compartido por formulario y detalle. | Un solo lugar para el formato del resultado calculado, sin duplicar markup. |

## Criterios de revisión

- Escritorio y móvil: `Nuevo producto` y `Editar producto` desde `/products`.
- Receta con varios insumos: columnas alineadas, `+ Agregar insumo` y `Quitar`.
- Detalle `Ver receta`: tabla, rendimiento, capacidad mensual y costo variable.
- Validación: receta vacía, unidad incompatible, capacidad sin cargar.
- Accesibilidad: foco inicial, `Tab` dentro del modal, `Escape` y `:focus-visible`.

## Evidencia

Capturas del código final de este PR, tomadas con Playwright contra Supabase local:

- `issue-288-formulario-escritorio.png` — formulario con tres insumos.
- `issue-288-formulario-movil.png` — misma pantalla en 390 px.
- `issue-288-formulario-movil-receta.png` — renglones de receta en móvil.
- `issue-288-detalle-receta-costo.png` — detalle con rendimiento, capacidad y costo variable.
- `issue-288-formulario-datos-incompletos.png` — capacidad sin cargar y resultado pendiente.

Para regenerarlas: `bun run dev` y recorrer `/products` → `+ Nuevo` / `Ver receta`.
