# bugs/ — Hallazgos de UI pendientes de valoración

> Documentación técnica de seguimiento. No es documentación de negocio: contiene rutas de código y estado de implementación.
>
> Registrados el 2026-11-24 a partir de una revisión de 97 archivos de UI (63 en `components/`, 34 en `app/`) contra las reglas del skill `web-design-guidelines` v1.1.0, snapshot fijado en el commit `434b7f9`.
>
> Estado general: **pendiente de valoración**. Ningún ítem está en curso, asignado ni tiene fecha de implementación.

Cada hallazgo vive en su propio archivo. El esfuerzo es una estimación para decidir cuándo retomarlo, no un compromiso de entrega.

Escala: XS (minutos), S (una o dos horas), M (medio día), L (uno o dos días).

| ID | Hallazgo | Esfuerzo | Archivo |
| --- | --- | --- | --- |
| UI-01 | Enlace de salto y destino del contenido principal | S | [UI-01-enlace-de-salto.md](UI-01-enlace-de-salto.md) |
| UI-02 | Patrón ARIA completo en las pestañas de insumos | M | [UI-02-pestanas-insumos.md](UI-02-pestanas-insumos.md) |
| UI-03 | Dimensiones intrínsecas de tres imágenes decorativas | XS | [UI-03-dimensiones-imagenes.md](UI-03-dimensiones-imagenes.md) |
| UI-04 | `spellCheck={false}` en campos de correo | XS | [UI-04-spellcheck-correo.md](UI-04-spellcheck-correo.md) |
| UI-05 | Elipsis, placeholders y equilibrio de línea en títulos | S | [UI-05-elipsis-y-titulos.md](UI-05-elipsis-y-titulos.md) |
| UI-06 | `tabular-nums` en columnas numéricas | S | [UI-06-tabular-nums.md](UI-06-tabular-nums.md) |
| UI-07 | Sincronizar búsquedas y pestañas con la URL | L | [UI-07-estado-en-url.md](UI-07-estado-en-url.md) |
| UI-08 | Confirmación antes de eliminar o descartar | M / L | [UI-08-confirmaciones.md](UI-08-confirmaciones.md) |
| UI-09 | Ajustes globales de móvil e hidratación | XS | [UI-09-movil-e-hidratacion.md](UI-09-movil-e-hidratacion.md) |
| UI-10 | Formato de período con `Intl` | S / M | [UI-10-formato-de-periodo.md](UI-10-formato-de-periodo.md) |

## Lo que no requiere acción

La revisión no encontró problemas en estos puntos: etiquetas en todos los controles, `aria-label` en botones de ícono, avisos asíncronos con `role="status"` o `role="alert"`, estados de foco visibles con anillo, tablas semánticas con `scope`, estados vacíos, formatos de fecha y cantidad con `Intl`, ausencia de `transition: all`, de lecturas de diseño durante el render y de bloqueos de pegado.

El formateador de importes de `lib/money/format.ts` no usa `Intl.NumberFormat` de forma deliberada para garantizar un resultado idéntico en cualquier entorno. Es una excepción documentada, no un hallazgo pendiente.

## Criterio para revalorar

Retomar el backlog cuando se trabaje en accesibilidad, en los catálogos, en soporte móvil o antes de publicar cambios relevantes de UI. La decisión de implementar, postergar o descartar cada ítem se registra en su archivo, con su fecha.
