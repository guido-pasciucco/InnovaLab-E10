# Definición conceptual — Calculadora de costos para emprendedores

> *Documento vivo para comprender, decidir y explicar el modelo de costos de la aplicación*

> Fuente: `Definición conceptual — Calculadora de costos para emprendedores.docx` (documento conceptual original)

---

## 1. Propósito y alcance acordado

Este documento organiza y corrige la primera entrega conceptual del equipo. Su propósito es que todas las áreas —UX/UI, Frontend, Backend, Datos y QA— comprendan qué significan los datos y resultados antes de diseñar fórmulas, pantallas o historias de usuario.

La aplicación estará dirigida a emprendedores que fabrican productos físicos. No se enfocará en un rubro particular: deberá poder utilizarse para alimentos, indumentaria, artesanías, cosmética, mobiliario u otros productos. Cada ficha calculará un producto y una unidad de costeo concreta, mientras que una misma cuenta podrá guardar varios productos.

La aplicación **no calculará servicios en esta primera versión**. Tampoco será un **sistema contable, de facturación, inventario o impuestos**. Su función será **ayudar a construir y comprender el costo, explorar precios, estimar contribución marginal y calcular el punto de equilibrio**.

## 2. Evaluación general de la propuesta del equipo

La secuencia conceptual propuesta es sólida: objeto de costo → unidad de costeo → recursos consumidos → clasificación → asignación → costo total → costo unitario → contribución → punto de equilibrio. Esta cadena ofrece una base adecuada para pensar el motor.

Sin embargo, se necesitan cinco precisiones antes de convertirla en requisitos:

Primera: **directo/indirecto y fijo/variable son dos clasificaciones diferentes**. Un costo puede ser directo y variable, indirecto y fijo, o adoptar otra combinación según el caso.

Segunda: en el punto 10, **$200.000 es el costo variable total de 100 unidades, no el costo variable unitario**. El costo variable unitario continúa siendo $2.000.

Tercera: **cantidad producida y cantidad vendida no son equivalentes**. **La producción interviene en el costeo; las ventas intervienen en ingresos, resultados y punto de equilibrio**.

Cuarta: **el costo fijo unitario es una asignación basada en un volumen**. **El costo fijo total no se transforma en variable**. Para calcular el punto de equilibrio se usa el costo fijo total y la contribución por unidad, sin restar dos veces el mismo costo.

Quinta: **“margen de contribución” y “margen de ganancia sobre ventas” no son sinónimos**. Ambos deben tener nombres, fórmulas y explicaciones diferentes en la interfaz.

## 3. Cadena mental para comprender el cálculo

¿Qué quiero calcular? → **Objeto de costo**.

¿En qué unidad quiero expresarlo? → **Unidad de costeo**.

¿Qué recursos consume? → **Costos**.

¿Cómo cambian cuando cambia la actividad? → **Fijos o variables**.

¿Puedo identificarlos con el producto? → **Directos o indirectos**.

¿Cómo incorporo los indirectos? → **Asignación y criterio de asignación**.

¿Cuánto cuesta fabricar el total? → **Costo total**.

¿Cuánto cuesta una unidad? → **Costo unitario**.

¿Cuánto deja cada venta para cubrir la estructura? → **Contribución por unidad**.

¿Cuánto necesito vender para cubrir los costos? → **Punto de equilibrio**.

## 4. Conceptos básicos corregidos y adaptados a la aplicación

### 1. Costo

Es el **valor económico de los recursos utilizados para fabricar un producto**. Puede incluir materiales, trabajo, energía y otros recursos consumidos.

Ejemplo: para fabricar una vela se utilizan cera, mecha, fragancia, recipiente, tiempo de trabajo y energía.

Implicación para la app: el sistema no debería pedir solamente “costo total”. Debe ayudar al usuario a identificar y cargar los componentes que forman ese costo.

### 2. Objeto de costo

Es **aquello cuyo costo se desea determinar**. En esta aplicación será un producto físico definido por el usuario.

Ejemplo: “vela aromática de 250 g” es un objeto de costo más preciso que “velas”.

Implicación para la app: cada cálculo debe estar asociado a una ficha de producto. Una cuenta podrá tener varias fichas, pero cada una conservará sus propios componentes y resultados.

### 3. Unidad de costeo

Es la **presentación concreta para la cual se quiere conocer y expresar el costo**. Responde a la pregunta cotidiana: “¿Qué unidad o presentación vendo y cuánto me cuesta?”.

