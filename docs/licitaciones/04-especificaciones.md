# Especificaciones de la licitación de insumos

Documento vivo para ir cerrando lo que las [reglas de negocio](01-reglas-de-negocio.md) y los diagramas ([compra](02-proceso-compra-insumos.md), [registro](03-registro-del-proveedor.md)) dejan abierto o contradicen. Cada punto se discute acá hasta tener una decisión con fecha.

## Cómo se usa

- Cada punto tiene un ID `ES-NN` que no se reutiliza.
- Estados: **Abierta** (sin decisión), **Decidida** (con fecha de decisión), **Descartada** (no aplica, con el porqué).
- Cada punto cita textual lo que dicen las reglas de negocio sobre ese tema, para discutir sin tener que abrir el otro documento.
- Al decidir, se completa **Decisión** y **Fecha**, y el punto pasa a la sección *Decididas*. Si la decisión cambia una regla, se actualiza también la regla en el documento de reglas.
- Si una decisión cambia después, se agrega la fecha nueva y qué cambió. No se borra la anterior.
- Para agregar un punto, usar la plantilla del final.

## Resumen

| ID | Tema | Estado |
| --- | --- | --- |
| ES-01 | Rondas: si existen en la primera versión | Decidida (20 nov 2026) |
| ES-02 | Precio de partida: obligatorio u opcional | Decidida (20 nov 2026) |
| ES-03 | Duración de la licitación y de las rondas | Abierta |
| ES-04 | Aviso cuando nadie oferta | Abierta |
| ES-05 | Cotización por canasta o por ítem | Abierta |
| ES-06 | Qué habilita la negociación | Abierta |
| ES-07 | Qué proveedores "venden ese insumo" | Abierta |
| ES-08 | Proveedor ligado a un emprendedor vs. dashboard unificado | Abierta |
| ES-09 | Enlace de registro: vencimiento y verificación | Abierta |
| ES-10 | Canal de las notificaciones | Abierta |
| ES-11 | Orden de compra y nota de agradecimiento en la primera versión | Abierta |
| ES-12 | Proveedores en carrera con rondas automáticas | Abierta |

## Abiertas

### ES-03. Duración de la licitación y de las rondas

- **Estado:** Abierta
- **Fuentes:** RN-02, RN-09, RN-12.
- **Qué dicen las reglas de negocio:**
  - **Ronda:** "Intervalo (6 hs por defecto) en el que rige un precio objetivo."
  - **RN-02:** "El emprendedor publica, por insumo (o canasta), la cantidad, las especificaciones, el precio de partida y la duración de la licitación. […]"
  - **RN-09:** "En cada ronda (6 hs por defecto, parametrizable) […]"
  - **RN-12:** "La licitación cierra sola al vencer la duración. No se aceptan ofertas posteriores. Los horarios los fija el reloj del servidor (hora de Buenos Aires)."
- **Contexto:** la ronda dura 6 hs por defecto y es parametrizable. La duración de la licitación la elige el emprendedor al publicar.
- **A definir:** duración mínima y máxima de la licitación; si la duración tiene que ser múltiplo de la ronda; quién parametriza la ronda (cada emprendedor o la aplicación) y entre qué valores.
- **Decisión:** —
- **Fecha:** —

### ES-04. Aviso cuando nadie oferta

- **Estado:** Abierta
- **Fuentes:** diagrama de compra (nota *Temporizador*).
- **Qué dicen las reglas de negocio:** no hay regla sobre este tema. Lo más cercano:
  - **RN-10:** "[…] Si no responde, se considera que ratifica." (aplica a un proveedor que ya ofertó, no a uno que nunca ofertó).
  - **RN-12:** "La licitación cierra sola al vencer la duración. […]"
- **Contexto:** el diagrama pide avisar al emprendedor si ningún proveedor oferta después de un tiempo.
- **A definir:** cuánto tiempo pasa antes del aviso; qué opciones tiene el emprendedor después (esperar, cancelar, invitar a otros proveedores).
- **Decisión:** —
- **Fecha:** —

