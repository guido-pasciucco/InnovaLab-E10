# BUG-014 — Un fallo de transporte deja el submit muerto y sin mensaje

| Campo | Valor |
| --- | --- |
| ID | BUG-014 |
| Severidad | Aviso |
| Estado | Abierto — pendiente de detalle |
| Origen | Code review de proyecto completo, 2026-10-10 |
| Módulo | `components/forms/dispatch-in-transition.ts`, `app/` |
| Verificación | Lectura de código + análisis de esquema |

## Qué pasa

Cuando el retorno de una Server Action se rechaza por un fallo de transporte (sin red, un deploy cortando la conexión), el estado del formulario nunca se actualiza: `handleActionErrors` no llega a correr porque el request no llega a la aplicación, y el componente queda mirando un estado `undefined` que las condiciones de render no contemplan. El botón vuelve de su estado de carga al normal sin ningún feedback.

El repositorio ya conoce este modo de falla y lo maneja en un solo lugar, con un `try/catch` y un comentario explícito, pero los cuatro formularios de autenticación no tienen equivalente.

## Dónde está

- `components/forms/dispatch-in-transition.ts:9-13` — el dispatch sin propagación del resultado.
- `app/dashboard/logout-button.tsx:18-19` — el comentario que documenta el problema.
- `app/dashboard/logout-button.tsx:21-27` — el manejo correcto.
- `app/login/login-form.tsx:88` — condición de render que no contempla el estado indefinido.
- `app/login/login-form.tsx:94` — la otra condición con la misma característica.
- `app/signup/signup-form.tsx:49` — otro formulario con la misma característica.
- `app/reset-password/reset-password-form.tsx:39` — otro formulario con la misma característica.
- `app/update-password/update-password-form.tsx:59` — otro formulario con la misma característica.

## Evidencia

De `components/forms/dispatch-in-transition.ts`:

```ts
return (data: P) => {
  startTransition(() => {
    dispatch(data);
  });
};
```

Comparación, de `app/dashboard/logout-button.tsx`:

```ts
// The call itself can still reject (offline, deploy in progress)
```

## Reproducción

No aplica: verificado por lectura del código.

## Impacto

El usuario presiona el botón, ve que carga, y no recibe ninguna señal de que la acción no ocurrió.

## Causa raíz

El estado del formulario modela el resultado de la acción, pero no modela el fallo del transporte que impide obtener ese resultado.

## Dirección del arreglo

Que `dispatchInTransition` propague el resultado y que cada formulario traduzca el fallo de transporte a un estado visible, o cubrirlo con un `error.tsx` (ver BUG-009). Alternativa de menor esfuerzo: un estado local de tipo "falló la conexión" en el helper compartido por los cuatro formularios.

## Qué NO se verificó

Se verificó el mecanismo en el bundle de react-dom 19.2.8 (`onActionError` marca la acción como rejected y limpia `pending`, sin escribir el estado), pero no se ejecutó la ruta completa en la aplicación. La consecuencia observada es la ausencia de mensaje, no un crash.