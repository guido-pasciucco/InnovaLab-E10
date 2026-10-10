# 01 — Capa que elige el modelo de costos según el negocio del usuario

| Campo | Valor |
| --- | --- |
| **Estado** | ⏳ Necesidad registrada. Sin decisión de implementación. |
| **Fecha** | 2026-10-09 |
| **Relacionado** | [`docs/calculation-engine/Motor de cálculo de Innova Lab.md`](../../calculation-engine/Motor%20de%20cálculo%20de%20Innova%20Lab.md) · [`docs/producto/01-calculadora-inteligente.md`](../../producto/01-calculadora-inteligente.md) |

## Problema

Cada usuario llega con una estructura de negocio distinta. Una panadería artesanal, un taller que vive de la mano de obra y una producción con varias etapas no reparten los costos fijos de la misma manera. Si la aplicación aplica un solo criterio a todos, el costo unitario queda falso y el punto de equilibrio también: unos productos terminan pagando costos que en realidad consumió otro.

El motor ya documenta que no hay un método de asignación universal. El criterio depende del proceso: horas de máquina, horas de mano de obra, unidades producidas, costeo por absorción o costeo basado en actividades. Esa elección es técnica. El emprendedor no tiene por qué conocerla para usar la calculadora.

Hoy esa elección no está resuelta en el producto. Sin ella, el motor no sabe qué modelo aplicar cuando hay que calcular el costo fijo de cada producto y, a partir de ahí, el punto de equilibrio.

## Necesidad

Hace falta una capa, al ingreso del usuario, que haga unas pocas preguntas de negocio y, con esas respuestas, elija el modelo de costos con el que se van a hacer las cuentas.

Esa capa puede ser un agente o un mecanismo equivalente (por ejemplo, un cuestionario con reglas). Lo que importa es el resultado: a partir de cómo trabaja el negocio, queda definido cómo se calculan el costo unitario, la absorción de los costos fijos y el resto de las decisiones de teoría de costos que el usuario no debería tener que tomar.

La fuente para tomar esa decisión es lo documentado en `docs/calculation-engine`, en particular:

- la clasificación fijo/variable y directo/indirecto, y el costeo por absorción con su generador de costos (sección 3);
- la vinculación de costos directos por receta, tiempo o cantidad (secciones 4 a 9.1);
- los criterios de reparto de indirectos del MVP (sección 9.2);
- el punto de equilibrio, que depende de cómo quedaron separados los fijos y los variables (sección 12).

La capa no inventa un modelo nuevo. Elige, entre los que el motor ya describe, el que corresponde a las respuestas del usuario, y deja registrado cuál se aplicó y por qué, en lenguaje llano.

## Límite de las preguntas

Las preguntas tienen que hablar del negocio, no de la teoría.

El usuario puede decir si fabrica uno o varios productos, si tiene la receta, si el horno o las personas se llenan primero en un día normal, o si un gasto es del local o de un producto concreto. No tiene que saber qué es el costeo ABC, la absorción, un cost driver ni la capacidad práctica.

La aplicación traduce esas respuestas al modelo. Si hace falta un dato que el usuario no tiene, la capa pide el dato del negocio (minutos que tarda una receta, importe del alquiler del mes) y no el nombre del método.

## Ejemplo de referencia

La conversación siguiente es un caso real con un modelo de IA. Muestra el tipo de decisión que la capa tiene que poder tomar: con receta y costos fijos de planta, el método más exacto es uno; para una panadería artesanal chica, conviene otro más simple, atado al recurso que se llena primero.

No es el tono ni la profundidad que debe tener la aplicación. En el ejemplo el modelo explica la teoría y pide datos ya clasificados como costos fijos, actividades y capacidad práctica. En el producto, esa explicación queda del lado de la capa. Al usuario se le pregunta solo lo que puede contestar desde su día de trabajo.

---

Usuario: Quiero conocer el costo fijo de varios productos que fabrico y conozco la receta de cada uno y tengo los costos fijos de la producción. Qué modelo asignación de costos fijos me sugerís para calcular esto de la manera más exacta posible? 
Preguntame paso a paso los datos que necesitás para cumplir con la tarea que te estoy pidiendo?

Modelo: El método más exacto, cuando ya tenés la receta de cada producto y los costos fijos de la planta, es el costeo basado en actividades (ABC) sobre capacidad práctica.

Cada costo fijo se asigna a la actividad que realmente lo genera (amasado, horneado, envasado, limpieza, control de calidad, etc.). La receta y el proceso dicen cuánto consume cada producto de esa actividad: minutos de máquina, kilos procesados, cantidad de lotes o puestas a punto. El costo de la actividad se divide por su capacidad práctica (lo que esa máquina o ese puesto puede hacer en el período), y eso se multiplica por lo que usa cada producto. Así el costo fijo por unidad refleja el uso real del recurso, y la capacidad ociosa queda aparte en lugar de inflar el costo de lo que sí se fabricó.

Para armarlo necesito los datos en orden. Arranco por el primero.

Paso 1. Listá cada costo fijo del período (mes o año, el que uses) con tres datos:

1. Nombre del costo (alquiler, sueldo del supervisor, depreciación del horno, energía fija, etc.).
2. Importe del período.
3. A qué recurso o etapa de producción está atado, si lo sabés (una máquina concreta, una línea, toda la planta, mano de obra indirecta).
Si algún costo es en parte fijo y en parte variable, separá solo la parte fija.

Usuario: Entiendo lo que me estás explicando, ahora bien, si dejo de lado el modelo ABC Costing, teniendo en cuenta esto, qué modelo de asignacion me sugerís para destribuir los cortos fijos para un emprendimiento pequeño como puede ser una elaboración de una panadería artesanal?

Modelo: Para una panadería artesanal, el modelo que más conviene es el costeo por absorción con una tasa única de costos fijos por minuto de horno.

Sumás todos los costos fijos del período y los dividís por los minutos que el horno puede trabajar a capacidad práctica (el tiempo real de horneado, sin contar lo que el horno está apagado o vacío). Eso da un costo fijo por minuto. Cada receta ya dice cuántos minutos ocupa el horno, así que el costo fijo de un producto es ese tiempo multiplicado por la tasa.

En una panadería chica el horno suele ser el recurso que limita cuánto se puede fabricar, y casi todos los costos fijos (alquiler, luz fija, depreciación, sueldos de estructura) existen para sostener esa capacidad. Con una sola cuenta por mes alcanza, y usa datos que ya tenés en la receta.

Si en tu caso el límite es la mano de obra y el horno sobra, la misma cuenta se hace con minutos de elaboración en lugar de minutos de horno.

Paso 1. Decime cuál de estos dos se llena primero en un día normal de trabajo:

1. El horno.
2. La mano de obra.

---

## Qué queda abierto

- Si esa capa es un agente o un cuestionario con reglas fijas. La especificación de producto deja la IA generativa fuera del alcance del MVP ([`01-calculadora-inteligente.md`](../../producto/01-calculadora-inteligente.md)); este documento no revierte eso. Registra que la decisión del modelo tiene que existir, y que puede resolverse sin un modelo de lenguaje.
- Qué preguntas mínimas alcanzan para elegir entre los criterios que ya describe el motor, sin pedirle al usuario que nombre un método.
- Cómo se le muestra al usuario la elección, en una frase de su negocio, y cómo puede corregirla si el recurso límite no es el que la capa supuso.