### ES-05. Cotización por canasta o por ítem

- **Estado:** Abierta
- **Fuentes:** RN-02, RN-13, RN-14, CC-02; diagrama de compra (tarea *Cotiza canasta o ítems*).
- **Qué dicen las reglas de negocio:**
  - **RN-02:** "El emprendedor publica, por insumo (o canasta), la cantidad, las especificaciones, el precio de partida y la duración de la licitación. […]"
  - **RN-13:** "Al cierre, la aplicación arma un cuadro comparativo por insumo con la última oferta de cada proveedor, la diferencia contra el precio de partida y contra el último precio registrado del insumo."
  - **RN-14:** "El emprendedor decide con qué proveedor contacta para comprar cada insumo. Puede repartir la compra por ítem y negociar. […]"
  - **CC-02:** "El precio que se carga es el precio unitario final acordado, expresado en la unidad de medida del catálogo. Si la compra se reparte entre varios proveedores, se carga el promedio ponderado por las cantidades compradas."
- **Contexto:** se puede publicar por insumo o por canasta, y el cuadro comparativo es por insumo. Si un proveedor cotiza la canasta completa con un solo precio, no se puede comparar ítem por ítem ni repartir la compra.
- **A definir:** si la oferta de canasta exige precio por ítem; si un proveedor puede cotizar solo algunos ítems de la canasta.
- **Decisión:** —
- **Fecha:** —

### ES-06. Qué habilita la negociación

- **Estado:** Abierta
- **Fuentes:** RN-08, RN-14; diagrama de compra (tarea *Habilita datos del proveedor*).
- **Qué dicen las reglas de negocio:**
  - **RN-08:** "El emprendedor ve la identidad de los proveedores, que los datos del registro hacen posible. El emprendedor ve todas las ofertas con la identidad de cada proveedor desde el inicio."
  - **RN-14:** "El emprendedor decide con qué proveedor contacta para comprar cada insumo. Puede repartir la compra por ítem y negociar. Las ofertas son de referencia (no vinculantes) y no obligan a ninguna de las partes."
- **Contexto:** RN-08 dice que el emprendedor ve la identidad de cada proveedor desde el inicio. El diagrama, en cambio, habilita los datos del proveedor recién cuando el emprendedor elige negociar.
- **A definir:** qué ve el emprendedor antes de negociar (nombre, contacto completo) y qué se habilita al negociar, y para quién (para el emprendedor o para el proveedor).
- **Decisión:** —
- **Fecha:** —

### ES-07. Qué proveedores "venden ese insumo"

- **Estado:** Abierta
- **Fuentes:** RN-05; diagrama de registro (tarea *Completa negocio, CUIT, contacto y rubros*; nota *Al publicar*).
- **Qué dicen las reglas de negocio:**
  - **RN-01:** "Solo se licitan insumos del Maestro de Insumos. […]"
  - **RN-05:** "Participan solo proveedores registrados con ese emprendedor. Al publicar, se invita a todos los proveedores registrados que venden ese insumo y antes de publicar, el emprendedor puede quitar de esa lista a quienes no quiere invitar."
- **Contexto:** al publicar se invita a los proveedores que venden ese insumo. El proveedor declara rubros al registrarse, pero los insumos del emprendedor no tienen rubro. Las reglas no dicen cómo se sabe qué vende cada proveedor.
- **A definir:** cómo se vincula un insumo con los proveedores que lo venden (por rubro, eligiéndolos a mano en cada insumo, o invitando a todos y dejando que el emprendedor quite).
- **Decisión:** —
- **Fecha:** —

### ES-08. Proveedor ligado a un emprendedor vs. dashboard unificado