Ejemplos: una vela de 250 g, una torta de veinte porciones, una caja de seis alfajores, un paquete de pan de 500 g o una remera estampada.

La unidad de costeo **no debe confundirse con la unidad de medida de un insumo**. La unidad de costeo puede ser “una vela de 250 g”, mientras que la cera se compra en kilogramos y se consume en gramos.

Tampoco debe confundirse con el nombre general del producto. El objeto de costo puede ser “alfajores de chocolate”; **la unidad de costeo puede ser “una caja de seis alfajores”**.

#### Cómo se integra en la aplicación

La interfaz debería preguntar “¿Cómo vendés este producto?” en lugar de exigir que el usuario conozca el término técnico “unidad de costeo”.

**El usuario define el nombre del producto, la forma de venta y la presentación**. Las formas iniciales recomendadas son: unidad individual, presentación agrupada y presentación por peso o volumen.

Ejemplos: “una vela”; “una caja de 6 alfajores”; “un paquete de pan de 500 g”; “un frasco de crema de 250 ml”.

La aplicación debe confirmar la elección con una frase comprensible: “Vamos a calcular el costo de una caja de 6 alfajores”. Esa presentación será la referencia para costo, precio, contribución y punto de equilibrio.

#### Cómo se conecta con el lote

El lote es el conjunto producido en un mismo proceso. El rendimiento indica cuántas unidades base utilizables se obtienen de ese lote.

Ejemplo: un lote produce 60 alfajores y la presentación de venta contiene 6. Por lo tanto, el lote rinde 10 cajas.

Si el costo total del lote es $200.000, el costo por caja es $200.000 ÷ 10 = $20.000. Como información complementaria, el costo por alfajor es $200.000 ÷ 60 = $3.333,33.

Si la cantidad producida no forma presentaciones completas, la app no debe redondear silenciosamente. **Debe informar el sobrante y permitir definir si se vende por separado, se conserva para otro lote o se considera merma**.

#### Resultados vinculados con la presentación

La app puede mostrar costo por unidad base y costo por presentación, pero el resultado comercial principal debe corresponder a la forma en que el producto se vende.

Todos los resultados deben nombrar la presentación: “Costo estimado: $20.000 por caja de 6 alfajores”, “Precio sugerido por caja” y “Punto de equilibrio: 40 cajas por mes”.

Implicación para Desarrollo: cada ficha debe guardar como mínimo la unidad base, la forma de venta, el tipo de presentación, la cantidad contenida, el rendimiento del lote y la unidad utilizada en los resultados.

### 4. Costo total

Es la suma de los costos incluidos por el modelo para una cantidad de producción o un período determinado.

**La expresión “costo total” necesita contexto**. Puede significar costo total de un lote, costo total de producción mensual o costo total completo. La app debe mostrar siempre cuál de ellos está calculando.

### 5. Costo unitario

El **costo unitario es cuánto cuesta producir una unidad de costeo**.

La fórmula básica es: **costo unitario = costo total ÷ cantidad obtenida**.

La palabra “unitario” no significa necesariamente “una pieza individual”. **Significa una unidad de la presentación que elegimos costear**.

Ejemplo: si un lote cuesta $500.000 y produce 100 unidades utilizables, el costo unitario del lote es $5.000.

Implicación para la app: debe informar qué componentes están incluidos en ese valor y cuál fue la cantidad utilizada como divisor.

### 6. Costo directo

Es un **costo que puede identificarse y asignarse al producto** de una manera razonable y útil.

Ejemplo: la madera utilizada específicamente para una mesa o la cera utilizada en una vela.

**“Directo” no significa necesariamente “variable”**, aunque muchos materiales directos se comporten de esa forma.

### 7. Costo indirecto

Es un costo relacionado con la producción que no puede identificarse directamente con una unidad o cuyo seguimiento individual no resulta razonable.

Ejemplos: alquiler del taller compartido, mantenimiento general o electricidad utilizada por varios procesos.

La clasificación depende del vínculo con el objeto de costo. La electricidad que consume una máquina es directa (fuerza motriz); la electricidad general del taller sería indirecta (para distribuir).

### 8. Costo fijo

Es un **costo cuyo importe total permanece relativamente estable dentro de un período y rango de actividad**, aunque cambie la cantidad producida o vendida.

Ejemplos: alquiler mensual, seguros, determinadas suscripciones y ciertos salarios.

