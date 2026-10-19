# Motor de cálculo de costos — reglas funcionales del MVP

## 1. Alcance

En una primera etapa el motor debe permitir cargar insumos y costos fijos de estructura, definir recetas, calcular el costo de una unidad vendible (incluye costos directos y reparto/asignación de indirectos), incluir el trabajo propio y contratado.

En una segunda etapa debe ayudar a calcular el punto de equilibrio y como llegar a él.

## 2. Flujo completo del motor

Para cada producto terminado, se deberìa seguir este orden:

1. Definir el costo de cada insumo comprado para la cantidad que utilice la receta de cada producto (gramo, o miligramo o unidad).
2. Multiplicar ese valor por la cantidad que utiliza la receta.
3. Sumar la mano de obra y demás costos indirectos mensuales que formen parte del costo de ese producto (relacionar con lote).
4. Hecho esto, se obtiene el costo para cada unidad de lo fabricado.

**Una vez logrado esto, el motor debe poder abordar una segunda etapa, final:**

5. Conocer el Punto de Equilibrio.
6. Aplicar un margen deseado para sugerir un precio de venta.
7. Determinar qué cantidad de cada producto debe ser vendida para llegar a ese Punto de equilibrio.

## 3. Clasificación de los costos

Cada costo responde dos preguntas diferentes. Una no reemplaza a la otra.

### 3.1 Según su comportamiento (volumen de producción)

- **Fijo:** no cambia directamente por fabricar una unidad más dentro del nivel normal de actividad. Ejemplos: alquiler, abono mensual de internet o el sueldo de un supervisor.
- **Variable:** aumenta o disminuye con la producción o la venta. Ejemplos: harina u otra materia prima, envases o comisión por venta.

### 3.2 Según su relación con el producto (Puedo identificar y medir este costo fácilmente en una sola unidad de producto?)

- **Directo:** se puede medir cuánto utiliza un producto o receta y se lo asigna de forma clara, exacta y económicamente viable al producto. Ejemplos: gramos de harina, sueldo del cocinero que armó la torta o una etiqueta por envase.
- **Indirecto:** beneficia a varios productos y no resulta tan práctico o sencillo medir cuánto corresponde a cada uno. Ejemplos: alquiler general, administración o internet.

| Ejemplo | Comportamiento | Relación |
| --- | --- | --- |
| Harina del pan | Variable | Directo |
| Alquiler del taller | Fijo | Indirecto |
| Abono exclusivo de una máquina para un producto | Fijo | Directo |
| Comisión general por ventas | Variable | Indirecto |

### Por qué debemos poder identificar los costos asociados a una clasificación?

Porque esta clasificación responde a una pregunta diferente y sirve para tomar decisiones diferentes / críticas.

#### Resumen de diferencias

| Clasificación | Pregunta que responde | Utilidad principal |
| --- | --- | --- |
| Fijo vs. Variable | ¿El costo cambia si produzco más? | Evaluar el riesgo del negocio y calcular el punto de equilibrio. |
| Directo e Indirecto | ¿Puedo rastrear este costo directamente al producto? | Calcular el costo exacto por unidad y fijar precios. |

En conclusión: **Ambas son necesarias simultáneamente.** Un mismo costo puede ser fijo e indirecto a la vez (como el alquiler de la fábrica), pero lo analizas bajo una lupa distinta según la decisión que vayas a tomar.

### MODELO DE COSTO: COSTEO POR ABSORCION

Para una panadería artesanal como la que estamos usando debemos decidir un método de ASIGNACIÓN de los costos indirectos que todo producto conlleva.

El Costeo por Absorción es un método de contabilidad de costos que establece que el costo final de un producto debe incluir absolutamente todos los costos de fabricación, tanto los directos como los indirectos.

Bajo este sistema, la unidad de costeo (por ejemplo, un kilo de pan o una torta) "absorbe" cuatro componentes esenciales:

- **Materiales directos:** Los ingredientes principales (harina, azúcar, manteca).
- **Mano de obra directa:** El tiempo de trabajo del panadero dedicado a esa receta.
- **Costos indirectos variables:** Gastos de fábrica que cambian según la producción (como el gas del horno o la electricidad de las batidoras).
- **Costos indirectos fijos:** Gastos de estructura que se mantienen constantes sin importar cuánto se produzca (como el alquiler del local, los seguros o los sueldos fijos del personal).

