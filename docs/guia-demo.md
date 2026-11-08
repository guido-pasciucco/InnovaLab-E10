# Guía para presentar la demo

Recorrido completo de la Calculadora de Costos, desde la landing hasta el resumen descargable. Dura **10 a 12 minutos**.

El ejemplo es una emprendedora que vende **alfajores de maicena en caja de 6**. Todos los resultados de esta guía salieron del motor de cálculo real de la app, así que si cargás exactamente estos datos, vas a ver los mismos números en pantalla.

## Antes de empezar (el día anterior)

1. Entrá a la URL del deploy con una cuenta de demo que ya esté confirmada. La confirmación por correo no se hace en vivo.
2. Cargá el ejemplo completo hasta el **paso 8**, siguiendo la sección "Qué ingresar en cada vista". Así quedan todos los pasos desbloqueados y, si algo falla, tenés un cálculo listo.
3. El día de la demo, abrí el deploy en dos pestañas: una con la sesión cerrada (para la landing) y otra con la sesión iniciada.

> **¿Cargar en vivo o mostrar lo cargado?** Cargá en vivo el paso 1 y una línea de cada tipo de costo, así se ve cómo funciona. El resto ya lo tenés del día anterior: no hace falta tipear todo frente al público.

## El mensaje en una frase

> "Muchos emprendedores ponen el precio a ojo. Esta herramienta los lleva paso a paso hasta saber cuánto les cuesta producir, a cuánto vender y cuántas unidades necesitan para no perder plata."

## Qué ingresar en cada vista y cómo presentarla

### 1. Landing (1 min)

**Qué ingresar:** nada.

**Cómo presentarla:**
- Mostrá el título y bajá hasta la sección **"El recorrido"**.
- Decí: *"Antes de registrarse, el usuario ya sabe qué va a obtener: costo real, precio sugerido y punto de equilibrio."*

### 2. Crear cuenta e iniciar sesión (1 min)

**Qué ingresar:**
- En **Crear cuenta** solo mostrá el formulario (nombre y apellido, correo, contraseña y confirmación). No lo envíes.
- En **Iniciar sesión** ingresá el correo y la contraseña de la cuenta de demo.

**Cómo presentarla:**
- Decí: *"La cuenta se confirma por correo, y los cálculos quedan guardados en el servidor: el usuario puede cortar y retomar cuando quiera."*

### 3. Dashboard (30 s)

**Qué ingresar:** nada. Abrí el cálculo **Alfajores de maicena x6**.

**Cómo presentarlo:**
- Mostrá la lista de cálculos y en qué paso quedó cada uno.
- Decí: *"Cada producto es un cálculo independiente y se retoma desde donde quedó."*

### 4. Paso 1 · Configuración (1 min)

**Qué ingresar:**

| Campo | Valor |
| --- | --- |
| Producto o servicio | Alfajores de maicena x6 |
| Tipo | Producto |
| Moneda | ARS |
| Período | Mensual |
| Unidad de venta | Caja |
| Volumen estimado | 150 |

**Cómo presentarlo:**
- Decí: *"Arrancamos por lo básico: qué vendo y cuánto pienso vender por mes. Acá son 150 cajas. Todo lo que sigue se calcula sobre este volumen."*
- Al guardar, señalá que se desbloquea el paso 2 en la barra de progreso.

### 5. Paso 2 · Costos fijos del mes (1 min)

**Qué ingresar** (concepto y monto):

| Concepto | Monto |
| --- | --- |
| Alquiler de cocina compartida | 45000 |
| Monotributo | 40000 |
| Habilitación bromatológica | 15000 |

**Cómo presentarlo:**
- Decí: *"Los costos fijos se pagan igual si vendo 50 cajas o 500."*
- Señalá la tarjeta **"Costo unitario en vivo"** a la derecha: se actualiza con cada línea que cargás.

### 6. Paso 3 · Costos variables por unidad (1,5 min)

**Qué ingresar** (lo que pagás en cada compra y para cuántas cajas te rinde):

| Concepto | Monto de la compra | Rinde para |
| --- | --- | --- |
| Maicena y harina (bolsón) | 6000 | 4 |
| Dulce de leche 5 kg | 30000 | 15 |
| Coco rallado 1 kg | 9000 | 30 |
| Cajas y etiquetas (pack) | 12000 | 20 |

**Resultado esperado:** variable por caja **$4.400**.

**Cómo presentarlo:**
- Decí: *"Nadie compra dulce de leche para una sola caja. Cargás lo que pagás de verdad, por ejemplo el balde de 5 kg, y para cuántas cajas te alcanza. La app calcula el costo por caja."*

### 7. Paso 4 · Trabajo propio e indirectos (1 min)

**Qué ingresar:**

| Campo | Valor |
| --- | --- |
| Horas del mes | 40 |
| Valor por hora | 3500 |
| Indirecto: Gas | 20000 |
| Indirecto: Internet | 12000 |

**Resultado esperado:** costo unitario **$6.213,33** por caja (costos fijos $272.000 en total).