- **Estado:** Abierta
- **Fuentes:** RN-05; diagrama de registro (notas *Queda ligado a un emprendedor* y *Dashboard*).
- **Qué dicen las reglas de negocio:**
  - **RN-05:** "Participan solo proveedores registrados con ese emprendedor. […]"
  - **RN-07:** "Ningún proveedor ve el precio de compra de referencia del emprendedor, su catálogo ni sus recetas."
  - Las reglas no dicen si un proveedor puede estar registrado con más de un emprendedor.
- **Contexto:** la nota del registro dice que el proveedor queda ligado a un emprendedor y, para trabajar con otro, se registra otra vez. La tarea final habla de un dashboard unificado de emprendedores.
- **A definir:** si un mismo proveedor (mismo CUIT) tiene una cuenta por emprendedor o una sola cuenta que ve las licitaciones de todos los emprendedores con los que se registró.
- **Decisión:** —
- **Fecha:** —

### ES-09. Enlace de registro: vencimiento y verificación

- **Estado:** Abierta
- **Fuentes:** diagrama de registro (subtítulo y nota *Invitación directa*).
- **Qué dicen las reglas de negocio:** no hay regla sobre el enlace ni sobre la verificación. Lo más cercano:
  - **RN-05:** "Participan solo proveedores registrados con ese emprendedor. […]"
  - **RN-08:** "El emprendedor ve la identidad de los proveedores, que los datos del registro hacen posible. […]"
- **Contexto:** el diagrama dice que el enlace es de un solo uso y vence, y que la invitación directa entra en la misma verificación.
- **A definir:** cuánto dura el enlace; si es uno por proveedor o uno general que el emprendedor difunde; qué se verifica del proveedor (CUIT válido, mail confirmado) antes de crear la cuenta.
- **Decisión:** —
- **Fecha:** —

### ES-10. Canal de las notificaciones

- **Estado:** Abierta
- **Fuentes:** RN-11, RN-16; diagrama de registro (tarea *Acepta los términos y, aparte, los avisos*).
- **Qué dicen las reglas de negocio:**
  - **Aplicación:** "Ejecuta las reglas, notifica, registra y compara. No adjudica ni elige por el emprendedor."
  - **En carrera:** "Proveedores a los que el emprendedor decide notificar cada ronda."
  - **RN-11:** "El emprendedor decide a qué proveedores se notifica cada ronda. Un proveedor excluido deja de recibir comunicaciones, sin aviso y su última oferta se conserva a título informativo."
  - **RN-16:** "[…] les avisa de próxima licitación cuando se publique por medio de mail. Puede existir consentimiento del proveedor y registro de la respuesta."
- **Contexto:** la aplicación notifica invitaciones, rondas y cierres. Solo RN-16 nombra un canal (el mail), y el registro pide aceptar los avisos por separado.
- **A definir:** canales (mail, aviso dentro de la aplicación, otro); qué pasa con un proveedor que no aceptó los avisos.
- **Decisión:** —
- **Fecha:** —

### ES-11. Orden de compra y nota de agradecimiento en la primera versión

- **Estado:** Abierta
- **Fuentes:** RN-15, RN-16.
- **Qué dicen las reglas de negocio:**
  - **RN-15:** "Con lo acordado, la aplicación puede generar una orden de compra por proveedor, con ítems, cantidades, precio unitario, total, condiciones de entrega y pago, fecha y número correlativo."
  - **RN-16:** "Si el emprendedor lo ordena, la aplicación envía a los proveedores no elegidos una nota de agradecimiento idéntica para todos, sin revelar precios ni resultados, y les avisa de próxima licitación cuando se publique por medio de mail. Puede existir consentimiento del proveedor y registro de la respuesta."
  - **RN-17:** "Se guarda de forma inmodificable todo el proceso (ofertas, rondas, % de baja, decisiones y órdenes de compra, si las hubiera), con fecha y hora. […]"
- **Contexto:** las dos reglas dicen que la aplicación "puede" hacerlo, y RN-17 habla de órdenes de compra "si las hubiera". Ninguno de los dos diagramas incluye la orden de compra ni la nota.
- **A definir:** si entran en la primera versión o quedan para después.
- **Decisión:** —
- **Fecha:** —