En términos sencillos, su filosofía dicta que un producto no está terminado ni listo para la venta si no ha pagado la parte proporcional de la infraestructura y los gastos generales que hicieron posible su fabricación. Es el método estándar exigido por normas contables y a veces, por las fiscales para la presentación de informes ante la autoridad de fiscalización.

Significa que el precio de venta de una torta o de un kilo de pan no solo debe pagar la harina y el azúcar. También tiene que "absorber" una parte del alquiler, la luz, el gas y los sueldos. Si no lo hacemos así, estaríamos perdiendo plata sin darnos cuenta.

#### ¿Cómo hacemos para repartir esos gastos? (El método): Cost Driver / generador de costos

<https://www.youtube.com/watch?v=aXN7P9Ndg3I>

Un Cost Driver NO es un costo. Es la variable que utilizas para repartir (asignar) un costo.

Y el método de asignación de costos indirectos, debería ser diferente para cada tipo de negocio, producto, fábrica o establecimiento, ya que los procesos productivos no son los mismos para diferentes establecimientos.

Esto es el corazón de la contabilidad de costos: **no existe un método de asignación universal**. Los costos indirectos (CIF) se deben repartir siguiendo la lógica operativa y la realidad de cada proceso productivo.

| Tipo de Fábrica o Proceso | ¿Cómo es su producción? | El mejor criterio de asignación (Base de reparto) | ¿Por qué? |
| --- | --- | --- | --- |
| **Fábrica Automatizada** *(Ej: Embotelladora, textiles con maquinaria pesada)* | El proceso depende casi por completo de máquinas. Hay pocos operarios. | **Horas-Máquina** | La maquinaria consume la mayor parte de la energía, el mantenimiento y la depreciación del lugar. A más horas de máquina, más costo indirecto se genera. |
| **Taller Artesanal** *(Ej: Carpintería fina, alta costura, joyería)* | El valor y el tiempo dependen del esfuerzo y la habilidad del artesano. | **Horas de Mano de Obra Directa** | Los costos indirectos (luz, herramientas generales, supervisión) se consumen proporcionalmente al tiempo que el trabajador pasa interactuando con el producto. |
| **Producción Masiva Homogénea** *(Ej: Fábrica que solo hace un tipo de ladrillo)* | Se produce un único producto, siempre igual y en grandes cantidades. | **Unidades Producidas** | Como todos los productos son idénticos y pasan exactamente por el mismo proceso, la forma más justa y rápida es dividir los costos indirectos en partes iguales entre cada unidad. |
| **Fábrica Multiproducto Compleja** *(Ej: Una imprenta que hace folletos, libros y cajas)* | Los productos son muy diferentes entre sí. Unos requieren diseño, otros corte, otros ensamblado. | **Costeo Basado en Actividades (ABC)** | Un prorrateo simple fallaría. Aquí se asignan los costos según las actividades que cada producto "usa" (horas de diseño, número de arranques de máquina, etc.). |
| **Panadería Artesanal** *(Ej: Negocio que fabrica pan, facturas, galletas y pasteles)* | Mezcla de productos rápidos con otros muy elaborados. Todos comparten el mismo horno, alquiler y servicios del local. | **Horas de Mano de Obra Directa** (Tiempo de preparación) | Si repartes por unidad, un pancito cargaría con el mismo costo indirecto que un pastel de bodas. Al usar las horas de trabajo del panadero, el pastel absorbe más costos (alquiler, gas, luz) porque requiere más tiempo dentro de la estructura operativa. |

Si intentas aplicar el mismo criterio de reparto a negocios diferentes, vas a terminar con un **costo unitario falso**, lo que te llevará a fijar precios incorrectos o a creer que un producto es rentable cuando en realidad te está haciendo perder dinero.

Forzar un criterio arbitrario o estandarizado a procesos productivos diferentes genera lo que en gestión o contabilidad se conoce como **subsidio cruzado de costos**: unos productos terminan absorbiendo erróneamente los costos de otros.

La regla de oro para elegir cómo repartir los costos indirectos es buscar la **relación de causa y efecto**.

