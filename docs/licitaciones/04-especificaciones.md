# Especificaciones de la licitación de insumos

Documento vivo para ir cerrando lo que las [reglas de negocio](01-reglas-de-negocio.md) y los diagramas ([compra](02-proceso-compra-insumos.md), [registro](03-registro-del-proveedor.md)) dejan abierto o contradicen. Cada punto se discute acá hasta tener una decisión con fecha.

## Cómo se usa

- Cada punto tiene un ID `ES-NN` que no se reutiliza.
- Estados: **Abierta** (sin decisión), **Decidida** (con fecha de decisión), **Descartada** (no aplica, con el porqué).
- Al decidir, se completa **Decisión** y **Fecha**, y el punto pasa a la sección *Decididas*. Si la decisión cambia una regla, se actualiza también la regla en el documento de reglas.
- Si una decisión cambia después, se agrega la fecha nueva y qué cambió. No se borra la anterior.
- Para agregar un punto, usar la plantilla del final.

## Resumen

| ID | Tema | Estado |
| --- | --- | --- |
| ES-01 | Rondas: si existen en la primera versión | Abierta |
| ES-02 | Precio de partida: obligatorio u opcional | Abierta |
| ES-03 | Duración de la licitación y de las rondas | Abierta |
| ES-04 | Aviso cuando nadie oferta | Abierta |
| ES-05 | Cotización por canasta o por ítem | Abierta |
| ES-06 | Qué habilita la negociación | Abierta |
| ES-07 | Qué proveedores "venden ese insumo" | Abierta |
| ES-08 | Proveedor ligado a un emprendedor vs. dashboard unificado | Abierta |
| ES-09 | Enlace de registro: vencimiento y verificación | Abierta |
| ES-10 | Canal de las notificaciones | Abierta |
| ES-11 | Orden de compra y nota de agradecimiento en la primera versión | Abierta |

## Abiertas

### ES-01. Rondas: si existen en la primera versión

- **Estado:** Abierta
- **Fuentes:** RN-09, RN-10, RN-11; diagrama de compra (tarea *Cotiza canasta o ítems*).
- **Contexto:** las reglas definen rondas con % de baja, precio objetivo y proveedores en carrera. El diagrama no muestra rondas: el proveedor cotiza y puede volver a cotizar para bajar su precio dentro de la licitación.
- **Opciones:**
  1. Rondas completas como dicen las reglas: el emprendedor fija el % de baja en cada ronda y elige a quién notificar.
  2. Licitación abierta sin rondas, como el diagrama: una ventana única en la que cada proveedor puede bajar su oferta.
  3. Empezar sin rondas y sumarlas en una versión siguiente.
- **Decisión:** —
- **Fecha:** —

### ES-02. Precio de partida: obligatorio u opcional

- **Estado:** Abierta
- **Fuentes:** RN-02, RN-09, RN-10; diagrama de compra (nota *Techo opcional*).
- **Contexto:** RN-02 lo pone entre los datos que se publican, y RN-09 calcula el primer precio objetivo a partir de él. El diagrama dice que el emprendedor puede no fijarlo y los proveedores igual cotizan.
- **A definir:** si es opcional, cómo se calcula el precio objetivo de la primera ronda y qué límite tiene la primera oferta (RN-10).
- **Decisión:** —
- **Fecha:** —

### ES-03. Duración de la licitación y de las rondas

- **Estado:** Abierta
- **Fuentes:** RN-02, RN-09, RN-12.
- **Contexto:** la ronda dura 6 hs por defecto y es parametrizable. La duración de la licitación la elige el emprendedor al publicar.
- **A definir:** duración mínima y máxima de la licitación; si la duración tiene que ser múltiplo de la ronda; quién parametriza la ronda (cada emprendedor o la aplicación) y entre qué valores.
- **Decisión:** —
- **Fecha:** —

### ES-04. Aviso cuando nadie oferta

- **Estado:** Abierta
- **Fuentes:** diagrama de compra (nota *Temporizador*).
- **Contexto:** el diagrama pide avisar al emprendedor si ningún proveedor oferta después de un tiempo. No hay regla que lo cubra.
- **A definir:** cuánto tiempo pasa antes del aviso; qué opciones tiene el emprendedor después (esperar, cancelar, invitar a otros proveedores).
- **Decisión:** —
- **Fecha:** —

### ES-05. Cotización por canasta o por ítem

