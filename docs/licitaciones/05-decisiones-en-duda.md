# Decisiones en duda

Decisiones que ya figuran en las [reglas de negocio](01-reglas-de-negocio.md) o en los diagramas, pero que alguien quiere revisar. No son puntos abiertos: los puntos abiertos van en [Especificaciones](04-especificaciones.md). Acá se junta la discusión hasta resolver si la decisión se mantiene o se cambia.

## Cómo se usa

- Cada duda tiene un ID `DD-NN` que no se reutiliza.
- Estados: **En duda** (en discusión), **Se mantiene** (con fecha y porqué), **Se cambia** (con fecha).
- Cada duda cita textual lo que está decidido hoy, junta los argumentos a favor y en contra del cambio, y anota los resguardos posibles.
- Si se cambia, el cambio se registra como un punto nuevo en [Especificaciones](04-especificaciones.md) y se actualizan las reglas afectadas, con su historial.

## Resumen

| ID | Tema | Estado |
| --- | --- | --- |
| DD-01 | Registro público de proveedores y licitaciones visibles para todos | En duda |

## DD-01. Registro público de proveedores y licitaciones visibles para todos

- **Estado:** En duda
- **Planteada:** 21 de noviembre de 2026.
- **Qué está decidido hoy:**
  - **RN-05:** "Participan solo proveedores registrados con ese emprendedor. Al publicar, se invita a todos los proveedores registrados que venden ese insumo y antes de publicar, el emprendedor puede quitar de esa lista a quienes no quiere invitar."
  - **RN-07:** "Ningún proveedor ve el precio de compra de referencia del emprendedor, su catálogo ni sus recetas."
  - **Diagrama de registro, nota *Queda ligado a un emprendedor*:** "Solo recibe invitaciones de él. Para trabajar con otro, se registra otra vez."
  - **Diagrama de registro:** el único camino para registrarse empieza con el enlace que difunde el emprendedor. No hay registro sin enlace.
- **La duda:** el proveedor debería poder registrarse públicamente, sin que un emprendedor lo invite, y ver las licitaciones que publican los emprendedores para poder ofertar.
- **A favor del cambio:**
  - La aplicación es nueva. Un registro público suma proveedores que ningún emprendedor conoce todavía, y con eso llegan más ofertas y más competencia.
  - El proveedor descubre emprendedores a los que venderles, y eso le da un motivo propio para entrar a la aplicación.
  - El emprendedor no tiene que conseguir y mandar un enlace a cada proveedor.
- **En contra del cambio / riesgos:**
  - Un competidor puede registrarse como proveedor y ver qué compra cada emprendedor, cuánto y con qué precio de partida. Va contra la idea de RN-07.
  - Ofertas de desconocidos: como las ofertas no obligan a nada (RN-14), alguien puede ofertar un precio irreal y ensuciar el cuadro comparativo.
  - Proveedores lejanos o poco confiables: el precio es puesto en destino (RN-04), pero el emprendedor no sabe quién está del otro lado.
  - Contradice RN-05 y la nota del registro, que habría que reescribir.
- **Resguardos posibles si se cambia** (ideas, no decisiones):
  - Que el emprendedor elija en cada licitación si es privada (solo sus proveedores) o pública.
  - Verificar el CUIT del proveedor antes de dejarlo ofertar (ES-09).
  - Mostrarle a cada proveedor solo las licitaciones de su rubro o de su zona.
  - Que el emprendedor pueda bloquear a un proveedor.
  - Mostrar las licitaciones públicas sin el nombre del emprendedor hasta que elija negociar. RN-21 ya le pasa su contacto al proveedor en ese momento.
- **Puntos relacionados:** ES-07 (a quién se invita), ES-08 (una cuenta o varias por proveedor), ES-09 (enlace de registro y verificación).
- **Resolución:** —
- **Fecha:** —