**Cómo presentarlo:**
- Decí: *"Este es el paso que más se olvida. Las horas en la cocina también cuestan: si no las contás, el precio queda por debajo de lo que necesitás."*
- Mostrá cómo salta el costo unitario en la tarjeta en vivo.

### 8. Paso 5 · Margen y precio sugerido (1 min)

**Qué ingresar:** Margen esperado (%) = **35**

**Resultado esperado:**

| Dato | Valor |
| --- | --- |
| Costo unitario | $6.213,33 |
| Precio sugerido | $9.558,97 |
| Contribución por unidad | $5.158,97 |
| Ganancia estimada (mensual) | $501.845,38 |

**Cómo presentarlo:**
- Probá en vivo con 20 % y volvé a 35 % para mostrar cómo reacciona el precio.
- Decí: *"El margen se mide sobre el precio de venta, no sobre el costo. Por eso el precio no es costo más 35 %: es costo dividido 0,65."*

### 9. Paso 6 · Punto de equilibrio (1 min)

**Qué ingresar:** nada, se calcula solo.

**Resultado esperado:** **53 cajas**, es decir **$503.984,29** en ventas.

**Cómo presentarlo:**
- Mostrá el gráfico y el cruce de las curvas.
- Decí: *"Con este precio tengo que vender al menos 53 cajas por mes para no perder plata. Planeo vender 150, así que estoy bastante por encima."*

### 10. Paso 7 · Comparar escenarios (2 min)

**Qué ingresar:** duplicá el escenario base y editá la copia. Si dejás un campo vacío, se mantiene el valor del escenario base.

| Escenario | Nombre del escenario | Precio de venta | Unidades del mes |
| --- | --- | --- | --- |
| A | Subo el precio | 11000 | *(vacío)* |
| B | Vendo más | *(vacío)* | 200 |

**Resultado esperado:**

| Escenario | Precio | Margen real | Ganancia estimada | Unidades de equilibrio |
| --- | --- | --- | --- | --- |
| Base | $9.558,97 | 35 % | $501.845,38 | 53 |
| A · Subo el precio | $11.000 | 43,52 % | $718.000 | 42 |
| B · Vendo más | $8.861,54 | 35 % | $620.307,69 | 61 |

**Cómo presentarlo:**
- Decí: *"El escenario base nunca se pisa. Puedo probar 'qué pasa si' sin romper mi cálculo."*
- En A: *"Si subo el precio a $11.000, gano $216.000 más por mes y necesito vender 11 cajas menos para cubrir costos."*
- En B: *"Si vendo 200 cajas, los costos fijos se reparten entre más unidades. Con el mismo margen puedo bajar el precio a $8.861 y aun así ganar más."*
- Opcional: en **"Aumento esperado de tus costos variables (%)"** ingresá **10** y mostrá cómo impactaría la inflación.

### 11. Paso 8 · Resumen y compartir (1 min)

**Qué ingresar:** nada.

**Resultado esperado:**

| Fila | Valor |
| --- | --- |
| Producto | Alfajores de maicena x6 |
| Costo unitario | $6.213,33 |
| Precio sugerido | $9.558,97 |
| Margen real | 35 % |
| Ganancia estimada | $501.845,38 |
| Equilibrio | 53 u. · $503.984,29 |

**Cómo presentarlo:**
- Leé la línea de **supuestos**: *"Así se sabe sobre qué base se calculó: período mensual, 150 cajas y sin costos de venta."*
- Hacé clic en **Descargar ficha en PDF** y abrí el archivo.
- Hacé clic en **Copiar resumen** y pegalo en un chat.
- Mostrá **Enviar por WhatsApp** y aclará que es lo próximo que viene: hoy está deshabilitado.
- Cerrá con **Nuevo cálculo**: vuelve al paso 1 con un borrador limpio.

## Cierre (30 s)

> "En diez minutos pasamos de *no sé cuánto me cuesta una caja de alfajores* a tener un precio justificado, el punto de equilibrio y una ficha lista para compartir."

## Preguntas probables

| Pregunta | Respuesta |
| --- | --- |
| ¿Por qué el equilibrio en pesos no es 53 × precio? | Se calcula con las unidades exactas (52,72). Las 53 que se ven están redondeadas hacia arriba, y el monto coincide con el del paso 6. |
| ¿Por qué en el escenario B baja el precio? | Al no cargar precio, la app mantiene el margen del 35 % y recalcula el precio con el nuevo costo por caja, que es más bajo. |
| ¿Contempla impuestos o comisiones de venta? | Todavía no. Por eso el resumen dice "sin costos de venta". |
| ¿Se pierde el cálculo si cierro? | No. El borrador se guarda en el servidor y se retoma desde el dashboard. |
| ¿Reemplaza a un contador? | No. Es una herramienta de apoyo, y así lo aclara el resumen. |

## Si algo falla en vivo

- **El deploy tarda en responder:** esperá unos segundos y recargá. La primera carga puede ser más lenta.
- **Un paso te redirige a otro:** ese cálculo todavía no llegó a ese paso. Avanzá con **Siguiente** desde donde quedó, o abrí el cálculo que dejaste preparado.
- **El PDF no descarga:** usá **Copiar resumen** como plan B.
