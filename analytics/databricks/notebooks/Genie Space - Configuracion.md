# Genie Space — InnovaLab - Punto de Equilibrio

## Información general

| Campo | Valor |
|---|---|
| Nombre | InnovaLab - Punto de Equilibrio |
| ID | 01f1be2b03eb19448dbd37055143b8dc |
| URL | /genie/rooms/01f1be2b03eb19448dbd37055143b8dc |
| Catálogo | workspace |
| Schema | innovalab |
| Creado | Octubre 2026 |

## Tablas incluidas (10)

1. workspace.innovalab.profiles — Usuarios del sistema
2. workspace.innovalab.businesses — Negocios PyME
3. workspace.innovalab.products — Productos de cada negocio
4. workspace.innovalab.business_cost_lines — Líneas de costo (fijos y variables)
5. workspace.innovalab.calculations — Cálculos de costeo por producto (2 por producto: _A y _B)
6. workspace.innovalab.costing_setup — Configuración del cálculo (volumen estimado, moneda, período)
7. workspace.innovalab.scenarios — Escenarios de cálculo (base, optimista, pesimista)
8. workspace.innovalab.calc_cost_lines — Líneas de costo del cálculo (fijos prorrateados + variables por unidad)
9. workspace.innovalab.pricing_inputs — Configuración de precios (manual o markup sobre costo)
10. workspace.innovalab.computed_results — Resultados del punto de equilibrio

## Instrucciones cargadas (General Instructions)

### Fórmulas del motor de cálculo de costos
- Responde siempre en español
- 12 fórmulas del motor: costo por unidad de compra, costo del ingrediente, costo variable del lote, unidades vendibles, costo variable por unidad, rendimiento, aprovechamiento, costo fijo asignado, costo fijo por unidad, costo completo por unidad, precio con recargo, precio con margen sobre la venta, contribución por unidad, punto de equilibrio en unidades

### Reglas importantes de negocio
- Margen y recargo no son lo mismo
- Contribución cero o negativa = no hay punto de equilibrio
- Sueldos mensuales = costos fijos; horas extra = mano de obra variable
- Porcentajes de asignación de costos fijos deben sumar 100%
- Cálculos _A = precio manual; _B = markup sobre costo
- Filtrar por products.name o calculations.product_id cuando se pregunta por un producto

## Ejemplos SQL cargados (SQL Queries tab)

1. ¿Cuál es el punto de equilibrio de un producto específico?
2. Comparar escenarios A vs B para un producto
3. Detalle de costos fijos y variables por producto
4. Graficar el punto de equilibrio de un producto (curvas de ingresos y costos)

## Comentarios en Unity Catalog

### Comentarios de tabla (10)
- profiles: Usuarios del sistema. Cada usuario puede tener uno o más negocios PyME.
- businesses: Negocios PyME del usuario.
- products: Productos de cada negocio. Pueden ser elaborados o revendidos.
- business_cost_lines: Líneas de costo a nivel negocio. behavior=fixed/variable.
- calculations: Cálculos de costeo por producto. _A (precio manual) y _B (margen sobre costo).
- costing_setup: Configuración del cálculo. estimated_volume = unidades vendibles previstas.
- scenarios: Escenarios de cálculo. is_base=true marca el escenario base.
- calc_cost_lines: Líneas de costo del cálculo. fixed con allocation_pct, variable por unidad.
- pricing_inputs: Configuración de precios. manual o markup_on_cost.
- computed_results: Resultados del punto de equilibrio con todas las fórmulas.

### Comentarios de columna (10)
- computed_results.total_fixed: SUM(calc_cost_lines WHERE behavior=fixed)
- computed_results.variable_unit: SUM(calc_cost_lines WHERE behavior=variable)
- computed_results.total_cost: total_fixed + variable_unit * estimated_volume
- computed_results.unit_cost: total_fixed / estimated_volume + variable_unit
- computed_results.contribution_margin_unit: price - variable_unit
- computed_results.break_even_units: total_fixed / contribution_margin_unit
- computed_results.break_even_sales: break_even_units * price
- calc_cost_lines.behavior: fixed (prorrateado) o variable (por unidad)
- calc_cost_lines.allocation_pct: % de costos fijos asignado al producto (suma 100%)
- pricing_inputs.margin_convention: manual vs markup_on_cost
- pricing_inputs.expected_margin_pct: porcentaje de recargo (1.0 = 100%)
- costing_setup.estimated_volume: unidades vendibles previstas (mensual)

## Guía de permisos para invitar usuarios

### Paso 1 — Invitar al workspace
1. Admin Settings → Identity and Access → Users → Add user
2. Ingresar email del compañero
3. Rol: workspace user

### Paso 2 — Otorgar SELECT sobre las tablas
```sql
GRANT USE CATALOG ON CATALOG workspace TO `<email>`;
GRANT USE SCHEMA ON SCHEMA workspace.innovalab TO `<email>`;
GRANT SELECT ON TABLE workspace.innovalab.profiles TO `<email>`;
GRANT SELECT ON TABLE workspace.innovalab.businesses TO `<email>`;
GRANT SELECT ON TABLE workspace.innovalab.products TO `<email>`;
GRANT SELECT ON TABLE workspace.innovalab.business_cost_lines TO `<email>`;
GRANT SELECT ON TABLE workspace.innovalab.calculations TO `<email>`;
GRANT SELECT ON TABLE workspace.innovalab.costing_setup TO `<email>`;
GRANT SELECT ON TABLE workspace.innovalab.scenarios TO `<email>`;
GRANT SELECT ON TABLE workspace.innovalab.calc_cost_lines TO `<email>`;
GRANT SELECT ON TABLE workspace.innovalab.pricing_inputs TO `<email>`;
GRANT SELECT ON TABLE workspace.innovalab.computed_results TO `<email>`;
```

### Paso 3 — Compartir el Genie Space
1. Abrir /genie/rooms/01f1be2b03eb19448dbd37055143b8dc
2. Clic Share → agregar email → Can view o Can edit

### Paso 4 — Enviar el link
```
https://<workspace>.cloud.databricks.com/genie/rooms/01f1be2b03eb19448dbd37055143b8dc
```

## Documento de referencia
- [Resumen y formulas.md](./Resumen%20y%20formulas.md) — Documento operativo con fórmulas y reglas del motor de cálculo

## Notas
- El Genie Space es una entidad server-side de Databricks. No se puede exportar como archivo a Git.
- Esta documentación sirve como referencia versionada de la configuración.
- El SQL warehouse serverless se enciende automáticamente al recibir consultas y se apaga tras inactividad.
- Free Edition: uso no comercial, 1 warehouse 2X-Small, fair usage policy aplica.