### ES-12. Proveedores en carrera con rondas automáticas

- **Estado:** Abierta
- **Fuentes:** RN-11; surge de la decisión de ES-01.
- **Qué dicen las reglas de negocio:**
  - **En carrera:** "Proveedores a los que el emprendedor decide notificar cada ronda."
  - **RN-11:** "El emprendedor decide a qué proveedores se notifica cada ronda. Un proveedor excluido deja de recibir comunicaciones, sin aviso y su última oferta se conserva a título informativo."
- **Contexto:** con rondas automáticas (ES-01) el emprendedor ya no tiene que intervenir en cada ronda. RN-11 supone que en cada ronda elige a quién notificar.
- **A definir:** si por defecto todos los proveedores siguen en carrera ronda tras ronda; si el emprendedor puede excluir a un proveedor en cualquier momento o solo entre rondas.
- **Decisión:** —
- **Fecha:** —

## Decididas

### ES-01. Rondas: si existen en la primera versión

- **Estado:** Decidida
- **Fuentes:** RN-09, RN-10, RN-11; diagrama de compra (tarea *Cotiza canasta o ítems*).
- **Qué dicen las reglas de negocio** (antes de la decisión):
  - **Ronda:** "Intervalo (6 hs por defecto) en el que rige un precio objetivo."
  - **Precio objetivo:** "Referencia de la ronda: precio objetivo anterior × (1 − % de baja). No es obligatorio alcanzarlo."
  - **En carrera:** "Proveedores a los que el emprendedor decide notificar cada ronda."
  - **RN-09:** "En cada ronda (6 hs por defecto, parametrizable) el emprendedor define el % de baja y la aplicación calcula el nuevo precio objetivo. El objetivo es una referencia, no una obligación."
  - **RN-10:** "En cada ronda el proveedor puede mejorar su oferta con un precio menor al suyo anterior (llegue o no al objetivo) o ratificarla. Nunca puede ofertar por encima de su último precio, y la primera oferta no puede superar el precio de partida. Si no responde, se considera que ratifica."
  - **RN-11:** "El emprendedor decide a qué proveedores se notifica cada ronda. Un proveedor excluido deja de recibir comunicaciones, sin aviso y su última oferta se conserva a título informativo."
- **Contexto:** las reglas definen rondas con % de baja, precio objetivo y proveedores en carrera. El diagrama no muestra rondas: el proveedor cotiza y puede volver a cotizar para bajar su precio dentro de la licitación.
- **Opciones consideradas:**
  1. Rondas completas como dicen las reglas: el emprendedor fija el % de baja en cada ronda y elige a quién notificar.
  2. Licitación abierta sin rondas, como el diagrama: una ventana única en la que cada proveedor puede bajar su oferta.
  3. Empezar sin rondas y sumarlas en una versión siguiente.
  4. Rondas automáticas: el emprendedor fija el % de baja una sola vez al publicar y la aplicación avanza las rondas sola.
- **Decisión:** opción 4, rondas automáticas. La primera versión tiene rondas. El emprendedor fija el % de baja una sola vez, al publicar, y la aplicación avanza las rondas y calcula el precio objetivo de cada una sin que el emprendedor intervenga. El precio objetivo sigue siendo una referencia, no una obligación.
- **Por qué:** sin rondas, el proveedor no ve su posición (RN-06) y no tiene motivo para bajar su oferta. Con rondas manuales, el emprendedor tendría que entrar cada 6 hs. Las rondas automáticas mantienen la presión sobre el precio sin exigirle eso.
- **Ejemplo:** precio de partida $1.000 el kilo y 10% de baja. El precio objetivo pasa de $1.000 a $900 en la segunda ronda y a $810 en la tercera, sin que el emprendedor haga nada.
- **Qué no decide:** la duración de las rondas y de la licitación (ES-03); qué pasa si no hay precio de partida (ES-02); si el emprendedor puede excluir proveedores entre rondas (ES-12); si el % de baja puede cambiarse después de publicar.
- **Reglas que cambia:** RN-09.
- **Fecha:** 20 de noviembre de 2026.

