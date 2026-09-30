# Calculadora Inteligente de Costos, Precios y Punto de Equilibrio

> **Producto digital** · Documento de especificación completo, transcrito a un único Markdown estructurado.
> Formato y resaltado añadidos para lectura rápida. Contenido íntegro del PDF original.

---

## 🎯 Resumen ejecutivo

> **Qué es:** herramienta web guiada que convierte los **costos reales** de un emprendimiento en **precio sugerido**, **margen de ganancia** y **punto de equilibrio**.

- **Para quién:** emprendedores y pequeños productores/prestadores de servicios.
- **Para qué:** fijar precios con información real (no por intuición ni copiando a la competencia).
- **Cómo:** recorrido guiado de carga → cálculo → análisis, sin que el usuario necesite conocer fórmulas financieras.
- **Alcance del MVP:** un solo producto/servicio, al menos 3 escenarios comparables, 100% navegador.
- **Fuera de alcance:** contabilidad integral, impuestos, conexión bancaria, facturación electrónica, IA generativa.

---

## 1. Identificación del Producto

| Campo                | Detalle                                                                    |
| -------------------- | -------------------------------------------------------------------------- |
| **Nombre**           | Calculadora Inteligente de Costos, Precios y Punto de Equilibrio           |
| **Tipo de solución** | Aplicación web de gestión económica y financiera básica de emprendimientos |
| **Usuarios**         | Emprendedores y pequeños productores o prestadores de servicios            |
| **Propósito**        | Transformar costos reales en información para la toma de decisiones        |

> **Necesidad que aborda:** muchos emprendimientos fijan precios por referencias externas o comparación con la competencia, sin saber realmente cuánto cuesta producir cada unidad. Resultado: precios insuficientes o márgenes distintos a los esperados.

**Función principal — acompañar al usuario en un recorrido guiado para:**
- identificar costos **fijos** y **variables**;
- incorporar costos **directos** e **indirectos**;
- contemplar el valor del **tiempo de trabajo** cuando corresponda;
- calcular el **costo total**;
- obtener el **costo unitario**;
- definir un **margen de ganancia** esperado;
- calcular un **precio de venta sugerido**;
- conocer el **punto de equilibrio**;
- analizar cómo cambian estos resultados ante modificaciones en costos, precio o margen.

---

## 2. Problemática

Muchos emprendedores tienen dificultades para conocer el costo real de sus productos y **transformar esa información en un precio sostenible**. Cuando los costos cambian con frecuencia, esto impacta directamente en la **rentabilidad** y la **continuidad** del emprendimiento.

- ❌ Fijación de precios **intuitiva** o solo tomando como referencia a la competencia.
- ❌ Dificultad para identificar e incorporar **costos fijos, variables y costo unitario**.
- ❌ Falta de incorporación del **tiempo de trabajo propio** y otros costos indirectos.
- ❌ Desconocimiento del **margen real** y del nivel de ventas necesario para cubrir costos.
- ❌ Dificultad para **actualizar precios** y evaluar el impacto de cambios en los costos.

> **Necesidad central:** una herramienta simple que traduzca costos, precio, margen y punto de equilibrio en **información aplicable a decisiones cotidianas**.

---

## 3. Solución Propuesta

Desarrollar una **calculadora digital guiada** que registre los principales componentes de costo y los convierta automáticamente en **indicadores económicos comprensibles**.

- Cargar **costos fijos y variables** de forma ordenada.
- Incorporar **mano de obra propia** y otros costos indirectos que suelen quedar fuera.
- Calcular **costo total y costo unitario**.
- Definir un **margen de ganancia** y obtener un **precio de venta sugerido**.
- Calcular el **punto de equilibrio** en unidades y en monto de ventas.
- Modificar costos, precio o margen para **comparar escenarios** y visualizar su impacto.

> 💡 **Valor agregado:** fijación de precios basada en información real, reduce errores de rentabilidad y convierte contenidos de formación en una herramienta de uso cotidiano.

---

## 4. Funcionalidades

La aplicación se organiza como un **recorrido guiado**, evitando que el usuario necesite conocer previamente fórmulas financieras.

