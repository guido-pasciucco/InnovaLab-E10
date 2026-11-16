# Fase 2 — Documentación

Índice de la documentación de la Fase 2 (flujo de costos multi-producto). El objetivo es separar contexto/referencia, decisiones y specs en construcción.

## Mapa

### Base (contexto y alcance)
- `02-especificacion-flujo-costos.md`: especificación del flujo por bloques (pasos, datos/reglas, huecos y propuestas).
- `03-mvp-fase-2.md`: alcance del MVP de la primera entrega.
- `glosario.md`: términos de negocio del flujo.

### Decisiones (fuente de verdad)
- `04-decisiones.md`: registro central de decisiones **tomadas** y **pendientes**. Toda decisión nueva se registra acá; las decisiones extensas pueden tener un doc puntual y vincularse desde aquí.

### Specs en construcción
- `spec/bloque-2-productos.md`: borrador vivo del spec del Bloque 2 (productos y recetas), construido decisión por decisión.

### Detalles de decisión
- `inmutables/preguntas/decision-capacidad-vs-plan-periodo.md`: detalle de la decisión de capacidad mensual como campo editable en el formulario del producto (opción A refinada, sin pantalla propia ni “plan del mes”) y botón “Cerrar cálculo” para snapshot histórico. Mapa de flujos A y B documentado como referencia.

### Alineación con UX/UI
- `alineacion-malena.md`: diferencias entre la guía de pantallas y las decisiones de la Fase 2, con propuestas de consolidación para los cuatro puntos principales.

### Referencia / material inmutable o de apoyo
- `inmutables/analisis-flujo-costos.md`: análisis del flujo y huecos detectados.
- `inmutables/flujo-del-modelo-calculadora-de-costos-numera.md`: flujo del modelo (NUMERA) y correlación con issues.
- `inmutables/malena/01-malena-guia-pantallas-navegacion.md`: guía de pantallas y navegación (Malena).
- `inmutables/malena/05-respuesta-guia-pantallas.md`: respuesta/alineación frente a la guía de pantallas.
- `inmutables/preguntas/06-decision-cierre-calculo.md`: material de trabajo sobre cierre de cálculo.

## Convenciones

- **Decisiones:** `04-decisiones.md` es la única fuente de verdad; git guarda la fecha de cada cambio. Los specs y la especificación deben reflejar lo decidido ahí.
- **Specs:** `spec/bloque-N-*.md` son borradores vivos; lo no decidido se marca como **pendiente** y se cierra decisión por decisión.
- **Referencias:** los docs en `inmutables/` se tratan como material de contexto/referencia; si se actualizan, mantener coherencia con decisiones vigentes.
- Prefijos numéricos (`01-04`) conservados en la base por compatibilidad de enlaces; nuevos specs bajo `spec/`.
