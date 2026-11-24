# Vercel AI SDK y Amazon Bedrock

`ai` y `@ai-sdk/amazon-bedrock` son el cliente con el que el asistente llama a Claude Haiku 4.5.

## Problema que resuelve

El panel tiene que poder cambiar de proveedor sin reescribirse. El SDK deja el modelo detrás de una sola llamada de streaming. En esta entrega el único adaptador es Bedrock. Otro proveedor es otro adaptador y otras variables de entorno.

## Cómo se usa en este proyecto

| Aspecto | Decisión |
| --- | --- |
| Dónde se importa | `lib/help/bedrock.ts`, solo en el servidor |
| Qué modelo se invoca | El ARN de un perfil de inferencia de aplicación, en `HELP_MODEL` |
| Para qué el perfil | Lleva la etiqueta `Project=InnovaLab-E10`, que Cost Explorer puede filtrar |
| Qué no se usa | Bedrock Agents, Knowledge Bases y el id pelado del modelo |

El botón y el panel no importan estas librerías. Si faltan las variables, el asistente queda apagado y no hay invocaciones.
