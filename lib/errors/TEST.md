# lib/errors/TEST.md — Testear el camino del error

Casos específicos para probar errores. Las reglas compartidas están en [`../../TEST.md`](../../TEST.md); el diseño del manejo de errores, en [`AGENTS.md`](AGENTS.md).

## Qué se testea en cada capa

| Capa | Qué afirma el test |
| --- | --- |
| Servicio | Que lanza el **código** correcto del catálogo |
| Catálogo | Que los códigos respetan la convención de nombres y su `status` |
| Núcleo | `AppError` toma el mensaje del catálogo; `toAppError` convierte y loguea |
| Adaptador de ruta | Status HTTP y envelope `{ error: { code, message } }` |
| Adaptador de action | `ServiceResult` serializable y que `redirect()` sigue pasando |
| Lectura en el form | `getFieldErrors` extrae los mensajes por campo de un `VALIDATION` |

## Servicios: afirmá el código, no el texto

```ts
await expect(loginService(client, valid)).rejects.toMatchObject({ code: "AUTH_EMAIL_NOT_CONFIRMED" });
```

- `rejects.toMatchObject({ code })` es la forma por defecto; `rejects.toEqual(new AppError("..."))` cuando importa el error completo.
- Una entrada inválida se afirma como `ZodError`: `rejects.toBeInstanceOf(ZodError)`. Si el servicio no debe llamar al cliente externo en ese caso, verificalo (`expect(client.auth.signInWithPassword).not.toHaveBeenCalled()`).
- Nunca afirmes sobre `err.message` de un `AppError`: el texto vive en el catálogo y se prueba ahí.

## Testeá los dos lados del camino

Por cada error que se maneja, **dos tests**:

1. El código manejado produce el resultado esperado.
2. Un error **distinto** sigue subiendo intacto.

```ts
it("lets infrastructure errors bubble up untouched", async () => {
  const boom = new Error("network");
  const client = clientWith(async () => {
    throw boom;
  });

  await expect(loginService(client, valid)).rejects.toBe(boom);
});
```

Esto es obligatorio para todo `catch` dentro de `lib/services/`.

## Catálogo

Todo código que no sea genérico (`VALIDATION`, `UNAUTHORIZED`, `INTERNAL`) tiene que matchear `DOMINIO_CASO`, y el test del catálogo lo hace cumplir. Al agregar un código de dominio, sumá su `status` esperado al test de ese dominio.

## Adaptadores

- **Ruta:** afirmá `res.status` y `await res.json()` contra el envelope exacto.
- **Action:** afirmá el objeto `{ ok, code, message, details }`.
- **Error inesperado:** afirmá que sale el `fallbackCode` y silenciá el log con `vi.spyOn(console, "error").mockImplementation(() => {})`.
- **Control de flujo de Next:** `redirect()` tiene que atravesar el adaptador (`rejects.toMatchObject({ digest: expect.stringContaining("NEXT_REDIRECT") })`).

## Checklist

- [ ] El test del servicio afirma el `code`, no el mensaje.
- [ ] Hay un test para el código manejado y otro para un error que sigue subiendo.
- [ ] Un código nuevo de dominio tiene su `status` verificado en el test del catálogo.
- [ ] Los tests de adaptadores afirman status/envelope y que `redirect()` no se traga.
