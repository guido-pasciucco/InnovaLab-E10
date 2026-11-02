# Tokens de color de Tailwind v4

La paleta visual se define una vez en app/globals.css. Los componentes consumen nombres semánticos de Tailwind y no valores de color directos.

## Fuente y uso

| Token fuente | Valor | Origen | Uso semántico |
| --- | --- | --- | --- |
| --surface-canvas | #D8F5E3 | Figma | Fondo principal |
| --surface-raised | #FFFFFF | Figma | Superficies elevadas y texto sobre acción primaria |
| --surface-tint | #F1FFF5 | Figma | Superficie suave |
| --border-default | #BFE3CB | Figma | Bordes de controles |
| --text-primary | #0B1F10 | Figma | Texto principal |
| --text-muted | #4D6354 | Figma | Texto secundario |
| --text-on-action | #06130A | Figma | Texto sobre acción tonal |
| --action-primary | #15803D | Figma | Acción primaria |
| --action-primary-hover | #166534 | Figma | Hover de acción primaria |
| --action-primary-pressed | #14532D | Figma | Estado presionado |
| --action-tonal | #E1F5E7 | Figma | Acción tonal |
| --status-success | #0B7A43 | Figma | Mensajes de éxito |
| --status-danger | #B3202F | Figma | Error y rechazo |
| --surface-disabled | #E6EDE7 | Figma | Fondo deshabilitado |
| --focus-ring | #168A46 | Propuesta interna | Indicador de foco |
| --surface-danger | #FCE8EB | Propuesta interna | Fondo de error |
| --status-warning | #A45C12 | Propuesta interna | Texto de advertencia |
| --surface-warning | #FFF2DA | Propuesta interna | Fondo de advertencia |
| --surface-success | #E1F5E7 | Propuesta interna | Fondo de éxito |
| --text-disabled | #5A6D5E | Propuesta interna ajustada | Texto deshabilitado |

Los nombres --color-* de @theme inline exponen las utilidades Tailwind equivalentes: por ejemplo, bg-action-primary, text-fg y border-border-default.

## Accesibilidad

Se verificaron contrastes de texto normal contra sus superficies:

- --text-primary sobre canvas: 14.86:1.
- --text-muted sobre canvas: 5.60:1.
- --status-danger sobre --surface-danger: 5.65:1.
- --status-warning sobre --surface-warning: 4.61:1.
- --status-success sobre --surface-success: 4.75:1.
- --text-disabled sobre --surface-disabled: 4.66:1.

El valor Figma --text-on-action tiene 3.79:1 sobre --action-primary; por eso --color-on-action-primary usa --surface-raised (#FFFFFF, 5.02:1). El valor Figma se conserva para --color-on-action sobre la acción tonal.

## Compatibilidad con #170 / PR #212

Se preserva el contrato --brand-green-{50,100,500,600,700} y su mapeo --color-brand-green-*:

| Token | Valor de #212 |
| --- | --- |
| --brand-green-50 | #F0FDF4 |
| --brand-green-100 | #DCFCE7 |
| --brand-green-500 | #22C55E |
| --brand-green-600 | #16A34A |
| --brand-green-700 | #15803D |

Estos valores no se usan como fuente de las nuevas acciones semánticas. En particular, la acción primaria oficial de Figma es #15803D, mientras que #212 reserva ese valor como brand-green-700.

## Alcance de la fase 1

La fase 1 tokeniza PrimaryButton, TextField y SelectField. No activa --color-*: initial ni migra páginas, Auth, Calculator, gradientes, sombras o variantes dark:. Esos cambios quedan para la fase 2, después de integrar o reconciliar los PR que todavía modifican esas superficies.
