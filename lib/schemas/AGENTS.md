# schemas/ — Contratos Zod y reglas de campo

Cada regla de validación y su mensaje se escriben **una sola vez**, en el `fields.ts` del contrato. El formulario (cliente) y los schemas de la base (`lib/db/<dominio>/validation.ts`) se arman a partir de esas mismas reglas, y usan las **mismas claves**, así que guardar no requiere renombrar campos.

## Quién toca este directorio

| Rol | Qué hace en `lib/schemas/` |
| --- | --- |
| **Backend** | Dueño. Define las reglas, los mensajes y los contratos. |
| **Frontend** | Consume los contratos desde `components/` y `app/`. Solo agrega campos puramente cosméticos del formulario (ver `lib/AGENTS.md`). |

## Estructura

Una carpeta por contrato. El archivo principal tiene el mismo nombre que la carpeta.

```
lib/schemas/
├── auth/
│   ├── fields.ts                  # emailField, passwordField
│   ├── auth.ts                    # login, signup, reset y update de contraseña
│   └── auth.test.ts
└── calculator-setup/
    ├── fields.ts                  # origen de cada regla y su mensaje
    ├── calculator-setup.ts        # contrato del formulario (calculatorSetupSchema)
    └── calculator-setup.test.ts
```

## Camino rápido: agregar un campo

1. **Definí la regla en `fields.ts`** con el sufijo `Field` y el mensaje en español:
   ```ts
   export const unitField = z.string().trim().min(1, { error: "Escribí en qué unidad lo vendés (ej: caja, paquete, kilo)." }).max(40);
   ```
2. **Usala en el contrato del formulario** con la misma clave que tiene la columna en la base:
   ```ts
   export const calculatorSetupSchema = z.object({ unit: unitField /* ... */ });
   ```
3. **Usala en el `lib/db/<dominio>/validation.ts`** de la tabla como refinamiento de drizzle-zod:
   ```ts
   createInsertSchema(costingSetup, { unit: unitField /* ... */ });
   ```
4. **Testeá los dos contratos** con el helper `fieldErrors`: el mismo input inválido tiene que devolver el mismo mensaje en el formulario y en la base.

## Reglas

| Tema | Regla |
| --- | --- |
| Fuente única | La regla y el mensaje viven solo en `fields.ts`. Ni el formulario ni `lib/db` redefinen una regla de negocio. |
| Dirección de dependencias | `lib/db → lib/schemas`, nunca al revés. `lib/schemas` es puro y apto para el cliente: no importa `lib/db`, `drizzle-orm` ni `window`. |
| Nombres de clave | La clave del formulario es igual al nombre de la columna en TypeScript (`unit`, `period`, `volume`, `name`). Si no coinciden, se renombra la columna, no se mapea. |
| Nombres de columna | Sin prefijos que repitan el nombre de la tabla: `costing_setup.unit`, no `costing_setup.costing_unit`. |
| Nombres de regla | `<concepto>Field` y describen la regla, no la clave: `productNameField` se usa en la clave `name`. |
| Tipos | Se infieren con `z.infer`. Nada de `float` para cantidades (`lib/AGENTS.md`, regla 3): un volumen entero es `z.int()` con columna `integer`. |
| Mensajes | En español y escritos solo en el schema. Si el formulario y el schema no coinciden, se corrige el schema y nunca el JSX. |

## Lo único que se mapea

Un contrato de formulario puede mezclar campos de varias tablas. Por ejemplo, `calculatorSetupSchema.name` se guarda en `products` y el resto del objeto en `costing_setup`. Al guardar, los campos se **reparten por tabla**, pero no se renombran.

## Por qué el formulario no deriva de las tablas

Derivar el formulario con `createInsertSchema(products).shape.name` obligaría al cliente a importar `lib/db`, que es solo de servidor. Además metería Drizzle en el bundle del navegador y ataría la UI a cada migración. Compartir las reglas desde `fields.ts` deja una sola fuente y mantiene esa frontera.

## Checklist

- [ ] La regla nueva está en `fields.ts` y no está duplicada en otro lugar.
- [ ] La clave del formulario coincide con el nombre de la columna.
- [ ] `lib/schemas` no importa nada de `lib/db`.
- [ ] Hay un test que confirma el mismo mensaje en el formulario y en la base.
- [ ] Si cambió una columna, la migración se generó con `bun run db:generate` (ver `lib/db/AGENTS.md`).
