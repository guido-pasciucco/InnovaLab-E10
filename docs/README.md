# docs/ — Documentación del producto

La documentación se organiza por **flujo**, no por proyecto ni por fecha. Cada flujo es un solo archivo que concentra el recorrido del usuario, las reglas vigentes y las decisiones que lo gobiernan. Si una regla cambió, se actualiza el flujo y se registra la fecha; no se crea un documento nuevo.

## Regla central

Una doc de negocio se lee sin conocer la implementación. Si una frase solo tiene sentido con el código actual, no va en una doc de negocio.

Prueba rápida: **¿la frase seguiría siendo verdad si el código se reescribiera desde cero?**

- Sí → es una regla de negocio.
- No → es detalle técnico, descripción de PR o seguimiento de tarea.

## Estructura

| Carpeta / archivo | Contenido | No contiene |
| --- | --- | --- |
| [`flujos/`](flujos/) | Un archivo por flujo: recorrido, reglas y decisiones vigentes | Seguimiento de tareas |
| [`decisiones-pendientes.md`](decisiones-pendientes.md) | Recolector único de todo lo que falta decidir | Decisiones ya tomadas |
| [`producto/`](producto/) | Glosario de nombres y conceptos usados en el código, el esquema y las issues | Reglas de negocio: están en los flujos |
| [`decisiones.md`](decisiones.md) | Decisiones de negocio y técnica, resumidas y con fecha | Reglas que ya viven en un flujo |
| [`dependencias/`](dependencias/) | Guías de dependencias, precisión del motor y material de apoyo | Reglas de negocio |
| [`duda/`](duda/) | Material a evaluar: capturas de QA y diagramas | Decisión de borrado ya tomada |
| [`bugs/ui-guidelines.md`](bugs/ui-guidelines.md) | Hallazgos técnicos de UI pendientes de valoración | Reglas de negocio |
| [`refactor/`](refactor/) | Hallazgos de validación y decisiones de refactor por flujo | Reglas vigentes, que están en los flujos |

## Flujos

| Flujo | Qué cubre |
| --- | --- |
| [01 · Navegación](flujos/01-navegacion.md) | Menú persistente, página inicial y dependencias entre secciones |
| [02 · Login y acceso](flujos/02-login-y-acceso.md) | Autenticación, sesión, owner-scoping y persistencia |
| [03 · Insumos](flujos/03-insumos.md) | Catálogo compartido de insumos y packaging, unidades de medida |
| [04 · Productos](flujos/04-productos.md) | Recetas, rendimiento, CVU, capacidad y presentaciones |
| [05 · Cálculo de costos](flujos/05-calculo-de-costos.md) | Indirectos, reparto, precio, margen, equilibrio, tablero e histórico |
| [06 · Chat con datos](flujos/06-chat-con-datos.md) | Búsqueda sobre la documentación del producto |
| [07 · Demo](flujos/07-demo.md) | Guía para presentar el producto |
| [08 · Despliegue](flujos/08-despliegue.md) | Configuración y deploy en Vercel |
| [09 · Licitaciones](flujos/09-licitaciones.md) | Flujo completo de licitaciones: proveedores, invitaciones, ofertas y órdenes |
| [09 · Licitaciones · pendientes](flujos/09-licitaciones-pendientes.md) | Dudas y puntos abiertos del flujo de licitaciones |

## Forma de una decisión de negocio

1. Título que enuncia la decisión, no el tema.
2. Estado y fecha o fechas de decisión.
3. La regla en una frase, al principio.
4. El porqué, con ejemplos concretos del negocio.
5. Los límites: qué no decide.
6. Si la regla cambió, la fecha nueva y qué cambió. No se reescribe la historia.

## Lo que no va en una doc de negocio

- Números de ticket, issue o PR.
- Links a PRs, ramas o archivos de código.
- Nombres de columnas, tablas, funciones o tipos.
- "Pendiente de implementación", "lo implementa #X", "falta la migración".
- Fechas de edición que no sean fechas de decisión.
- Estado del código.

Ese detalle va en el issue, en la descripción del PR o en una doc técnica. La doc de negocio registra la regla, no cómo se construyó.

## Fechas e idioma

- Se registra la fecha en que se tomó la decisión, no la fecha en que se escribió el archivo.
- Si una regla cambia, se agrega la fecha nueva y qué cambió. No se borra la anterior.
- Si no hay fecha, no es una decisión: es una idea.
- Las docs se escriben en español. Los identificadores de código se citan solo en docs técnicas, nunca en una regla de negocio.

## Checklist antes de publicar

- [ ] Cada frase pasa la prueba de la reescritura.
- [ ] La regla está en el primer párrafo.
- [ ] Las fechas son fechas de decisión.
- [ ] No hay tickets, PRs, archivos ni nombres de código.
- [ ] Los ejemplos son del negocio, no del código.
- [ ] La doc dice qué no decide, no solo qué decide.
