# INNOVA LAB 2026 / PRODUCTO DIGITAL

> **Registro histórico.** Esta guía se conserva tal como la escribió Malena, como foto de su versión de las decisiones. No se actualiza: donde difiere de lo decidido, manda el registro de decisiones de la fase (`04-decisiones.md`) y los documentos `bloque-N/diferencias-malena.md` explican cada diferencia.

## Guía de pantallas y navegación

**ESPECIFICACIÓN PARA UX/UI · Documento de trabajo**

Esta guía explica qué necesita encontrar y hacer la persona usuaria en cada pantalla. Está organizada para diseñar en Figma, revisar el recorrido con el equipo y entregar pantallas comprensibles a Frontend.

**ALCANCE**: Emprendedores que elaboran y venden productos físicos. No es un sistema de facturación, inventario, impuestos ni asesoramiento contable.

---

## 01 | El recorrido, de un vistazo

La persona usuaria registra lo que compra, arma sus productos, completa los gastos del negocio y obtiene precios y resultados. El diseño debe acompañar ese orden, sin pedir los mismos datos dos veces.

- **ACCESO** · Home → Iniciar sesión / Crear cuenta → Confirmación de correo → Bienvenida.
- **PRODUCTOS** · Catálogo de insumos y packaging → Producto y receta → Presentaciones y costo variable → Capacidad mensual → ¿Otro producto?
- **COSTOS Y PRECIOS** · Gastos indirectos del mes → Distribución entre productos → Costo total → Recargo → Precio sugerido.
- **RESULTADOS** · Contribución y equilibrio → Tablero de todo el catálogo.

---

## 02 | Detalle de cada pantalla

En cada ficha: propósito, contenido visible, acciones, estados y fuente. Los ejemplos de nombres, montos o unidades son ilustrativos; no deben asumirse como datos predeterminados.

### A. Acceso a la aplicación

#### P00 · Home / portada