| Bloque | Descripción |
| --- | --- |
| **Configuración inicial** | Seleccionar producto/servicio, moneda, período, unidad de venta y volumen estimado. |
| **Costos fijos** | Alquiler, servicios, herramientas, suscripciones u otros costos estables del período. |
| **Costos variables** | Insumos, materiales, comisiones, envases, logística asociados a cada unidad. |
| **Trabajo propio e indirectos** | Horas de trabajo, valor por hora y otros conceptos que la intuición suele omitir. |
| **Motor de cálculo** | Calcula costo fijo total, variable unitario, costo total del período y costo unitario. |
| **Margen y precio sugerido** | Indicar margen esperado, mostrar metodología y calcula el precio; o ingresar precio manual. |
| **Punto de equilibrio** | Cuántas unidades vender para cubrir costos y el monto de ventas equivalente. |
| **Simulación de escenarios** | Modificar costos, volumen, precio o margen sin alterar los datos base. |
| **Resultados y visualización** | Tarjetas, indicadores y gráficos simples con costo unitario, precio, ganancia y equilibrio. |
| **Validaciones y ayuda** | Detectar valores faltantes/inconsistentes y explicar cada dato en lenguaje simple. |
| **Resumen** | Vista final con principales resultados y supuestos utilizados. |

---

## 5. Requisitos mínimos para aprobar (MVP)

> El MVP debe demostrar el **recorrido completo de cálculo** para un producto o servicio, con fórmulas consistentes, resultados comprensibles y **al menos 3 escenarios comparables**.

| Categoría | Requisito mínimo |
| --- | --- |
| Caso de uso | Calcular costos, precio sugerido y punto de equilibrio de un producto o servicio. |
| Configuración | Definir moneda, período, unidad de venta y volumen estimado. |
| Costos fijos | Cargar múltiples conceptos y obtener el total del período. |
| Costos variables | Cargar costos por unidad y obtener el costo variable unitario. |
| Trabajo propio | Incorporar horas y valor del tiempo de trabajo cuando corresponda. |
| Costos indirectos | Sumar otros costos no incluidos en insumos directos. |
| Costo total | Calcular automáticamente el costo total para el volumen indicado. |
| Costo unitario | Calcular el costo de cada unidad o servicio. |
| Margen esperado | Ingresar un porcentaje y dejar explícita la metodología de cálculo. |
| Precio sugerido | Calcular automáticamente el precio a partir del costo y margen. |
| Precio manual | Probar un precio alternativo y mostrar su margen/contribución resultante. |
| Punto de equilibrio (unidades) | Calcular unidades necesarias para cubrir costos fijos. |
| Punto de equilibrio (ventas) | Mostrar el monto de facturación equivalente. |
| Escenarios | Crear y comparar al menos 3 escenarios modificando costos, precio, margen o volumen. |
| Resultados | Presentar indicadores y al menos una visualización simple. |
| Validaciones | Evitar cálculos inválidos y mensajes claros ante datos faltantes o inconsistentes. |

**Entregable:** aplicación web responsive y funcional, con recorrido completo sin errores críticos.

> ⚠️ **Criterio de cálculo:** antes del desarrollo debe acordarse **una única convención de margen** (por ejemplo, % sobre costo vs. % sobre precio de venta) y comunicarla claramente. Las fórmulas deben ser **verificables y consistentes** en toda la aplicación.

> 🚫 **Fuera de alcance del MVP:** contabilidad integral, liquidación impositiva, conexión bancaria, facturación electrónica, actualización automática por inflación, predicciones avanzadas e IA generativa. Es una herramienta de **apoyo**, no reemplaza asesoramiento contable ni impositivo.

---

## 6. Future Scope / Escalabilidad futura

Una vez validado el motor de cálculo y la experiencia guiada, la herramienta podrá escalar hacia una gestión más completa.

