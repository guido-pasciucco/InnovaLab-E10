# Costos para emprendedores

## Conceptos básicos para comprender el cálculo de costos

**Esta secuencia de 22 puntos no es casual. Para trabajar en costos y diseñar un modelo (o motor) el equipo debe construir mentalmente esta cadena:**

- **¿Qué quiero calcular?** → **Objeto de costo**
- **¿En qué unidad?** → **Unidad de costeo**
- **¿Qué recursos consumo?** → **Costos**
- **¿Cómo se comportan?** → **Fijos / Variables**
- **¿Puedo identificarlos directamente?** → **Directos / Indirectos**
- **¿Cómo los asigno?** → **Asignación + criterio de asignación**
- **¿Cuánto cuesta producir?** → **Costo total**
- **¿Cuánto cuesta cada unidad?** → **Costo unitario**
- **¿Cuánto necesito vender para cubrir mis costos?** → **Margen de contribución + Punto de equilibrio**

**Esto es el núcleo que el equipo necesita dominar antes de empezar a discutir modelos y cálculos.**

**Es lo que se enseña en cualquier formación introductoria de Administración, Contabilidad o Costos: El modelo tradicional de costeo:**

- **Costos directos** → se asignan directamente al producto.
- **Costos indirectos** → se distribuyen entre los productos utilizando algún criterio de asignación.

> **Importante:** Primero tenemos que definir qué tipo de usuario queremos atender y qué nivel de precisión necesita.

---

## 1. Costo

**Definición:** Es el valor económico de los recursos utilizados para producir un bien, prestar un servicio o desarrollar una actividad determinada.

**Ejemplo:** materia prima, trabajo, electricidad o materiales utilizados para producir. Todos esos ***recursos*** representan costos vinculados con la producción.

**Para Desarrollo:**
El sistema debe identificar qué recursos se consumen y con qué producto o servicio están relacionados.

---

## 2. Objeto de costo

Es aquello cuyo costo queremos determinar.
Puede ser un producto, un servicio, un pedido o un proyecto.

**Ejemplo:** una torta de chocolate, una reparación de PC o un servicio de consultoría.

**Concepto fundamental:** Antes de calcular un costo hay que definir qué queremos costear (por ende, esto nos dirá cuál será el Modelo de Costo).

---

## 3. Unidad de costeo

Es la unidad concreta **respecto de la cual se expresa el costo**.

**Ejemplos:** una torta, un kilogramo, un litro, una hora de servicio o una reparación.

Esto es fundamental para una aplicación informática porque el usuario debe poder definir (y entender) cuál es la unidad sobre la que quiere obtener el costo, ya que un costo siempre va relacionado a una cantidad producida.

---

## 4. Costo total

Es la suma de todos los costos asociados con la producción de un producto o la prestación de un servicio durante un determinado período o cantidad de producción.

---

## 5. Costo unitario

Es el costo correspondiente a una unidad de objeto de costo.

**Fórmula básica:**

> **Costo unitario = Costo total ÷ Cantidad de unidades**

Ej.: Costo total: \$500.000; Producción: 100 unidades
Costo unitario = \$5.000

---

## 6. Costo directo

Es un costo que puede identificarse y **asignarse** de manera económicamente razonable a un producto o servicio (el objeto de costo).

**Ejemplo:** la madera utilizada específicamente para fabricar una mesa.

> **NOTA — Asignación de costos:** Es **determinar cuánto de un costo corresponde a cada producto o servicio**.

---

## 7. Costo indirecto

Es un costo que está relacionado con la producción o prestación del servicio, pero que no puede asignarse directamente a un producto o servicio determinado.

**Ejemplo:** el alquiler de un taller donde se fabrican varios productos, el mantenimiento general, supervisión o alquiler del lugar de producción.

> **NOTA:** Un costo no es directo o indirecto por su naturaleza. Depende de si podemos identificarlo razonablemente con un determinado producto o servicio.

Un ejemplo muy bueno de esto es la electricidad:

- Una máquina produce exclusivamente el **Producto A** y podemos medir la electricidad que consume (fuerza motriz) → **costo directo** del Producto A.
- Un taller utiliza la misma instalación eléctrica para fabricar varios productos y no podemos determinar cuánto consume cada uno → **costo indirecto**.

---

## 8. Costo fijo

Es un costo cuyo importe total permanece relativamente constante durante un determinado período, aunque aumente o disminuya la cantidad producida o vendida.

**Ejemplo:** alquiler mensual de un local, seguros; determinados salarios; software contratado por abono mensual.

**Importante para Desarrollo:**
"Fijo" no significa que el costo nunca pueda cambiar. Significa que **no cambia proporcionalmente** con el nivel de actividad dentro del rango considerado.

---

## 9. Costo variable

Es un costo cuyo importe total cambia cuando cambia la cantidad producida o vendida.

**Ejemplo:** si para fabricar una unidad se necesitan \$2.000 de materia prima, producir más unidades requiere más materia prima.

| Cantidad producida | Costo variable total |
| ------------------ | -------------------- |
| 10 unidades        | \$20.000             |
| 100 unidades       | \$200.000            |
| 1.000 unidades     | \$2.000.000          |

El costo total varía con la cantidad producida.

---

## 10. Costo variable unitario

Es el costo variable correspondiente a una unidad de producto o servicio.

