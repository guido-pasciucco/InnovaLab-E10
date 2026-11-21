# Licitación de Insumos por Rondas — Reglas de negocio principales

Funcionalidad complementaria de la Calculadora de Costos. Borrador v1, 15 de noviembre de 2026.

## 1. Objetivo y alcance

Liberar tiempo del emprendedor en la búsqueda de precios de sus principales insumos y simplificar la generación de órdenes de compra por cantidad. El emprendedor publica una compra, los proveedores compiten por rondas sin conocerse entre sí, y el resultado puede alimentar el Maestro de Insumos que usa la Calculadora de Costos.

- **Modelo:** subasta inversa por rondas con ofertas selladas. No es una subasta japonesa pura: en esa, el proveedor solo acepta el precio de cada paso o sale; acá propone su propio precio.
- **Alcance:** la aplicación sistematiza el proceso. No interviene en el pago, la entrega ni el contrato, que se acuerdan entre emprendedor y proveedor.

## 2. Actores y términos

| Término | Significado |
| --- | --- |
| Emprendedor | Único que publica la licitación, conduce las rondas y elige con qué proveedor compra cada insumo. |
| Proveedor | Participa con sus ofertas. No conoce a los demás proveedores ni sus precios. |
| Aplicación | Ejecuta las reglas, notifica, registra y compara. No adjudica ni elige por el emprendedor. |
| Precio de partida | Techo inicial que publica el emprendedor. Ninguna oferta puede superarlo. |
| Ronda | Intervalo (6, 12 o 24 hs; 6 hs por defecto) en el que rige un precio objetivo. *(Modificado el 20 nov 2026, ver [Historial de cambios](#historial-de-cambios).)* |
| Precio objetivo | Referencia de la ronda: precio objetivo anterior × (1 − % de baja). No es obligatorio alcanzarlo. |
| En carrera | Proveedores a los que el emprendedor decide notificar cada ronda. |

## 3. Reglas de negocio principales

### A. Publicación

| ID | Regla |
| --- | --- |
| RN-01 | Solo se licitan insumos del Maestro de Insumos. Las cantidades se sugieren a partir de recetas y producción planificada si existen; si no, se cargan a mano. |
| RN-02 | El emprendedor publica, por insumo (o canasta), la cantidad, las especificaciones, el precio de partida, la duración de cada ronda (6, 12 o 24 hs; 6 hs por defecto) y la cantidad de rondas (de 2 a 5; 4 por defecto). La duración de la licitación es la cantidad de rondas por la duración de cada ronda. El precio de partida es obligatorio: la aplicación sugiere el precio actual del insumo en el Maestro de Insumos y el emprendedor puede dejarlo o cambiarlo. Una canasta agrupa varios insumos en una misma licitación: el precio de partida, el precio objetivo y las ofertas van siempre por insumo. Cada licitación recibe un número correlativo. *(Modificada el 20 y el 21 nov 2026, ver [Historial de cambios](#historial-de-cambios).)* |
| RN-03 | Una vez publicada, la licitación no se modifica: solo puede cancelarse antes del cierre. Un insumo no puede estar en dos licitaciones activas a la vez (para esta versión, el desarrollo solo contempla una licitación activa por vez). |
| RN-04 | Los precios ofertados son precios finales puestos en destino (impuestos y flete incluidos), por unidad de medida. Es la misma base que usa la Calculadora de Costos. |

### B. Participación y confidencialidad

| ID | Regla |
| --- | --- |
| RN-05 | Participan solo proveedores registrados con ese emprendedor. Al publicar, se invita a todos los proveedores registrados que venden ese insumo y antes de publicar, el emprendedor puede quitar de esa lista a quienes no quiere invitar. |
| RN-06 | Los proveedores no se conocen entre sí. Cada uno ve únicamente en su interfaz lo ya definido: términos de la licitación (hora de inicio y fin, insumos, cantidades, precio de partida y precio objetivo vigente) y su propia oferta. No recibe señales de su posición ni de cuántos compiten. |
| RN-07 | Ningún proveedor ve el precio de compra de referencia del emprendedor, su catálogo ni sus recetas. |
| RN-08 | El emprendedor ve la identidad de los proveedores, que los datos del registro hacen posible. El emprendedor ve todas las ofertas con la identidad de cada proveedor desde el inicio. |

### C. Rondas

| ID | Regla |
| --- | --- |
| RN-09 | En cada ronda (6, 12 o 24 hs, según elija el emprendedor al publicar) rige un nuevo precio objetivo. El emprendedor define el % de baja una sola vez, al publicar, y la aplicación avanza las rondas y calcula el nuevo precio objetivo sin que el emprendedor intervenga. El objetivo es una referencia, no una obligación. *(Modificada el 20 nov 2026, ver [Historial de cambios](#historial-de-cambios).)* |
| RN-10 | En cada ronda el proveedor puede mejorar su oferta con un precio menor al suyo anterior (llegue o no al objetivo) o ratificarla. Nunca puede ofertar por encima de su último precio, y la primera oferta no puede superar el precio de partida. Si no responde, se considera que ratifica. |
| RN-11 | El emprendedor decide a qué proveedores se notifica cada ronda. Un proveedor excluido deja de recibir comunicaciones, sin aviso y su última oferta se conserva a título informativo. |
| RN-12 | La licitación cierra sola al vencer la duración. No se aceptan ofertas posteriores. Los horarios los fija el reloj del servidor (hora de Buenos Aires). |
| RN-18 | Si al terminar la primera ronda uno o más insumos no recibieron ninguna oferta, la aplicación avisa al emprendedor una sola vez cuáles son. El emprendedor puede dejarla seguir, que es lo que pasa si no hace nada, o cancelar la licitación entera. No puede sumar proveedores ni quitar insumos: para eso, la cancela y publica una nueva. *(Agregada y modificada el 21 nov 2026, ver [Historial de cambios](#historial-de-cambios).)* |
| RN-20 | En una canasta, el proveedor cotiza cada insumo por separado y puede cotizar solo algunos. RN-10 se aplica insumo por insumo. En el cuadro comparativo, un insumo que el proveedor no cotizó figura sin oferta. *(Agregada el 21 nov 2026, ver [Historial de cambios](#historial-de-cambios).)* |

### D. Cierre y compra

| ID | Regla |
| --- | --- |
| RN-19 | Al cierre, cada insumo sin ninguna oferta queda desierto por separado y el resto de la licitación sigue normal. Si ningún insumo recibió ofertas, la licitación entera queda desierta y no se arma cuadro comparativo. Lo desierto queda guardado en el historial y el emprendedor puede publicar una licitación nueva para esos insumos. *(Agregada y modificada el 21 nov 2026, ver [Historial de cambios](#historial-de-cambios).)* |
| RN-13 | Al cierre, la aplicación arma un cuadro comparativo por insumo con la última oferta de cada proveedor, la diferencia contra el precio de partida y contra el último precio registrado del insumo. |
| RN-14 | El emprendedor decide con qué proveedor contacta para comprar cada insumo. Puede repartir la compra por ítem y negociar. Las ofertas son de referencia (no vinculantes) y no obligan a ninguna de las partes. |
| RN-15 | Con lo acordado, la aplicación puede generar una orden de compra por proveedor, con ítems, cantidades, precio unitario, total, condiciones de entrega y pago, fecha y número correlativo. |
| RN-16 | Si el emprendedor lo ordena, la aplicación envía a los proveedores no elegidos una nota de agradecimiento idéntica para todos, sin revelar precios ni resultados, y les avisa de próxima licitación cuando se publique por medio de mail. Puede existir consentimiento del proveedor y registro de la respuesta. |

### E. Trazabilidad

| ID | Regla |
| --- | --- |
| RN-17 | Se guarda de forma inmodificable todo el proceso (ofertas, rondas, % de baja, decisiones y órdenes de compra, si las hubiera), con fecha y hora. El emprendedor ve el historial completo; cada proveedor, solo el suyo. |

## 4. Conexión con la Calculadora de Costos

El resultado de la licitación es un precio final por unidad de cada insumo. Una vez confirmado por el emprendedor, ese precio puede reemplazar al precio del insumo en el Maestro de Insumos. Como el precio del insumo forma parte de cada receta, alimenta el Costo Variable Unitario y, de ahí, el resto de los indicadores.

### Flujo de la conexión

1. Al cierre, la aplicación presenta el cuadro comparativo (RN-13).
2. El emprendedor elige proveedor por insumo y acuerda las condiciones (RN-14).
3. La aplicación pregunta: "¿Actualizar el costo del insumo?". Por defecto, no.
4. Si responde que sí, la aplicación muestra el impacto y pide una **segunda confirmación**.
5. Recién tras la segunda confirmación se actualiza el precio del insumo, con fecha, origen y valor anterior.
6. La Calculadora de Costos recalcula los indicadores afectados.

### Reglas de la conexión

| ID | Regla |
| --- | --- |
| CC-01 | La actualización del costo es opcional y exige doble confirmación. Con un "no", o sin la segunda confirmación, el catálogo queda igual. |
| CC-02 | El precio que se carga es el precio unitario final acordado, expresado en la unidad de medida del catálogo. Si la compra se reparte entre varios proveedores, se carga el promedio ponderado por las cantidades compradas. |
| CC-03 | Antes de la segunda confirmación se muestra el impacto: precio anterior y nuevo del insumo, y el costo variable de los productos que lo usan. |
| CC-04 | Cada actualización guarda fecha, origen (la licitación, su número y fecha de publicación) y valor anterior en el historial de precios del insumo. |
| CC-05 | La actualización solo cambia costos. No modifica los precios de venta cargados, la estructura, la mezcla ni la producción planificada. |

### Qué indicadores se recalculan

| Indicador de la Calculadora | Efecto |
| --- | --- |
| Costo Variable Unitario | Cambia directamente: es donde entra el nuevo precio del insumo, según la cantidad que lleva cada receta. |
| Contribución de una Unidad | Se recalcula: Precio de Venta − nuevo Costo Variable Unitario. |
| Costo Total Unitario | Se recalcula con el nuevo costo variable. La parte de estructura no cambia. |
| Margen en Pesos, Margen sobre el Precio y % Recargo | Se recalculan a partir del nuevo Costo Total Unitario. |
| Precio Sugerido | Se recalcula con el nuevo Costo Total Unitario. Los precios de venta que cargó el emprendedor no se tocan. |
| Contribución Ponderada, Punto de Equilibrio, Cuota en Unidades y Equilibrio en Pesos | Se recalculan porque cambian las contribuciones de los productos afectados. |
| Estructura, Mezcla y Producción planificada | No cambian. |

**Ejemplo:** si el kilo de harina baja de $1.000 a $900 y cada medialuna lleva 0,10 kg, su Costo Variable Unitario pasa de $200 a $190. Con precio de venta de $450, la contribución sube de $250 a $260; el Costo Total Unitario baja de $300 a $290 y el Margen en Pesos sube de $150 a $160. El Precio Sugerido, con 50% de recargo, pasa de $450 a $435, y el Punto de Equilibrio baja, porque la contribución promedio aumenta.

### Consideraciones

- **Precio por volumen.** Si el precio se consiguió por comprar una cantidad grande, conviene actualizar el costo solo si ese volumen se va a sostener. Si no, el costo cargado quedaría más bajo que el real.
- **Comparabilidad.** Los precios deben ser finales y puestos en destino (RN-04). Si algún proveedor cotiza sin flete o sin impuestos, la comparación y el costo cargado quedan distorsionados.
- **Costo histórico y mermas.** El precio adjudicado se carga como costo histórico, sin ajuste por inflación. La Calculadora sigue calculando con cantidades teóricas de receta, de modo que un insumo más barato no corrige las mermas no cargadas.

## Historial de cambios

Cambios a las reglas que surgen de las decisiones registradas en [Especificaciones](04-especificaciones.md). Se conserva el texto anterior.

### 20 de noviembre de 2026 — RN-09 (ES-01)

Las rondas pasan a ser automáticas: el % de baja se fija una sola vez al publicar.

- **Texto anterior:** "En cada ronda (6 hs por defecto, parametrizable) el emprendedor define el % de baja y la aplicación calcula el nuevo precio objetivo. El objetivo es una referencia, no una obligación."
- **Texto nuevo:** "En cada ronda (6 hs por defecto, parametrizable) rige un nuevo precio objetivo. El emprendedor define el % de baja una sola vez, al publicar, y la aplicación avanza las rondas y calcula el nuevo precio objetivo sin que el emprendedor intervenga. El objetivo es una referencia, no una obligación."

### 20 de noviembre de 2026 — RN-02 (ES-02)

El precio de partida pasa a ser obligatorio explícitamente, con una sugerencia tomada del Maestro de Insumos.

- **Texto anterior:** "El emprendedor publica, por insumo (o canasta), la cantidad, las especificaciones, el precio de partida y la duración de la licitación. Cada licitación recibe un número correlativo."
- **Texto nuevo:** "El emprendedor publica, por insumo (o canasta), la cantidad, las especificaciones, el precio de partida y la duración de la licitación. El precio de partida es obligatorio: la aplicación sugiere el precio actual del insumo en el Maestro de Insumos y el emprendedor puede dejarlo o cambiarlo. Cada licitación recibe un número correlativo."

### 20 de noviembre de 2026 — término *Ronda*, RN-02 y RN-09 (ES-03)

El emprendedor elige la duración de cada ronda y la cantidad de rondas; la duración total sale de ahí.

- **Ronda, texto anterior:** "Intervalo (6 hs por defecto) en el que rige un precio objetivo."
- **Ronda, texto nuevo:** "Intervalo (6, 12 o 24 hs; 6 hs por defecto) en el que rige un precio objetivo."
- **RN-02, texto anterior** (ya con el cambio de ES-02): "El emprendedor publica, por insumo (o canasta), la cantidad, las especificaciones, el precio de partida y la duración de la licitación. El precio de partida es obligatorio: la aplicación sugiere el precio actual del insumo en el Maestro de Insumos y el emprendedor puede dejarlo o cambiarlo. Cada licitación recibe un número correlativo."
- **RN-02, texto nuevo:** "El emprendedor publica, por insumo (o canasta), la cantidad, las especificaciones, el precio de partida, la duración de cada ronda (6, 12 o 24 hs; 6 hs por defecto) y la cantidad de rondas (de 2 a 5; 4 por defecto). La duración de la licitación es la cantidad de rondas por la duración de cada ronda. El precio de partida es obligatorio: la aplicación sugiere el precio actual del insumo en el Maestro de Insumos y el emprendedor puede dejarlo o cambiarlo. Cada licitación recibe un número correlativo."
- **RN-09, texto anterior** (ya con el cambio de ES-01): "En cada ronda (6 hs por defecto, parametrizable) rige un nuevo precio objetivo. […]"
- **RN-09, texto nuevo:** "En cada ronda (6, 12 o 24 hs, según elija el emprendedor al publicar) rige un nuevo precio objetivo. […]"

### 21 de noviembre de 2026 — nuevas RN-18 y RN-19 (ES-04)

Se agregan dos reglas para cuando nadie oferta. No reemplazan texto anterior.

- **RN-18** (en *C. Rondas*): "Si al terminar la primera ronda ningún proveedor ofertó, la aplicación avisa al emprendedor una sola vez. El emprendedor puede dejarla seguir, que es lo que pasa si no hace nada, o cancelarla. No puede sumar proveedores: para invitar a otros, la cancela y publica una nueva."
- **RN-19** (en *D. Cierre y compra*): "Si la licitación cierra sin ninguna oferta, queda desierta: no se arma cuadro comparativo, queda guardada en el historial y el emprendedor puede publicar otra."

### 21 de noviembre de 2026 — RN-02 y nueva RN-20 (ES-05)

La canasta solo agrupa insumos: todo se cotiza por insumo, y un proveedor puede cotizar solo algunos.

- **RN-02:** se agrega la frase "Una canasta agrupa varios insumos en una misma licitación: el precio de partida, el precio objetivo y las ofertas van siempre por insumo." El resto del texto no cambia.
- **RN-20** (nueva, en *C. Rondas*): "En una canasta, el proveedor cotiza cada insumo por separado y puede cotizar solo algunos. RN-10 se aplica insumo por insumo. En el cuadro comparativo, un insumo que el proveedor no cotizó figura sin oferta."

### 21 de noviembre de 2026 — RN-18 y RN-19 por insumo (ES-13)

El aviso y la licitación desierta pasan a aplicarse insumo por insumo.

- **RN-18, texto anterior:** "Si al terminar la primera ronda ningún proveedor ofertó, la aplicación avisa al emprendedor una sola vez. El emprendedor puede dejarla seguir, que es lo que pasa si no hace nada, o cancelarla. No puede sumar proveedores: para invitar a otros, la cancela y publica una nueva."
- **RN-18, texto nuevo:** "Si al terminar la primera ronda uno o más insumos no recibieron ninguna oferta, la aplicación avisa al emprendedor una sola vez cuáles son. El emprendedor puede dejarla seguir, que es lo que pasa si no hace nada, o cancelar la licitación entera. No puede sumar proveedores ni quitar insumos: para eso, la cancela y publica una nueva."
- **RN-19, texto anterior:** "Si la licitación cierra sin ninguna oferta, queda desierta: no se arma cuadro comparativo, queda guardada en el historial y el emprendedor puede publicar otra."
- **RN-19, texto nuevo:** "Al cierre, cada insumo sin ninguna oferta queda desierto por separado y el resto de la licitación sigue normal. Si ningún insumo recibió ofertas, la licitación entera queda desierta y no se arma cuadro comparativo. Lo desierto queda guardado en el historial y el emprendedor puede publicar una licitación nueva para esos insumos."
