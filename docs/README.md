# docs/ — Cómo se escriben las docs

Esta guía es para personas e IA que escriben o editan documentación en `docs/`. Su objetivo es que una regla de negocio se entienda sin abrir el código.

## Regla central

Una doc de negocio se lee sin conocer la implementación. Si una frase solo tiene sentido con el código actual, no va en una doc de negocio.

Prueba rápida: **¿la frase seguiría siendo verdad si el código se reescribiera desde cero?**

- Sí → es una regla de negocio.
- No → es detalle técnico, descripción de PR o seguimiento de tarea.

## Tipos de documento

| Tipo | Carpeta | Contiene | No contiene |
| --- | --- | --- | --- |
| Decisión de negocio | `decisiones/establecidas/negocio/` | la regla, el porqué, ejemplos y fechas de decisión | tickets, PRs, archivos, columnas, estado de implementación |
| Decisión técnica | `decisiones/establecidas/desarrollo/` | la decisión técnica, alternativas y consecuencias | reglas de negocio disfrazadas de detalle técnico |
| Decisión pendiente | `decisiones/pendientes/` | el problema, las opciones y qué falta decidir | una decisión ya tomada |
| Documento de producto | `producto/` | comportamiento, definiciones y ejemplos de uso | seguimiento de tareas |

## Forma de una decisión de negocio

1. Título que enuncia la decisión, no el tema.
2. Estado y fecha o fechas de la decisión.
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

## Fechas

- Se registra la fecha en que se tomó la decisión, no la fecha en que se escribió el archivo.
- Si una regla cambia, se agrega la fecha nueva y qué cambió. No se borra la anterior.
- Si no hay fecha, no es una decisión: es una idea.

## Idioma

Las docs se escriben en español. Los identificadores de código se citan solo en docs técnicas, nunca en una regla de negocio.

## Checklist antes de publicar

- [ ] Cada frase pasa la prueba de la reescritura.
- [ ] La regla está en el primer párrafo.
- [ ] Las fechas son fechas de decisión.
- [ ] No hay tickets, PRs, archivos ni nombres de código.
- [ ] Los ejemplos son del negocio, no del código.
- [ ] La doc dice qué no decide, no solo qué decide.

## Docs existentes

Las docs que ya existen se ajustan cuando se editan. No se reescriben solo para cumplir esta guía: el objetivo es que las próximas nazcan limpias.
