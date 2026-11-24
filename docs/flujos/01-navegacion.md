# 01 — Navegación

Cómo se mueve el usuario por el producto. La navegación del flujo de costos tiene dos piezas separadas.

## Menú de navegación

- Sección **persistente**, presente en todas las pantallas del flujo.
- Es el **único camino** para cambiar de sección y no desaparece al entrar a un destino.
- No tiene estado: solo navega.

## Página inicial / dashboard

- Es **una vista más del menú** (`/dashboard`, ruta tentativa).
- No está decidido si será un dashboard con resumen del estado del catálogo y accesos a cada bloque, o una página inicial simple; el punto sigue abierto.
- No fuerza un orden ni bloquea secciones.

## Destinos

| Destino | Ruta propuesta | Estado |
| --- | --- | --- |
| Página inicial | `/dashboard` | Existe como destino; contenido a decidir |
| Insumos | `/supplies` | Editable siempre |
| Productos | `/productos` | Editable siempre |
| Costos indirectos | `/costos-indirectos` | Carga única para todo el catálogo |
| Tablero | `/tablero` | Solo lectura |
| Datos históricos | — | Consulta del histórico de cierres |

## Navegación por destinos, no por pasos

No hay pasos obligatorios ni ventanas bloqueadas. El usuario puede cargar indirectos antes de tener productos, mirar el tablero con datos a medias o saltear secciones.

Lo que existe son **dependencias de datos**, no bloqueos de interfaz:

- El **prorrateo** requiere capacidades cargadas en los productos.
- El **tablero** muestra resultados cuando existen indirectos, precios y capacidades; con datos parciales muestra estados vacíos.
- Cualquier edición recalcula lo derivado en vivo. No hay cierre de lista para calcular.

## Convivencia con el asistente legacy

El producto también tiene el asistente guiado de la Fase 1 (`/paso-1` a `/paso-8`). No está decidido si el menú es global a todo el producto o solo a las rutas del catálogo, ni cómo se alternan ambas navegaciones; el punto sigue abierto.

## Fuentes

- Las decisiones vigentes están aplicadas en este flujo; el material de trabajo original se conserva en el historial de git.