**“Fijo” no significa eterno ni inmutable**. Puede aumentar entre meses, pero **no aumenta proporcionalmente por cada unidad fabricada** dentro del rango especificado.

### 9. Costo variable

Es un **costo cuyo total cambia con la cantidad producida o vendida**.

Ejemplo: si cada producto requiere $2.000 de materiales, fabricar 10 unidades demanda $20.000 y fabricar 100 demanda $200.000.

Para la app será importante distinguir variables de producción —materiales o envases— y variables de venta —por ejemplo, una comisión por operación—.

### 10. Costo variable unitario

Es **cuánto gastás para fabricar una unidad más. Aparece porque fabricás esa unidad**.

Ejemplo: para producir una caja de 6 alfajores se utilizan $6.000 de ingredientes, $1.000 de caja y etiqueta, y $2.000 de trabajo directamente relacionado con la producción. El costo variable unitario es $9.000 por caja.

Si se fabrica 1 caja, el costo variable total es $9.000. Si se fabrican 10 cajas, es $90.000. Cuantas más cajas se fabrican, mayor es el costo variable total; el costo variable por caja continúa siendo $9.000 mientras no cambien los precios, las cantidades ni la forma de producir.

> [!tip] Regla para recordar
> El **costo variable unitario es lo que se consume al fabricar una unidad**.

### 11. Costo fijo unitario

Es la parte de los gastos fijos del período que se reparte entre las unidades. Esos gastos existen aunque se fabrique poco o nada.

Ejemplos de costos fijos: alquiler, internet, seguros o una suscripción mensual.

Si los costos fijos mensuales asignados al producto son $300.000 y se espera fabricar 100 cajas, se asignan $3.000 de costos fijos a cada caja.

Si solo se fabrican 50 cajas, se asignan $6.000 a cada una. El gasto fijo continúa siendo $300.000; como hay menos cajas para repartirlo, cada caja debe cubrir una parte mayor.

> [!tip] Regla para recordar
> El **costo variable aparece porque fabrico esa caja; el costo fijo ya existe y lo reparto entre las cajas**.

Ejemplo conjunto: si una caja tiene $9.000 de costo variable y $3.000 de costo fijo asignado, su costo completo estimado es $12.000.

Implicación para la app: debe mostrar la cantidad utilizada para repartir el costo fijo y aclarar que el valor por unidad cambia si cambia ese volumen.

### 12. Materia prima o material directo

Es el material que forma parte del producto y cuyo costo puede identificarse con él.

Ejemplos: harina en pan, tela en una prenda o madera en una mesa.

Implicación para la app: debe admitir cantidad comprada, precio pagado, unidad de medida y cantidad utilizada, con conversiones compatibles como kg/g y l/ml.

### 13. Mano de obra directa

Es el trabajo directamente relacionado con la fabricación y cuyo valor puede asignarse al producto.

Ejemplo: tres horas para producir un lote de doce unidades. Si la hora vale $8.000, el lote incorpora $24.000 de mano de obra, equivalentes a $2.000 por unidad.

Implicación para la app: el usuario podrá escribir el valor de su hora o calcularlo desde un ingreso mensual deseado y horas productivas. La app no necesita un LLM para esto; necesita una fórmula explicada y editable.

### 14. Costos indirectos de producción

Son costos necesarios para fabricar, pero no identificables de manera directa con una unidad concreta.

Ejemplos: mantenimiento del taller, supervisión, alquiler del área de producción o energía general.

Para incluirlos en el costo de un producto se necesita un criterio de asignación. La app no debería distribuirlos silenciosamente.

### 15. Asignación de costos

Es **decidir cuánto de un costo corresponde a cada producto**.

Cuando el costo pertenece claramente a un producto, la asignación es directa. Por ejemplo, la cera utilizada en una vela se carga a esa vela.

Cuando un gasto es compartido por varios productos, hay que repartirlo. Por ejemplo, si en el mismo taller se fabrican velas y difusores, **no corresponde cargar el alquiler completo a los dos productos porque se contaría dos veces**.

La asignación indica el resultado del reparto: cuánto del alquiler se atribuye a las velas y cuánto a los difusores.

Implicación para la app: debe conservar el costo total original, mostrar cuánto se asignó a cada producto y evitar que una vista global duplique el mismo gasto.

### 16. Criterio de asignación

Es la regla elegida para decidir cómo se reparte un costo compartido entre los productos.