La **relación de causa y efecto** y la elección del **generador o inductor de costo (*cost driver*)** representan el principio rector para diseñar un sistema de asignación de costos preciso y conceptualmente sólido.

#### ¿Qué es la relación de Causa y Efecto en costos?

Es el principio que establece que un costo indirecto solo debe asignarse a un producto o actividad si existe una razón física o lógica de origen por la cual ese producto provoca que el costo aumente o se consuma. No debe asignarse de manera arbitraria, sino que debe imputarse al producto o servicio que realmente provocó u originó ese gasto.

Bajo este principio, si un producto consume un recurso, debe absorber el costo de ese recurso en la misma proporción en que lo gastó.

**Efecto:** El costo indirecto en el que incurre el negocio (por ejemplo, la factura de electricidad del horno o el desgaste de la maquinaria).

**Causa:** La acción, evento o recurso demandado por el producto que hace que ese costo ocurra (por ejemplo, el tiempo que el pan pasa dentro del horno o la cantidad de amasados realizados).

Si no existe una relación causal clara entre el producto y el costo indirecto, cualquier reparto que se haga será una arbitrariedad.

#### ¿Qué es un Cost Driver (Inductor de Costo)?

El cost driver es la medida cuantitativa que actúa como nexo o puente entre la causa y el efecto. Es aquello que mejor describe el nivel de actividad que consume un recurso.

Otra manera de definirlo: Cost Driver (Inductor de Costos): Es el criterio utilizado para distribuir un costo indirecto entre los diferentes productos o procesos del negocio. Representa la variable que mejor explica el consumo de dicho costo, como unidades producidas, horas de uso de equipos, superficie ocupada o cualquier otro factor relevante.

Se divide en dos tipos principales:

1. **Inductores de Recursos (*Resource Drivers*):** Miden el consumo de recursos por parte de las actividades (ej. metros cuadrados para repartir el costo del alquiler entre sectores).
2. **Inductores de Actividades (*Activity Drivers*):** Miden el consumo de actividades por parte de los productos (ej. número de horneados, horas de fermentación o cantidad de lotes producidos para asignar costos a cada tipo de pan).

#### ¿Cómo se relacionan ambos conceptos?

La relación es de identificación y selección: la relación de causa y efecto es el *criterio lógico*, mientras que el *cost driver* es la *unidad de medida* elegida para operacionalizar esa lógica.

#### Una frase para recordar

**El criterio responde a "cómo voy a repartir el costo".**

**El Cost Driver responde a "qué variable voy a medir para hacerlo"**

Por ejemplo:

| Concepto | Ejemplo |
| --- | --- |
| Criterio | Repartir la luz según uso del horno |
| Cost Driver | Horas de horno |
| Valor del Driver | 40 h, 25 h, 15 h |

Para el usuario emprendedor, probablemente nunca haga falta mostrarle la expresión **"Cost Driver"**.

La pantalla podría decir algo más amigable:

> **¿Cómo desea distribuir este gasto?**
>
> - Por unidades producidas
> - Por kilos producidos
> - Por horas de horno
> - Por porcentaje manual

#### El proceso de vinculación

1. **Analizar el costo indirecto (Efecto):** Se observa la bolsa de costos indirectos a distribuir (ej. gasto de gas en el proceso de cocción).
2. **Buscar la causa raíz (Causa):** ¿Qué hace que consumamos más o menos gas? El calor demandado y el tiempo de funcionamiento del horno.
3. **Seleccionar el *Cost Driver* óptimo:** Se elige una variable medible que capture esa causa con precisión. En este caso, "Horas de cocción por lote".
4. **Calcular la tasa de asignación:**

```text
Tasa del Cost Driver = Costo Indirecto Total / Total de Unidades del Cost Driver
```

5. **Asignar al producto:** Se multiplica la tasa por la cantidad de *cost drivers* que consumió ese producto específico.

#### Ejemplo práctico aplicado a "Pan Artesano"

Imaginemos que debemos asignar el costo mensual del mantenimiento del horno industrial ($100.000 al mes).

- **Opción A (Sin causa y efecto - Criterio arbitrario):**

Repartir los $100.000 en partes iguales entre los 4 productos del menú ($25.000 a cada uno).