| Categoría | Funcionalidades futuras |
| --- | --- |
| Múltiples productos | Gestionar un catálogo completo de productos y servicios. |
| Costos compartidos | Distribuir costos fijos entre productos según criterios configurables. |
| Historial | Guardar versiones de costos y precios a lo largo del tiempo. |
| Actualizaciones | Registrar variaciones de costos y recalcular precios automáticamente. |
| Alertas | Avisar cuando un cambio de costo reduzca el margen por debajo de un umbral. |
| Inflación/índices | Integrar índices o referencias externas cuando exista una fuente adecuada. |
| Importación | Cargar costos desde CSV/XLSX o plantillas existentes. |
| Documentos (OCR) | Extraer datos de facturas o comprobantes. |
| Impuestos | Incorporar configuraciones impositivas y percepciones. |
| Comisiones | Modelar comisiones de marketplaces, medios de pago y canales. |
| Descuentos | Simular promociones, descuentos y precios mayoristas. |
| Escenarios avanzados | Comparar variaciones múltiples y sensibilidad de costos/precios. |
| Proyecciones | Estimar ventas, ingresos y resultados para distintos horizontes. |
| IA asistente | Explicar resultados y sugerir preguntas/escenarios según los datos cargados. |
| Cuentas de usuario | Guardar emprendimientos, cálculos y configuraciones en la nube. |
| Panel de gestión | Visualizar evolución de costos, precios, margen y punto de equilibrio. |
| Exportación | Generar reportes PDF/XLSX con cálculos, supuestos y escenarios. |
| Integraciones | Conectar con sistemas de ventas, e-commerce, facturación o gestión. |

> 💡 **Principio de transparencia:** cada recomendación de precio o escenario debe poder **explicarse a partir de los datos y fórmulas** utilizadas.

---

## 7. Recomendación de tecnologías y herramientas

Para el MVP se recomienda una **arquitectura web liviana**. El núcleo es un **motor de cálculo determinístico y transparente**; **no es necesario** incorporar IA generativa para cumplir el alcance inicial.

| Necesidad | Tecnologías / herramientas posibles |
| --- | --- |
| Frontend web | React / Next.js |
| Lenguaje | TypeScript |
| Diseño responsive | CSS Modules / Tailwind CSS |
| Motor de cálculo | Funciones TypeScript **desacopladas** de la interfaz |
| Precisión decimal | Decimal.js / Big.js para cálculos monetarios |
| Validación de datos | Zod / React Hook Form |
| Gráficos | Recharts / Chart.js |
| Estado local | React state / Zustand |
| Persistencia MVP | LocalStorage / IndexedDB (escenarios locales) |
| Backend opcional | Next.js API Routes / Node.js |
| Base de datos opcional | PostgreSQL / Supabase |
| Autenticación futura | Supabase Auth |
| Validación de fórmulas | Excel / Google Sheets como referencia cruzada |
| Pruebas unitarias | Vitest / Jest |
| Pruebas end-to-end | Playwright |
| Diseño UX/UI | Figma |
| Flujos | FigJam / Miro |
| Control de versiones | Git + GitHub |
| Hosting | Vercel |
| IA futura | API LLM solo para asistencia/explicación |

> ⚠️ **Recomendación técnica clave:** separar las **fórmulas** del código de interfaz y cubrirlas con **pruebas unitarias**. Esto valida resultados de forma independiente y reduce el riesgo de errores en cálculos financieros.

> 💡 La **primera versión puede funcionar 100% en el navegador** (sin cuentas ni almacenamiento centralizado). Esto reduce complejidad y permite concentrar el desarrollo en la calidad del cálculo y la experiencia.

> 💰 **Licencias/escalabilidad:** para el MVP priorizar herramientas open source y planes gratuitos. Revisar costos recién cuando se incorporen cuentas, almacenamiento, IA, OCR o integraciones.

---

## 8. Plan de trabajo semanal

> El proyecto se organiza en **6 sprints de dos semanas + Sprint Planning**. Perfiles: UX/UI Designer, Frontend Developer, Backend Developer y QA Tester.

> ⚠️ Si se define una arquitectura 100% client-side, las tareas de **Backend** vinculadas al motor de cálculo/validación/persistencia serán **absorbidas por Frontend**, y la decisión debe quedar documentada en el Sprint Planning.

### 🧭 Sprint Planning — Semana 0

**Objetivo:** definir el modelo de cálculo, las reglas de negocio, el alcance del MVP y la experiencia base antes de empezar.