### ES-02. Precio de partida: obligatorio u opcional

- **Estado:** Decidida
- **Fuentes:** RN-01, RN-02, RN-07, RN-09, RN-10, RN-13; diagrama de compra (nota *Techo opcional*).
- **Qué dicen las reglas de negocio** (antes de la decisión):
  - **Precio de partida:** "Techo inicial que publica el emprendedor. Ninguna oferta puede superarlo."
  - **RN-01:** "Solo se licitan insumos del Maestro de Insumos. […]"
  - **RN-02:** "El emprendedor publica, por insumo (o canasta), la cantidad, las especificaciones, el precio de partida y la duración de la licitación. Cada licitación recibe un número correlativo."
  - **RN-07:** "Ningún proveedor ve el precio de compra de referencia del emprendedor, su catálogo ni sus recetas."
  - **RN-09:** "En cada ronda (6 hs por defecto, parametrizable) el emprendedor define el % de baja y la aplicación calcula el nuevo precio objetivo. El objetivo es una referencia, no una obligación."
  - **RN-10:** "[…] la primera oferta no puede superar el precio de partida. […]"
  - **RN-13:** "Al cierre, la aplicación arma un cuadro comparativo por insumo con la última oferta de cada proveedor, la diferencia contra el precio de partida y contra el último precio registrado del insumo."
- **Contexto:** RN-02 lo pone entre los datos que se publican, y las rondas automáticas (ES-01) calculan el primer precio objetivo a partir de él. El diagrama dice que el emprendedor puede no fijarlo y los proveedores igual cotizan.
- **Opciones consideradas:**
  1. Obligatorio, como dicen las reglas.
  2. Opcional, como dice el diagrama. Si las rondas arrancan de la mejor oferta, el precio objetivo revela esa oferta a todos y rompe RN-06; evitarlo exige un objetivo distinto por proveedor.
  3. Obligatorio, con sugerencia: la aplicación propone el precio actual del insumo en el Maestro de Insumos y el emprendedor lo deja o lo cambia.
- **Decisión:** opción 3. El precio de partida es obligatorio. Al publicar, la aplicación sugiere el precio actual del insumo en el Maestro de Insumos, y el emprendedor puede dejarlo o cambiarlo.
- **Por qué:** las rondas automáticas necesitan un punto de partida. Como todo insumo licitado está en el Maestro de Insumos (RN-01), siempre hay un precio para sugerir y el emprendedor nunca tiene que inventar uno. La confidencialidad entre proveedores no se toca.
- **Ejemplo:** la harina figura en el catálogo a $1.000 el kilo. Al publicar, el precio de partida aparece en $1.000. El emprendedor lo baja a $950 porque sabe que hay mejores precios, y las rondas arrancan de $950.
- **Qué no decide:**
  - Cómo se sugiere el precio de partida de una canasta (ES-05).
  - Si la pantalla avisa que el precio de partida lo van a ver los proveedores. Se recomendó, porque si el emprendedor deja la sugerencia, los proveedores ven cuánto paga hoy, que es lo que RN-07 protege. No está decidido.
- **Reglas que cambia:** RN-02.
- **Fecha:** 20 de noviembre de 2026.

## Plantilla

```markdown
### ES-NN. Título que enuncia la pregunta

- **Estado:** Abierta
- **Fuentes:** reglas y diagramas relacionados.
- **Qué dicen las reglas de negocio:**
  - **RN-NN:** "cita textual de la regla". Si no hay regla, decirlo.
- **Contexto:** qué dicen las otras fuentes y por qué no alcanza.
- **Opciones / A definir:** alternativas o preguntas concretas.
- **Decisión:** —
- **Fecha:** —
```