- **Error:** La magdalena de centeno solo requiere 18 minutos de horneo, mientras que el pan lactal requiere 40 minutos. Tratar a todos por igual distorsiona el costo real.

- **Opción B (Con relación de causa y efecto + *Cost Driver* adecuado):**
  - **Causa:** El desgaste del horno se produce por el tiempo de uso a alta temperatura.
  - **Cost Driver seleccionado:** Minutos de horneo por lote.
  - **Cálculo:** Si el pan lactal consume el 50% del tiempo total del horno en el mes, absorbe el 50% ($50.000) de ese costo indirecto. La magdalena, que usa muy poco tiempo de horno, absorbe una porción proporcionalmente menor.

#### Resumen para el modelo de la App

- **Causa y Efecto es la filosofía de equidad:** "Quien consume el recurso, paga el costo".
- **Cost Driver es el mecanismo de cálculo:** la métrica que el usuario selecciona en la app (horas, unidades, lotes, volumen) para ejecutar el reparto de forma automatizada y realista.

**RN:** El sistema deberá calcular el Costo Unitario Total de cada producto elaborado mediante la suma de sus Costos Directos y los Costos Indirectos Asignados, según el criterio de distribución definido por el usuario.

> **Costo Unitario Total = Costos Directos + Costos Indirectos Asignados**

Y la acompañaría con una explicación sencilla:

> **El costo unitario total representa cuánto cuesta fabricar una unidad de un producto, considerando tanto los costos que pueden identificarse directamente con él (ingredientes, envases, mano de obra directa, etc.) como la parte proporcional de los gastos generales del negocio que le corresponde (alquiler, electricidad, internet, seguros, etc.).**

### 3.3 Preguntas para el usuario

La aplicación debe preguntar:

8. **¿Este insumo genera un costo que varía de manera proporcional cuando producís más?**
9. **¿Este insumo incide en el costo, pero no es tan sencillo de medir cuanto de él suma al costo de este producto?**

La primera respuesta determina si es fijo o variable. La segunda, si es directo o indirecto. Cada pregunta debe mostrar una explicación breve y ejemplos.

El trabajo del emprendedor/dueño también debería cuantificarse. Se registra como mano de obra de la persona dueña y también debe asignarse a cada producto.

## 4. Vinculación de costos directos

Un costo directo queda vinculado a un producto o receta mediante un dato medible:

| Tipo | Vinculado a |
| --- | --- |
| Insumo | Producto, receta, cantidad utilizada y unidad de medida. |
| Mano de obra | Producto, receta, tiempo efectivo y valor por hora |
| Envase o componente (packaging) | Producto y cantidad utilizada |
| Servicio exclusivo | Producto, receta, importe y si corresponde al lote o al ¿¿período?? |

Si un insumo se usa en varios productos, cada receta de cada producto debe indicar la cantidad utilizada. Si un esfuerzo económico se aplica a varios productos, se trata como indirecto y se distribuye con un criterio de asignación.

## 5. Insumos, compras y unidades

Para cada insumo (materia prima) se registra el importe pagado, la cantidad comprada y la unidad en la que se compró.

Las unidades deben ser compatibles (conversión a una unidad base): Ejs.: kilogramos a gramos, litros a mililitros, maples a 30 unidades de huevos y paquetes a unidades cuando el usuario confeccione cada receta.

La frase **cantidad expresada en la unidad base** significa, por ejemplo:

- 25 kg equivalen a 25.000 g;
- 12 botellas de 1 litro equivalen a 12.000 ml;
- Una caja de 100 etiquetas equivale a 100 unidades.

```text
Costo por unidad base = importe pagado / cantidad expresada en la unidad base
Costo usado en la receta = costo por unidad base × cantidad usada
```

Ejemplo:

```text
25 kg de harina cuestan $20.000
25 kg = 25.000 g
Costo por gramo = 20.000 / 25.000 = $0,80
Si la receta usa 1.000 g, el lote consume $ 800 de harina
```

## 6. Receta, lote y unidad vendible

La receta debe indicar insumos y cantidades, tiempo efectivo de trabajo, cantidad producida, pérdidas y presentación de venta.

```text
Unidades vendibles = cantidad producida - merma - unidades no vendibles
Costo directo del lote = insumos + mano de obra directa + otros costos directos
Costo directo unitario = costo directo del lote / unidades vendibles
```

