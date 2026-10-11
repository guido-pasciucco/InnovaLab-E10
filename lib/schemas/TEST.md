# lib/schemas/TEST.md — Testear contratos Zod

Casos específicos para los contratos de `lib/schemas/`. Las reglas compartidas están en [`../../TEST.md`](../../TEST.md); el diseño de los contratos, en [`AGENTS.md`](AGENTS.md).

## Qué se testea

Una regla vive una sola vez en `fields.ts`, pero la consumen **dos contratos**: el del formulario (`lib/schemas/<contrato>/<contrato>.ts`) y el de la base (`lib/db/<dominio>/validation.ts`). Cada uno se testea por un motivo distinto:

| Dónde | Qué prueba | Profundidad |
| --- | --- | --- |
| Contrato del formulario | **La regla**: límites, `trim`, literales y mensajes | Todos los casos inválidos |
| Contrato de la base | **El cableado**: que el override aplica el `Field` compartido y que los `.omit()` sacan los campos del servidor | Un caso por campo con override, más el caso válido |
| `fields.ts` | Nada propio: Zod ya está testeado y la regla se cubre a través del contrato | Solo si un `Field` no lo expone ningún contrato |

No se testea Zod en sí (que `z.email()` rechace un email inválido): se testean las decisiones que el proyecto codifica con Zod.

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
| Cableado en la base | Cada campo con override en `lib/db/<dominio>/validation.ts` tiene **un** caso inválido que afirma el mismo mensaje literal que el formulario. No se repiten todas las variantes: eso ya lo cubre el contrato del formulario |
| Campos del servidor | Cada input público afirma que los campos que pone el servidor (`id`, dueño, FKs, timestamps) no sobreviven al `parse` |
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

- [ ] La regla nueva tiene todos sus casos en el test del contrato del formulario.
- [ ] Si la base la reusa como override, `lib/db/<dominio>/validation.test.ts` tiene un caso que afirma el mismo mensaje literal, vía `fieldErrors`.
- [ ] Los campos que pone el servidor no sobreviven al `parse` del input público.
- [ ] Hay un caso válido que pasa.
- [ ] Las variantes del mismo caso usan `it.each`.