| Rol | Tareas |
| --- | --- |
| **Todos** | Revisar problemática, solución, funcionalidades y requisitos · definir el caso principal de uso · acordar moneda, período, unidad de venta y volumen · construir glosario común · definir una única convención de margen · validar fórmulas con al menos 3 ejemplos numéricos · definir criterios de aceptación y Definition of Done |
| **UX/UI** | Mapear el recorrido completo · inventario de pantallas y navegación · wireframes de carga guiada, resultados y simulación · ayudas contextuales |
| **Frontend** | Crear repositorio y estructura · definir tipos/modelos · configurar librerías de formularios, validación, precisión y testing · estructura inicial del motor de cálculo desacoplado |
| **Backend** | Decidir si hace falta API/persistencia centralizada · definir contratos y responsabilidades del servicio de cálculo · documentar la arquitectura y la fuente única de verdad |
| **QA** | Estrategia y matriz de pruebas · planilla de referencia con resultados esperados · casos normales/límite/error (vacíos, cero, negativos, decimales, divisiones por cero) · criterios de aprobación |

---

### 🔍 Sprint 1 | EXPLORACIÓN — Semanas 1–2

| | **Semana 1** | **Semana 2** |
| --- | --- | --- |
| **Objetivo** | Construir la carga guiada de datos y dejar una estructura consistente para registrar todos los componentes del costo. | Implementar y validar el motor de costo total y costo unitario con los datos cargados. |
| **Todos** | Validar qué datos son obligatorios vs. opcionales · definir ejemplos reales de costos fijos/variables/trabajo propio/indirectos. | Revisar el tratamiento de cada tipo de costo sin contabilizar conceptos dos veces · validar resultados esperados para distintos volúmenes. |
| **UX/UI** | Diseñar configuración inicial (producto, moneda, período, unidad, volumen) · formularios de costos fijos y variables con alta/edición/eliminación · bloque de trabajo propio e indirectos · ayudas y mensajes de error. | Diseñar la primera pantalla de resumen de costos (subtotal por categoría, total y unitario) · textos que expliquen cada indicador. |
| **Frontend** | Formulario de configuración inicial · componentes reutilizables de alta/edición/eliminación · campos monetarios/numericos con formato · guardar estado entre pasos · validaciones básicas (obligatorios, no negativos, volumen > 0). | Funciones puras para subtotales y total por categoría · costo variable unitario, total del período y unitario · precisión decimal separando cálculo interno del redondeo visual · conectar motor con formularios para recalcular · pruebas unitarias. |
| **Backend** | Si hay API: modelo de cálculo/borrador y endpoints CRUD · validaciones de esquema equivalentes · respuesta de errores consistente. | Si el cálculo se centraliza: implementar el servicio y devolver resultados estructurados · validar que frontend/backend usen las mismas reglas. |
| **QA** | Casos de prueba por formulario · probar agregar/editar/eliminar múltiples conceptos · validar decimales, separadores, importes grandes y campos vacíos · verificar que no se pierdan datos al navegar. | Comparar todos los resultados contra la planilla de referencia · probar combinaciones de costos y volúmenes · validar cero costos fijos/variables y cantidades extremas · registrar diferencias de redondeo. |

**✅ Entregable Semana 1:** carga guiada navegable · configuración inicial funcional · alta/edición/eliminación de costos · validaciones básicas · casos de prueba de entrada.
**❎ Dependencias Semana 1:** modelo de datos y reglas de Semana 0 · diseño de flujo aprobado · criterios de validación definidos.
**✅ Entregable Semana 2:** motor de costos funcional · costo total y unitario · resumen visible y comprensible · pruebas unitarias · resultados validados.
**❎ Dependencias Semana 2:** carga guiada de Semana 1 · clasificación de costos acordada · planilla de referencia disponible.

---

### 💡 Sprint 2 | IDEACIÓN — Semanas 3–4

