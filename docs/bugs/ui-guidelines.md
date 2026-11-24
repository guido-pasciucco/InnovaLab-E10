# Hallazgos de UI — Web Interface Guidelines

> Documento técnico de seguimiento. No es documentación de negocio: contiene rutas de código y estado de implementación.
>
> Registrados el 2026-11-24 a partir de una revisión de 97 archivos de UI (63 en `components/`, 34 en `app/`) contra las reglas del skill `web-design-guidelines` v1.1.0, snapshot fijado en el commit `434b7f9`.
>
> Estado: **pendiente de valoración**. Ningún ítem está en curso, asignado ni tiene fecha de implementación.

## Criterio de registro

Los hallazgos se agrupan por unidad de trabajo corregible, no por regla incumplida. El esfuerzo es una estimación para decidir cuándo retomarlos, no un compromiso de entrega.

| ID | Hallazgo | Esfuerzo | Ubicación principal |
| --- | --- | --- | --- |
| UI-01 | Enlace de salto y destino del contenido principal | S | `app/layout.tsx:74` |
| UI-02 | Patrón ARIA completo en las pestañas de insumos | M | `components/supplies/supplies-catalog.tsx:84` |
| UI-03 | Dimensiones intrínsecas de tres imágenes decorativas | XS | `app/layout.tsx:39,52,65` |
| UI-04 | `spellCheck={false}` en campos de correo | XS | Cuatro formularios |
| UI-05 | Elipsis, placeholders y equilibrio de línea en títulos | S | Varios archivos |
| UI-06 | `tabular-nums` en columnas numéricas | S | Tres tablas |
| UI-07 | Sincronizar búsquedas y pestañas con la URL | L | Tres catálogos y una pestaña |
| UI-08 | Confirmación antes de eliminar o descartar | M / L | Dos acciones y tres `confirm()` |
| UI-09 | Ajustes globales de móvil e hidratación | XS | `app/globals.css`, `app/layout.tsx:28` |
| UI-10 | Formato de período con `Intl` | S / M | `components/period-costs/period-costs-values.ts:38` |

Escala: XS (minutos), S (una o dos horas), M (medio día), L (uno o dos días).

## Detalle por ítem

### UI-01 · Enlace de salto y destino del contenido principal

- **Problema:** no existe un enlace que permita a quien navega con teclado saltar directo al contenido.
- **Impacto:** hay que recorrer con Tab todo el encabezado antes de llegar a la página.
- **Nota para retomar:** alcanza con `id="main-content"` en el contenedor de `app/layout.tsx:74` y un enlace `sr-only` que se haga visible al enfocarse. Conviene `tabIndex={-1}` en el destino para que el foco se desplace de verdad. No hace falta tocar los `<main>` de cada página.

### UI-02 · Patrón ARIA completo en las pestañas de insumos

- **Problema:** el control usa `role="tablist"` y `role="tab"`, pero no responde a flechas ni declara el panel asociado.
- **Impacto:** funciona con Tab y Enter, pero contradice el comportamiento esperado de un conjunto de pestañas para teclado y lectores de pantalla.
- **Nota para retomar:** no es solo `onKeyDown`; requiere *roving tabindex*, flechas izquierda y derecha, Home y End, `aria-controls`, `role="tabpanel"` y `aria-labelledby`.

### UI-03 · Dimensiones intrínsecas de tres imágenes decorativas

- **Problema:** las etiquetas `<img>` de `app/layout.tsx` no declaran `width` ni `height`.
- **Impacto:** riesgo de desplazamiento de diseño (CLS) mientras cargan.
- **Nota para retomar:** las dimensiones reales de los archivos son 208×339 (`carrito.png`), 305×288 (`monedas.png`) y 302×296 (`calculadora.png`). Con `object-contain` no hay distorsión, pero hay que usar los valores reales, no los del contenedor.

### UI-04 · `spellCheck={false}` en campos de correo

- **Problema:** los campos de correo de login, signup, reset de contraseña y registro de proveedor no desactivan la corrección ortográfica.
- **Impacto:** subrayados rojos y autocorrecciones sobre direcciones, códigos o identificadores.
- **Nota para retomar:** `TextField` y `PasswordInput` ya propagan props, así que es agregar la prop en los cuatro puntos de uso.

### UI-05 · Elipsis, placeholders y equilibrio de línea en títulos

