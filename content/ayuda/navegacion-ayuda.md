# Mora — Guía de navegación y recorridos de Numora

> **Contenido derivado para asistencia al usuario; revisión funcional pendiente antes de publicar.**
> Fuentes: «Calcu — Guía de pantallas y navegación para UX/UI» (19 páginas, documento de trabajo P00–P18) y acuerdos contenidos en su sección de respuestas; auditoría READ-ONLY de Mora del 23/11/2026. Esta guía **no certifica** que las pantallas diseñadas estén disponibles.
> **Regla para Mora:** antes de indicar «hacé clic en…» o «andá a…», distinguir una ubicación comprobada de un flujo propuesto. No inventar URLs, botones ni menús; si no se puede verificar la pantalla real, indicar que el recorrido está previsto para una etapa posterior.

## Por dónde empezar

Numora está orientada a personas que elaboran y venden productos físicos. Ayuda a organizar costos, comprender cómo se forma un precio y analizar resultados. No es un sistema de facturación, inventario ni liquidación de impuestos.

El **recorrido funcional diseñado** sigue este orden:

1. Acceder a la aplicación e iniciar sesión o crear una cuenta.
2. Registrar las compras de ingredientes, insumos y packaging.
3. Crear productos y registrar recetas con cantidades y rendimiento.
4. Definir las presentaciones comerciales (unidad, caja de varias unidades, etc.) y sus materiales de empaque.
5. Indicar producción mensual planificada.
6. Registrar gastos generales del negocio para el período.
7. Revisar costo variable, distribución de gastos y costo total; evaluar precio sugerido.
8. Consultar contribución y punto de equilibrio, y luego los resultados del catálogo.

**Disponibilidad:** es el flujo objetivo de la guía UX/UI, **no** una garantía de que se pueda completar hoy de principio a fin. En la revisión del 23/11/2026 se habían identificado rutas de insumos y productos, licitaciones/proveedores y pantallas del calculador histórico. La organización exacta del menú de fase 2 todavía debe verificarse en la versión desplegada.

## Acceso a Numora (P00–P06)

- **Portada (P00):** presentación del producto y accesos a inicio de sesión y creación de cuenta. Los gráficos y tarjetas de portada son informativos, no resultados personales. La acción «Empezar cálculo» figura en la guía, pero su destino definitivo debe comprobarse en la aplicación.
- **Iniciar sesión (P01):** acceso con correo y contraseña; recuperación de contraseña y enlace para crear cuenta. La opción «Continuar sin cuenta» fue descartada en el documento funcional: **no recomendarla**.
- **Crear cuenta (P02):** nombre y apellido, correo y contraseña con confirmación; después, verificación del correo. No se solicita nombre de usuario según la especificación.
- **Revisar y confirmar el correo (P03–P04):** seguir el enlace de confirmación y consultar el estado; ante problemas, revisar spam o solicitar reenvío si la interfaz lo ofrece. No asegurar que la cuenta quedó activada hasta que el sistema lo confirme.
- **Recuperar contraseña (P05–P06):** solicitar un enlace y establecer una nueva contraseña mediante un enlace válido. Los pasos y mensajes de error dependen del estado real de la implementación.

## Inicio y menú de navegación (P07)

La guía UX/UI propone un inicio/bienvenida dentro del área privada, con menú lateral persistente en escritorio y desplegable accesible en móvil. Contempla Inicio, Insumos, Productos, Costos, Resultados, Datos históricos, Configuraciones y Cerrar sesión.

**Estado:** esta es una propuesta de organización; no afirmar que todas esas opciones existen. En particular, **Datos históricos**, **Configuraciones**, el onboarding reabrible y las tres pestañas de **Costos** tenían alcance por definir o validar. Para una duda concreta, recomendar buscar primero la sección visible en la versión del usuario y, si no está, explicar que el recorrido forma parte del diseño previsto.

## Insumos y packaging (P08–P09)

**Propósito:** mantener un registro de materiales comprados que pueda reutilizarse al definir recetas y presentaciones, en lugar de volver a ingresar el precio de cada insumo en cada producto.

