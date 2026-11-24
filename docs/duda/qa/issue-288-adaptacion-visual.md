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
| Se reutilizan `FormGrid`, `TextField`, `SelectField`, `PrimaryButton` y `CatalogModal`. | Coherencia con Insumos y con los tokens de #201/#222; el modal compartido solo acepta una descripción opcional. |
| El `VariableCostResult` es un componente presentacional compartido por formulario y detalle. | Un solo lugar para el formato del resultado calculado, sin duplicar markup. |

## Ajustes de QA

| Hallazgo | Ajuste |
| --- | --- |
| En móvil, nombre y capacidad seguían en dos columnas: `FormGrid` ya trae `grid-cols-2` y la clase `grid-cols-1` no podía ganar. | `FormGrid` acepta `stackOnMobile` (por defecto `false`, así Insumos no cambia). El formulario lo usa para una columna en móvil y dos desde `sm`. |
| En escritorio, el rótulo largo de capacidad desalineaba los inputs. | Se reserva el alto de dos líneas para los rótulos desde `sm`, sin cambiar los textos. |
| Al editar, el importe del producto guardado parecía ya reflejar cambios sin guardar. | Si el formulario está sucio, el bloque pasa a `Último resultado guardado / Cambios sin guardar` y explica que se recalcula al guardar. El motor no se ejecuta en el cliente. |

Estos tres puntos quedan cubiertos por `tests/e2e/products/visual-adaptation.spec.ts`.

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
- `issue-288-formulario-datos-incompletos.png` — errores de validación, capacidad sin cargar y resultado pendiente.
- `issue-288-edicion-costo-guardado.png` — edición con cambios sin guardar: importe anterior marcado como *Último resultado guardado*.

Para regenerarlas: `bun run dev` y recorrer `/products` → `+ Nuevo` / `Ver receta` / `Editar`.

## Validación en el HEAD actualizado (tras merge de `main`)

| Comando | Resultado |
| --- | --- |
| `bun run typecheck` | OK (tras limpiar los tipos generados de rutas eliminadas por `main`) |
| `bun run lint` | OK, 3 warnings preexistentes en `app/layout.tsx` |
| `bun run lint:e2e` | OK |
| `bun run test` | 784 tests OK |
| `bunx playwright test` | 55/55 e2e OK (incluye Productos, Receta, Insumos, Packaging, Gastos del período, Presentaciones y accesibilidad del modal) |

El merge fue normal (sin rebase ni force-push). Se preservaron los defaults de rendimiento y el catálogo de unidades de `main`, y su enlace a presentaciones (P12). El e2e usa la ruta canónica `/supplies`.
