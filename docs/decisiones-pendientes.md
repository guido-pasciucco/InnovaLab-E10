# Decisiones pendientes — recolector único

Todo lo que sigue abierto en el producto, el cálculo y la ingeniería, reunido en un solo lugar. Las decisiones **ya tomadas** no se repiten acá; las resueltas durante la Fase 2 se dieron por cerradas.

Cada fila dice de dónde viene. Cuando una decisión se cierra, se saca de este archivo, se escribe en el flujo correspondiente y se registra con fecha.

## Resumen

| ID | Tema | Estado | Origen | Bloquea |
| --- | --- | --- | --- | --- |
| P-01 | Contenido de la página inicial / dashboard | Abierta | Fase 2 · General | Criterio de aceptación de `/dashboard` |
| P-02 | Alcance del menú persistente (global vs. catálogo) | Abierta | Fase 2 · General | Layout y navegación compartida |
| P-04 | Regla de "importancia de cada gasto" en el prorrateo | Abierta | Fase 2 · Bloque 3 | Reparto por gasto |
| P-05 | Cuota, equilibrio en pesos y prueba de cierre | Abierta | Fase 2 · Bloque 3 | Fórmulas del equilibrio |
| P-06 | Recargo global vs. por producto | Abierta | Fase 2 · Bloque 3 | Interfaz de precios |
| P-07 | Modelo de período: cálculo activo vs. histórico | Abierta | Fase 2 · Bloque 3 | Edición histórica |
| P-08 | Destino del cálculo de un solo producto (Fase 1) | Abierta | Fase 2 · Global | Reemplazo por el catálogo |
| P-09 | Planilla #250 como oráculo de validación | Dependencia externa | Fase 2 · Bloque 3 | QA de todas las fórmulas |
| P-10 | Eje X del gráfico del equilibrio | Abierta | Fase 2 · Bloque 4 | Gráfico multi-producto |
| P-11 | Líneas del gráfico del equilibrio | Abierta | Fase 2 · Bloque 4 | Gráfico multi-producto |
| P-12 | Estados vacíos del tablero | Abierta | Fase 2 · Bloque 4 | Tablero |
| P-13 | Cuotas fraccionarias: precisión y formato | Abierta | Fase 2 · Bloque 4 | Tablero |
| P-14 | Resultados que muestra el tablero y sus fórmulas | Abierta | Fase 2 · Bloque 4 | Tablero |
| P-19 | Comisiones porcentuales por venta en el MVP | Abierta | Producto · §11 | Alcance del MVP |
| P-20 | Tratamiento de mermas y desperdicios | Diferida a largo plazo | Producto · §11 | Cálculo de recetas |
| P-21 | Redondeo monetario y unidades del equilibrio | Abierta | Producto · §11 | Contrato de precisión |
| P-22 | Qué resultados son proyecciones y cuáles son reales | Abierta | Producto · §11 | Comunicación al usuario |
| P-23 | Validar el modelo con el mentor y dos rubros distintos | Abierta | Producto · §11 | Validación del producto |
| D-04 | Auditoría de autorización por recurso en Server Actions | Pendiente | ADR 03 | Seguridad de acciones |
| D-05 | Regla de lint que prohíba casts a `VerifiedUserId` | Pendiente | ADR 03 | Frontera de identidad |
| D-06 | Cache por request de `getUser` en renders | Pendiente | ADR 03 | Rendimiento de auth |

Las decisiones abiertas de **licitaciones** no se incluyen en este recolector.

---

## Producto y cálculo

### Navegación y alcance

- **P-01** — No está definido si la vista inicial será un dashboard (resumen del estado del catálogo con accesos a cada bloque) o una página inicial simple. La propuesta de "hub con una tarjeta por bloque" quedó en pausa; no es decisión tomada.
- **P-02** — ¿El menú persistente aplica a todo el producto o solo a las rutas del catálogo? Hoy el producto tiene además el asistente `/paso-1` a `/paso-8`; si el menú es global, hay que definir cómo conviven.
- **P-08** — El catálogo reemplazaría al cálculo de un solo producto de la Fase 1, pero no está decidido qué pasa con los cálculos existentes. Decisión de producto aparte.

### Bloque 3 — Costos indirectos, precio y equilibrio

- **P-04** — Las issues hablan de "promedio ajustado según la importancia de cada gasto" sin definir cómo se pondera. Hoy los indirectos son un solo total repartido por capacidad.
- **P-05** — Interpretación final de la cuota por producto, del equilibrio en pesos y de la prueba de cierre. Las fórmulas propuestas necesitan validación contra la planilla.
- **P-06** — La especificación dice "cada producto" pero no aclara si el porcentaje es uno solo para todos o individual. La convención margen-vs-recargo ya está resuelta; este punto no.
- **P-07** — Los indirectos son "del mes" pero no hay modelo de período: ¿un solo cálculo vigente o histórico? La edición histórica también bloquea el selector de mes.
- **P-09** — Sin la planilla #250 no hay oráculo para verificar ninguna fórmula. Es la dependencia de QA más importante del flujo.

### Bloque 4 — Tablero

- **P-10** — Con varios productos no está definido qué significa el eje X del gráfico. La propuesta es unidades totales vendidas de la mezcla.
- **P-11** — No está detallado qué líneas se dibujan. La propuesta es indirectos del período (constante) contra contribución acumulada de la mezcla.
- **P-12** — Qué ve el usuario sin catálogo cerrado, sin indirectos o sin capacidades.
- **P-13** — Las cuotas pueden dar decimales; no está definido si se muestran exactas, redondeadas o como "unidades vendibles".
- **P-14** — Qué resultados se muestran (precio sugerido, contribución, equilibro, recargo) y con qué fórmulas.

### Definición conceptual del producto

- **P-19** — Incluir o no comisiones porcentuales por venta en el MVP.
- **P-20** — Tratamiento de mermas y desperdicios. Diferida: es una idea a largo plazo, no algo para implementar ahora; requiere conversación y acuerdo con el equipo antes de entrar en alcance. Las reglas de mermas quedan como propuesta documentada, no como norma vigente.
- **P-21** — Reglas de redondeo monetario y de unidades del punto de equilibrio.
- **P-22** — Acordar qué resultados son proyecciones y cuáles pueden basarse en datos reales.
- **P-23** — Validar el modelo con el mentor y con al menos dos rubros distintos.

> Fuera de alcance de decisión: el formato numérico de `rendimiento` y el redondeo interno los define la implementación y no bloquean el spec.

## Desarrollo

- **D-04** — Auditar las Server Actions de `app/(calculator)/`: el `VerifiedUserId` no comprueba que un `calculationId` o `businessId` del input pertenezca al usuario.
- **D-05** — Regla de lint que prohíba `as VerifiedUserId` fuera de `getSessionUserService` y la factory de tests.
- **D-06** — Decidir si se agrega cache por request de `getUser` en renders (layout + page). Una Server Action es otro request, así que el cache no une sus llamadas.

## Cómo cerrar una decisión

1. Escribir la regla en el flujo que corresponda, sin fecha: git guarda el historial.
2. Si es una regla de negocio con identidad propia, registrar la decisión con su ID, su tipo, la regla y el porqué.
3. Sacar el ítem de este archivo y explicar la regla donde corresponda.
4. Si la decisión cambia una regla anterior, registrar qué cambió: no se reescribe la historia.
