# Cierre del cálculo y captura del histórico mensual — análisis previo

> **Estado:** resuelta por la decisión de capacidad mensual y "cerrar cálculo" (opción A refinada): el catálogo es editable siempre, la capacidad vive en el formulario del producto y el histórico se toma con el botón "Cerrar cálculo". Este documento se conserva como registro del análisis previo.

> **Documento de decisión para el equipo.** Plantea dos opciones para dos problemas relacionados: cómo "cerrar" el cálculo de costos de un período sin congelar el catálogo, y cómo ordenar los datos del cálculo frente al catálogo permanente.
>
> Contexto: hoy se asume que la lista de productos debe "cerrarse" para poder prorratear los costos indirectos, y está pendiente si ese cierre es definitivo o se puede reabrir. También está pendiente si el cálculo es único y vigente o si se guarda histórico por período.

## Lo que ya existe en el sistema

La persistencia ya soporta cálculos versionados: cada cálculo es una fila propia con `status` (hoy solo `draft`), fecha y datos propios (costos, precios, escenarios y resultados guardados), y una referencia al cálculo que el usuario está editando en ese momento. El resto queda como versiones anteriores consultables por fecha.

En la práctica: un "Cerrar cálculo" no necesita estructura nueva — sería cambiar el estado a cerrado y abrir un cálculo nuevo. Lo que falta definir es la regla de negocio: qué estados existen y qué se puede editar después del cierre.

---

## El problema en una frase

El catálogo (insumos + productos + recetas) es permanente y editable; el cálculo del mes (capacidad + costos indirectos + recargo → resultados) necesita una "foto" estable para que el historial tenga sentido. ¿Cómo se captura esa foto y dónde viven los datos del cálculo?

---

## Opción A — Botón "Cerrar cálculo" (catálogo siempre editable)

El catálogo nunca se cierra: insumos, productos y recetas se editan siempre, y cada cambio recalcula lo derivado (regla ya propuesta en la spec). El cierre se aplica **solo al cálculo del período**: un botón "Cerrar cálculo de costos" (o similar) que congela una copia del estado del mes — productos, capacidades, costos indirectos, recargo y resultados — y la guarda como histórico.

**A favor:**
- Modelo mental simple: "el catálogo es tuyo y siempre editable; el cálculo es lo que congelás".
- No hay acciones irreversibles: editar después del cierre no rompe nada, simplemente genera el cálculo del período siguiente (o un borrador nuevo).
- Resuelve el histórico sin esperar al "plan del mes" completo: cada cierre es una foto.
- Coherente con la navegación por destinos: es un botón en una pantalla, no un flujo nuevo.

**En contra / lo que hay que definir:**
- Hay que decidir qué pasa con las ediciones posteriores al cierre: ¿arrancan un cálculo nuevo automáticamente? ¿el usuario elige a qué período pertenecen?
- ¿Se puede cerrar más de un cálculo del mismo mes? ¿El cierre es manual, por fin de mes, o ambos?
- Dos "cierres" distintos en la cabeza del usuario (catálogo vs. cálculo) si la lista de productos sigue existiendo como concepto.

---

## Opción B — Sección "Pasos del cálculo de costos" separada del catálogo

Los datos base (insumos, productos, recetas, costos indirectos) se cargan en sus secciones, y después existe una sección dedicada al cálculo que recorre los pasos: capacidad → costos indirectos → recargo → resultados. El "cierre" es implícito: al completar los pasos del mes queda guardado el cálculo.

**A favor:**
- Separación explícita entre "catálogo permanente" y "plan del mes" como entidad propia.
- Guía al usuario por el orden lógico de lo que falta cargar.
- Si el histórico importa, cada "pasada" por los pasos es naturalmente un período.

**En contra / lo que hay que definir:**
- Cambia el modelo de navegación acordado ("por destinos, no por pasos"): introduce un asistente/pasos dentro del flujo; si se elige esta opción, esa decisión queda revisada.
- Duplica pantallas o responsabilidades: capacidad y costos indirectos ya tienen secciones propias; ¿se cargan dos veces o se enlazan?
- "Completar los pasos" como cierre es difuso: ¿qué pasa si el usuario carga indirectos, calcula, y después quiere cambiar una capacidad? ¿Rehace todos los pasos?
- Es la opción más cara de construir.

---

## Preguntas para el equipo

1. **¿El catálogo debe poder editarse siempre, o hace falta un cierre de productos?** (Si se elige A, la lista de productos ya no necesita "cerrarse" para prorratear: el prorrateo usa el estado actual.)
2. **¿Qué congela exactamente el cierre?** ¿Una copia de productos + capacidades + costos indirectos + recargo + resultados, o solo los datos del mes?
3. **¿Ediciones posteriores al cierre** generan un nuevo borrador de cálculo, un nuevo período, o se aplican al mismo mes abierto?
4. **¿Cierre manual, automático al cambiar de mes, o ambos?**
5. **¿Se permite más de un cierre por mes** (versiones del mismo período)?
6. **¿El equipo está abierto a reintroducir un flujo por pasos** si la Opción B lo justifica, o se prefiere mantener la navegación solo por destinos?
