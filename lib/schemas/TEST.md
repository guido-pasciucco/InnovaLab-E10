# lib/schemas/TEST.md — Testear contratos Zod

Casos específicos para los contratos de `lib/schemas/`. Las reglas compartidas están en [`../../TEST.md`](../../TEST.md); el diseño de los contratos, en [`AGENTS.md`](AGENTS.md).

## Qué se testea

Una regla vive una sola vez en `fields.ts`, pero la consumen **dos contratos**: el del formulario (`lib/schemas/<contrato>/<contrato>.ts`) y el de la base (`lib/db/<dominio>/validation.ts`). Se testean los dos, y el mismo input inválido tiene que devolver el **mismo mensaje** en ambos. Las reglas de `fields.ts` también se testean por separado.

## Cómo afirmar

Afirmá sobre el mismo `fieldErrors` que llega al formulario en `details`, así el test verifica exactamente lo que ve el usuario:

```ts
function fieldErrors(schema: z.ZodType, input: unknown) {
  const result = schema.safeParse(input);
  return result.success ? {} : z.flattenError(result.error).fieldErrors;
}
```

Para una regla suelta (un `Field` que no es objeto), leé `result.error.issues[0]?.message`.

## Reglas

| Tema | Regla |
| --- | --- |
| Mensajes | Se afirman **literalmente**: `toEqual({ name: ["Escribí el nombre de tu producto."] })`. Si el texto cambia, el test tiene que fallar |
| Idioma | Se afirma el mensaje tal cual lo define el contrato (ver [`AGENTS.md`](AGENTS.md)) |
| Mismo mensaje | El caso inválido del formulario se repite en `lib/db/<dominio>/validation.test.ts` con el mismo texto esperado |
| Caso válido | Cada contrato tiene al menos un test que acepta un objeto completo y válido |
| Variantes | Para una tabla de valores (vacío, solo espacios, cero, negativo, decimal), usá `it.each` en vez de copiar el test |
| Datos | Partí de un objeto válido y cambiá un solo campo (`{ ...validSetup, volume: 0 }`) |

```ts
it.each(["", "   "])("rejects the name when it is %j", (name) => {
  const errors = fieldErrors(setupSchema, { ...validSetup, name });

  expect(errors).toEqual({ name: ["Escribí el nombre de tu producto."] });
});
```

## Checklist

- [ ] La regla nueva tiene un test en el contrato del formulario y otro en `lib/db/<dominio>/validation.test.ts`.
- [ ] Ambos afirman el mismo mensaje literal, vía `fieldErrors`.
- [ ] Hay un caso válido que pasa.
- [ ] Las variantes del mismo caso usan `it.each`.