La guía propone un catálogo con pestañas **Insumos** y **Packaging**, búsqueda por nombre o unidad, alta/edición y eliminación. Insumos son ingredientes o materiales de elaboración; packaging son envases y materiales de presentación. La separación en pestañas es una decisión funcional/UX de la guía, pero su disponibilidad exacta debe comprobarse en la pantalla vigente.

### Qué datos se registran

La propuesta P09 pide: **nombre**, **cantidad total comprada**, **unidad de medida** (por ejemplo, kg, g, L, ml, m o unidades) y **precio total pagado**. El costo por unidad mínima se calcula a partir de estos datos. Ejemplo del documento: 25 kg de harina por $18.750 equivalen a $0,75 por gramo.

No pedir una segunda cantidad de bolsas o envases: la aclaración funcional especifica que se registra la cantidad total en una unidad seleccionada. **Pendiente de implementación/validación:** la automatización de equivalencias y el formulario simplificado P09 no deben describirse como presentes sin verificar.

### Editar o eliminar un insumo

El flujo diseñado permite actualizar una compra y reutilizar el dato. El equipo acordó **bloquear** la eliminación de un insumo usado en una receta o de packaging asociado a una presentación, pero la aplicación efectiva de esta protección depende de que las asociaciones estén implementadas. No afirmar que el bloqueo ya está activo sin verificarlo.

## Productos y recetas (P10–P11)

El catálogo de productos permite organizar lo que fabrica el emprendimiento. En la receta se define el producto, se seleccionan insumos previamente registrados, se indica la **cantidad realmente utilizada** de cada uno y el **rendimiento del lote** (cuántas unidades elaboradas produce esa receta).

El precio de compra proviene del catálogo de insumos; no debería ingresarse nuevamente en cada receta. Si faltan datos de cantidad o rendimiento, no puede calcularse con fiabilidad el costo unitario. Esta es la regla funcional; las acciones y pantallas disponibles deben confirmarse en la aplicación actual.

## Presentaciones y costo variable (P12)

Una presentación comercial especifica cómo se vende una receta: una unidad, una caja de seis o cualquier número positivo de unidades, junto con el packaging consumido. Deben distinguirse:

- **Costo variable de elaborar una unidad:** costo de los ingredientes utilizados en la receta dividido por el rendimiento.
- **Costo variable de una presentación:** costo de las unidades elaboradas incluidas más el packaging asociado.

Ejemplo ilustrativo del acuerdo financiero: si una receta cuesta $24.000 y rinde 24 alfajores, cada alfajor tiene $1.000 de costo variable de elaboración; una caja de seis con caja de $450 y etiqueta de $50 cuesta $6.500 en variables.

No sumar alquileres u otros gastos indirectos en este cálculo. No mostrar un cero como resultado válido cuando faltan datos. **Estado:** diseño/contrato de fase 2; verificar qué parte está integrada y visible antes de dar pasos concretos.

## Producción mensual (P13)

La capacidad mensual indica **cuántas unidades se planea fabricar**, no cuántas se vendieron. La guía propone usarla para continuar con otros productos y después distribuir gastos. Sigue **por definir** si esta función será una pantalla propia o una pestaña dentro de P12. No indicar al usuario una pestaña específica como si ya existiera.

## Gastos generales y distribución (P14–P15)

Los gastos de estructura o indirectos del período —por ejemplo alquiler y servicios— se ingresan **una sola vez para el negocio**, no por receta. Después se estima qué parte corresponde a cada producto para obtener un costo total por unidad o presentación.

**Estado:** la regla definitiva de reparto entre productos estaba pendiente de validación. No afirmar que Numora distribuye actualmente esos gastos con un porcentaje o criterio particular ni improvisar una fórmula.

## Precio sugerido (P16)

Se debe separar el **margen sobre el precio** del **recargo sobre el costo**.

