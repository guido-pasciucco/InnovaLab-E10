# Decisión de persistencia (ORM): PENDIENTE

> **Estado: PENDIENTE.** No se seleccionó ni instaló ningún ORM. Este documento registra el problema y una propuesta de evaluación; **no constituye una decisión aprobada**.

## Contexto y problema

La calculadora es un MVP **local-first**: todo el cálculo y el estado viven en el cliente, sin persistencia en servidor. Los contratos compartidos ya están definidos con **Zod**, y la lógica de dominio es pura (`lib/calc`, `lib/money`), sin dependencias de infraestructura.

El problema aparece cuando se adopte persistencia real (Supabase con PostgreSQL previsto): si cada tabla se refleja a mano en interfaces TypeScript duplicadas, el esquema de base de datos y los tipos divergen con cada cambio, y se pierde la validación en runtime que hoy brinda Zod.

## Propuesta de enfoque (a evaluar, no aprobada)

Cuando se incorpore persistencia en servidor, **evaluar Drizzle ORM**:

- Definiciones de tablas en TypeScript con tipos `select`/`insert` **inferidos** (`$inferSelect` / `$inferInsert`), evitando repetir todos los campos de la base en interfaces manuales.
- Integración con Zod para **derivar** la validación de persistencia desde el esquema, en lugar de mantenerla duplicada.

**Alternativa a considerar:** usar el cliente de Supabase con tipos `Row`/`Insert`/`Update` **generados** del esquema, sin ORM. Menos dependencias y menos capa de abstracción; consultas menos tipadas que un ORM con query builder.

| Criterio | Drizzle (propuesta) | Cliente Supabase (alternativa) |
|----------|--------------------|--------------------------------|
| Tipado de consultas | Query builder fuertemente tipado | Tipos generados, consultas menos estrictas |
| Dependencias | ORM adicional | Solo el cliente existente |
| Validación runtime | Derivable de esquemas Zod | Requiere schemas Zod propios igualmente |

## Límites que sí o sí hay que respetar

- **El dominio no depende del ORM.** `lib/calc` y `lib/money` siguen siendo puros; los adapters solo aparecen si los modelos realmente difieren.
- **No confundir fila persistida con contrato público.** El input del usuario y el contrato de cálculo (Zod + `z.infer` hoy) no son lo mismo que la fila en base de datos.
- **Datos controlados por el servidor:** `id`, `ownerId` y timestamps pertenecen a esa capa; nunca son escribibles a ciegas por el usuario.
- **La inferencia de tipos no reemplaza la validación en runtime.** Los tipos existen solo en compilación; Zod sigue siendo la barrera de ejecución.
- **Autorización:** la ruta de acceso a la base elegida (Drizzle directo, cliente Supabase u otra) exige evaluar **RLS / políticas de autorización** antes de aprobar.

## Criterios para revisitar y aprobar

1. Se confirma la incorporación de persistencia en servidor (Supabase PostgreSQL).
2. Se compara Drizzle vs. cliente Supabase con un spike real sobre el esquema previsto.
3. Se define cómo se derivan las validaciones Zod de persistencia sin duplicar esquemas.
4. Se evalúa la estrategia de autorización (RLS) para la ruta de acceso elegida.

## Referencias

- [Drizzle ORM — goodies](https://orm.drizzle.team/docs/goodies)
- [Supabase — generating types](https://supabase.com/docs/guides/api/rest/generating-types)
