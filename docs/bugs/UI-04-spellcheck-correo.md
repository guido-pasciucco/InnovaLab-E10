# UI-04 · `spellCheck={false}` en campos de correo

- **Estado:** pendiente de valoración
- **Esfuerzo:** XS
- **Ubicación:** login, signup, reset de contraseña y registro de proveedor
- **Origen:** revisión de Web Interface Guidelines, 2026-11-24

## Problema

Los campos de correo no desactivan la corrección ortográfica del navegador.

## Impacto

Aparecen subrayados rojos y autocorrecciones sobre direcciones, códigos o identificadores que no son palabras del diccionario.

## Nota para retomar

`TextField` y `PasswordInput` ya propagan props, así que alcanza con pasar la prop en los cuatro puntos de uso.
