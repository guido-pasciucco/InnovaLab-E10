Snapshots archivados de la rama Mora

Estos dos archivos se trasladaron SIN cambiar su contenido desde drizzle/meta.
Son evidencia del historial de la rama, no snapshots activos para drizzle-kit.
Sus SQL y entradas originales del journal conservan nombres y timestamps.

Motivo: ambas ramas generaron snapshots con el mismo prevId. Drizzle-kit
necesita una sola cadena activa; no existe una operación de merge de snapshots.
Se conserva íntegra la cadena de main en meta y se añade un snapshot generado
por drizzle-kit desde los módulos actuales: main + help. Este snapshot reemplaza
la necesidad de usar las fotos bifurcadas como entradas de generación, sin
reescribir ninguna foto histórica.

Procedimiento ejecutado:
1. Archivar las dos fotos de Mora aquí sin modificar bytes.
2. bun run db:generate --name reconcile_help_usage
3. Revisar que el único DDL generado sea CREATE TABLE help_usage.
4. Sustituir ese DDL por la corrección condicional y verificada del mismo efecto.
   La FK a auth.users, RLS y permisos se mantienen en SQL, como en Mora.
5. bun run db:generate --name verify_help_repair: No schema changes.
6. bunx drizzle-kit check: Everything's fine.

El migrador de ejecución utiliza journal + SQL; no lee estos snapshots.