| | **Semana 3** | **Semana 4** |
| --- | --- | --- |
| **Objetivo** | Incorporar margen de ganancia y cálculo de precio sugerido con metodología transparente y verificable. | Calcular y visualizar el punto de equilibrio en unidades y monto, explicando cuándo el negocio cubre costos. |
| **Todos** | Revisar la convención de margen y cómo se explicará · definir el resultado al ingresar un precio manual distinto al sugerido. | Definir el criterio exacto de punto de equilibrio y el redondeo de unidades vendibles · validar comportamiento con margen de contribución cero o negativo. |
| **UX/UI** | Diseñar ingreso de margen y tarjeta de precio sugerido · diferenciar costo unitario, precio de venta y ganancia · opción de probar precio manual · advertencias cuando el precio esté por debajo de niveles sostenibles. | Diseñar indicadores de equilibrio en unidades y monto · gráfico simple de ingresos vs. costos con identificación del cruce · explicación breve · estados para equilibrio no viable. |
| **Frontend** | Fórmula de precio sugerido según convención aprobada · calcular margen/contribución ante precio manual · actualizar en tiempo real · mostrar fórmula sin complejidad innecesaria · pruebas unitarias de precio/margen/contribución. | Contribución por unidad · cálculo de unidades necesarias y monto equivalente · redondeo para unidades completas · gráfico de ingresos/costos con los mismos valores del motor · recálculo automático. |
| **Backend** | Incorporar reglas de precio y margen al servicio · validar rangos y devolver estados claros para escenarios no viables. | Incorporar reglas de equilibrio y proteger divisiones por cero · entregar valores para indicadores y gráfico. |
| **QA** | Validar margen 0%, valores altos y precios manuales por debajo/encima del costo · precisión y redondeo · comparar contra planilla de referencia. | Validar fórmula con múltiples casos · costo fijo cero, contribución cero/negativa, precios extremos · gráfico coherente con valores · mensajes de no viable correctos. |

**✅ Entregable Semana 3:** margen esperado configurable · precio sugerido automático · precio manual con margen resultante · advertencias de precios inviables · reglas de precio documentadas.
**❎ Dependencias Semana 3:** costo unitario validado · convención de margen cerrada · casos numéricos de referencia.
**✅ Entregable Semana 4:** punto de equilibrio en unidades · monto de ventas de equilibrio · contribución por unidad · gráfico de ingresos/costos · estados no viables manejados.
**❎ Dependencias Semana 4:** costos, precio y margen validados · criterio de redondeo definido · librería de gráficos seleccionada.

---

### 🛠 Sprint 3 | DESARROLLO — Semanas 5–6

| | **Semana 5** | **Semana 6** |
| --- | --- | --- |
| **Objetivo** | Desarrollar simulación y comparación de escenarios para visualizar el impacto de cambios en costos, precio, margen o volumen. | Integrar todas las funcionalidades en un único recorrido y alcanzar la primera versión completa del MVP. |
| **Todos** | Definir qué variables se podrán modificar y qué indicadores comparar · acordar que el escenario base se conserve. | Recorrer el producto de punta a punta como usuario nuevo · detectar pasos redundantes o cálculos inconsistentes · priorizar bugs para la segunda mitad. |
| **UX/UI** | Diseñar flujo para crear, duplicar, editar y eliminar escenarios · comparación base vs. alternativas · destacar aumentos/disminuciones sin depender solo del color. | Unificar estilos, navegación y ayudas · vista resumen final con supuestos e indicadores · recorrido comprensible sin conocimientos contables avanzados. |
| **Frontend** | Crear escenarios desde el cálculo base · modificar costos, volumen, margen y precio por escenario · recalcular indicadores · comparar al menos 3 · restaurar base y eliminar con seguridad. | Integrar configuración, costos, precio, equilibrio y escenarios · conservar datos al volver a pasos anteriores · reinicio con confirmación · persistencia local · consolidar componentes y eliminar duplicados. |
| **Backend** | Si hay persistencia centralizada: modelar/guardar escenarios asociados a un cálculo · que editar un escenario no modifique los demás. | Integrar servicios y persistencia · revisar consistencia de contratos y manejo de errores · documentar endpoints y variables de entorno. |
| **QA** | Probar creación, clonación, edición y eliminación · aislar cálculos entre escenarios · verificar que las diferencias mostradas coincidan con valores reales · cambios consecutivos y recuperación de base. | Primer testing end-to-end del flujo completo · crear cálculo → cargar costos → precio → equilibrio → escenarios · edición de datos anteriores y propagación de cambios · registrar y priorizar bugs. |