**Ejemplo:** si cada producto requiere \$2.000 de materia prima, el costo variable unitario es \$2.000.

Si se producen 100 unidades: el costo variable **total** de ese lote de 100 unidades será \$200.000. Pero el costo variable unitario continúa siendo: \$2.000.

---

## 11. Costo fijo unitario

Es el resultado de distribuir el costo fijo total entre las unidades producidas.

**Ejemplo:**

- Costo fijo mensual: \$100.000
- Producción: 100 unidades
- **Costo fijo unitario = \$1.000**

Si se producen 200 unidades, el costo fijo unitario disminuye a \$500.

> **NOTA:** Este es uno de los conceptos que más dificultades puede generar al principio.

---

## 12. Materia prima o material directo

Es el material que forma parte del producto y cuyo costo puede identificarse directamente con él.

**Ejemplo:** harina para fabricar pan o madera para fabricar una mesa.

Los materiales directos constituyen **uno de los componentes** clásicos del costo de producción.

---

## 13. Mano de obra directa

Es el trabajo de las personas que participa directamente en la producción de un producto o en la prestación de un servicio y cuyo costo puede identificarse con ese producto o servicio.

**Ejemplo:** las horas de trabajo de una persona que fabrica un mueble. Si conocemos el costo de esa hora de trabajo, podemos asignarlo directamente al producto.

---

## 14. Costos indirectos de producción

Son los costos necesarios para producir, pero que no pueden asignarse directamente a una unidad determinada.

**Ejemplos:** mantenimiento, electricidad general, supervisión o alquiler del lugar de producción. Son costos indirectos.

---

## 15. Asignación de costos

Es determinar **cuánto de un costo corresponde a cada producto o servicio**.

**Ejemplo:** distribuir el costo de electricidad entre los distintos productos fabricados.

---

## 16. Criterio de asignación

Es la forma que se utiliza para determinar cuánto de un costo corresponde a cada producto o servicio.

**Ejemplos:** horas de trabajo, horas de máquina, unidades producidas o superficie utilizada.

---

## 17. Período de costeo

Es el período de tiempo que se toma para identificar y calcular los costos.

**Ejemplos:** una semana, un mes, un trimestre o un año.

---

## 18. Cantidad producida

Es la cantidad de unidades de producto o servicio que se producen o prestan durante un determinado período.

Este dato es fundamental porque permite calcular, entre otras cosas, el **costo unitario**.

---

## 19. Costo del producto

Es el conjunto de costos relacionados con la producción de un producto.

En términos básicos comprende:

**Materiales directos + Mano de obra directa + Costos indirectos de producción.**

---

## 20. Costo completo

Es el costo que contempla **todos los costos que se decida incorporar al producto o servicio según el modelo de costeo utilizado**.

Esto requiere definir qué costos deben incluirse y **cómo se asignan**.

---

## 21. Contribución marginal

Es la diferencia entre las ventas y los costos variables.

> **Margen de contribución = Ventas – Costos variables**

Indica cuánto queda disponible para cubrir los costos fijos y, una vez cubiertos estos, generar resultado.

---

## 22. Punto de equilibrio

Es el nivel de ventas en el que los ingresos alcanzan exactamente para cubrir los costos, sin obtener ganancia ni pérdida.

En términos sencillos:

> **Es la cantidad que necesito vender para no perder dinero.**

---

Teniendo lo anterior, es posible avanzar a algo más sofisticado, como costeo ABC, prorrateo, inductores de costos, centros de costos, costeo por órdenes/procesos, mermas, scrap, etc.

---

# Costos ABC

El **Costeo Basado en Actividades (ABC)** intenta hacer más precisa la asignación de los costos indirectos.

En lugar de hacer simplemente:

> **Costo → Producto**

plantea:

> **Costo → Actividad → Inductor → Producto**

Por ejemplo, una empresa tiene costos asociados con:

- preparar máquinas;
- realizar controles de calidad;
- procesar pedidos;
- realizar compras.

ABC intenta determinar **cuánto de esas actividades consume cada producto**.

Por eso puede ser más preciso cuando una empresa tiene:

- muchos productos;
- procesos diferentes;
- costos indirectos importantes;
- actividades muy diversas.

## Una comparación sencilla

Imaginemos que tenemos **\$1.000.000 de costos indirectos**.

**Modelo tradicional:**
"Los distribuimos según horas de producción."

**ABC:**
"Primero identificamos qué actividades generan esos costos y luego determinamos cuánto de cada actividad consume cada producto."

---

**No necesitamos decidir ahora que nuestra calculadora deberá utilizar ABC.**

Primero tenemos que definir **qué tipo de usuario queremos atender y qué nivel de precisión necesita**.

- Para un pequeño emprendedor que fabrica tres o cinco productos, probablemente un modelo sencillo y transparente sea mucho más útil que un sistema ABC.
- En cambio, si pretendemos desarrollar una herramienta capaz de costear empresas con muchos productos, múltiples procesos y una estructura importante de costos indirectos, **ABC puede adquirir mucho más sentido**.

Por eso, para este proyecto, yo presentaría ABC como **un modelo de costeo de mayor sofisticación que el modelo tradicional**, no como "el modelo correcto" frente a uno "incorrecto".

**ABC no es simplemente una fórmula para calcular costos.** Es un **modelo o metodología de costeo** que busca asignar los costos indirectos a los productos o servicios en función de las actividades que generan esos costos.