Puede utilizarse, por ejemplo, el tiempo de producción, las horas de máquina, las unidades producidas, el espacio utilizado o un porcentaje definido por el usuario.

Ejemplo: el alquiler mensual del taller es $300.000. Si las velas utilizan el 60% de las horas del taller y los difusores el 40%, el criterio “horas de uso” asigna $180.000 a las velas y $120.000 a los difusores.

No existe un criterio correcto para todos los casos. Debe ser una regla razonable, comprensible y relacionada con el uso que cada producto hace del recurso.

Implicación para la app: en lugar de pedir solamente un porcentaje, podría preguntar “¿Qué representa mejor cómo se usa este gasto?” y ofrecer criterios simples. La regla, los datos y la cuenta deben quedar visibles y ser editables.

> [!tip] Regla para recordar
> La **asignación es el “cuánto” le corresponde a cada producto; el criterio de asignación es la regla utilizada para decidirlo**.

### 17. Período de costeo

Es el intervalo utilizado para identificar y comparar costos. (para nuestro 1er MVP será mensual en primer instancia)

Decisión propuesta para esta aplicación: **carga y cálculo principal mensual**. La vista anual será una proyección derivada de los datos mensuales, no un conjunto independiente de valores. La carga semanal queda fuera de la primera versión para evitar mezclar períodos.

**Todos los datos comparados deben expresarse en el mismo período.**

### 18. Cantidad producida y cantidad vendida

La cantidad producida es lo fabricado durante el período. La cantidad vendida es lo efectivamente comercializado o lo que se espera vender.

**No son equivalentes: se pueden producir 100 unidades y vender 60.**

**La producción ayuda a calcular costo y rendimiento; las ventas ayudan a estimar facturación, resultado y punto de equilibrio.** La aplicación debe pedirlas por separado cuando sean necesarias, ya que son dos procedimientos mentales distintos. Pueden usar algunos datos de entrada comunes y/o mismas unidades para su cálculo, pero son algoritmos distintos.

### 19. Costo de producción del producto

En un esquema básico incluye materiales directos, mano de obra directa y costos indirectos de producción asignados.

No necesariamente incluye gastos comerciales, administrativos, financieros o tributarios. Por eso la app debe evitar llamar “costo real total” a un resultado sin explicar su alcance.
### 20. Costo completo

Es el costo que incorpora todos los componentes que el modelo decidió atribuir al producto, además de los costos estrictamente productivos.

Puede incluir una asignación de gastos generales o comerciales si esa es la decisión metodológica.

Implicación para la app: debe diferenciar costo de producción, otros costos por venta y costo completo estimado. Esto permite que el usuario comprenda qué cubre el precio sugerido.

### 21. Contribución y margen de contribución

La **contribución muestra cuánto sobra de las ventas después de cubrir los costos variables** ($ en dinero). Ese importe sirve para cubrir los costos fijos y, una vez cubiertos, generar un resultado positivo.

**Contribución por unidad = precio de venta unitario − costo variable unitario.**

**Contribución total = ventas totales − costos variables totales.**

**Margen de contribución (% en porcentaje) = contribución ÷ ventas × 100.**

> [!warning] No lo llames “margen” a secas
> Debe evitarse llamarlo simplemente “margen” porque **puede confundirse con el margen utilizado para sugerir un precio**.

El Margen de Contribución (%) mide qué tan eficiente es un producto, mostrando el porcentaje de cada venta destinado a cubrir la estructura fija del negocio. Cuanto más alto sea, más rápido cubrís esa estructura. Es clave llamarlo por su nombre completo y evitar decirle simplemente “margen”, para no confundirlo con el porcentaje de recargo que se usa para fijar un precio.

### 22. Punto de equilibrio

Es el **nivel de ventas en el que los ingresos cubren exactamente los costos considerados, sin resultado positivo ni negativo**.

Para un solo producto: **punto de equilibrio en unidades = costos fijos del período ÷ contribución por unidad**.

**Punto de equilibrio en pesos = unidades de equilibrio × precio de venta.**

> [!warning] Caso sin equilibrio
> **Si el precio es igual o menor que el costo variable unitario, no existe un punto de equilibrio alcanzable**: cada venta no aporta dinero para cubrir los costos fijos.

En un emprendimiento con varios productos, el cálculo global requiere considerar la mezcla de ventas o contribución de los diferentes productos. Un punto de equilibrio individual solo será válido si los costos fijos asignados a ese producto están definidos sin duplicación. En la vida real por no tener estas definiciones y conceptos claros, suele suceder, muy a menudo dos cosas:

> [!warning] Dos errores reales muy comunes
> - Que una persona puede estar vendiendo muchas cantidades y **por cada unidad que vende, va agregando pérdidas a su negocio, ya que el precio de venta no está correctamente calculado**….
>
> - O que esté cargando un **margen innecesariamente alto** a un producto, basado en el “ojímetro” o en lo que estila el mercado y **perderse cantidad de ventas por haber colocado un precio de venta que pudo haberse ofrecido mucho más económico** al consumidor final.

## 5. Dos clasificaciones que no deben mezclarse

La clasificación directo/indirecto responde: **“¿puedo vincular razonablemente este costo con el producto?”**.

La clasificación fijo/variable responde: **“¿cómo cambia el costo total cuando cambia el nivel de actividad?”**.

Ejemplos: materia prima específica = directa y normalmente variable. Alquiler de un taller compartido = indirecto y normalmente fijo. Comisión por cada venta = puede identificarse con la venta y es variable. Mantenimiento general = indirecto y puede tener componentes fijos o variables.

Para el diseño, conviene guiar al usuario con ejemplos y preguntas simples en lugar de exigirle que domine primero toda la terminología contable.

## 6. Margen para fijar precios: decisión pendiente

**Margen de ganancia sobre ventas y recargo sobre costo son porcentajes diferentes.**

Ejemplo: costo completo estimado $8.000 y precio $10.000. La diferencia es $2.000. **El margen sobre ventas es $2.000 ÷ $10.000 = 20%. El recargo sobre costo es $2.000 ÷ $8.000 = 25%.**

Si el usuario solicita un margen del 20% sobre el precio, el precio sugerido se obtiene como **$8.000 ÷ (1 − 0,20) = $10.000**.

Recomendación: utilizar margen sobre el precio de venta, nombrarlo explícitamente y mostrar la fórmula. El equipo y el mentor deben validar qué componentes integran el costo utilizado como base.

## 7. Asignación de costos fijos en una aplicación con varios productos

> [!warning] Error clásico: duplicar el fijo
> Si una persona fabrica velas y difusores, **no se puede cargar el alquiler completo en ambos productos** y luego sumar los resultados como si fueran la rentabilidad del negocio. **Eso duplicaría el mismo costo**.

La cuenta debería registrar los gastos generales una sola vez. Luego, para analizar cada producto, el usuario podría asignar una parte mediante un criterio explícito: porcentaje manual, horas de producción, unidades, uso de espacio u otra base pertinente.

Para la primera versión hay dos caminos posibles. Camino A: cálculo independiente por producto; el usuario ingresa la parte de costos fijos que desea atribuirle y la app aclara que el resultado es una estimación individual. Camino B: gastos generales a nivel negocio y distribución entre todos los productos mediante reglas guardadas.

Recomendación: diseñar el modelo de datos para gastos generales a nivel negocio, pero comenzar con una asignación simple y transparente. No prometer rentabilidad global hasta poder verificar que el total no se duplica y que las asignaciones entre productos son coherentes.

## 8. Costeo ABC y modelos avanzados

El costeo basado en actividades (ABC) busca asignar con mayor precisión los costos indirectos siguiendo la cadena costo → actividad → inductor → producto.

Ejemplo: preparar máquinas, controlar calidad o procesar pedidos son actividades. Cada producto recibe una parte de esos costos según cuánto consume de la actividad.

ABC puede ser útil cuando existen muchos productos, procesos diferentes y costos indirectos relevantes. No es “correcto” frente a un modelo tradicional “incorrecto”; responde a una necesidad de precisión y complejidad diferente.

Decisión para este proyecto: ABC queda como evolución futura, no como modelo del MVP. Para pequeños emprendedores de distintos rubros resulta más apropiado un modelo sencillo, explicable y verificable.

Otros temas como centros de costos, costeo por órdenes o procesos, desperdicios, merma y scrap pueden documentarse como posibles extensiones. “Scrap” es el término correcto; debe evitarse la forma “scrup”.

## 9. Modelo recomendado para el MVP

Una cuenta puede guardar varios productos. Cada producto tiene nombre, unidad de costeo, lote o rendimiento, materiales, mano de obra y otros costos asociados.

Los insumos se guardan en un catálogo reutilizable con precio de compra, cantidad y unidad de medida. Cada producto indica cuánto consume. Al actualizar un insumo, la app recalcula los productos relacionados.