- **Comportamiento actual verificado en la auditoría técnica:** el motor histórico calcula el precio sugerido a partir de un margen aplicado sobre el precio de venta; el recargo equivalente aparece como información.
- **Convención acordada para fase 2:** precio sugerido mediante recargo porcentual sobre el costo total. Ejemplo: $7.000 con 30 % de recargo = $9.100.

**No presentar el recargo como la fórmula vigente hasta confirmar la integración del cambio.** Un precio sugerido es una referencia; no garantiza rentabilidad ni sustituye una decisión comercial.

## Contribución y equilibrio (P17)

La **contribución unitaria** es el precio de venta menos el costo variable unitario; sirve para cubrir gastos de estructura. No equivale a ganancia neta. El **punto de equilibrio** estima las ventas necesarias para cubrir los costos del período.

La guía diseña un equilibrio de **catálogo multiproducto**, usando mezcla, contribuciones y cuotas por producto. **Estado:** no disponible en la implementación de ayuda auditada; la descripción de fase 2 no autoriza a afirmar que el usuario ya puede consultarlo.

## Tablero global de resultados (P18)

La guía propone un tablero multiproducto con costos totales, contribución, margen, cuotas mínimas y un gráfico de equilibrio en pesos. Es un **diseño de fase 2**, no un compromiso de disponibilidad. Las comparaciones de escenarios y cambios de mezcla están fuera del alcance de esa pantalla según la guía.

## Reglas para responder preguntas de navegación

- **«¿Dónde cargo harina?»** Explicar que corresponde al catálogo de **Insumos**; no inventar la URL ni confirmar un botón cuya existencia no se verificó.
- **«¿Dónde cargo cajas?»** Explicar que el packaging se registra como material de presentación en el recorrido diseñado; si la pestaña aún no existe, reconocerlo.
- **«¿Cómo creo una caja de seis?»** Explicar la diferencia entre la receta del producto y una **presentación comercial** de seis unidades con packaging; comprobar si el formulario correspondiente está disponible.
- **«¿Dónde cargo el alquiler?»** Explicar que es un gasto de estructura o indirecto mensual; el destino diseñado es la sección de gastos generales, pero no asegurar la existencia de esa pantalla.
- **«¿Dónde veo el equilibrio de todo mi catálogo?»** Informar que el tablero multiproducto pertenece a la fase 2 y que la ayuda actual no certifica su disponibilidad.
- Cuando la persona pregunte por un botón, error o ruta no documentados, decir que no se dispone de información verificada, en lugar de inventar un recorrido.

## Chatea con tus datos

Mora puede orientar a la persona hacia **Hablá con tus datos** cuando la consulta requiere analizar información de su cuenta y esa función está disponible. El agente es de solo lectura y consulta vistas SQL y la base de conocimiento del producto.

Capacidades disponibles:
- Productos: cantidad, nombre, capacidad mensual y costo variable.
- Insumos y packaging: nombre, precio y unidades de compra.
- Recetas: insumos utilizados y sus cantidades.
- Presentaciones: formas de venta, unidades incluidas y envases.
- Gastos mensuales identificados por AAAA-MM: concepto, importe y comparaciones entre meses.
- Listados, totales y gráficos simples de los datos anteriores.

Limitaciones actuales:
- No dispone de datos suficientes para margen real, recargo real, contribución ni punto de equilibrio.
- No dispone de información específica de Licitaciones.
- No cubre históricos que dependan de funcionalidades aún no implementadas, como cerrar cálculo.
- La disponibilidad depende de que la función esté habilitada en la aplicación.

Nombres equivalentes: «Chatea con tus datos» y «Hablá con tus datos».

## Advertencias editoriales y validación pendiente

- **Por validar en código/despliegue:** estado exacto P00–P18 y estructura actual de menú.
- **Por validar funcionalmente:** equivalencias automáticas en P09, modalidad final de P13, prorrateo P15 y transición efectiva a recargo en P16.
- Esta guía contiene **resúmenes para ayuda al usuario**, no es una copia fiel ni reemplazo del documento UX/UI original.
