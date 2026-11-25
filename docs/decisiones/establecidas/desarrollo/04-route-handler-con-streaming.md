# 04 — Un Route Handler con streaming para "Chateá con tus datos"

| Campo | Valor |
| --- | --- |
| **Estado** | ✅ Aceptada (revisión de Backend pendiente) |
| **Fecha** | 2026-11-23 |
| **Relacionado** | #279 · [ADR 02](./02-persistencia-del-calculo-en-servidor.md) · [ADR 03](./03-identidad-verificada-en-servicios.md) · `app/api/chat-datos/` · `docs/chat-datos/README.md` |

## Contexto

El [ADR 02](./02-persistencia-del-calculo-en-servidor.md) dejó una regla: el navegador habla con **Server Actions**, y no hay Route Handlers "mientras no exista un consumidor externo". La app no tenía ninguno (`app/api/` estaba vacío).

"Chateá con tus datos" (#279) es un agente que responde preguntas con datos del usuario y de los documentos del producto. Una respuesta tarda entre 10 y 30 segundos, porque el modelo hace varias llamadas: busca, consulta datos y redacta. Si el texto llega recién al final, el usuario mira una pantalla quieta medio minuto.

Una Server Action devuelve **un** resultado cuando termina. No puede ir enviando la respuesta a medida que se genera.

## Opciones

### A. Server Action sin streaming

Respeta el ADR 02 al pie de la letra. Descartada: la pantalla queda sin señales de vida durante toda la espera y el usuario no puede ver los pasos que va dando el agente (qué consulta, qué fuentes).

### B. Un Route Handler con streaming (elegida)

`POST /api/chat-datos` responde con un flujo de eventos (formato de mensajes de interfaz de `ai` 7). El texto, las fuentes, la tabla y el gráfico llegan a medida que están listos.

### C. Una función Lambda aparte

Descartada en el plan de #279: suma infraestructura, otra firma de pedidos y otro lugar donde guardar las claves de AWS, sin ventaja para este caso. Las claves viven en las variables de Vercel.

## Decisión

Opción B, como **una sola excepción** al ADR 02, con estas reglas:

1. **Es la única.** Cualquier otro endpoint sigue la regla del ADR 02. Que exista este no abre la puerta a los demás.
2. **Misma puerta de identidad.** La sesión se lee con `getOptionalUser()` (devuelve `null` sin redirigir: una ruta de API responde 401, no manda a `/login`). El id del usuario sale **solo de la sesión** ([ADR 03](./03-identidad-verificada-en-servicios.md)); el cuerpo del pedido lleva únicamente `question` y `history`, y cualquier otro campo se ignora.
3. **Errores por el adaptador de rutas.** Antes de que empiece el flujo, un fallo sale con `handleRouteErrors` y el status del catálogo (400, 401, 404, 503). Una vez empezado, el status ya es 200: el error viaja dentro del flujo con un texto genérico, y la causa real queda solo en el log del servidor.
4. **Apagada por defecto.** Sin `CHAT_DATOS_ENABLED=true` la ruta responde 404 (`CHAT_DATOS_DISABLED`) sin leer la sesión ni el cuerpo, como si no existiera.
5. **La lógica no vive en `route.ts`.** `route.ts` solo conecta piezas reales. La puerta (`handler.ts`) recibe todo inyectado, y el resto está en `lib/chat-datos/` y `lib/services/`. Así se prueba con un modelo simulado, sin AWS ni base.
6. **El navegador no recibe SQL salvo `CHAT_DATOS_SHOW_SQL=true`.** El flujo se filtra antes de salir: se quita el SQL de la entrada y de la salida de la herramienta, y el texto de los errores internos. El SQL queda en el log del servidor.
7. **Tiempo máximo de 60 s** (`maxDuration`), con un tope de 6 llamadas al modelo y de tokens por llamada.

## Consecuencias

- El resto de la app sigue con Server Actions; el ADR 02 no cambia salvo una nota que apunta acá.
- El endpoint no tiene consumidor externo: lo usa solo la pantalla `chat-datos`.
- **Sin límite de frecuencia por usuario.** Cada pregunta cuesta del orden de US$0,02 en Bedrock (ver el plan de #279). Hoy el único freno es el apagado por variable. Si se abre a usuarios reales, hace falta un tope por usuario; queda pendiente de issue antes de encender `CHAT_DATOS_ENABLED` en producción.
- Un cambio en el formato del flujo de `ai` puede afectar el filtro de SQL: `lib/chat-datos/redact-stream.test.ts` lo cubre, y las versiones de `ai` y `@ai-sdk/amazon-bedrock` están fijas.