Los gastos generales se registran por mes y se asignan a productos mediante un criterio visible. La aplicación conserva el importe original y la asignación, evitando confundirlos.

El motor devuelve costo del lote, costo variable unitario, costo de producción unitario, costo completo estimado, precio sugerido según margen, contribución, resultado mensual estimado y punto de equilibrio.

El usuario puede probar un precio alternativo y escenarios conservador, esperado y optimista. Las fórmulas y supuestos deben estar disponibles mediante explicaciones breves.

## 10. Decisiones ya tomadas

Producto físico, no servicios.

Público principal: emprendedores.

Aplicación general para múltiples rubros.

Una cuenta puede guardar varios productos; cada ficha costea un producto y una unidad concreta.

Moneda inicial: pesos argentinos.

Persistencia mediante cuenta de usuario.

Modelo inicial sencillo y transparente; ABC fuera del MVP.

## 11. Decisiones que el equipo todavía debe cerrar

Definir si el cálculo principal utilizará producción real, producción esperada o capacidad normal para asignar determinados costos.

Confirmar que el período principal será mensual y que la vista anual será una proyección.

Definir qué componentes integran el costo base del precio sugerido.

Confirmar margen sobre ventas como convención para el precio sugerido.

Definir cómo se cargarán y asignarán los gastos generales compartidos entre productos.

Definir si las comisiones porcentuales por venta se incluirán en el MVP.

Definir el tratamiento de mermas y desperdicios.

Acordar reglas de redondeo monetario y de unidades del punto de equilibrio.

Acordar qué resultados son proyecciones y cuáles podrían basarse en datos reales.

Validar el modelo con el mentor y con al menos dos casos de rubros diferentes.

## 12. Recorrido conceptual del usuario

1. Crear una cuenta e iniciar sesión.

2. Crear una ficha de producto y definir la unidad base, la forma de venta y la presentación comercial.

3. Indicar cuántas unidades contiene cada presentación, cómo se produce el lote y cuál es su rendimiento utilizable.

4. Seleccionar o crear insumos y registrar cantidades utilizadas.

5. Registrar tiempo de trabajo y valor hora.

6. Agregar otros costos directos, variables e indirectos.

7. Revisar las asignaciones de gastos generales.

8. Consultar la composición del costo.

9. Elegir un margen y obtener un precio sugerido.

10. Probar el precio actual o uno alternativo.

11. Consultar contribución, resultado estimado y punto de equilibrio.

12. Comparar escenarios, guardar y volver a actualizar el cálculo.

## 13. Preguntas que ayudan a pensar cada funcionalidad

¿Qué dato ingresa el usuario? ¿Lo conoce o debemos ayudarlo a calcularlo?

¿Qué unidad y período utiliza?

¿Ese dato corresponde al producto, al lote o al negocio completo?

¿Es un dato real o una estimación?

¿Qué fórmula lo transforma en un resultado?

¿Qué supuesto hace la fórmula?

¿Qué debe pasar si el dato falta, es cero, negativo o incompatible?

¿Cómo puede verificar el usuario de dónde salió el resultado?

¿Qué otros productos se ven afectados si cambia el dato?

¿Estamos mostrando costo, facturación, contribución o resultado sin confundirlos?

## 14. Implicaciones para QA

QA debe participar antes de la implementación para convertir estas definiciones en criterios de aceptación verificables.

Casos centrales: conversiones kg/g y l/ml; rendimiento cero; costo o cantidad negativa; precio menor o igual al costo variable; margen igual o superior al 100%; cambio de un insumo reutilizado; asignaciones duplicadas; diferencias entre producido y vendido; redondeo del equilibrio; actualización de escenarios; aislamiento de datos entre cuentas.

Ante cada indicador, QA debería preguntar: de qué datos sale, qué supuesto utiliza, qué sucede si falta información y cómo se explica al usuario.

## 15. Definición breve del producto

Aplicación web para emprendedores argentinos que fabrican productos de distintos rubros. Permite guardar productos e insumos, construir costos a partir de materiales, mano de obra y gastos asignados, explorar precios y márgenes, comparar escenarios y comprender cuántas unidades deben venderse para cubrir los costos.

La herramienta acompaña decisiones y ofrece cálculos transparentes; no reemplaza asesoramiento contable.

Pan Artesano

Panaderia artesanal con local a la calle sin delivery

productos unitarios (4)

ingredientes de los productos
