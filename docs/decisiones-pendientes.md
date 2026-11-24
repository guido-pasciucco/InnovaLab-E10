# Decisiones pendientes — recolector único

Todo lo que sigue abierto en el producto, el cálculo y la ingeniería, reunido en un solo lugar. Las decisiones **ya tomadas** no se repiten acá; las resueltas durante la Fase 2 se dieron por cerradas.

Cada fila dice de dónde viene. Cuando una decisión se cierra, se saca de este archivo, se escribe en el flujo correspondiente y se registra con fecha.

## Resumen

| ID | Tema | Estado | Origen | Bloquea |
| --- | --- | --- | --- | --- |
| P-05 | Cuota, equilibrio en pesos y prueba de cierre | Abierta | Fase 2 · Bloque 3 | Fórmulas del equilibrio |
| P-06 | Recargo global vs. por producto | Abierta | Fase 2 · Bloque 3 | Interfaz de precios |
| P-09 | Planilla #250 como oráculo de validación | Dependencia externa | Fase 2 · Bloque 3 | QA de todas las fórmulas |
| P-13 | Cuotas fraccionarias: precisión y formato | Abierta | Fase 2 · Bloque 4 | Tablero |
| P-20 | Tratamiento de mermas y desperdicios | Diferida a largo plazo | Producto · §11 | Cálculo de recetas |
| P-21 | Redondeo monetario y unidades del equilibrio | Abierta | Producto · §11 | Contrato de precisión |
| P-22 | Qué resultados son proyecciones y cuáles son reales | Abierta | Producto · §11 | Comunicación al usuario |
| P-23 | Validar el modelo con el mentor y dos rubros distintos | Abierta | Producto · §11 | Validación del producto |
| P-24 | Desactivar un producto para el cálculo sin borrarlo | Diferida | Fase 2 · Bloque 2 | Ciclo de vida del producto |
| D-04 | Auditoría de autorización por recurso en Server Actions | Pendiente | ADR 03 | Seguridad de acciones |
| D-05 | Regla de lint que prohíba casts a `VerifiedUserId` | Pendiente | ADR 03 | Frontera de identidad |
| D-06 | Cache por request de `getUser` en renders | Pendiente | ADR 03 | Rendimiento de auth |

Las decisiones abiertas de **licitaciones** no se incluyen en este recolector.

---

## Producto y cálculo

### Bloque 3 — Costos indirectos, precio y equilibrio

- **P-05** — Interpretación final de la cuota por producto, del equilibrio en pesos y de la prueba de cierre. Las fórmulas propuestas necesitan validación contra la planilla.
- **P-06** — El recargo sobre el costo total unitario ya está decidido como convención; falta definir si el porcentaje es uno solo para todo el negocio o uno por producto. Hoy no se guarda en ningún lado, así que define dónde vive el dato y cómo es la pantalla de precios.
- **P-09** — Sin la planilla #250 no hay oráculo para verificar ninguna fórmula. Es la dependencia de QA más importante del flujo.

### Bloque 4 — Tablero

- **P-13** — Las cuotas pueden dar decimales; no está definido si se muestran exactas, redondeadas o como "unidades vendibles".

### Definición conceptual del producto

- **P-20** — Tratamiento de mermas y desperdicios. Diferida: es una idea a largo plazo, no algo para implementar ahora; requiere conversación y acuerdo con el equipo antes de entrar en alcance. Las reglas de mermas quedan como propuesta documentada, no como norma vigente.
- **P-21** — Reglas de redondeo monetario y de unidades del punto de equilibrio.
- **P-22** — Acordar qué resultados son proyecciones y cuáles pueden basarse en datos reales.
- **P-23** — Validar el modelo con el mentor y con al menos dos rubros distintos.

### Ciclo de vida del producto

- **P-24** — Desactivar un producto para que deje de entrar en el cálculo sin borrarlo, y poder volver a activarlo. Diferida: es una mejora para más adelante; hoy borrar un producto es definitivo para el usuario.

> Fuera de alcance de decisión: el formato numérico de `rendimiento` y el redondeo interno los define la implementación y no bloquean el spec.

## Desarrollo

- **D-04** — Auditar las Server Actions de `app/(business)/` (insumos, productos, licitaciones y proveedores): el `VerifiedUserId` no comprueba que un id de recurso recibido en el input pertenezca al usuario.
- **D-05** — Regla de lint que prohíba `as VerifiedUserId` fuera de `getSessionUserService` y la factory de tests.
- **D-06** — Decidir si se agrega cache por request de `getUser` en renders (layout + page). Una Server Action es otro request, así que el cache no une sus llamadas.

## Cómo cerrar una decisión

1. Escribir la regla en el flujo que corresponda, sin fecha: git guarda el historial.
2. Si es una regla de negocio con identidad propia, registrar la decisión con su ID, su tipo, la regla y el porqué.
3. Sacar el ítem de este archivo y explicar la regla donde corresponda.
4. Si la decisión cambia una regla anterior, registrar qué cambió: no se reescribe la historia.