Si un lote produce 20 panes, pero 2 no pueden venderse, el costo se divide entre 18. Si se vende una presentación con varias unidades:

```text
Costo de la presentación = costo unitario × unidades incluidas
```

## 7. Merma, pérdida y aprovechamiento de sobrantes

El sistema debe diferenciar en qué momento ocurre la pérdida y si el material todavía puede aprovecharse. Esa diferencia determina si el costo se reparte, se registra como pérdida o se transfiere a otro producto.

- Merma del insumo: parte de la materia prima que se descarta antes o durante la elaboración, como cáscaras o recortes que no se utilizan.
- Pérdida durante la producción: parte del lote que no llega a convertirse en una unidad vendible. Su costo se reparte entre las unidades que sí pueden venderse.
- Pérdida posterior: producto terminado que estaba disponible para vender, pero luego debe descartarse. Se registra como una pérdida del período y no modifica retroactivamente el costo del lote original.
- Sobrante aprovechable: producto terminado que deja de venderse en su forma original, pero puede convertirse en insumo de otro producto.

### 7.1 Reglas para reutilizar un producto terminado

En el caso del pan que se seca y se utiliza para producir pan rallado, no corresponde cargar harina nueva ni considerar que el pan tiene costo cero. El pan ya consumió harina, energía y trabajo cuando se produjo, por lo que conserva el costo unitario que tenía registrado.

- El producto reutilizado debe existir previamente en el stock como producto terminado.
- La cantidad utilizada debe descontarse del stock del producto de origen.
- El costo que se considera es el costo unitario registrado cuando se elaboró el producto.
- El lote original no se recalcula: se registra un movimiento posterior desde el producto de origen hacia el producto derivado.
- Al nuevo producto se le suman solamente los costos adicionales de transformación.
- Una misma unidad no puede figurar simultáneamente como vendida, descartada y reutilizada.
- Si parte del sobrante finalmente no se aprovecha, esa cantidad se registra como pérdida definitiva.

### 7.2 Flujo funcional en la aplicación

1. Desde el producto original, el usuario selecciona la acción “Registrar sobrante”.
2. La app pregunta qué ocurrió: descarte definitivo o reutilización.
3. Si elige reutilización, ingresa la cantidad o el peso que utilizará y selecciona el producto de destino. También puede crear uno nuevo, por ejemplo, pan rallado.
4. La app muestra el costo unitario guardado del producto de origen y calcula el importe que se transferirá.
5. El usuario completa el nuevo proceso: tareas realizadas, tiempo de trabajo, insumos y envases adicionales, cantidad obtenida y, si puede calcularlo por separado, la electricidad o el gas utilizados específicamente en la transformación.
6. Antes de confirmar, la app muestra el origen del costo y evita que la misma cantidad sea utilizada dos veces.
7. Al confirmar, se descuenta la cantidad del producto original, se crea el lote del producto derivado y ambos movimientos quedan vinculados.
8. El ingreso por venta recién se registra cuando el producto derivado se vende; reutilizarlo no genera una ganancia por sí mismo.

### 7.3 Cálculos

```text
Costo transferido = cantidad reutilizada × costo unitario registrado del producto de origen
Costo adicional de transformación = insumos adicionales + envases + energía directa + mano de obra adicional
Costo total del lote derivado = costo transferido + costo adicional de transformación
Costo unitario del producto derivado = costo total del lote derivado / cantidad vendible obtenida
```

Si el producto de origen se controla por peso, la transferencia se calcula con el costo por gramo o kilogramo registrado. Si se controla por unidades, se utiliza el costo por unidad.

### 7.4 Ejemplo: pan no vendido convertido en pan rallado

Un lote produjo 20 panes vendibles con un costo total de $20.000. El costo registrado fue de $1.000 por pan. Más tarde quedaron 2 panes sin vender y se decidió utilizarlos para producir pan rallado.

```text
Costo de 2 panes reutilizados: 2 × $1.000 = $2.000
Envases adicionales: $400
Mano de obra adicional: $600
Energía directa del proceso: $200
Costo total del lote de pan rallado: $2.000 + $400 + $600 + $200 = $3.200
Rendimiento obtenido: 4 bolsas vendibles
Costo por bolsa: $3.200 / 4 = $800
```

