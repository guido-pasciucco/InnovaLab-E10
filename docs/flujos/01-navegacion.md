# 01 — Navegación

Cómo se mueve el usuario por el producto. El área privada tiene un menú lateral persistente y una pantalla de inicio.

## Menú de navegación

- Sección **persistente**, presente en todas las pantallas del flujo.
- Es el **único camino** para cambiar de sección y no desaparece al entrar a un destino.
- No tiene estado: solo navega.

## Inicio

- Es el primer destino del menú (`/inicio`) y la pantalla a la que llega el usuario al iniciar sesión.
- Resume el estado del catálogo y muestra las tareas pendientes hasta el equilibrio: capacidad mensual, recargo y revisión de precios cuando no se llega al equilibrio.
- La tarjeta **Equilibrio** muestra las ventas de equilibrio del motor cuando el estado es `ready` y enlaza a `/equilibrio`; con cualquier otro estado muestra "Pendiente · faltan datos".
- Ofrece accesos rápidos a Insumos, Productos, Gastos del período, Precios y Equilibrio.
- No fuerza un orden ni bloquea secciones. `/dashboard` solo redirige a Inicio para no romper enlaces viejos.

## Destinos

| Destino | Ruta | Estado |
| --- | --- | --- |
| Inicio | `/inicio` | Resumen y tareas pendientes |
| Insumos | `/supplies` | Editable siempre; incluye la pestaña Packaging |
| Productos | `/products` | Editable siempre; cada producto tiene sus presentaciones |
| Gastos del período | `/period-costs` | Carga única para todo el negocio, mes actual |
| Costo total | `/total-costs` | Solo lectura |
| Precios | `/precios` | Recargo por defecto del negocio y recargo propio por fila (presentación, o producto si no tiene); precios derivados en cada lectura |
| Punto de Equilibrio | `/equilibrio` | Solo lectura: contribución, cuotas, punto de equilibrio y gráfico del catálogo |
| Chateá con tus datos | `/chat-datos` | Sección propia del menú superior, con dos estrellas violetas. Solo aparece si `CHAT_DATOS_ENABLED` está prendido; si no, la ruta responde 404. La conversación queda en el navegador, en esa pestaña |
| Licitaciones | `/licitaciones` | Sección propia del menú |
| Proveedores | `/proveedores` | Sección propia del menú |
| Tablero | — | Reemplazado en Inicio por la tarjeta Equilibrio, que enlaza a `/equilibrio` |
| Datos históricos | — | Consulta del histórico de cierres, sin construir |

## Navegación por destinos, no por pasos

No hay pasos obligatorios ni ventanas bloqueadas. El usuario puede cargar indirectos antes de tener productos, mirar el tablero con datos a medias o saltear secciones.

Lo que existe son **dependencias de datos**, no bloqueos de interfaz:

- El **prorrateo** requiere capacidades cargadas en los productos.
- El **tablero** muestra resultados cuando existen indirectos, precios y capacidades; con datos parciales muestra estados vacíos.
- Cualquier edición recalcula lo derivado en vivo. No hay cierre de lista para calcular.

## Un solo recorrido

El asistente por pasos y el cálculo de un solo producto de la Fase 1 se eliminaron. El menú lateral es la única navegación del área privada.

## Fuentes

- Las decisiones vigentes están aplicadas en este flujo; el material de trabajo original se conserva en el historial de git.
