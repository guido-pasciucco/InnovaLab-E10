# QA #39 — Persistencia y confirmación de `/paso-1`

Base: `61386175f49ecb9b0c1fdc1df8aaa394f6148626`.
Rama: `qa/issue-39-persistencia-paso-1`.
Entorno local: Node 24.20.0, Bun 1.4.2, Chromium, Docker Engine 28.4.0,
Supabase CLI 2.118.0. No se utilizan claves ni bases de producción.

## Evidencia RED y causa raíz

En el commit QA inicial `4b8fb85`, cinco escenarios de persistencia pasaban
y el sexto fallaba esperando `Guardado`. La auditoría repitió ese fallo cuatro
veces. La Server Action devolvía HTTP 200 y `ok: true`; SELECT y recarga
confirmaron que los datos estaban guardados.

El formulario seguía dirty contra los defaults iniciales. El efecto retornaba
por `isDirty` antes de `reset(state.data)` y el banner exigía `!isDirty`.
La contraprueba devolvió los inputs a los defaults iniciales, sin otro submit:
el efecto hizo reset y apareció la confirmación.

## Corrección

Cada solicitud captura los valores locales enviados. Cada nuevo resultado
exitoso actualiza el baseline de React Hook Form una sola vez:

- Sin ediciones posteriores: reset a los valores confirmados, incluida su normalización.
- Con ediciones posteriores: reset con `keepValues`, conservando esas ediciones
  y recalculando dirty contra el estado realmente guardado.
- No se hace reset ante un fallo. El banner exige éxito, formulario limpio y
  ausencia de petición pendiente.
- Se conserva el ref de doble envío. El handler se construye dentro del evento
  para evitar la infracción `react-hooks/refs`.

No se modifican servicios, tablas, validaciones, migraciones ni contratos.
No se crea un issue independiente para este defecto.

## Cobertura E2E

Los seis escenarios originales permanecen sin modificaciones:
recarga, cierre y nueva sesión, descarte de ediciones no confirmadas,
último guardado prevalece, formulario bloqueado durante petición pendiente
y mensaje/frase exactos de confirmación.

Se agregan cinco regresiones: edición posterior invalida la confirmación,
rechazo real del servidor no confirma ni reemplaza datos, edición local
posterior a la solicitud se conserva, normalización de espacios y doble submit.

El rechazo se induce alterando el payload después de la validación del cliente,
sin reemplazar la respuesta del servidor. La edición durante pending se simula
habilitando temporalmente un input desde el test: es una defensa ante cambios
programáticos, no una interacción normal de usuario con el formulario bloqueado.

Fixtures existentes crean usuarios únicos por caso y limpian sus datos.
No hay esperas arbitrarias, tests omitidos ni fallos declarados como esperados.

## Validación GREEN

Stack descartable exclusivo `innova-issue39-fix`, configuración runtime temporal
con project_id propio. Todas las URLs fueron verificadas como locales y las
claves se obtuvieron de ese stack. El volumen anterior se preserva.
`.env.test`, `.next` y `test-results/` continúan ignorados.

| Comando | Resultado |
| --- | --- |
| `bun run db:migrate:local` | Código 0 |
| `bun run test:e2e -- --workers=1 --output=test-results/issue39-fix` | 21 aprobados: 11 paso 1 y 10 auth; código 0 |
| Build de Next ejecutado por Playwright | Aprobado |
| `bun run test:int` | 102 aprobados, 2 archivos; código 0 |
| `bun run test` | 311 aprobados, 24 archivos; código 0 |
| `bun run lint:e2e` | Código 0 |
| `bun run lint` | Código 0 |
| `bun run typecheck` | Código 0 |
| `git diff --check` | Código 0 |

Para reproducir, iniciar Supabase local aislado, generar `.env.test` con sus
credenciales locales, migrar y ejecutar esos comandos. No reutilizar un volumen
con migraciones ajenas sin comprobar su historial.

## Compatibilidad y criterios pendientes

Reality check: #160 (`32103a3`) maneja fallos de transporte y #166
(`6e1390c`) detector de drift y handler de submit. Ninguno corrige el baseline
dirty. El handler de evento de esta corrección coincide con #166.
La simulación textual del formulario con cada rama finaliza sin conflictos;
esto no sustituye ejecutar regresiones tras integrar aquellas ramas.
No se incorporan sus commits ni se modifican sus ramas.

#39 no se cierra: volver desde paso 2 y cobertura UI entre usuarios siguen
pendientes. La suite actual no acredita esos criterios por los tests de integración.
La entrega queda pendiente de auditoría independiente de OpenCode; no se abre PR,
no se publica la rama y no se hace merge.