Los 2 panes salen del stock de pan. Ingresan 4 bolsas de pan rallado con un costo de $800 cada una. El sistema conserva el vínculo para explicar que parte del costo proviene del pan producido anteriormente.

### 7.5 Casos que el sistema debe impedir

- Reutilizar una cantidad mayor que el stock disponible.
- Transferir el precio de venta en lugar del costo del producto.
- Utilizar dos veces la misma unidad en distintos lotes derivados.
- Guardar un lote derivado con cantidad obtenida igual a cero.
- Eliminar el vínculo con el lote o producto de origen.

## 8. Mano de obra y trabajo propio

El trabajo propio también debe incluirse en el costo total del producto. En el MVP, el tiempo dedicado directamente a elaborar una receta se registra como mano de obra directa del lote. Las horas destinadas a compras, administración o ventas no se agregan nuevamente a la receta: se consideran al calcular cuántas horas productivas quedan disponibles y, por lo tanto, el valor sugerido por hora.

### 8.1 Cómo sugiere la app el valor del trabajo propio

La app no puede saber por sí sola cuánto vale el trabajo de cada persona ni inventar una tarifa de mercado. Debe guiar al usuario para obtener un valor mínimo por hora a partir de cuánto pretende cobrar por su trabajo.

En una carga guiada, el usuario informa:

- remuneración mensual que quiere obtener por su trabajo;
- días que trabaja por mes;
- horas que trabaja por día;
- horas mensuales dedicadas a tareas generales, como compras, administración o ventas.

```text
Horas totales mensuales = días trabajados × horas por día
Horas productivas = horas totales - horas de tareas generales
Valor sugerido por hora = remuneración mensual deseada / horas productivas
```

Ejemplo:

```text
Remuneración deseada: $ 600.000
Días trabajados: 20
Horas por día: 8
Horas totales: 160
Horas de administración, compras y ventas: 40
Horas productivas: 160 - 40 = 120
Valor sugerido por hora: 600.000 / 120 = $5.000
```

Ese resultado es un piso basado en el objetivo del usuario, no un precio de mercado. La pantalla debe mostrar cómo se obtuvo y permitir modificarlo. También puede existir una carga directa para quien ya conoce su valor por hora.

Si las horas productivas son cero, la app no puede calcular la sugerencia y debe pedir que se corrijan los datos o que se cargue el valor manualmente.

### 8.2 Cómo se carga en cada producto

En cada receta se registra solo el tiempo efectivo de trabajo: preparar, mezclar, amasar, controlar, envasar o limpiar cuando la tarea corresponde a ese lote. Una espera durante la cual la persona puede realizar otra actividad, como una fermentación, no se suma completa.

```text
Mano de obra propia del lote = horas efectivas del lote × valor por hora
Mano de obra propia por unidad = mano de obra del lote / unidades producidas vendibles
```

Las tareas generales no se vuelven a sumar en la receta. Ya se descontaron al calcular las horas productivas: así la remuneración mensual completa se recupera mediante el valor de las horas dedicadas a producir, sin contar dos veces el mismo tiempo.

### 8.3 Personal contratado

- Si se paga por hora o lote y el trabajo se mide por producto, se carga como directo.
- Si se paga un sueldo mensual, se usa el costo mensual total para el negocio, incluyendo las cargas correspondientes.
- La parte medible por producto se asigna por las horas dedicadas.
- El trabajo general que no se puede medir por producto se asigna como costo indirecto por tiempo de producción.

## 9. Criterios concretos para asignar los costos

Asignar un costo significa determinar cuánto de ese gasto corresponde a cada producto. El procedimiento depende de si el costo es directo o indirecto.

### 9.1 Costos directos

Los costos directos se cargan en la receta o en el lote al que pertenecen. El importe asignado se calcula según el consumo real:

- insumos: cantidad usada en la receta;
- mano de obra: tiempo efectivo dedicado a la receta;
- envases: cantidad usada;
- otros costos exclusivos: importe asociado al lote o producto.

Como estos costos ya están vinculados con una receta o un lote mediante cantidades o tiempos concretos, no es necesario repartirlos usando porcentajes.

### 9.2 Costos indirectos