- **Problema:** el botón de cierre de sesión usa `"Signing out..."` en lugar del carácter `…`; varios placeholders no terminan en `…`; ningún título usa `text-wrap: balance`.
- **Impacto:** consistencia tipográfica y aspecto de los títulos, especialmente en líneas que terminan con una sola palabra.
- **Nota para retomar:** `text-wrap: balance` conviene aplicarlo como regla global en `app/globals.css`, no en cada título. Los placeholders que ya usan `…` en los catálogos sirven de referencia. El texto de cierre de sesión está en inglés dentro de una interfaz en español; se puede unificar.

### UI-06 · `tabular-nums` en columnas numéricas

- **Problema:** las celdas de importes de las tablas de gastos, insumos y productos no usan cifras de ancho fijo.
- **Impacto:** las comas no quedan alineadas y las columnas cambian de ancho cuando cambia un valor.
- **Nota para retomar:** aplicar de forma explícita en las celdas numéricas. No conviene una regla global sobre `text-right`, porque la columna de acciones también usa esa clase y no contiene números.

### UI-07 · Sincronizar búsquedas y pestañas con la URL

- **Problema:** los filtros de búsqueda de tres catálogos y la pestaña insumos/packaging viven solo en `useState`.
- **Impacto:** se pierden al recargar, no se pueden compartir por link y el botón Atrás no restaura el estado.
- **Nota para retomar:** `nuqs` no está instalado. Hay que decidir entre agregar la dependencia o usar `useSearchParams` con `router.replace(..., { scroll: false })`. Incluye debounce, navegación hacia atrás y adelante y el límite entre componentes de servidor y de cliente. Es el ítem de mayor esfuerzo.

### UI-08 · Confirmación antes de eliminar o descartar

- **Problema:** eliminar un insumo (`components/supplies/supplies-table.tsx:37`) y descartar un borrador (`components/tenders/publish-tender-form.tsx:326`) ejecutan la acción sin confirmación previa. Otros tres puntos usan el `confirm()` nativo del navegador.
- **Impacto:** riesgo de pérdida de datos por un clic accidental y experiencia inconsistente.
- **Nota para retomar:** la opción acotada es un `ConfirmDialog` reutilizando `CatalogModal`. Un undo real exige además cambios en las server actions y un temporizador. El diálogo de insumos en uso aparece después del error, no antes de la acción, así que no cumple esta función.

### UI-09 · Ajustes globales de móvil e hidratación

- **Problema:** falta `overscroll-behavior: contain` en el diálogo desplazable, no hay `touch-action: manipulation` global y `app/layout.tsx:28` usa `suppressHydrationWarning` sin una razón documentada.
- **Impacto:** en móvil el scroll puede propagarse al fondo; el aviso de hidratación puede ocultar fallos reales.
- **Nota para retomar:** son cambios pequeños, pero el último requiere confirmar si existe una causa concreta antes de quitarlo.

### UI-10 · Formato de período con `Intl`

- **Problema:** `formatPeriodLabel` arma el nombre del mes con un arreglo escrito a mano.
- **Impacto:** el formato queda atado a un idioma y a un orden fijo.
- **Nota para retomar:** `new Date("2026-11")` depende de la zona horaria y puede resolver al mes anterior; hay que construir la fecha de forma segura en UTC y verificar que el resultado siga siendo `noviembre de 2026`. Es posible que haya que actualizar pruebas.

## Lo que no requiere acción

La revisión no encontró problemas en estos puntos: etiquetas en todos los controles, `aria-label` en botones de ícono, avisos asíncronos con `role="status"` o `role="alert"`, estados de foco visibles con anillo, tablas semánticas con `scope`, estados vacíos, formatos de fecha y cantidad con `Intl`, ausencia de `transition: all`, de lecturas de diseño durante el render y de bloqueos de pegado.

El formateador de importes de `lib/money/format.ts` no usa `Intl.NumberFormat` de forma deliberada para garantizar un resultado idéntico en cualquier entorno. Es una excepción documentada, no un hallazgo pendiente.

## Criterio para revalorar

Retomar el backlog cuando se trabaje en accesibilidad, en los catálogos, en soporte móvil o antes de publicar cambios relevantes de UI. La decisión de implementar, postergar o descartar cada ítem se registra en este archivo, con su fecha.