- **Estado:** Abierta
- **Fuentes:** RN-02, RN-13, RN-14, CC-02; diagrama de compra (tarea *Cotiza canasta o ítems*).
- **Contexto:** se puede publicar por insumo o por canasta, y el cuadro comparativo es por insumo. Si un proveedor cotiza la canasta completa con un solo precio, no se puede comparar ítem por ítem ni repartir la compra.
- **A definir:** si la oferta de canasta exige precio por ítem; si un proveedor puede cotizar solo algunos ítems de la canasta.
- **Decisión:** —
- **Fecha:** —

### ES-06. Qué habilita la negociación

- **Estado:** Abierta
- **Fuentes:** RN-08, RN-14; diagrama de compra (tarea *Habilita datos del proveedor*).
- **Contexto:** RN-08 dice que el emprendedor ve la identidad de cada proveedor desde el inicio. El diagrama, en cambio, habilita los datos del proveedor recién cuando el emprendedor elige negociar.
- **A definir:** qué ve el emprendedor antes de negociar (nombre, contacto completo) y qué se habilita al negociar, y para quién (para el emprendedor o para el proveedor).
- **Decisión:** —
- **Fecha:** —

### ES-07. Qué proveedores "venden ese insumo"

- **Estado:** Abierta
- **Fuentes:** RN-05; diagrama de registro (tarea *Completa negocio, CUIT, contacto y rubros*; nota *Al publicar*).
- **Contexto:** al publicar se invita a los proveedores que venden ese insumo. El proveedor declara rubros al registrarse, pero los insumos del emprendedor no tienen rubro.
- **A definir:** cómo se vincula un insumo con los proveedores que lo venden (por rubro, eligiéndolos a mano en cada insumo, o invitando a todos y dejando que el emprendedor quite).
- **Decisión:** —
- **Fecha:** —

### ES-08. Proveedor ligado a un emprendedor vs. dashboard unificado

- **Estado:** Abierta
- **Fuentes:** RN-05; diagrama de registro (notas *Queda ligado a un emprendedor* y *Dashboard*).
- **Contexto:** la nota del registro dice que el proveedor queda ligado a un emprendedor y, para trabajar con otro, se registra otra vez. La tarea final habla de un dashboard unificado de emprendedores.
- **A definir:** si un mismo proveedor (mismo CUIT) tiene una cuenta por emprendedor o una sola cuenta que ve las licitaciones de todos los emprendedores con los que se registró.
- **Decisión:** —
- **Fecha:** —

### ES-09. Enlace de registro: vencimiento y verificación

- **Estado:** Abierta
- **Fuentes:** diagrama de registro (subtítulo y nota *Invitación directa*).
- **Contexto:** el enlace es de un solo uso y vence. La invitación directa entra en la misma verificación.
- **A definir:** cuánto dura el enlace; si es uno por proveedor o uno general que el emprendedor difunde; qué se verifica del proveedor (CUIT válido, mail confirmado) antes de crear la cuenta.
- **Decisión:** —
- **Fecha:** —

### ES-10. Canal de las notificaciones

- **Estado:** Abierta
- **Fuentes:** RN-09, RN-11, RN-16; diagrama de registro (tarea *Acepta los términos y, aparte, los avisos*).
- **Contexto:** la aplicación notifica invitaciones, rondas y cierres. RN-16 menciona el mail, y el registro pide aceptar los avisos por separado.
- **A definir:** canales (mail, aviso dentro de la aplicación, otro); qué pasa con un proveedor que no aceptó los avisos.
- **Decisión:** —
- **Fecha:** —

### ES-11. Orden de compra y nota de agradecimiento en la primera versión

- **Estado:** Abierta
- **Fuentes:** RN-15, RN-16.
- **Contexto:** las dos reglas dicen que la aplicación "puede" hacerlo. Ninguno de los dos diagramas incluye la orden de compra ni la nota.
- **A definir:** si entran en la primera versión o quedan para después.
- **Decisión:** —
- **Fecha:** —

## Decididas

Todavía no hay puntos decididos.

## Plantilla

```markdown
### ES-NN. Título que enuncia la pregunta

- **Estado:** Abierta
- **Fuentes:** reglas y diagramas relacionados.
- **Contexto:** qué dicen las fuentes y por qué no alcanza.
- **Opciones / A definir:** alternativas o preguntas concretas.
- **Decisión:** —
- **Fecha:** —
```