Los costos indirectos benefician a varios productos y por eso deben repartirse. El criterio de asignación indica qué dato se usará para calcular la parte que corresponde a cada producto. No se usa el mismo criterio para todos, porque un alquiler, un gasto comercial y un gasto administrativo no se relacionan con los productos de la misma manera. Para el MVP se utilizarán los siguientes criterios:

| Costo indirecto | Criterio que aplicará la app | Datos que toma la app |
| --- | --- | --- |
| Alquiler del espacio de producción, limpieza o mantenimiento general | Tiempo de producción | Horas que cada producto ocupa el espacio durante el mes |
| Electricidad o gas compartidos, cuando no se pueden medir por producto | Tiempo de producción | Horas de elaboración planificadas por producto |
| Publicidad general, plataforma de ventas o atención comercial | Ventas planificadas | Importe de ventas esperado de cada producto |
| Administración y otros gastos generales sin una relación más clara | Costo directo planificado | Costo directo mensual de cada producto |

Los criterios de la tabla indican qué información utiliza la app para repartir cada tipo de costo indirecto. La app no elige al azar: primero identifica el tipo de costo cargado y propone el criterio relacionado. Luego toma los datos mensuales de cada producto —horas de producción, ventas planificadas o costo directo planificado—, calcula qué proporción representa cada uno y aplica ese porcentaje al costo. El usuario puede revisar el cálculo y elegir otro criterio si representa mejor su actividad.

#### Reparto por tiempo de producción

```text
Porcentaje del producto = horas mensuales del producto / horas mensuales de todos los productos
Costo asignado = costo indirecto mensual × porcentaje del producto
```

Ejemplo: si el pan ocupa 60 de las 100 horas mensuales del taller, recibe el 60 % del alquiler y de los servicios de producción compartidos.

#### Reparto por ventas planificadas

```text
Ventas planificadas = precio esperado × unidades que se espera vender
Porcentaje del producto = ventas planificadas del producto / ventas planificadas totales
Costo asignado = gasto comercial mensual × porcentaje del producto
```

#### Reparto por costo directo planificado

```text
Costo directo mensual = costo directo unitario × unidades planificadas
Porcentaje del producto = costo directo mensual del producto / costo directo mensual total
Costo asignado = gasto general mensual × porcentaje del producto
```

En todos los casos:

```text
Costo indirecto unitario = costo indirecto asignado al producto / unidades planificadas del producto
```

La app debe mostrar el criterio, los datos usados y el porcentaje obtenido. El usuario puede reemplazar la sugerencia con porcentajes manuales si conoce una distribución mejor, pero el total debe sumar 100 %.

Si falta el dato necesario —por ejemplo, todavía no se cargaron horas ni ventas planificadas— la app debe pedir otro criterio o porcentajes manuales. No debe repartir el costo silenciosamente en partes iguales.

## 10. Períodos

Los costos indirectos se llevan a un mismo período, que en el MVP será mensual.

```text
Costo mensual equivalente = importe / cantidad de meses que cubre
```

- pago anual: dividir por 12;
- pago trimestral: dividir por 3;
- pago mensual: usar el importe completo;
- pago semanal: utilizar la equivalencia mensual definida por el equipo.

El período y la conversión deben quedar visibles. El motor no debe mezclar silenciosamente importes semanales, mensuales y anuales.

## 11. Precio sugerido, margen y ganancia

La app debe separar tres datos:

- Costo total: lo que cuesta producir y sostener la parte correspondiente de los gastos generales.
- Ganancia buscada: lo que el usuario quiere ganar por encima del costo.
- Descuentos sobre la venta: porcentajes o importes que se descuentan al cobrar, como una comisión de la plataforma o del medio de pago.

Si no existen descuentos sobre la venta, el margen se calcula así:

```text
Precio sugerido = costo total unitario / (1 - margen deseado)
```

Ejemplo:

```text
Costo total unitario: $1.000
Margen deseado: 30 %
Precio sugerido: 1.000 / 0,70 = $1.428,57
```

Sumar 30 % al costo daría $1.300, pero el margen real sería 23,08 %. Esto ocurre porque el margen se mide sobre el precio final, no sobre el costo.

Si además existe una comisión porcentual sobre la venta, debe incluirse en la fórmula para que no reduzca la ganancia esperada:

```text
Precio sugerido = (costo total unitario + cargo fijo por venta)
                  / (1 - margen deseado - comisión porcentual - otros porcentajes sobre la venta)
```

Ejemplo:

```text
Costo total: $1.000
Margen deseado: 30 %
Comisión de venta: 10 %
Precio sugerido: 1.000 / (1 - 0,30 - 0,10) = $1.666,67
```

El sistema debe mostrar por separado cuánto corresponde al costo, cuánto a la comisión y cuánto queda como ganancia. Si la suma del margen y los descuentos porcentuales alcanza o supera el 100 %, no se puede calcular un precio válido y se debe pedir que el usuario cambie esos valores.

```text
Descuento porcentual = precio de venta × porcentaje de comisión u otros cargos
Ganancia estimada por unidad = precio de venta
                               - costo total unitario
                               - cargo fijo por venta
                               - descuento porcentual
Margen real = ganancia estimada / precio de venta
```

Los impuestos solamente se incorporan en esta cuenta cuando, según la situación del usuario, funcionan como un porcentaje o cargo que debe cubrir el precio. La app no debe asumir automáticamente una condición impositiva.

## 12. Punto de equilibrio

```text
Contribución por unidad = precio de venta - costos variables por unidad
Punto de equilibrio en unidades = costos fijos mensuales / contribución por unidad
```

Si existen varios productos, el cálculo depende de la mezcla de ventas planificada y debe mostrar la proporción utilizada.

La contribución es el dinero que deja cada unidad después de pagar los costos que aparecen al producirla o venderla. Ese dinero sirve para cubrir los costos fijos. Por ejemplo:

```text
Precio: $1.500
Costos variables por unidad: $1.000
Contribución por unidad: $500
```

Si la contribución da cero, cada venta solamente cubre sus costos variables y no deja nada para pagar alquiler u otros costos fijos. Si da negativa, cada nueva venta genera una pérdida mayor. En esos casos no existe una cantidad de ventas que permita alcanzar el punto de equilibrio con ese precio; por eso la app debe mostrar una advertencia y no un número de unidades.

## 13. Precisión, redondeo e historial

- El dinero se calcula con precisión decimal, no con números de coma flotante.
- El motor no redondea importes en los pasos intermedios. Conserva el resultado decimal completo y redondea el importe monetario final a dos decimales.
- La interfaz muestra el dinero con dos decimales. Las cantidades físicas conservan la precisión ingresada por el usuario; por ejemplo, 1,275 kg no se transforma en 1,28 kg para realizar el cálculo.
- Un cálculo guardado conserva precios, cantidades, porcentajes, tiempos y reglas utilizados.
- Cambiar el precio de un insumo afecta cálculos futuros, no resultados históricos.
- Una nueva versión de una receta no modifica la utilizada en un cálculo anterior.

## 14. Datos que debe guardar cada cálculo

- producto y versión de receta;
- insumos, cantidades y precios utilizados;
- unidades producidas y vendibles;
- merma, pérdida definitiva y cantidad reutilizada;
- producto de origen cuando se utiliza un sobrante para elaborar otro producto;
- horas y valor de la mano de obra;
- otros costos directos;
- costos indirectos del período;
- criterio y porcentajes de distribución;
- margen deseado;
- comisiones y cargos aplicados a la venta;
- precio sugerido y precio elegido;
- fecha del cálculo.

## 15. Ejemplo resumido: pan artesanal

```text
Producción: 20 panes
Unidades no vendibles: 2
Insumos del lote: $8.000
Trabajo efectivo: 2 horas
Valor por hora: $5.000
Mano de obra: 2 × 5.000 = $10.000
Otros costos directos: $2.000

Costo directo del lote: 8.000 + 10.000 + 2.000 = $20.000
Unidades vendibles: 20 - 2 = 18
Costo directo unitario: 20.000 / 18 = $1.111,11

Costo indirecto mensual asignado: $45.000
Producción mensual planificada: 180 panes
Costo indirecto unitario: 45.000 / 180 = $250

Costo total unitario: 1.111,11 + 250 = $1.361,11
Margen deseado: 30 %
Precio sugerido: 1.361,11 / 0,70 = $1.944,44
```
