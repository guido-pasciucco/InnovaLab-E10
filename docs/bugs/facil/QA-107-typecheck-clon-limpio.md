# QA-107 — Hacer reproducible el typecheck en un clon limpio

| Campo | Valor |
| --- | --- |
| ID | QA-107 |
| Issue URL | https://github.com/guido-pasciucco/InnovaLab-E10/issues/107 |
| Severidad inferida | Aviso |
| Estado | Abierto |

## Qué pasa

El comando documentado para verificar TypeScript (`bunx tsc --noEmit`) depende de archivos generados previamente por Next. En un clon limpio (o sin la carpeta generada `.next`), el typecheck falla con `app/layout.tsx(23,50): error TS2304: Cannot find name 'LayoutProps'`. Después de ejecutar `bun run build`, Next genera los tipos en `.next/types` y el mismo comando pasa, por lo que el resultado depende del estado previo de la máquina.

La propuesta del issue es agregar un script que genere primero los tipos de Next, por ejemplo `"typecheck": "next typegen && tsc --noEmit"`, y documentar `bun run typecheck` como comando de validación.

## Criterios

- [ ] `bun run typecheck` funciona sin una carpeta `.next` previa.
- [ ] No requiere ejecutar `bun run build` antes.
- [ ] El README y las guías de validación usan el nuevo comando.
- [ ] El typecheck continúa detectando errores reales de TypeScript.

## Relación con bugs

Sin relación directa con fichas BUG. Hallazgo de validación posterior al merge del PR #102.