*(Primera pantalla que ve la persona usuaria al ingresar al link de la app. Pantalla ya creada a partir del issue #216 (cerrado); se pueden leer las referencias desde allí.)*

- **PARA QUÉ SIRVE**: Presentar la aplicación a quien ingresa por primera vez y facilitar el acceso al recorrido principal. Esta Home ya está desarrollada: no se solicita diseñarla desde cero.
- **QUÉ DEBE VERSE**: Conservar la composición ya implementada: marca, titular y descripción, CTA «Empezar cálculo», enlaces «Iniciar sesión» y «Crear cuenta», gráfico de muestra y tres tarjetas informativas: Costos, Precios y Punto de equilibrio. Las tarjetas explican funciones; NO son tres pantallas nuevas ni contienen cálculos personales.
- **QUÉ PUEDE HACER**: Iniciar sesión, crear cuenta o seleccionar «Empezar cálculo». Verificar con el equipo que el destino del CTA corresponda al recorrido actualizado (acceso/catálogo), no asumir automáticamente la ruta histórica del wizard. *(Importante para el equipo Front-End)*
- **INTERACCIÓN Y ACCESIBILIDAD**: «Hover» = cambio visual al pasar el mouse; «foco» = señal visible al llegar con la tecla Tab; «CTA accesible» = botón que se entiende, tiene contraste adecuado y puede activarse con teclado y pantalla táctil. Revisar estas condiciones también en móvil.
- **ALCANCE UX/UI Y QA**: Pantalla existente. La tarea es mantener coherencia visual y revisar las observaciones QA ya registradas; cualquier ajuste debe ser puntual. Las tarjetas y el gráfico son recursos de presentación: no muestran resultados reales de la cuenta.

#### P01 · Iniciar sesión

*(Pantalla creada a partir del issue #205 (cerrado).)*

- **PARA QUÉ SIRVE**: Permitir volver a los datos propios.
- **QUÉ DEBE VERSE**: Correo electrónico; contraseña; botón mostrar/ocultar; «Recordarme»; «¿Olvidaste tu contraseña?»; «Ingresar»; «Crear cuenta». ~~«Continuar sin cuenta»~~ (flujo por confirmar; **esto no va — debe ser eliminado**).
- **QUÉ PUEDE HACER**: Ingresar, recuperar contraseña, registrarse.
- **ESTADOS Y MENSAJES**: Campos obligatorios; email inválido; clave errónea; cargando; error de conexión con explicación; sesión iniciada. Mensajes ya creados y validados.

#### P02 · Crear cuenta

*(Pantalla creada a partir de los issues #183 (cerrado), #184 (abierto).)*

- **PARA QUÉ SIRVE**: Registrar a la persona emprendedora sin pedir información innecesaria.
- **QUÉ DEBE VERSE**: Nombre y apellido; email; contraseña y confirmación; mostrar/ocultar; acceso a login; nota de términos «Documentación pendiente». No pedir «Nombre de usuario».
- **QUÉ PUEDE HACER**: Crear cuenta; ver errores específicos; pasar a verificación del email.
- **ESTADOS Y MENSAJES**: Correo duplicado/inválido, claves distintas, guardando, error y registro enviado. Mensajes ya creados y validados.
- **CRITERIO UX**: Nombre de negocio podría agregarse como otro ítem de registro.

#### P03 · Revisá tu correo

*(Pantalla creada a partir del issue #200 (cerrado), #184 (abierto).)*

- **PARA QUÉ SIRVE**: Indicar el siguiente paso después del registro.
- **QUÉ DEBE VERSE**: Título y mensaje «Te enviamos un enlace a {email}»; ayuda sobre spam; «Ya verifiqué mi correo»; «Reenviar correo»; «Cambiar correo».
- **QUÉ PUEDE HACER**: Comprobar confirmación real; reenviar; editar dirección.
- **ESTADOS Y MENSAJES**: Sin verificar, verificado, reenviado, reenvío limitado, cargando, error.
- **CRITERIO UX**: No mostrar «Cuenta activada» hasta que el sistema confirme el estado.

#### P04 · Confirmación de correo

*(Referencia: issue #184 (abierto).)*

- **PARA QUÉ SIRVE**: Dar respuesta clara al abrir el enlace recibido.
- **QUÉ DEBE VERSE**: Confirmación efectiva o explicación de enlace vencido, incorrecto o usado; navegación a login o reenvío.
- **QUÉ PUEDE HACER**: Continuar al acceso; recuperar un enlace válido.
- **ESTADOS Y MENSAJES**: Verificando, éxito, expirado, inválido, error técnico.
- **CRITERIO UX**: Separar explícitamente verificación de cuenta de recuperación de contraseña.

#### P05 · ¿Olvidaste tu contraseña?

*(Referencia: #185 (abierto).)*

- **PARA QUÉ SIRVE**: Ayudar a recuperar acceso con privacidad.
- **QUÉ DEBE VERSE**: Campo de correo; CTA «Enviar enlace»; instrucciones breves; volver a «Iniciar sesión».
- **QUÉ PUEDE HACER**: Solicitar enlace de recuperación.
- **ESTADOS Y MENSAJES**: Email inválido; envío; respuesta neutral; error técnico o límite de intentos.
- **CRITERIO UX**: La respuesta no debe revelar si existe una cuenta asociada a ese correo.

#### P06 · Nueva contraseña

*(Referencia: #185 (abierto) y #125 (abierto).)*

- **PARA QUÉ SIRVE**: Permitir establecer una contraseña desde un enlace válido.
- **QUÉ DEBE VERSE**: Nueva contraseña y confirmación; mostrar/ocultar; botón de guardar; vínculo para solicitar otro enlace.
- **QUÉ PUEDE HACER**: Guardar clave y regresar a login.
- **ESTADOS Y MENSAJES**: Enlace válido, vencido o usado; no coincide; guardando; éxito; error.
- **CRITERIO UX**: La pantalla debe verificar que el enlace y la sesión de recuperación sean válidos.

### B. Inicio de la aplicación, navegación y catálogo

#### Navegación común — menú lateral

Desde P07 comienza el área privada de la aplicación: primero se ve la pantalla de Inicio / Bienvenida. En escritorio debe tener un **menú lateral visible y persistente**, que también se mantiene en P08–P13 y las etapas siguientes. En móvil, debe poder abrirse como menú desplegable accesible.

**Opciones del menú**:

- «Inicio»
- «Insumos» (incluye la pestaña Packaging)
- «Productos» (incluye pestaña de presentaciones)
- «Tabla de resultados / Tablero / tablero de control» (todas las cuentas finales de cada producto, con desglose de costos, precio sugerido, contribución y margen; y acceso al equilibrio)
- «Datos históricos»
- «Configuraciones»
- «Cerrar sesión»

En cuanto al **menú lateral**: la idea es agregar otro apartado llamado **Costos**, donde se va a poder ver: **Costos**, organizada en tres pestañas: «Costos Variables», «Costos Fijos e indirectos» y «Costos totales». (#241–#243–#244)

La intención sería facilitar la consulta y administración de los costos del negocio desde un mismo lugar. En el caso de los costos directos, la información ya se obtiene de las recetas y presentaciones de cada producto, por lo que no debería solicitarse nuevamente su carga.

**Comportamiento**:

- Destacar la sección activa.
- Permitir volver al Inicio.
- Advertir si al cambiar de sección hay cambios sin guardar.
- Ofrecer desde Configuraciones la opción de volver a ver el onboarding.
- «Datos históricos» y otros ajustes necesitan definir el alcance funcional con el equipo (por definir con Ariel); el menú sí debe reservarles lugar.
- Cerrar sesión debe finalizar la sesión y regresar al acceso.

#### P07 · Inicio / bienvenida de la aplicación

*(Referencia: Diagrama bloque 1.)*

- **PARA QUÉ SIRVE**: Ser la primera pantalla del área privada al iniciar sesión. Dar la bienvenida, explicar cómo empezar y permitir acceder a las distintas funciones mediante el menú lateral.
- **QUÉ DEBE VERSE**: Bienvenida; explicación del recorrido en lenguaje simple (onboarding guiado, solo aparece la primera vez que una persona usuaria ingresa pero queda guardado en configuraciones); accesos al Menú lateral con las opciones definidas al inicio de esta sección y acceso rápido a los datos del negocio.
- **QUÉ PUEDE HACER**: Desde el Inicio, la persona usuaria puede elegir por dónde empezar: cargar insumos, crear o consultar productos y acceder a las demás secciones desde el menú lateral. Si ya utilizó la aplicación, puede ver qué información tiene registrada, identificar lo que le falta completar y continuar desde allí. También puede abrir Configuraciones o cerrar sesión desde el menú.
- **CRITERIO UX**: El Inicio debe ser la pantalla de entrada habitual después de iniciar sesión. En el primer ingreso, se muestra un tutorial guiado que explica cómo usar la aplicación. En los siguientes ingresos, se muestra directamente el Inicio, con un resumen claro de los productos, los datos cargados y las tareas pendientes. El menú lateral debe permanecer disponible para moverse entre secciones sin repetir el tutorial. La persona usuaria podrá volver a abrirlo cuando quiera desde Configuraciones.

#### P08 · Catálogo de insumos y packaging

*(Referencia: issue #239, tiene capturas de referencia.)*

- **PARA QUÉ SIRVE**: Reunir los insumos y materiales de packaging que compra el emprendimiento en un catálogo propio. Cada elemento tiene registrado su precio, cantidad y unidad de compra. Luego se reutiliza en las recetas y presentaciones de los productos, sin volver a cargar el mismo precio en cada producto.
- **QUÉ DEBE VERSE**: Acceso desde la opción «Insumos» del menú lateral y encabezado del catálogo. La pantalla tendrá dos pestañas independientes: «Insumos» y «Packaging». Cada pestaña mostrará su propio listado de elementos, utilizando el mismo diseño de tabla y las mismas funcionalidades de búsqueda, carga, edición y eliminación. Habrá un buscador por nombre o unidad y un botón «Agregar insumo» o «Agregar packaging», según la pestaña. Cada fila mostrará el nombre, la cantidad comprada, la unidad de compra, el precio total pagado, el costo calculado por unidad mínima (por ejemplo, $/g, $/ml o $/unidad) y las acciones «Editar» y «Eliminar».
- **QUÉ PUEDE HACER**: Consultar los elementos registrados, buscar por nombre o unidad, alternar entre Insumos y Packaging, agregar uno nuevo o editar uno existente mediante el modal P09, y eliminarlo con confirmación. Puede regresar a esta pantalla desde el menú lateral cuando necesite actualizar un precio o consultar sus datos; lo que registre queda guardado para utilizarlo en los productos.
- **ESTADOS Y MENSAJES**: Catálogo vacío: explicar qué se carga aquí y mostrar un botón para agregar el primer elemento. Búsqueda sin resultados: indicarlo y permitir limpiar el filtro. Mostrar carga, confirmación de guardado o eliminación y errores con opción de reintentar. **Definido por el equipo**: si la persona usuaria intenta eliminar un insumo asociado a una receta, el sistema debe bloquear la eliminación y mostrar un mensaje explicativo: «No podés eliminar este insumo porque está asociado a uno o más productos. Primero quitá el insumo de las recetas correspondientes». La misma protección debe aplicarse al packaging vinculado a presentaciones comerciales. Esta restricción debe validarse tanto en la interfaz como en el backend para garantizar la integridad de los datos.
- **CRITERIO UX**: «Insumos» y «Packaging» son pestañas de UNA misma pantalla, no dos pantallas distintas. P09 es el modal para cargar o editar datos. Diferenciar claramente «Precio total pagado por la compra» de «Costo por unidad mínima», que calcula la aplicación. Ejemplo: 25 kg de harina por $18.750 equivalen a $0,75 por gramo. No pedir a la persona usuaria que calcule ese valor ni confundirlo con el precio del producto terminado. Diseñar la tabla también para celular.

#### P09 · Agregar / editar insumo o packaging (modal)

- **PARA QUÉ SIRVE**: Registrar o corregir una compra sin abandonar el catálogo.
- **QUÉ DEBE VERSE** *(reformulación)*: Modal para agregar o editar un insumo o material de packaging, con los siguientes campos:
  - **Nombre**: identificación del insumo o material.
  - **Cantidad comprada**: cantidad total adquirida, expresada numéricamente.
  - **Unidad de medida**: selector con opciones predefinidas (kg, g, litros, ml, metros, unidades, etc.). El ícono (?) de ayuda explicará que debe seleccionarse la unidad en la que se expresa la cantidad del insumo comprada.
  - **Precio total pagado**: importe correspondiente a toda la cantidad registrada.
  - **Costo por unidad mínima**: calculado automáticamente por la aplicación.

  Ejemplo: si el usuario compra una bolsa de harina de 25 kg por $18.750, deberá ingresar: Nombre «Harina», Cantidad «25», Unidad de medida «kg» y Precio «$18.750». La aplicación mostrará automáticamente $0,75/g, es decir, cuánto le cuesta cada gramo de harina.

  **Aclaración UX/UI**: No se solicita la cantidad de bolsas o envases como campo adicional. El usuario registra la cantidad total adquirida y selecciona su unidad de medida. La propuesta es automatizar las equivalencias conocidas para no exigir cálculos manuales. Botones «Guardar» y «Cancelar».

  **Pendiente de validación funcional**: Esta propuesta simplifica el formulario actual del issue #239, que también permite cargar unidad mínima y equivalencia (ambas son correctas pero es información irrelevante para el usuario, PERO muy importante para el sistema). *(Ejemplo visual: ver documento fuente.)*
- **QUÉ PUEDE HACER**: Guardar, cerrar, volver a la fila de origen.
- **ESTADOS Y MENSAJES**: Obligatorios; cantidades y precios inválidos; guardando; duplicados; error de servidor.
- **CRITERIO UX**: Mantener foco y navegación por teclado. Si el precio cambió, informar que podría afectar productos vinculados.

#### P10 · Mis productos / catálogo

*(Referencia: #240, con capturas de referencia.)*

- **PARA QUÉ SIRVE**: Consultar y administrar los productos del negocio.
- **QUÉ DEBE VERSE**: Listado de productos propios; nombre; estado de receta; presentaciones; capacidad mensual cuando exista; acciones Crear / Abrir / Editar / Eliminar.
- **QUÉ PUEDE HACER**: Dar de alta producto, editarlo, ver sus cálculos, completar catálogo y continuar.
- **ESTADOS Y MENSAJES**: Catálogo vacío; producto incompleto; error de guardado; eliminación confirmada.
- **CRITERIO UX**: Sugerencia UX: diferenciar «Producto listo» de «Faltan datos para calcular».

#### P11 · Producto y receta (modal dentro de la misma pantalla)

- **PARA QUÉ SIRVE**: Definir qué se fabrica, con qué insumos y cuántas unidades rinde. (La persona usuaria carga el producto, introduce los ingredientes y finalmente indica cuántas unidades obtiene con esa receta.)
- **QUÉ DEBE VERSE**: Nombre del producto; selección de insumos del catálogo; cada cantidad usada con su unidad; rendimiento de la receta/lote; renglones agregables y editables.
- **QUÉ PUEDE HACER**: Agregar insumo, ajustar receta y rendimiento, guardar, ir a presentaciones.
- **ESTADOS Y MENSAJES**: Sin insumos disponibles; nombre vacío; cantidades incorrectas; rendimiento ausente/cero; guardado fallido.
- **CRITERIO UX**: No volver a pedir el precio de compra de cada insumo: viene de P08. Ofrecer acceso contextual para cargar uno nuevo.
- **REFERENCIA**: #240, #241 y acuerdo financiero del 11/11.

#### P12 · Presentaciones y costo variable

*(Referencia: issue #241.)*

- **PARA QUÉ SIRVE**: Mostrar cuánto cuesta elaborar la unidad y cuánto cuesta vender cada presentación.
- **QUÉ DEBE VERSE**: Dos resultados diferenciados: «Costo variable de elaborar una unidad» y «Costo variable de esta presentación». Lista editable de presentaciones (ej. unidad/caja x6), unidades contenidas y packaging seleccionado con cantidades; detalle «¿Cómo se calculó?».
- **QUÉ PUEDE HACER**: Agregar/editar/quitar presentación; vincular packaging; ver desglose; guardar.
- **ESTADOS Y MENSAJES**: Receta incompleta, packaging sin precio, rendimiento inválido, cálculo no disponible, guardado.
- **CRITERIO UX**: La cantidad por presentación es configurable, no solo x4/x6/x12. No mostrar $0 como si fuera válido cuando faltan datos. No sumar gastos indirectos aquí.

#### P13 · Capacidad mensual / ¿Otro producto?

*(Referencia: #242 (abierto).)*

- **PARA QUÉ SIRVE**: Registrar cuánto se planea producir y decidir si ampliar el catálogo.
- **QUÉ DEBE VERSE**: Producto de referencia; campo «¿Cuántas unidades pensás fabricar este mes?» con unidad; resumen de productos y capacidad; «Agregar otro producto» / «Continuar».
- **QUÉ PUEDE HACER**: Guardar capacidad; repetir flujo de producto; finalizar lista y pasar a gastos.
- **ESTADOS Y MENSAJES**: Sin capacidad; número inválido; cambios sin guardar; catálogo vacío.
- **CRITERIO UX**: Capacidad de PRODUCCIÓN no es cantidad VENDIDA.
- **POR DEFINIR**: Integrar esta funcionalidad como una segunda pestaña dentro de P12 en lugar de diseñarla como una pantalla independiente. Por lo tanto, P12 tendría dos pestañas: (1) Costos y presentaciones — cálculo de costos variables y gestión de presentaciones del producto; (2) Producción mensual — registro y edición de la cantidad de unidades que se estima fabricar por mes, tanto de la unidad como de presentaciones más grandes.

### C. Gastos del negocio y precios

> Las pantallas de los puntos C y D son sumamente importantes y deben ser conversadas tanto su diseño como sus resoluciones matemáticas por el equipo Funcional, QA, DATA, UX/UI y Front-End.

#### P14 · Costos indirectos del mes

*(Referencia: #243 (abierto); #211 (cerrado, patrón de tabla).)*

- **PARA QUÉ SIRVE**: Registrar los gastos generales UNA SOLA VEZ para el negocio.
- **QUÉ DEBE VERSE**: Lista editable de concepto + importe; botón «Agregar concepto»; subtotal; moneda ARS y período mensual; ejemplos como alquiler/servicios.
- **QUÉ PUEDE HACER**: Agregar, editar, eliminar, guardar y continuar.
- **ESTADOS Y MENSAJES**: Lista vacía, importe inválido, guardando, subtotal no disponible, error.
- **CRITERIO UX**: Por confirmar rótulo: «costos indirectos» y «costos fijos» no son exactamente lo mismo.

#### P15 · Distribución de gastos y costo total

*(Referencia: #244 (abierto), #250 (abierto).)*

- **PARA QUÉ SIRVE**: Mostrar qué parte de los gastos corresponde a cada producto.
- **QUÉ DEBE VERSE**: Gastos totales del mes, capacidad de cada producto, participación/asignación, costo variable y costo total por unidad o presentación; acceso «¿Cómo se distribuyó?».
- **QUÉ PUEDE HACER**: Revisar cálculo y volver a editar capacidad o gastos; continuar al precio.
- **ESTADOS Y MENSAJES**: Sin capacidades, gastos faltantes, cálculo imposible, error, datos actualizados.
- **CRITERIO UX**: Por confirmar: regla final de prorrateo. El diseño NO debe fijar porcentajes ni coeficientes sin validación funcional.

#### P16 · Precio sugerido

*(Referencia: #245 (abierto), acuerdo #241.)*

- **PARA QUÉ SIRVE**: Dejar que la persona decida cuánto sumar a su costo total.
- **QUÉ DEBE VERSE**: Por producto/presentación: costo total; campo «Recargo sobre el costo (%)»; precio sugerido; explicación breve de la cuenta; ejemplo $7.000 + 30 % = $9.100.
- **QUÉ PUEDE HACER**: Cambiar recargo, guardar, revisar costo anterior, continuar.
- **ESTADOS Y MENSAJES**: Sin costo total; porcentaje inválido; calculando; guardando; error.

#### P17 · Contribución y punto de equilibrio

*(Referencia: #246 y #250, abiertos.)*

- **PARA QUÉ SIRVE**: Explicar cuánto aporta vender cada producto y cuántas ventas cubren los gastos.
- **QUÉ DEBE VERSE**: Contribución por producto; margen monetario; mezcla/cuota del catálogo; unidades y pesos necesarios para el equilibrio; referencias a productos y período.
- **QUÉ PUEDE HACER**: Ver desglose; modificar entradas; avanzar al tablero.
- **ESTADOS Y MENSAJES**: Contribución nula/negativa, faltan datos, división imposible, actualización de resultados, error.
- **CRITERIO UX**: Por confirmar: cálculo final de mezcla, cuota y equilibrio en pesos. No presentar un resultado positivo cuando la contribución no alcanza.

### D. Resultados y seguimiento

#### P18 · Tablero final del catálogo

*(Referencia: #247 (abierto); #218 (cerrado, maqueta antigua).)*

- **PARA QUÉ SIRVE**: Permitir entender el resultado global y comparar los productos.
- **QUÉ DEBE VERSE**: Resumen del equilibrio del negocio; tabla por producto (costo total, contribución y margen); cuota mínima de cada uno; gráfico EN PESOS de gastos del mes y contribución de la mezcla con cruce en equilibrio; desglose junto al gráfico.
- **QUÉ PUEDE HACER**: Consultar valores; revisar un producto; volver a corregir datos; ver explicación.
- **ESTADOS Y MENSAJES**: Sin resultados, cálculo pendiente, error y resultados listos; cambios posteriores en datos.
- **CRITERIO UX**: El tablero nuevo es MULTIPRODUCTO. Comparar escenarios o cambiar mezcla está FUERA del alcance del #247.

---

## 03 | Reglas comunes para diseñar

- Una cifra debe decir SIEMPRE qué representa y para qué unidad se calcula: «por alfajor», «por caja de 6» o «por mes».
- Insumos y packaging se cargan una sola vez. Los productos y sus presentaciones los reutilizan.
- El costo de elaborar una unidad NO es el costo de una presentación con empaque. Mostrar ambos por separado.
- El precio sugerido usa un RECARGO sobre el costo total (#245); no recuperar por accidente la fórmula antigua de margen sobre precio de venta.
- No mezclar fabricar con vender, ni costo variable con costo total, ni margen con contribución.
- En campos monetarios, mostrar unidades claras y errores legibles. Si una cuenta no puede calcularse, mostrar «No disponible» con motivo, no un $0 engañoso.
- En TODOS los formularios prever: vacío, completo, error de campo, guardando, guardado, error de red, sesión expirada y borrado confirmado.
- Usar labels visibles, foco de teclado, estados accesibles, diseño responsivo y ayudas contextuales cortas. No exigir conocimientos contables.
- La estética y componentes existentes de Figma sirven de base; la jerarquía funcional debe seguir los acuerdos nuevos.

---

## 04 | Entregables concretos para UX/UI

- Prototipo navegable que incluya el lazo «Agregar otro producto».
- Pantallas P00–P18 adaptadas a móvil y escritorio; P09 como modal.
- Estados vacíos, carga, éxito, error y datos incompletos por cada paso.
- Componentes compartidos: campos monetarios, selector de unidad, pestañas, modal, tablas, tarjetas KPI, botones y ayudas.
- Pantalla de costos variables que diferencie unidad elaborada y presentación comercial.
- Tablero de multiproductos con gráfico en pesos y cuota por artículo.
- Revisión conjunta de D1–D10 antes de congelar Figma y entregar a desarrollo.

---

## 05 | Trazabilidad a GitHub

Índice de referencias: cada pantalla se vincula con los issues de GitHub que describen su funcionalidad o su diseño de origen. Un issue no equivale necesariamente a una pantalla independiente; la organización de pantallas y modales se define en esta guía.

### Acceso e inicio

| Pantalla | Referencias |
| --- | --- |
| P00 — Home pública | [#216](https://github.com/guido-pasciucco/InnovaLab-E10/issues/216) (portada) |
| P01 — Iniciar sesión | [#205](https://github.com/guido-pasciucco/InnovaLab-E10/issues/205) (acceso) |
| P02 — Crear cuenta | [#183](https://github.com/guido-pasciucco/InnovaLab-E10/issues/183) (registro) y [#184](https://github.com/guido-pasciucco/InnovaLab-E10/issues/184) (verificación del correo) |
| P03–P04 — Revisar y confirmar el correo | [#200](https://github.com/guido-pasciucco/InnovaLab-E10/issues/200) (aviso) y [#184](https://github.com/guido-pasciucco/InnovaLab-E10/issues/184) (verificación) |
| P05–P06 — Recuperación y cambio de contraseña | [#185](https://github.com/guido-pasciucco/InnovaLab-E10/issues/185) |
| P07 — Inicio / bienvenida y menú lateral | Definición funcional de esta guía; sin issue específico de pantalla en GitHub |

### Insumos, productos y producción

| Pantalla | Referencias |
| --- | --- |
| P08–P09 — Catálogo de insumos y packaging + modal para agregar o editar | [#239](https://github.com/guido-pasciucco/InnovaLab-E10/issues/239) |
| P10–P11 — Catálogo de productos + modal para crear o editar producto y receta | [#240](https://github.com/guido-pasciucco/InnovaLab-E10/issues/240) |
| P12 — Costos variables y presentaciones | [#241](https://github.com/guido-pasciucco/InnovaLab-E10/issues/241) |
| P13 — Producción mensual y opción de agregar otro producto | [#242](https://github.com/guido-pasciucco/InnovaLab-E10/issues/242). **PENDIENTE DE VALIDACIÓN**: integrar P13 como segunda pestaña de P12, en lugar de una pantalla independiente |

### Costos, precios y resultados

| Pantalla | Referencias |
| --- | --- |
| P14 — Costos indirectos mensuales | [#243](https://github.com/guido-pasciucco/InnovaLab-E10/issues/243) |
| P15 — Distribución de gastos y costo total | [#244](https://github.com/guido-pasciucco/InnovaLab-E10/issues/244) |
| P16 — Precio sugerido | [#245](https://github.com/guido-pasciucco/InnovaLab-E10/issues/245) |
| P17 — Contribución y punto de equilibrio | [#246](https://github.com/guido-pasciucco/InnovaLab-E10/issues/246) |
| P18 — Tablero general de resultados por producto | [#247](https://github.com/guido-pasciucco/InnovaLab-E10/issues/247) |