**✅ Entregable Semana 5:** simulador funcional · escenario base preservado · al menos 3 escenarios comparables · recálculo automático · comparación visual.
**❎ Dependencias Semana 5:** motor de costos/precio/equilibrio estable · variables editables definidas · diseño de comparación aprobado.
**✅ Entregable Semana 6:** primera versión integral del MVP · flujo completo punta a punta · resumen final · persistencia definida · backlog de bugs priorizado.
**❎ Dependencias Semana 6:** módulos de semanas 1–5 completos · diseños consolidados · reglas de negocio estables.

---

### 🛡 Sprint 4 | DESARROLLO — Semanas 7–8

| | **Semana 7** | **Semana 8** |
| --- | --- | --- |
| **Objetivo** | Fortalecer validaciones, manejo de errores y explicaciones para evitar resultados incorrectos o difíciles de interpretar. | Optimizar la experiencia responsive, accesibilidad y lectura de resultados para dejar el MVP listo para iteración con usuarios. |
| **Todos** | Revisar todos los puntos donde un dato inválido pueda generar un resultado engañoso · definir qué mensajes son advertencias y cuáles bloquean. | Revisar el MVP en desktop y mobile y priorizar problemas de comprensión o interacción · definir las tareas para las pruebas de uso. |
| **UX/UI** | Diseñar mensajes específicos de error y advertencia · ayudas contextuales · estados vacíos y recuperación sin perder datos. | Ajustar jerarquías, espaciado y visualizaciones por resolución · contraste, tamaño de texto, foco y uso del color · alternativa textual en gráficos · guion de usabilidad. |
| **Frontend** | Validaciones semánticas además de las de formato · impedir negativos, divisiones inválidas y márgenes fuera de rango · diferenciar precisión interna del formato mostrado · estados extremos · mensajes/focos accesibles. | Comportamiento responsive de formularios, resultados y comparación · navegación por teclado, labels y asociaciones accesibles · optimizar gráficos en pantalla chica · rendimiento y re-renderizados · completar pruebas unitarias y e2e. |
| **Backend** | Replicar validaciones críticas en servidor · normalizar respuestas de error · controles de integridad sobre cálculos guardados. | Optimizar respuestas y persistencia ante sesiones concurrentes o recargas · mensajes de error consistentes. |
| **QA** | Batería de pruebas de borde y negativas · ceros, negativos, decimales extensos, importes grandes, datos incompletos · que nunca se muestre NaN/Infinity sin explicación · regresión de todas las fórmulas. | Probar resoluciones y navegadores · revisión básica de accesibilidad · legibilidad de gráficos y tablas · regresión completa antes de pruebas con usuarios. |

**✅ Entregable Semana 7:** validaciones consolidadas · mensajes claros · manejo seguro de no calculables · motor revalidado con casos límite · sin resultados inválidos visibles.
**❎ Dependencias Semana 7:** MVP integrado de Semana 6 · catálogo de casos de prueba · reglas de validación acordadas.
**✅ Entregable Semana 8:** MVP responsive · accesibilidad básica validada · resultados legibles en desktop y mobile · recorridos críticos cubiertos · guion de usabilidad.
**❎ Dependencias Semana 8:** validaciones de Semana 7 cerradas · diseño final disponible · dispositivos/navegadores definidos.

---

### 🔁 Sprint 5 | ITERAR — Semanas 9–10

| | **Semana 9** | **Semana 10** |
| --- | --- | --- |
| **Objetivo** | Iterar a partir de pruebas de uso y realizar verificación financiera exhaustiva de fórmulas y escenarios. | Cerrar funcionalidades, resolver defectos prioritarios y alcanzar una versión candidata estable. |
| **Todos** | Pruebas con personas representativas y registrar dificultades · priorizar por impacto: bloqueo, error de cálculo, comprensión, fricción. | Congelar alcance (sin nuevas funcionalidades) · revisar requisito por requisito la tabla del MVP · definir caso de demo y datos. |
| **UX/UI** | Observar dónde se confunden al clasificar costos o interpretar resultados · revisar lenguaje, ayudas y orden según feedback · ajustes de alta prioridad sin ampliar alcance. | Resolver inconsistencias finales de textos, estados y navegación · revisar recorrido de demo · ordenar componentes y archivos. |
| **Frontend** | Implementar mejoras priorizadas de interacción y comprensión · corregir inconsistencias · que los cambios no rompan cálculos validados. | Resolver bugs críticos y altos · eliminar código temporal, warnings y duplicados · optimizar build y config de producción · completar pruebas unitarias/e2e. |
| **Backend** | Corregir errores de servicios/persistencia detectados · revisar logs y casos de error. | Cerrar endpoints/persistencia · config de producción, variables de entorno y errores · documentación técnica. |
| **QA** | Ejecutar planilla de referencia con batería amplia · verificar costos, precio, margen, contribución y equilibrio en cada escenario · regresión tras cada corrección · actualizar estado de bugs. | Regresión completa sobre la Release Candidate · verificar todos los criterios de aceptación · probar caso de demo desde cero · confirmar ausencia de errores bloqueantes. |

**✅ Entregable Semana 9:** informe de pruebas de uso · mejoras de UX aplicadas · fórmulas revalidadas · bugs críticos/altos resueltos o documentados · MVP listo para estabilización.
**❎ Dependencias Semana 9:** MVP responsive de Semana 8 · usuarios de prueba · planilla de referencia actualizada · backlog priorizado.
**✅ Entregable Semana 10:** Release Candidate estable · checklist de MVP completo · bugs críticos resueltos · caso de demo validado · documentación técnica en estado final.
**❎ Dependencias Semana 10:** iteraciones de Semana 9 cerradas · criterios de aceptación disponibles · entorno de producción definido.

---

### 🚀 Sprint 6 | CIERRE — Semanas 11–12

| | **Semana 11** | **Semana 12** |
| --- | --- | --- |
| **Objetivo** | Realizar la validación final del producto y preparar una versión lista para despliegue y presentación. | Desplegar, documentar y presentar la Calculadora Inteligente. |
| **Todos** | Ejecutar el recorrido final con datos realistas · congelar el alcance y documentar limitaciones · que no se presenten resultados como asesoramiento contable/impositivo. | Preparar demo (problema → carga → cálculo → equilibrio → escenarios) · documentar alcance, decisiones, limitaciones y Future Scope · presentación final. |
| **UX/UI** | Revisión final de claridad, accesibilidad y responsive · consistencia de textos, ayudas, formatos y unidades · capturas/recorrido visual. | Ordenar archivos y componentes · documentar decisiones de flujo y accesibilidad · recorrido visual para la presentación. |
| **Frontend** | Resolver últimos bugs aprobados · validar build de producción y navegadores objetivo · persistencia, reinicio y recuperación de estados · variables/config para despliegue. | Publicar la aplicación · verificar que lo publicado coincida con la Release Candidate · documentar instalación, ejecución, estructura y motor de cálculo · datos de ejemplo. |
| **Backend** | Validar servicios en entorno final · revisar disponibilidad, configuración y persistencia · instrucciones de despliegue y recuperación. | Desplegar servicios y BD si corresponde · documentar endpoints, variables de entorno, persistencia y mantenimiento · verificar conectividad. |
| **QA** | Smoke test, regresión final y cross-browser · verificar cálculos con casos definitivos · cero bugs bloqueantes · firmar checklist final. | Smoke test sobre la URL final · reporte final de testing · documentar bugs menores y reproducción · validar el caso completo de la demo. |

**✅ Entregable Semana 11:** versión final validada · checklist aprobado · cero bugs bloqueantes · limitaciones documentadas · paquete listo para despliegue.
**❎ Dependencias Semana 11:** Release Candidate de Semana 10 · entorno de despliegue disponible · casos definitivos de referencia.
**✅ Entregable Semana 12:** MVP publicado y funcional · motor y escenarios validados · documentación completa · reporte final de QA · presentación y demo preparadas.
**❎ Dependencias Semana 12:** validación final de Semana 11 · hosting/credenciales disponibles · documentación por rol completada · caso de demo aprobado.

---

> 📄 *Documento transcrito y formateado a partir del PDF «Calculadora Inteligente.pdf» el 2026-09-12.*
